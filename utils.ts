import { Prisma } from '@prisma/client';
import {
  FieldInclude,
  ModelWhere,
  ModelInclude,
  SoftDeleteOptions,
} from './types';
import {
  dataModels,
  DEFAULT_ATTRIBUTE,
  DEFAULT_TYPE,
  OPERATIONS_WITH_RELATION_FILTERS,
  RELATION_FILTERS,
  valuesOnFilter,
} from './constants';

export const isParanoid = (
  fieldModel: Prisma.DMMF.Model,
  opts?: SoftDeleteOptions,
) => {
  const paranoidField = getParanoidField(opts);
  return fieldModel.fields.some(f => f.name === paranoidField);
};

export function getParanoidField(
  opts: SoftDeleteOptions | undefined,
) {
  return opts?.field?.name || DEFAULT_ATTRIBUTE;
}

function parseInclude(
  fieldInclude: boolean | FieldInclude | null | undefined,
) {
  return typeof fieldInclude === 'object' ? fieldInclude : undefined;
}

export const deepSoftDelete = <
  Where extends ModelWhere,
  Include extends ModelInclude,
>(
  model: Prisma.DMMF.Model,
  where: Where | null = null,
  include?: Include | null,
  opts?: SoftDeleteOptions,
) => {
  const newWhere = {
    ...where,
  };

  let newInclude: ModelInclude | undefined = include
    ? { ...include }
    : undefined;

  const fieldType = opts?.field?.type || DEFAULT_TYPE;
  const value = (opts?.valueOnFilter || valuesOnFilter[fieldType])();

  const paranoidField = getParanoidField(opts);

  if (
    isParanoid(model, opts) &&
    !(paranoidField in newWhere) &&
    // XOR is/isNot on relation filters
    !RELATION_FILTERS.some(filter => filter in newWhere)
  )
    newWhere[paranoidField] = value;

  for (const field of model.fields) {
    const name = field.name;
    const { include, where } = buildFieldSoftDelete(
      field,
      newWhere[name],
      newInclude?.[name],
      opts,
    );
    if (where) newWhere[name] = where;
    if (include) newInclude = { ...newInclude, [name]: include };
  }

  for (const OPERATION of OPERATIONS_WITH_RELATION_FILTERS) {
    const whereOperation = newWhere[OPERATION];
    if (whereOperation instanceof Array) {
      whereOperation.forEach((where: ModelWhere, index: number) => {
        const { where: newWhereOperation } = deepSoftDelete(
          model,
          where,
          undefined,
          opts,
        );
        whereOperation[index] = newWhereOperation;
      });
    } else if (whereOperation instanceof Object) {
      const { where: newWhereOperation } = deepSoftDelete(
        model,
        whereOperation,
        undefined,
        opts,
      );
      newWhere[OPERATION] = newWhereOperation;
    }
  }

  return { where: newWhere as Where, include: newInclude as Include };
};

function buildFieldSoftDelete(
  field: Prisma.DMMF.Field,
  baseWhere: ModelWhere | null | undefined,
  baseInclude: FieldInclude | null | undefined | boolean,
  opts?: SoftDeleteOptions,
) {
  const fieldModel = dataModels.get(field.type);
  let newInclude = parseInclude(baseInclude);
  let newWhere = baseWhere;
  if (fieldModel && isParanoid(fieldModel, opts)) {
    if (baseInclude) {
      const objectInclude =
        typeof newInclude === 'boolean'
          ? undefined
          : newInclude?.include;
      const result = deepSoftDelete(
        fieldModel,
        baseWhere || newInclude?.where,
        objectInclude,
        opts,
      );
      if (field.isList)
        newInclude = {
          ...newInclude,
          where: {
            ...newInclude?.where,
            ...result.where,
          },
        };
      else newWhere = { ...newWhere, ...result.where };
      if (result.include) {
        newInclude ||= {};
        newInclude.include = {
          ...newInclude?.include,
          ...result.include,
        };
      }
    }
    if (newWhere) {
      const writeInclude = (include: ModelInclude) =>
        include &&
        (newInclude = {
          ...newInclude,
          ...include,
        });

      if (field.isList)
        // key = every | some | none
        for (const key in baseWhere) {
          if (Object.prototype.hasOwnProperty.call(baseWhere, key)) {
            const whereRelationFilter = baseWhere[key];
            const result = deepSoftDelete(
              fieldModel,
              whereRelationFilter,
              undefined,
              opts,
            );
            if (whereRelationFilter) {
              baseWhere[key] = {
                ...baseWhere[key],
                ...result.where,
              };
            }
            writeInclude(result.include);
          }
        }
      else {
        const result = deepSoftDelete(
          fieldModel,
          baseWhere,
          undefined,
          opts,
        );
        newWhere = { ...newWhere, ...result.where };
        writeInclude(result.include);
      }
    }
  }
  return {
    where: newWhere,
    include: newInclude,
  };
}
