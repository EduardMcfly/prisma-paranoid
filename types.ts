import { Prisma } from '@prisma/client';
import { AttributeTypes, ValidValue } from './constants';

export type ModelWhere = Record<string, any>;
export type FieldInclude = {
  select?: any;
  include?: ModelInclude | null;
  where?: ModelWhere;
};
export type ModelInclude = {
  [x: string]: boolean | undefined | null | FieldInclude;
};

export type SoftDeleteOptions = {
  field?: {
    name: string;
    type: AttributeTypes;
  };
  valueOnDelete?: () => ValidValue;
  valueOnFilter?: () => ValidValue;
};

export type AllPrismaAction =
  | Prisma.PrismaAction
  | `${Prisma.PrismaAction}OrThrow`;
