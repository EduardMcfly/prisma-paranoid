import { deepSoftDelete } from './deepSoftDelete';
import { parseInclude, isParanoid } from './common';
import { MetadataField, ModelWhere, FieldInclude, SoftDeleteContext, ModelInclude } from '../types';

export function buildFieldSoftDelete(
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
