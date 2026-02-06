import type { Prisma } from '@prisma/client';
import { AttributeTypes, ValidValue } from './constants';

export declare type ReadonlyDeep<T> = {
  readonly [K in keyof T]: ReadonlyDeep<T[K]>;
};

export type ModelWhere = Record<string, any>;
export type FieldInclude = {
  select?: any;
  include?: ModelInclude | null;
  where?: ModelWhere;
};
export type ModelInclude = {
  [x: string]: boolean | undefined | null | FieldInclude;
};

/** Config for the paranoid field and values (can be shared or per-model later). */
export type SoftDeleteDefaultConfig = {
  field?: {
    name: string;
    type: AttributeTypes;
  };
  valueOnDelete?: () => ValidValue;
  valueOnFilter?: () => ValidValue;
};

/** Resolved config used internally (field, valueOnDelete, valueOnFilter always set). */
export type SoftDeleteConfig = {
  field: { name: string; type: AttributeTypes };
  valueOnDelete: () => ValidValue;
  valueOnFilter: () => ValidValue;
};

export type MetadataField = {
  name: string;
  isId: boolean;
  type: string;
  kind: Prisma.DMMF.FieldKind;
  isList: boolean;
  isRequired: boolean;
};

type Model = {
  name: string;
  fields: Prisma.DMMF.Field[];
};

export type MetadataModel = ReadonlyDeep<Model> | Model;

export type SoftDeleteOptions<ModelName extends string = Prisma.ModelName> = {
  metadata: {
    models: MetadataModel[];
  };
  /**
   * Map of model names to enable paranoid (soft delete) for. e.g. { Comment: true, Post: true }
   * Ignored when allModels is true.
   */
  models?: Record<ModelName, boolean>;
  /**
   * If true, every model that has the paranoid field (e.g. deletedAt) is treated as paranoid.
   * @default false
   */
  allModels?: boolean;
  defaultConfig?: SoftDeleteDefaultConfig;
};

/** Internal context passed to utils (config + models map + DMMF map for traversal). */
export type SoftDeleteContext = {
  config: SoftDeleteConfig;
  models: Record<string, boolean>;
  dataModels: Map<string, MetadataModel>;
};

export type AllPrismaAction = Prisma.PrismaAction | 'groupBy' | `${Prisma.PrismaAction}OrThrow`;
