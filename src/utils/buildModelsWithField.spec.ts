import { expect } from 'chai';
import { AttributeTypes } from '../constants';
import type { MetadataModel, SoftDeleteConfig, SoftDeleteOptions } from '../types';
import { buildModelsWithField } from './buildModelsWithField';

function createModel(name: string, fieldNames: string[]): MetadataModel {
  return {
    name,
    fields: fieldNames.map((name) => ({
      name,
      type: 'String',
      isId: name === 'id',
      isList: false,
      isRequired: name === 'id',
      kind: 'scalar' as const,
      hasDefaultValue: false,
      isReadOnly: false,
      isUnique: false,
      isGenerated: false,
    })),
    uniqueIndexes: [],
  };
}

function createConfig(fieldName = 'deletedAt'): SoftDeleteConfig {
  return {
    field: { name: fieldName, type: AttributeTypes.date },
    valueOnDelete: () => new Date(),
    valueOnFilter: () => null,
  };
}

describe('buildModelsWithField', () => {
  describe('when auto is false', () => {
    it('returns options.models with defaultConfig merged into each model', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: false,
        models: {
          User: { paranoid: true },
          Post: { paranoid: false },
        },
      };
      const dataModelsMap = new Map<string, MetadataModel>([
        ['User', createModel('User', ['id', 'deletedAt'])],
        ['Post', createModel('Post', ['id'])],
      ]);
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(true);
      expect(result.Post?.paranoid).to.eql(false);
      expect(result.User?.field).to.eql({ name: 'deletedAt', type: AttributeTypes.date });
      expect(result.Post?.field).to.eql({ name: 'deletedAt', type: AttributeTypes.date });
      expect(result.User?.valueOnDelete).to.eql(config.valueOnDelete);
      expect(result.User?.valueOnFilter).to.eql(config.valueOnFilter);
    });

    it('returns empty object when options.models is undefined', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: false,
      };
      const dataModelsMap = new Map<string, MetadataModel>([['User', createModel('User', ['id', 'deletedAt'])]]);
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result).to.eql({});
    });
  });

  describe('when auto is true', () => {
    it('sets paranoid true for models that have the default field (deletedAt)', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
      };
      const dataModelsMap = new Map<string, MetadataModel>([
        ['User', createModel('User', ['id', 'email', 'deletedAt'])],
        ['Post', createModel('Post', ['id', 'title'])],
        ['Comment', createModel('Comment', ['id', 'deletedAt'])],
      ]);
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(true);
      expect(result.Post?.paranoid).to.eql(false);
      expect(result.Comment?.paranoid).to.eql(true);
    });

    it('uses custom default field name from config when no per-model override', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
      };
      const dataModelsMap = new Map<string, MetadataModel>([
        ['User', createModel('User', ['id', 'deleted'])],
        ['Post', createModel('Post', ['id', 'deletedAt'])],
      ]);
      const config = createConfig('deleted');

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(true);
      expect(result.Post?.paranoid).to.eql(false);
    });

    it('respects explicit paranoid: false override in options.models for a model that has the field', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
        models: {
          User: { paranoid: false },
          Post: { paranoid: true },
        },
      };
      const dataModelsMap = new Map<string, MetadataModel>([
        ['User', createModel('User', ['id', 'deletedAt'])],
        ['Post', createModel('Post', ['id', 'deletedAt'])],
      ]);
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(false);
      expect(result.Post?.paranoid).to.eql(true);
    });

    it('respects explicit paranoid: true override for a model that does not have the field', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
        models: {
          User: { paranoid: true },
        },
      };
      const dataModelsMap = new Map<string, MetadataModel>([['User', createModel('User', ['id', 'email'])]]);
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(true);
    });

    it('uses per-model field name from options.models to determine hasField', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
        models: {
          User: { field: { name: 'archivedAt', type: AttributeTypes.date }, paranoid: true },
        },
      };
      const dataModelsMap = new Map<string, MetadataModel>([
        ['User', createModel('User', ['id', 'archivedAt'])],
        ['Post', createModel('Post', ['id', 'deletedAt'])],
      ]);
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(true);
      expect(result.User?.field?.name).to.eql('archivedAt');
      expect(result.Post?.paranoid).to.eql(true);
      expect(result.Post?.field?.name).to.eql('deletedAt');
    });

    it('merges defaultConfig (valueOnDelete, valueOnFilter) into each model config', () => {
      const valueOnDelete = () => new Date();
      const valueOnFilter = () => null;
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
      };
      const dataModelsMap = new Map<string, MetadataModel>([['User', createModel('User', ['id', 'deletedAt'])]]);
      const config: SoftDeleteConfig = {
        field: { name: 'deletedAt', type: AttributeTypes.date },
        valueOnDelete,
        valueOnFilter,
      };

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result.User?.paranoid).to.eql(true);
      expect(result.User?.field?.name).to.eql('deletedAt');
      expect(result.User?.field?.type).to.eql(AttributeTypes.date);
      expect(result.User?.valueOnDelete).to.eql(valueOnDelete);
      expect(result.User?.valueOnFilter).to.eql(valueOnFilter);
    });

    it('returns empty object when dataModelsMap is empty', () => {
      const options: SoftDeleteOptions<string> = {
        metadata: { models: [] },
        auto: true,
      };
      const dataModelsMap = new Map<string, MetadataModel>();
      const config = createConfig();

      const result = buildModelsWithField({ options, dataModelsMap, config });

      expect(result).to.eql({});
    });
  });
});
