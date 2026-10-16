import { MetadataModel, ModelInclude, SoftDeleteContext } from '../types';
import { deepSoftDelete } from '../utils/deepSoftDelete';
import { augmentOptionalRelationSelects, hideDeletedOptionalRelations } from '../utils/hideDeletedOptionalRelations';

type ReadArgs = {
  where?: any;
  include?: any;
  select?: any;
};

export async function executeParanoidRead<TArgs extends ReadArgs, TResult>(
  dataModel: MetadataModel,
  args: TArgs,
  ctx: SoftDeleteContext,
  run: (args: TArgs) => Promise<TResult>,
): Promise<TResult> {
  const newArgs = { ...args };
  newArgs.where ||= {};
  const { where, include } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
  newArgs.where = where;
  if (include) newArgs.include = include;
  augmentOptionalRelationSelects(dataModel, newArgs.include as ModelInclude | null | undefined, ctx);
  augmentOptionalRelationSelects(dataModel, newArgs.select as ModelInclude | null | undefined, ctx);

  const result = await run(newArgs);
  return hideDeletedOptionalRelations(
    result,
    dataModel,
    (newArgs.include ?? newArgs.select) as ModelInclude | null | undefined,
    ctx,
  );
}
