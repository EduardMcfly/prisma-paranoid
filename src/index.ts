import { Prisma } from '@prisma/client';
import { isParanoid, deepSoftDelete, getParanoidField, uncapitalize } from './utils';
import { SoftDeleteOptions, SoftDeleteConfig, SoftDeleteContext, MetadataModel } from './types';
import { DEFAULT_ATTRIBUTE, DEFAULT_TYPE, valuesOnDelete, valuesOnFilter } from './constants';

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

function buildModelsWithField(dataModelsMap: Map<string, MetadataModel>, fieldName: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [name, model] of dataModelsMap) {
    const hasField = model.fields.some((f) => f.name === fieldName);
    if (hasField) out[name] = true;
  }
  return out;
}

// ***********************************/
// * PRISMA PARANOID EXTENSION */
// ***********************************/
export const prismaParanoid = <ModelName extends string = Prisma.ModelName>(opts: SoftDeleteOptions<ModelName>) => {
  const config = buildConfig(opts);
  const paranoidField = getParanoidField(config);

  return Prisma.defineExtension((client) => {
    const runtimeDataModel = opts.metadata;
    if (!runtimeDataModel?.models) {
      throw new Error(
        'prisma-paranoid: runtime data model not found on client. Ensure you are using a Prisma Client instance.',
      );
    }
    const dataModelsMap = new Map(runtimeDataModel.models.map((model) => [model.name, model]));
    const models = opts.auto === true ? buildModelsWithField(dataModelsMap, config.field.name) : (opts.models ?? {});

    const ctx: SoftDeleteContext = {
      config,
      models,
      dataModels: dataModelsMap,
    };

    return client.$extends({
      query: {
        $allModels: {
          async delete(params) {
            const { model, args, query } = params;
            const dataModel = model ? dataModelsMap.get(model) : undefined;
            if (dataModel && isParanoid(model, ctx)) {
              const updateArgs = {
                where: args.where,
                data: {
                  [paranoidField]: config.valueOnDelete(),
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
              const updateArgs = {
                where: args.where,
                data: {
                  [paranoidField]: config.valueOnDelete(),
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
export type { SoftDeleteOptions, SoftDeleteDefaultConfig } from './types';
export { AttributeTypes } from './constants';
