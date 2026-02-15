import { expect } from 'chai';
import { Prisma } from '@prisma/client';
import { prismaParanoid } from './index';
import { uncapitalize } from './utils/common';
import type { MetadataModel } from './types';
import { DEFAULT_ATTRIBUTE, AttributeTypes } from './constants';

const ALL_QUERY_METHODS = [
  'delete',
  'deleteMany',
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'groupBy',
] as const;

type ExtensionParams = {
  model: string | undefined;
  args: Record<string, unknown>;
  query: (args: any) => Promise<unknown>;
};

/**
 * Minimal metadata model for testing.
 * By default includes a uniqueIndex on the 'id' field so that
 * deleteMany takes the findMany + $transaction(update) path.
 */
function createMetadataModel(
  name: string,
  fieldNames: string[],
  { uniqueIndexes = [{ name: 'User_id_deletedAt_key', fields: ['id', DEFAULT_ATTRIBUTE] }] } = {},
): MetadataModel {
  return {
    name,
    fields: fieldNames.map((f) => ({
      name: f,
      type: f === 'id' ? 'String' : 'DateTime',
      isId: f === 'id',
      isList: false,
      isRequired: f === 'id',
      kind: 'scalar' as const,
      hasDefaultValue: false,
      isReadOnly: false,
      isUnique: f === 'id',
      isGenerated: false,
    })),
    uniqueIndexes,
  };
}

/**
 * Model with no primary key (no field has isId) and no uniqueIndexes.
 * deleteMany will fall back to updateMany.
 */
function createMetadataModelWithoutPk(name: string, fieldNames: string[]): MetadataModel {
  return {
    name,
    fields: fieldNames.map((f) => ({
      name: f,
      type: 'String',
      isId: false,
      isList: false,
      isRequired: false,
      kind: 'scalar' as const,
      hasDefaultValue: false,
      isReadOnly: false,
      isUnique: false,
      isGenerated: false,
    })),
    uniqueIndexes: [],
  };
}

/** Captured arguments from delegate methods (update, updateMany, findFirst, findMany, etc.). */
type CapturedArgs = {
  update?: any;
  updateMany?: any;
  findFirst?: any;
  findFirstOrThrow?: any;
  findMany?: any;
  /** All update() calls made inside deleteMany transaction (when model has PK). */
  updateCalls?: any[];
};

function delegateMethods(captured: CapturedArgs, findManyReturns: Record<string, any[]> = {}) {
  return (modelName: string) => ({
    update: async (args: any) => {
      captured.update = args;
      if (!captured.updateCalls) captured.updateCalls = [];
      captured.updateCalls.push(args);
      return {};
    },
    updateMany: async (args: any) => {
      captured.updateMany = args;
      return { count: 0 };
    },
    findFirst: async (args: any) => {
      captured.findFirst = args;
      return null;
    },
    findFirstOrThrow: async (args: any) => {
      captured.findFirstOrThrow = args;
      return null;
    },
    findMany: async (args: any) => {
      captured.findMany = args;
      return findManyReturns[modelName] ?? [];
    },
  });
}

/**
 * Mocks Prisma.defineExtension, runs prismaParanoid(options), and returns
 * captured handlers plus args passed to update/updateMany/findFirst/findFirstOrThrow/findMany.
 * The fake client exposes delegates for every model in options.metadata.models.
 * When deleteMany runs for a model with PK, it uses findMany + $transaction(update per item);
 * optional findManyReturns per model name controls what findMany returns (default []).
 */
