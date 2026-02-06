import { Prisma } from '@prisma/client';
import { deepSoftDelete } from './utils/deepSoftDelete';
import { isParanoid, getParanoidField, uncapitalize } from './utils/common';
import { SoftDeleteOptions, SoftDeleteConfig, SoftDeleteContext, MetadataModel } from './types';
import { DEFAULT_ATTRIBUTE, DEFAULT_TYPE, valuesOnDelete, valuesOnFilter } from './constants';
import { buildModelsWithField } from './utils/buildModelsWithField';
import { logParanoidModels } from './utils/logger';

type PrismaMethod = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

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

    return client.$extends({
      query: {
        $allModels: {
          async delete(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const modelConfig = ctx.models[model];
              const fieldName = getParanoidField(modelConfig ?? config);
              const valueOnDelete = modelConfig?.valueOnDelete ?? config.valueOnDelete;
              const updateArgs = {
                where: args.where,
                data: {
                  [fieldName]: valueOnDelete(),
                },
              };
              const methodName = uncapitalize(model);
              const update = client[methodName].update as PrismaMethod;
              return update(updateArgs);
            }
            return query(args);
          },
          async deleteMany(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const modelConfig = ctx.models[model];
              const fieldName = getParanoidField(modelConfig ?? config);
              const valueOnDelete = modelConfig?.valueOnDelete ?? config.valueOnDelete;
              const updateArgs = {
                where: args.where,
                data: {
                  [fieldName]: valueOnDelete(),
                },
              };
              const methodName = uncapitalize(model);
              const updateMany = client[methodName].updateMany as PrismaMethod;
              return updateMany(updateArgs);
            }
            return query(args);
          },
          async findUnique(params) {
            const { model, args, query } = params;

            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const newArgs = { ...args };
              newArgs.where ||= {} as any;
              const { where } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
              newArgs.where = where;
              const methodName = uncapitalize(model);
              const findFirst = client[methodName].findFirst as PrismaMethod;
              return findFirst(newArgs);
            }
            return query(args);
          },
          async findUniqueOrThrow(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const newArgs = { ...args };
              newArgs.where ||= {} as any;
              const { where } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
              newArgs.where = where;
              const methodName = uncapitalize(model);
              const findFirstOrThrow = client[methodName].findFirstOrThrow as PrismaMethod;
              return findFirstOrThrow(newArgs);
            }
            return query(args);
          },
          async findFirst(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const newArgs = { ...args };
              newArgs.where ||= {};
              const { where } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
          async findFirstOrThrow(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const newArgs = { ...args };
              newArgs.where ||= {};
              const { where } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
          async findMany(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const newArgs = { ...args };
              newArgs.where ||= {};
              const { where } = deepSoftDelete(dataModel, newArgs.where, newArgs.include, ctx);
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
          async groupBy(params) {
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
          },
        },
      },
    });
  });
};

export default prismaParanoid;
export type { SoftDeleteOptions, SoftDeleteDefaultConfig, LogLevel } from './types';
export { AttributeTypes } from './constants';
