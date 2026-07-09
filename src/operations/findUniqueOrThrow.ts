import { expandCompoundUniqueWhere, isParanoid } from '../utils/common';
import { deepSoftDelete } from '../utils/deepSoftDelete';
import { ArgsOperations, OperationContext } from './types';

export async function findUniqueOrThrowOperation(
  params: ArgsOperations<'findUniqueOrThrow'>,
  { dataModelsMap, ctx }: OperationContext,
) {
  const __internalParams = params.__internalParams;
  if (!__internalParams) throw new Error('__internalParams is required');

  const { model, args, query } = params;

  const dataModel = model ? dataModelsMap.get(model) : undefined;
  if (dataModel && isParanoid(model, ctx)) {
    const newArgs = { ...args };
    newArgs.where ||= {} as any;
    newArgs.where = expandCompoundUniqueWhere(dataModel, newArgs.where) as any;
    const { where } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
    newArgs.where = where;
    return query(newArgs, { ...__internalParams, action: 'findFirstOrThrow', args: newArgs });
  }

  return query(args);
}
