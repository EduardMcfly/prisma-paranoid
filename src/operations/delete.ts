import { getParanoidField, isParanoid } from '../utils/common';
import { ArgsOperations, OperationArgs, OperationContext } from './types';

export async function deleteOperation(
  params: ArgsOperations<'delete'>,
  { config, dataModelsMap, ctx }: OperationContext,
) {
  const __internalParams = params.__internalParams;
  if (!__internalParams) throw new Error('__internalParams is required');

  const { model, args, query } = params;

  const dataModel = model ? dataModelsMap.get(model) : undefined;
  if (dataModel && isParanoid(model, ctx)) {
    const modelConfig = ctx.models[model];
    const fieldName = getParanoidField(modelConfig ?? config);
    const valueOnDelete = modelConfig?.valueOnDelete ?? config.valueOnDelete;
    const valueOnFilter = modelConfig?.valueOnFilter ?? config.valueOnFilter;
    const updateArgs = {
      where: { [fieldName]: valueOnFilter(), ...args.where },
      data: {
        [fieldName]: valueOnDelete(),
      },
    } as OperationArgs<'update'>;
    return query(updateArgs, {
      ...__internalParams,
      args: updateArgs,
      action: 'update',
    });
  }
  return query(args);
}
