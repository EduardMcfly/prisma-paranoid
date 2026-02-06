export enum AttributeTypes {
  date = 'date',
  boolean = 'boolean',
  other = 'other',
}

export const DEFAULT_ATTRIBUTE = 'deletedAt';
export const DEFAULT_TYPE = AttributeTypes.date;

export const RELATION_FILTERS = ['is', 'isNot'];
export const OPERATIONS: ReadonlyArray<string> = ['AND', 'OR', 'NOT'];
export const OPERATIONS_WITH_RELATION_FILTERS = [...OPERATIONS, ...RELATION_FILTERS];

export type ValidValue = Date | string | number | boolean | undefined | null;

const MIDDLEWARE_NAME = 'SoftDeletePrisma';

type CallbackValues = Record<AttributeTypes, () => ValidValue>;

const commonError = `(${MIDDLEWARE_NAME}) -> When field.type is "${AttributeTypes.other}"`;
export const valuesOnDelete: CallbackValues = {
  [AttributeTypes.boolean]: () => true,
  [AttributeTypes.date]: () => new Date(),
  [AttributeTypes.other]: () => {
    throw new Error(
      `${commonError} valueOnDelete is required, example prisma.$use(softDelete({ ..., valueOnDelete: () => 1 }))`,
    );
  },
};

export const valuesOnFilter: CallbackValues = {
  [AttributeTypes.boolean]: () => false,
  [AttributeTypes.date]: () => null,
  [AttributeTypes.other]: () => {
    throw new Error(
      `${commonError} valueOnFilter is required, example prisma.$use(softDelete({ ..., valueOnFilter: () => 0 }))`,
    );
  },
};
