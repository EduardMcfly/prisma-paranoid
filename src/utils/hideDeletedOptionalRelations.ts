import { valuesOnFilter } from '../constants';
import { MetadataModel, ModelInclude, SoftDeleteContext } from '../types';
import { getParanoidField, isParanoid } from './common';

const injectedSelectFields = new WeakMap<object, Set<string>>();

function markInjectedSelectField(select: object, fieldName: string) {
  const fields = injectedSelectFields.get(select) ?? new Set<string>();
  fields.add(fieldName);
  injectedSelectFields.set(select, fields);
}

function paranoidFieldName(modelName: string, ctx: SoftDeleteContext): string {
  return getParanoidField(ctx.models[modelName] ?? ctx.config);
}

function aliveFilterValue(modelName: string, ctx: SoftDeleteContext) {
  const modelConfig = ctx.models[modelName];
  const effective = modelConfig ?? ctx.config;
  const fieldType = effective.field?.type ?? ctx.config.field.type;
  return (effective.valueOnFilter ?? ctx.config.valueOnFilter ?? valuesOnFilter[fieldType])();
}

function isSoftDeletedRecord(value: object, modelName: string, ctx: SoftDeleteContext): boolean {
  const fieldName = paranoidFieldName(modelName, ctx);
  if (!Object.prototype.hasOwnProperty.call(value, fieldName)) return false;
  return (value as Record<string, unknown>)[fieldName] !== aliveFilterValue(modelName, ctx);
}

function nestedRelationTree(node: true | { include?: ModelInclude | null; select?: ModelInclude | null }) {
  if (node === true) return undefined;
  return node.include ?? node.select ?? undefined;
}

/**
 * Partial selects of an optional paranoid relation do not load `deletedAt` unless asked.
 * Add it so the result can be nulled when the related row is soft-deleted, then strip it
 * if the caller did not request the field.
 */
export function augmentOptionalRelationSelects(
  model: MetadataModel,
  tree: ModelInclude | null | undefined,
  ctx: SoftDeleteContext,
): void {
  if (!tree) return;

  for (const field of model.fields) {
    if (field.kind !== 'object') continue;
    const node = tree[field.name];
    if (!node || node === true) continue;

    const fieldModel = ctx.dataModels.get(field.type);
    if (!fieldModel) continue;

    let next = node;
    if (!field.isList && !field.isRequired && isParanoid(field.type, ctx) && node.select) {
      const fieldName = paranoidFieldName(field.type, ctx);
      if (!node.select[fieldName]) {
        const select = { ...node.select, [fieldName]: true };
        markInjectedSelectField(select, fieldName);
        next = { ...node, select };
        tree[field.name] = next;
      }
    }

    const nested = nestedRelationTree(next);
    if (nested) augmentOptionalRelationSelects(fieldModel, nested, ctx);
  }
}

function omitInjectedParanoidField(
  relation: Record<string, unknown>,
  node: true | { select?: ModelInclude | null },
  modelName: string,
  ctx: SoftDeleteContext,
) {
  if (node === true || !node.select) return;
  const fieldName = paranoidFieldName(modelName, ctx);
  if (!injectedSelectFields.get(node.select)?.has(fieldName)) return;
  delete relation[fieldName];
}

/** Turns a soft-deleted optional to-one include into `null` without dropping the parent row. */
export function hideDeletedOptionalRelations<T>(
  result: T,
  model: MetadataModel,
  tree: ModelInclude | null | undefined,
  ctx: SoftDeleteContext,
): T {
  if (result == null || !tree) return result;
  if (Array.isArray(result)) {
    return result.map((row) => hideDeletedOptionalRelations(row, model, tree, ctx)) as T;
  }
  if (typeof result !== 'object') return result;

  const record = result as Record<string, unknown>;
  for (const field of model.fields) {
    if (field.kind !== 'object') continue;
    const node = tree[field.name];
    if (!node) continue;

    const fieldModel = ctx.dataModels.get(field.type);
    if (!fieldModel) continue;

    const value = record[field.name];
    const nested = nestedRelationTree(node);

    if (field.isList) {
      if (Array.isArray(value) && nested) {
        record[field.name] = value.map((item) => hideDeletedOptionalRelations(item, fieldModel, nested, ctx));
      }
      continue;
    }

    if (value == null || typeof value !== 'object') continue;

    if (!field.isRequired && isParanoid(field.type, ctx) && isSoftDeletedRecord(value, field.type, ctx)) {
      record[field.name] = null;
      continue;
    }

    const relation = value as Record<string, unknown>;
    if (!field.isRequired && isParanoid(field.type, ctx)) {
      omitInjectedParanoidField(relation, node, field.type, ctx);
    }
    if (nested) hideDeletedOptionalRelations(relation, fieldModel, nested, ctx);
  }

  return result;
}
