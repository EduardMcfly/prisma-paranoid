import {
  FieldInclude,
  ModelWhere,
  ModelInclude,
  SoftDeleteConfig,
  SoftDeleteContext,
  MetadataModel,
  MetadataField,
} from './types';
import { DEFAULT_ATTRIBUTE, OPERATIONS_WITH_RELATION_FILTERS, RELATION_FILTERS, valuesOnFilter } from './constants';

export const isParanoid = (modelName: string, ctx: SoftDeleteContext): boolean => ctx.models[modelName] === true;

export const uncapitalize = <T extends string>(str: T) =>
  (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<T>;

export function getParanoidField(config: SoftDeleteConfig | undefined): string {
  return config?.field?.name ?? DEFAULT_ATTRIBUTE;
}

function parseInclude(fieldInclude: boolean | FieldInclude | null | undefined) {
  return typeof fieldInclude === 'object' ? fieldInclude : undefined;
}

export const deepSoftDelete = <Where extends ModelWhere, Include extends ModelInclude>(
  model: MetadataModel,
  where: Where | null = null,
  include?: Include | null,
  ctx?: SoftDeleteContext,
) => {
  const newWhere = { ...where };

  let newInclude: ModelInclude | undefined = include ? { ...include } : undefined;

  if (!ctx) return { where: newWhere as Where, include: newInclude as Include };

  const config = ctx.config;
  const fieldType = config.field.type;
  const value = (config.valueOnFilter ?? valuesOnFilter[fieldType])();
  const paranoidField = getParanoidField(config);

  if (
    isParanoid(model.name, ctx) &&
    !(paranoidField in newWhere) &&
    !RELATION_FILTERS.some((filter) => filter in newWhere)
  )
    newWhere[paranoidField] = value;

  for (const field of model.fields) {
    const name = field.name;
    const { include: inc, where: w } = buildFieldSoftDelete(field, newWhere[name], newInclude?.[name], ctx);
    if (w) newWhere[name] = w;
    if (inc) newInclude = { ...newInclude, [name]: inc };
  }

  for (const OPERATION of OPERATIONS_WITH_RELATION_FILTERS) {
    const whereOperation = newWhere[OPERATION];
    if (whereOperation instanceof Array) {
      whereOperation.forEach((where: ModelWhere, index: number) => {
        const { where: newWhereOperation } = deepSoftDelete(model, where, undefined, ctx);
        whereOperation[index] = newWhereOperation;
      });
    } else if (whereOperation instanceof Object) {
      const { where: newWhereOperation } = deepSoftDelete(model, whereOperation, undefined, ctx);
      newWhere[OPERATION] = newWhereOperation;
    }
  }

  return { where: newWhere as Where, include: newInclude as Include };
};

function buildFieldSoftDelete(
  field: MetadataField,
  baseWhere: ModelWhere | null | undefined,
  baseInclude: FieldInclude | null | undefined | boolean,
  ctx?: SoftDeleteContext,
) {
  if (!ctx) return { where: baseWhere, include: parseInclude(baseInclude) };
  const fieldModel = ctx.dataModels.get(field.type);
  let newInclude = parseInclude(baseInclude);
  let newWhere = baseWhere;
  if (fieldModel && isParanoid(field.type, ctx)) {
    if (baseInclude) {
      const objectInclude = typeof newInclude === 'boolean' ? undefined : newInclude?.include;
      const result = deepSoftDelete(fieldModel, baseWhere || newInclude?.where, objectInclude, ctx);
      if (field.isList)
        newInclude = {
          ...newInclude,
          where: {
            ...newInclude?.where,
            ...result.where,
          },
        };
      else newWhere = { ...newWhere, ...result.where };
      if (result.include) {
        newInclude ||= {};
        newInclude.include = {
          ...newInclude?.include,
          ...result.include,
        };
      }
    }
    if (newWhere) {
      const writeInclude = (include: ModelInclude) =>
        include &&
        (newInclude = {
          ...newInclude,
          ...include,
        });

      if (field.isList)
        for (const key in baseWhere) {
          if (Object.prototype.hasOwnProperty.call(baseWhere, key)) {
            const whereRelationFilter = baseWhere[key];
            const result = deepSoftDelete(fieldModel, whereRelationFilter, undefined, ctx);
            if (whereRelationFilter) {
              baseWhere[key] = {
                ...baseWhere[key],
                ...result.where,
              };
            }
            writeInclude(result.include);
          }
        }
      else {
        const result = deepSoftDelete(fieldModel, baseWhere, undefined, ctx);
        newWhere = { ...newWhere, ...result.where };
        writeInclude(result.include);
      }
    }
  }
  return {
    where: newWhere,
    include: newInclude,
  };
}
