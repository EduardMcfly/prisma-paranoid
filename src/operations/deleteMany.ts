import { getParanoidField, isParanoid } from '../utils/common';
import { ArgsOperations, GetBatchResult, OperationArgs, OperationContext } from './types';

export async function deleteManyOperation(
  params: ArgsOperations<'deleteMany'>,
  { config, dataModelsMap, ctx }: OperationContext,
): Promise<GetBatchResult> {
  const __internalParams = params.__internalParams;
  if (!__internalParams) throw new Error('__internalParams is required');

  const { model, args, query } = params;

  const dataModel = model ? dataModelsMap.get(model) : undefined;
  if (dataModel && isParanoid(model, ctx)) {
    const modelConfig = ctx.models[model];
    const fieldName = getParanoidField(modelConfig ?? config);
    const valueOnDelete = modelConfig?.valueOnDelete ?? config.valueOnDelete;
    const valueOnFilter = modelConfig?.valueOnFilter ?? config.valueOnFilter;
    const where = { [fieldName]: valueOnFilter(), ...args.where };

    const pkId = dataModel.fields.find((field) => field.isId);
    const paranoidFieldIsUniqueIndexed = dataModel.uniqueIndexes.some((index) => index.fields.includes(fieldName));
    if (pkId && paranoidFieldIsUniqueIndexed) {
      const findManyArgs: OperationArgs<'findMany'> = {
        where,
        select: { [pkId.name]: true },
      };
      const list = await query(findManyArgs, {
        ...__internalParams,
        args: findManyArgs,
        action: 'findMany',
      });

      for (const item of list) {
        const updateArgs = {
          where: { [pkId.name]: item.id },
          data: { [fieldName]: valueOnDelete() },
        } as Record<string, unknown> as OperationArgs<'update'>;
        await query(updateArgs, { ...__internalParams, action: 'update', args: updateArgs });
      }
      return { count: list.length };
    }

    const updateArgs = {
      where: where,
      data: {
        [fieldName]: valueOnDelete(),
      },
    } as Record<string, unknown> as OperationArgs<'updateMany'>;
    return query(updateArgs, { ...__internalParams, action: 'updateMany', args: updateArgs });
  }
  return query(args);
}
