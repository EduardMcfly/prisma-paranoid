import { isParanoid } from '../utils/common';
import { deepSoftDelete } from '../utils/deepSoftDelete';
import { ArgsOperations, OperationContext } from './types';

export async function groupByOperation(params: ArgsOperations<'groupBy'>, { dataModelsMap, ctx }: OperationContext) {
  const __internalParams = params.__internalParams;
  if (!__internalParams) throw new Error('__internalParams is required');

  const { model, args, query } = params;
  const dataModel = model ? dataModelsMap.get(model) : undefined;
  if (dataModel && isParanoid(model, ctx)) {
    const newArgs = { ...args };
    newArgs.where ||= {};
    const { where } = deepSoftDelete(dataModel, newArgs.where, null, ctx);
    newArgs.where = where;
    return query(newArgs);
  }
  return query(args);
}
