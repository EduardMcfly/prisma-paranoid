import { Prisma } from '@prisma/client';
import {
  isParanoid,
  deepSoftDelete,
  getParanoidField,
  uncapitalize,
} from './utils';
import { SoftDeleteOptions } from './types';
import {
  dataModels,
  DEFAULT_TYPE,
  valuesOnDelete,
  valuesOnFilter,
} from './constants';

type PrismaMethod = (args: any) => Promise<any>;

// ***********************************/
// * SOFT DELETE EXTENSION */
// ***********************************/
export const softDelete = (opts?: SoftDeleteOptions) => {
  const paranoidField = getParanoidField(opts);

  const type = opts?.field?.type || DEFAULT_TYPE;

  const valueOnDelete = opts?.valueOnDelete || valuesOnDelete[type];
  const valueOnFilter = opts?.valueOnFilter || valuesOnFilter[type];

  const newOpts: SoftDeleteOptions = {
    field: { name: getParanoidField(opts), type },
    valueOnDelete,
    valueOnFilter,
  };

  return Prisma.defineExtension(client =>
    client.$extends({
      query: {
        $allModels: {
          async delete(params) {
            const { model, args, query } = params;
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              // Change delete to update
              const updateArgs = {
                where: args.where,
                data: {
                  [paranoidField]: valueOnDelete(),
                },
              };
              // Access the update method via the model delegate from client

              const methodName = uncapitalize(model);
              const update = client[methodName]
                .update as PrismaMethod;
              return update(updateArgs);
            }
            return query(args);
          },
          async deleteMany(params) {
            const { model, args, query } = params;
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              // Change deleteMany to updateMany
              const updateArgs = {
                where: (args as any).where,
                data: {
                  [paranoidField]: valueOnDelete(),
                },
              };
              const methodName = uncapitalize(model);

              const modelDelegate = client[methodName];
              const updateMany =
                modelDelegate.updateMany as PrismaMethod;
              return updateMany(updateArgs);
            }
            return query(args);
          },
          async findUnique(params) {
            const { model, args, query } = params;
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              const newArgs = { ...args } as Record<string, any>;
              newArgs.where ||= {};
              const { where } = deepSoftDelete(
                dataModel,
                newArgs.where,
                newArgs.include,
                newOpts,
              );
              newArgs.where = where;
              // Change findUnique to findFirst via model delegate
              const methodName = uncapitalize(model);
              const modelDelegate = client[methodName];
              const findFirst =
                modelDelegate.findFirst as PrismaMethod;
              return findFirst(newArgs);
            }
            return query(args);
          },
          async findUniqueOrThrow(params) {
            const { model, args, query } = params;
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              const newArgs = { ...args } as Record<string, any>;
              newArgs.where ||= {};
              const { where } = deepSoftDelete(
                dataModel,
                newArgs.where,
                (newArgs as any).include,
                newOpts,
              );
              newArgs.where = where;
              // Change findUniqueOrThrow to findFirstOrThrow via model delegate

              const methodName = uncapitalize(model);
              const modelDelegate = client[methodName];
              const findFirstOrThrow =
                modelDelegate.findFirstOrThrow as PrismaMethod;
              return findFirstOrThrow(newArgs);
            }
            return query(args);
          },
          async findFirst({ model, args, query }) {
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              const newArgs = { ...args };
              newArgs.where ||= {};
              const { where } = deepSoftDelete(
                dataModel,
                newArgs.where,
                (newArgs as any).include,
                newOpts,
              );
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
          async findFirstOrThrow({ model, args, query }) {
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              const newArgs = { ...args } as Record<string, any>;
              newArgs.where ||= {};
              const { where } = deepSoftDelete(
                dataModel,
                newArgs.where,
                newArgs.include,
                newOpts,
              );
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
          async findMany({ model, args, query }) {
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              const newArgs = { ...args };
              newArgs.where ||= {};
              const { where } = deepSoftDelete(
                dataModel,
                newArgs.where,
                (newArgs as any).include,
                newOpts,
              );
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
          async groupBy({ model, args, query }) {
            const dataModel = model && dataModels.get(model);
            if (dataModel && isParanoid(dataModel)) {
              const newArgs = { ...args };
              newArgs.where ||= {};
              const { where } = deepSoftDelete(
                dataModel,
                newArgs.where,
                (newArgs as any).include,
                newOpts,
              );
              newArgs.where = where;
              return query(newArgs);
            }
            return query(args);
          },
        },
      },
    }),
  );
};

export default softDelete;