function installExtensionWithFakeClient(
  options: {
    metadata: { models: MetadataModel[] };
    auto: boolean;
    log?: false;
    defaultConfig?: any;
  },
  findManyReturns: Record<string, any[]> = {},
): { capturedHandlers: Record<string, (params: ExtensionParams) => Promise<unknown>>; captured: CapturedArgs } {
  const captured: CapturedArgs = {};
  const capturedHandlers: Record<string, (params: ExtensionParams) => Promise<unknown>> = {};
  const createDelegates = delegateMethods(captured, findManyReturns);

  const fakeClient: any = {
    $extends(ext: { query?: { $allModels?: Record<string, (p: ExtensionParams) => Promise<unknown>> } }) {
      const allModels = ext?.query?.$allModels;
      if (allModels) {
        for (const [method, handler] of Object.entries(allModels)) {
          capturedHandlers[method] = handler;
        }
      }
      return {};
    },
    $transaction: async (fn: (txClient: any) => Promise<any>) => fn(fakeClient),
  };
  for (const model of options.metadata.models) {
    fakeClient[uncapitalize(model.name)] = createDelegates(model.name);
  }

  const originalDefine = Prisma.defineExtension;
  (Prisma as any).defineExtension = function (fn: (client: any) => any) {
    return fn(fakeClient);
  };
  try {
    prismaParanoid(options);
    return { capturedHandlers, captured };
  } finally {
    (Prisma as any).defineExtension = originalDefine;
  }
}

