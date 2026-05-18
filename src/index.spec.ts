import { expect } from 'chai';
import { Prisma } from '@prisma/client';
import { prismaParanoid } from './index';
import { DEFAULT_ATTRIBUTE } from './constants';
import type { MetadataModel, SoftDeleteOptions } from './types';

function createMetadataModel(name: string, fieldNames: string[]): MetadataModel {
  return {
    name,
    fields: fieldNames.map((f) => ({
      name: f,
      type: 'String',
      isId: f === 'id',
      isList: false,
      isRequired: f === 'id',
      kind: 'scalar' as const,
      hasDefaultValue: false,
      isReadOnly: false,
      isUnique: false,
      isGenerated: false,
    })),
    uniqueIndexes: [],
  };
}

type ExtendedResult = {
  query: { $allModels?: { $allOperations: (params: any) => Promise<unknown> } };
};

function createFakeClient(_metadata?: { models: MetadataModel[] }) {
  const extendedResult: ExtendedResult = {
    query: {},
  };
  const client = {
    $extends: (config: unknown) => {
      Object.assign(extendedResult, config);
      return extendedResult;
    },
  };
  return { client, extendedResult };
}

describe('index', () => {
  describe('prismaParanoid', () => {
    it('throws when options is undefined (buildConfig fails)', () => {
      const { client } = createFakeClient();
      try {
        (Prisma as any).defineExtension = (fn: (c: any) => any) => fn(client);
        expect(() => prismaParanoid(undefined as any)).to.throw();
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('throws when options.metadata is undefined', () => {
      const { client } = createFakeClient();
      try {
        (Prisma as any).defineExtension = (fn: (c: any) => any) => fn(client);
        expect(() => prismaParanoid({} as SoftDeleteOptions<string>)).to.throw(
          'prisma-paranoid: runtime data model not found on client',
        );
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('throws when options.metadata.models is undefined', () => {
      const { client } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        expect(() => prismaParanoid({ metadata: {} as any })).to.throw(
          'prisma-paranoid: runtime data model not found on client',
        );
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('returns extended client when metadata.models is provided', () => {
      const metadata = { models: [createMetadataModel('User', ['id', 'deletedAt'])] };
      const { client, extendedResult } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        const result = prismaParanoid({
          metadata,
          auto: true,
        } as SoftDeleteOptions<string>);
        expect(result).to.equal(extendedResult);
        expect(extendedResult).to.have.nested.property('query.$allModels.$allOperations');
        expect(extendedResult.query.$allModels?.$allOperations).to.be.a('function');
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('returns extended client with $allOperations for known operations', () => {
      const metadata = { models: [createMetadataModel('User', ['id', 'deletedAt'])] };
      const { client, extendedResult } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        prismaParanoid({
          metadata,
          auto: true,
        } as SoftDeleteOptions<string>);
        const allOps = extendedResult.query.$allModels?.$allOperations;
        expect(allOps).to.be.a('function');
        if (!allOps) throw new Error('allOps is undefined');
        const params = {
          operation: 'findMany',
          model: 'User',
          args: {},
          query: (_args: unknown) => Promise.resolve([]),
          __internalParams: {},
        };
        return allOps(params).then((result: unknown) => {
          expect(result).to.eql([]);
        });
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('applies soft-delete filter on count for paranoid models', () => {
      const metadata = { models: [createMetadataModel('User', ['id', 'deletedAt'])] };
      const { client, extendedResult } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        prismaParanoid({
          metadata,
          auto: true,
        } as SoftDeleteOptions<string>);
        const allOps = extendedResult.query.$allModels?.$allOperations!;
        let capturedArgs: any;
        const queryStub = (args: any) => {
          capturedArgs = args;
          return Promise.resolve(1);
        };
        const params = {
          operation: 'count',
          model: 'User',
          args: {},
          query: queryStub,
          __internalParams: {},
        };
        return allOps(params).then((result: unknown) => {
          expect(result).to.equal(1);
          expect(capturedArgs.where).to.have.property('deletedAt', null);
        });
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('passes through to params.query for unknown operations', () => {
      const metadata = { models: [createMetadataModel('User', ['id', 'deletedAt'])] };
      const { client, extendedResult } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        prismaParanoid({
          metadata,
          auto: true,
        } as SoftDeleteOptions<string>);
        const allOps = extendedResult.query.$allModels?.$allOperations!;
        const params = {
          operation: 'create',
          model: 'User',
          args: { data: { id: '1' } },
          query: (_args: unknown) => Promise.resolve({ id: '1' }),
          __internalParams: {},
        };
        return allOps(params).then((result: unknown) => {
          expect(result).to.eql({ id: '1' });
        });
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });
  });

  describe('buildConfig (via extension)', () => {
    it('uses DEFAULT_ATTRIBUTE and DEFAULT_TYPE when defaultConfig is not provided', () => {
      const metadata = { models: [createMetadataModel('User', ['id', 'deletedAt'])] };
      const { client, extendedResult } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        prismaParanoid({
          metadata,
          auto: true,
        } as SoftDeleteOptions<string>);
        expect(extendedResult).to.have.nested.property('query.$allModels.$allOperations');
        const allOps = extendedResult.query.$allModels?.$allOperations!;
        const queryStub = (args: any) => {
          expect(args.where).to.have.property(DEFAULT_ATTRIBUTE);
          expect(args.data).to.have.property(DEFAULT_ATTRIBUTE);
          return Promise.resolve({});
        };
        const params = {
          operation: 'delete',
          model: 'User',
          args: { where: { id: 1 } },
          query: queryStub,
          __internalParams: { operation: 'delete', model: 'User', args: {}, query: queryStub },
        };
        return allOps(params);
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });

    it('uses defaultConfig.field when provided', () => {
      const metadata = { models: [createMetadataModel('User', ['id', 'archivedAt'])] };
      const { client, extendedResult } = createFakeClient();
      (Prisma.defineExtension as any) = (fn: (c: any) => any) => fn(client);
      try {
        prismaParanoid({
          metadata,
          auto: true,
          defaultConfig: { field: { name: 'archivedAt', type: 'date' as const } },
        } as SoftDeleteOptions<string>);
        const allOps = extendedResult.query.$allModels?.$allOperations!;
        let capturedArgs: any;
        const queryStub = (args: any) => {
          capturedArgs = args;
          return Promise.resolve({});
        };
        const params = {
          operation: 'delete',
          model: 'User',
          args: { where: { id: 1 } },
          query: queryStub,
          __internalParams: { operation: 'delete', model: 'User', args: {}, query: queryStub },
        };
        return allOps(params).then(() => {
          expect(capturedArgs.where).to.have.property('archivedAt');
          expect(capturedArgs.data).to.have.property('archivedAt');
        });
      } finally {
        (Prisma as any).defineExtension = Prisma.defineExtension;
      }
    });
  });

  describe('exports', () => {
    it('exports prismaParanoid as default and named', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const index = require('./index');
      expect(index.default).to.equal(index.prismaParanoid);
      expect(index.prismaParanoid).to.be.a('function');
    });

    it('re-exports types and AttributeTypes', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const index = require('./index');
      expect(index).to.have.property('AttributeTypes');
      expect(index.AttributeTypes).to.include.keys('date', 'boolean', 'other');
    });
  });
});
