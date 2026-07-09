import { DEFAULT_ATTRIBUTE } from '../constants';
import { SoftDeleteContext, SoftDeleteConfig, FieldInclude, ModelConfig, MetadataModel, ModelWhere } from '../types';

export const isParanoid = (modelName: string, ctx: SoftDeleteContext): boolean =>
  ctx.models[modelName]?.paranoid === true;

export const uncapitalize = <T extends string>(str: T) =>
  (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<T>;

export function getParanoidField(config: SoftDeleteConfig | ModelConfig | undefined): string {
  return config?.field?.name ?? DEFAULT_ATTRIBUTE;
}

export function parseInclude(fieldInclude: boolean | FieldInclude | null | undefined) {
  return typeof fieldInclude === 'object' ? fieldInclude : undefined;
}

export function expandCompoundUniqueWhere(model: MetadataModel, where: ModelWhere): ModelWhere {
  const expandedWhere = { ...where };

  for (const index of model.uniqueIndexes) {
    if (index.fields.length < 2) continue;

    const uniqueInputName = index.name ?? index.fields.join('_');
    const uniqueInput = expandedWhere[uniqueInputName];
    if (!uniqueInput || typeof uniqueInput !== 'object' || uniqueInput instanceof Array) continue;

    for (const field of index.fields) {
      if (field in uniqueInput) expandedWhere[field] = uniqueInput[field];
    }

    delete expandedWhere[uniqueInputName];
  }

  return expandedWhere;
}
