import { ModelWhere, ModelInclude, SoftDeleteContext, MetadataModel } from '../types';
import { getParanoidField, isParanoid } from './common';
import { OPERATIONS_WITH_RELATION_FILTERS, RELATION_FILTERS, valuesOnFilter } from '../constants';
import { buildFieldSoftDelete } from './buildFieldSoftDelete';

export const deepSoftDelete = <Where extends ModelWhere, Include extends ModelInclude>(
  model: MetadataModel,
  where: Where | null = null,
  include?: Include | null,
  ctx?: SoftDeleteContext,
) => {
  const newWhere = { ...where };

  let newInclude: ModelInclude | undefined = include ? { ...include } : undefined;

  if (!ctx) return { where: newWhere as Where, include: newInclude as Include };

  const modelConfig = ctx.models[model.name];
  const config = ctx.config;
  const effectiveConfig = modelConfig ?? config;
  const fieldType = effectiveConfig.field?.type ?? config.field.type;
  const value = (effectiveConfig.valueOnFilter ?? config.valueOnFilter ?? valuesOnFilter[fieldType])();
  const paranoidField = getParanoidField(effectiveConfig);

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
