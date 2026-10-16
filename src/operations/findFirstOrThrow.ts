import { isParanoid } from '../utils/common';
import { ArgsOperations, OperationContext } from './types';
import { executeParanoidRead } from './paranoidRead';

export async function findFirstOrThrowOperation(
  params: ArgsOperations<'findFirstOrThrow'>,
  { dataModelsMap, ctx }: OperationContext,
) {
  const __internalParams = params.__internalParams;
  if (!__internalParams) throw new Error('__internalParams is required');

  const { model, args, query } = params;

  const dataModel = model ? dataModelsMap.get(model) : undefined;
  if (dataModel && isParanoid(model, ctx)) {
    return executeParanoidRead(dataModel, args, ctx, (newArgs) =>
      query(newArgs, { ...__internalParams, action: 'findFirstOrThrow', args: newArgs }),
    );
  }

  return query(args);
}
