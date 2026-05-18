import { Prisma } from '@prisma/client';
import { SoftDeleteOptions, SoftDeleteConfig, SoftDeleteContext, MetadataModel } from './types';
import { DEFAULT_ATTRIBUTE, DEFAULT_TYPE, valuesOnDelete, valuesOnFilter } from './constants';
import { buildModelsWithField } from './utils/buildModelsWithField';
import { logParanoidModels } from './utils/logger';
import { deleteOperation } from './operations/delete';
import { deleteManyOperation } from './operations/deleteMany';
import { findUniqueOperation } from './operations/findUnique';
import { findUniqueOrThrowOperation } from './operations/findUniqueOrThrow';
import { findFirstOperation } from './operations/findFirst';
import { findFirstOrThrowOperation } from './operations/findFirstOrThrow';
import { findManyOperation } from './operations/findMany';
import { groupByOperation } from './operations/groupBy';
import { countOperation } from './operations/count';
import { aggregateOperation } from './operations/aggregate';

function buildConfig<ModelName extends string = Prisma.ModelName>(
  opts: SoftDeleteOptions<ModelName>,
): SoftDeleteConfig {
  const dc = opts.defaultConfig ?? {};
  const type = dc.field?.type ?? DEFAULT_TYPE;
  return {
    field: {
      name: dc.field?.name ?? DEFAULT_ATTRIBUTE,
      type,
    },
    valueOnDelete: dc.valueOnDelete ?? valuesOnDelete[type],
    valueOnFilter: dc.valueOnFilter ?? valuesOnFilter[type],
  };
}

// ***********************************/
// * PRISMA PARANOID EXTENSION */
// ***********************************/
export const prismaParanoid = <ModelName extends string = Prisma.ModelName>(options: SoftDeleteOptions<ModelName>) => {
  const config = buildConfig(options);

  return Prisma.defineExtension((client) => {
    const runtimeDataModel = options.metadata;
    if (!runtimeDataModel?.models) {
      throw new Error(
        'prisma-paranoid: runtime data model not found on client. Ensure you are using a Prisma Client instance.',
      );
    }
    const dataModelsMap = new Map(runtimeDataModel.models.map((model) => [model.name, model]));
    const models = buildModelsWithField({
      options,
      dataModelsMap: dataModelsMap as Map<ModelName, MetadataModel>,
      config,
    });

    const ctx: SoftDeleteContext = {
      config,
      models,
      dataModels: dataModelsMap,
    };

    logParanoidModels(models, options.log);

    const operationOptions = {
      config,
      dataModelsMap,
      ctx,
      models,
    };
    return client.$extends({
      query: {
        $allModels: {
          async $allOperations(params) {
            switch (params.operation) {
              case 'delete':
                return deleteOperation(params, operationOptions);
              case 'deleteMany':
                return deleteManyOperation(params, operationOptions);
              case 'findUnique':
                return findUniqueOperation(params, operationOptions);
              case 'findUniqueOrThrow':
                return findUniqueOrThrowOperation(params, operationOptions);
              case 'findFirst':
                return findFirstOperation(params, operationOptions);
              case 'findFirstOrThrow':
                return findFirstOrThrowOperation(params, operationOptions);
              case 'findMany':
                return findManyOperation(params, operationOptions);
              case 'groupBy':
                return groupByOperation(params, operationOptions);
              case 'count':
                return countOperation(params, operationOptions);
              case 'aggregate':
                return aggregateOperation(params, operationOptions);
              default:
                return params.query(params.args);
            }
          },
        },
      },
    });
  });
};

export default prismaParanoid;
export type { SoftDeleteOptions, SoftDeleteDefaultConfig, LogLevel } from './types';
export { AttributeTypes } from './constants';
