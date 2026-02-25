import { Prisma } from '@prisma/client';
import type { getPrismaClient } from '@prisma/client/runtime/client';
import { MetadataModel, ModelConfig, SoftDeleteConfig, SoftDeleteContext } from '../types';

type InternalRequestParams = Parameters<InstanceType<ReturnType<typeof getPrismaClient>>['_request']>[0];

type Operations = Prisma.TypeMap['model'][keyof Prisma.TypeMap['model']]['operations'];
export type OperationArgs<Operation extends keyof Operations> = Operations[Operation]['args'];

export type ArgsOperationsBase<Operation extends keyof Operations> = {
  operation: Operation;
  args: OperationArgs<Operation>;
  model: Prisma.ModelName;
  __internalParams?: InternalRequestParams;
};

export type ArgsOperations<Operation extends keyof Operations> = ArgsOperationsBase<Operation> & {
  query<OperationName extends keyof Operations = Operation>(
    args: OperationArgs<OperationName>,
    __internalParams?: InternalRequestParams & { action: OperationName },
  ): Prisma.PrismaPromise<Operations[OperationName]['result']>;
};

export type OperationContext = {
  config: SoftDeleteConfig;
  models: Record<string, ModelConfig>;
  dataModelsMap: Map<string, MetadataModel>;
  ctx: SoftDeleteContext;
};

export declare type GetBatchResult = {
  count: number;
};