describe('prismaParanoid extension', () => {
  const userModel = createMetadataModel('User', ['id', 'email', DEFAULT_ATTRIBUTE]);
  const defaultOptions = {
    metadata: { models: [userModel] },
    auto: true,
    log: false as const,
  };

  describe('when metadata is missing or invalid', () => {
    it('throws when options.metadata is missing', () => {
      const extend = prismaParanoid({ metadata: undefined as any, auto: true });
      const fakeClient = { $extends: () => ({}) };
      expect(() => extend(fakeClient as any)).to.throw(/runtime data model not found|metadata/);
    });

    it('throws when options.metadata.models is missing', () => {
      const extend = prismaParanoid({ metadata: {} as any, auto: true });
      const fakeClient = { $extends: () => ({}) };
      expect(() => extend(fakeClient as any)).to.throw(/runtime data model not found|metadata/);
    });
  });

  describe('when model is undefined', () => {
    const args = { where: { id: 1 } };

    ALL_QUERY_METHODS.forEach((method) => {
      it(`${method} passes the same args to query() without applying paranoid logic`, async () => {
        const { capturedHandlers } = installExtensionWithFakeClient(defaultOptions);
        let receivedArgs: any;
        const querySpy = async (a: any) => {
          receivedArgs = a;
          return method === 'deleteMany' ? { count: 0 } : method === 'findMany' || method === 'groupBy' ? [] : {};
        };
        await capturedHandlers[method]({
          model: undefined,
          args,
          query: querySpy,
        });
        expect(receivedArgs).to.eql(args);
      });
    });
  });

  describe('when model is not in runtime metadata', () => {
    const args = { where: { id: 1 } };

    ALL_QUERY_METHODS.forEach((method) => {
      it(`${method} passes the same args to query()`, async () => {
        const { capturedHandlers } = installExtensionWithFakeClient(defaultOptions);
        let receivedArgs: any;
        const querySpy = async (a: any) => {
          receivedArgs = a;
          return method === 'deleteMany' ? { count: 0 } : method === 'findMany' || method === 'groupBy' ? [] : {};
        };
        await capturedHandlers[method]({
          model: 'NonExistentModel',
          args,
          query: querySpy,
        });
        expect(receivedArgs).to.eql(args);
      });
    });
  });

  describe('when model is paranoid (soft delete)', () => {
    describe('delete', () => {
      it('calls update() with where containing paranoid filter and original where, and data with valueOnDelete', async () => {
        const { capturedHandlers, captured } = installExtensionWithFakeClient(defaultOptions);
        const args = { where: { id: 1 } };
        await capturedHandlers.delete({
          model: 'User',
          args,
          query: async () => {
            throw new Error('query should not be called');
          },
        });
        expect(captured.update).to.not.eql(undefined);
        expect(captured.update.where).to.include.keys(DEFAULT_ATTRIBUTE);
        expect(captured.update.where[DEFAULT_ATTRIBUTE]).to.eql(null);
        expect(captured.update.where.id).to.eql(1);
        expect(captured.update.data).to.have.property(DEFAULT_ATTRIBUTE);
        expect(captured.update.data[DEFAULT_ATTRIBUTE]).to.be.instanceOf(Date);
      });

      it('merges original where after paranoid filter so user conditions are preserved', async () => {
        const { capturedHandlers, captured } = installExtensionWithFakeClient(defaultOptions);
        const args = { where: { email: 'a@b.com', id: 42 } };
        await capturedHandlers.delete({ model: 'User', args, query: async () => ({}) });
        expect(captured.update.where[DEFAULT_ATTRIBUTE]).to.eql(null);
        expect(captured.update.where.email).to.eql('a@b.com');
        expect(captured.update.where.id).to.eql(42);
      });
    });

    describe('deleteMany', () => {
      it('when model has PK and paranoid field is in a uniqueIndex: calls findMany(select) then $transaction(update with select) per item', async () => {
        const { capturedHandlers, captured } = installExtensionWithFakeClient(defaultOptions, {
          User: [{ id: 1 }, { id: 2 }],
        });
        const args = { where: { email: 'a@b.com' } };
        const result = await capturedHandlers.deleteMany({
          model: 'User',
          args,
          query: async () => {
            throw new Error('query should not be called');
          },
        });
        // findMany receives where with paranoid filter and select with PK only
        expect(captured.findMany).to.not.eql(undefined);
        expect(captured.findMany.where).to.include.keys(DEFAULT_ATTRIBUTE);
        expect(captured.findMany.where[DEFAULT_ATTRIBUTE]).to.eql(null);
        expect(captured.findMany.where.email).to.eql('a@b.com');
        expect(captured.findMany.select).to.eql({ id: true });
        // One update call per item in the transaction
        expect(captured.updateCalls).to.have.lengthOf(2);
        expect(captured.updateCalls![0].where).to.eql({ id: 1 });
        expect(captured.updateCalls![0].data).to.have.property(DEFAULT_ATTRIBUTE);
        expect(captured.updateCalls![0].data[DEFAULT_ATTRIBUTE]).to.be.instanceOf(Date);
        expect(captured.updateCalls![0].select).to.eql({ id: true });
        expect(captured.updateCalls![1].where).to.eql({ id: 2 });
        expect(captured.updateCalls![1].data[DEFAULT_ATTRIBUTE]).to.be.instanceOf(Date);
        expect(captured.updateCalls![1].select).to.eql({ id: true });
        // Returns count matching the number of items
        expect(result).to.eql({ count: 2 });
      });

      it('when model has PK but paranoid field is not in a uniqueIndex: falls back to updateMany()', async () => {
        const modelNoUnique = createMetadataModel('UserNoUnique', ['id', 'email', DEFAULT_ATTRIBUTE], {
          uniqueIndexes: [],
        });
        const options = {
          metadata: { models: [modelNoUnique] },
          auto: true,
          log: false as const,
        };
        const { capturedHandlers, captured } = installExtensionWithFakeClient(options);
        const args = { where: { email: 'a@b.com' } };
        await capturedHandlers.deleteMany({
          model: 'UserNoUnique',
          args,
          query: async () => {
            throw new Error('query should not be called');
          },
        });
        expect(captured.updateMany).to.not.eql(undefined);
        expect(captured.updateMany.where[DEFAULT_ATTRIBUTE]).to.eql(null);
        expect(captured.updateMany.where.email).to.eql('a@b.com');
        expect(captured.updateMany.data).to.have.property(DEFAULT_ATTRIBUTE);
        expect(captured.updateMany.data[DEFAULT_ATTRIBUTE]).to.be.instanceOf(Date);
        // findMany should NOT have been called (no transaction path)
        expect(captured.findMany).to.eql(undefined);
      });

      it('when model has no PK: calls updateMany() with where and data', async () => {
        const modelNoPk = createMetadataModelWithoutPk('Log', ['message', DEFAULT_ATTRIBUTE]);
        const options = {
          metadata: { models: [modelNoPk] },
          auto: true,
          log: false as const,
        };
        const { capturedHandlers, captured } = installExtensionWithFakeClient(options);
        const args = { where: { message: 'foo' } };
        await capturedHandlers.deleteMany({
          model: 'Log',
          args,
          query: async () => {
            throw new Error('query should not be called');
          },
        });
        expect(captured.updateMany).to.not.eql(undefined);
        expect(captured.updateMany.where).to.include.keys(DEFAULT_ATTRIBUTE);
        expect(captured.updateMany.where[DEFAULT_ATTRIBUTE]).to.eql(null);
        expect(captured.updateMany.where.message).to.eql('foo');
        expect(captured.updateMany.data).to.have.property(DEFAULT_ATTRIBUTE);
        expect(captured.updateMany.data[DEFAULT_ATTRIBUTE]).to.be.instanceOf(Date);
      });
    });

    describe('findUnique', () => {
      it('calls findFirst() with where including paranoid filter (deletedAt: null)', async () => {
        const { capturedHandlers, captured } = installExtensionWithFakeClient(defaultOptions);
        const args = { where: { id: 1 } };
        await capturedHandlers.findUnique({
          model: 'User',
          args,
          query: async () => {
            throw new Error('findUnique should use findFirst, not query');
          },
        });
        expect(captured.findFirst).to.not.eql(undefined);
        expect(captured.findFirst.where).to.have.property(DEFAULT_ATTRIBUTE, null);
        expect(captured.findFirst.where.id).to.eql(1);
      });
    });

    describe('findUniqueOrThrow', () => {
      it('calls findFirstOrThrow() with where including paranoid filter', async () => {
        const { capturedHandlers, captured } = installExtensionWithFakeClient(defaultOptions);
        await capturedHandlers.findUniqueOrThrow({
          model: 'User',
          args: { where: { id: 1 } },
          query: async () => {
            throw new Error('findUniqueOrThrow should use findFirstOrThrow');
          },
        });
        expect(captured.findFirstOrThrow).to.not.eql(undefined);
        expect(captured.findFirstOrThrow.where).to.have.property(DEFAULT_ATTRIBUTE, null);
      });
    });

    describe('findFirst, findMany, groupBy', () => {
      it('passes args to query() with where including paranoid filter (deletedAt: null)', async () => {
        const { capturedHandlers } = installExtensionWithFakeClient(defaultOptions);
        const methods = ['findFirst', 'findMany', 'groupBy'] as const;
        for (const method of methods) {
          let queryReceivedArgs: any;
          await capturedHandlers[method]({
            model: 'User',
            args: { where: { email: 'x@y.com' } },
            query: async (a: any) => {
              queryReceivedArgs = a;
              return method === 'findMany' || method === 'groupBy' ? [] : null;
            },
          });
          expect(queryReceivedArgs.where).to.have.property(DEFAULT_ATTRIBUTE, null);
          expect(queryReceivedArgs.where.email).to.eql('x@y.com');
        }
      });
    });
  });

  describe('custom defaultConfig (field name)', () => {
    it('uses custom field name in where and data for delete/deleteMany', async () => {
      const customField = 'archivedAt';
      const model = createMetadataModel('Post', ['id', 'title', customField]);
      const options = {
        metadata: { models: [model] },
        auto: true,
        log: false as const,
        defaultConfig: { field: { name: customField, type: AttributeTypes.date } },
      };
      const { capturedHandlers, captured } = installExtensionWithFakeClient(options);
      await capturedHandlers.delete({
        model: 'Post',
        args: { where: { id: 1 } },
        query: async () => {
          throw new Error('should not be called');
        },
      });
      expect(captured.update.where[customField]).to.eql(null);
      expect(captured.update.data).to.have.property(customField);
      expect(captured.update.data[customField]).to.be.instanceOf(Date);
    });
  });
});
