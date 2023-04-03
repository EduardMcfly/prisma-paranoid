import { performance } from 'perf_hooks';
import { Prisma } from '@prisma/client';
import {
  isParanoid,
  deepSoftDelete,
  getParanoidField,
} from './utils';
import { AllPrismaAction, SoftDeleteOptions } from './types';
import {
  dataModels,
  DEFAULT_TYPE,
  valuesOnDelete,
  valuesOnFilter,
} from './constants';

// ***********************************/
// * SOFT DELETE MIDDLEWARE */
// ***********************************/
export const softDelete = (
  opts?: SoftDeleteOptions,
): Prisma.Middleware => {
  const paranoidField = getParanoidField(opts);

  const type = opts?.field?.type || DEFAULT_TYPE;

  const valueOnDelete = opts?.valueOnDelete || valuesOnDelete[type];
  const valueOnFilter = opts?.valueOnFilter || valuesOnFilter[type];

  const newOpts: SoftDeleteOptions = {
    field: { name: getParanoidField(opts), type },
    valueOnDelete,
    valueOnFilter,
  };

  return async (params, next) => {
    const model = params.model;
    const dataModel = model && dataModels.get(model);
    if (dataModel && isParanoid(dataModel)) {
      const action = params.action as AllPrismaAction;
      const now = performance.now();
      switch (action) {
        case 'delete': {
          // Delete queries
          // Change action to an update
          params.action = 'update';
          params.args['data'] = {
            [paranoidField]: valueOnDelete(),
          };
          break;
        }
        case 'deleteMany': {
          // Delete many queries
          params.action = 'updateMany';
          const args = params.args;
          args.data = {
            ...args.data,
            [paranoidField]: valueOnDelete(),
          };
          break;
        }
        case 'findUnique':
        case 'findUniqueOrThrow':
        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findMany':
        case 'findManyOrThrow': {
          if (action === 'findUnique') params.action = 'findFirst';
          if (action === 'findUniqueOrThrow')
            params.action = 'findFirstOrThrow' as Prisma.PrismaAction;
          params.args ||= {};
          const args = params.args;
          const { where } = deepSoftDelete(
            dataModel,
            args?.where,
            args?.include,
            newOpts,
          );
          args['where'] = where;
          break;
        }
      }
      console.log(
        `Soft delete query build in ${performance.now() - now}ms`,
      );
    }
    return next(params);
  };
};

export default softDelete;
