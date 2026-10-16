import { expect } from 'chai';
import { Prisma } from '@prisma/client';
import metadata from '../../prisma/generated/metadata';
import { DEFAULT_ATTRIBUTE, DEFAULT_TYPE, valuesOnDelete, valuesOnFilter } from '../constants';
import { SoftDeleteContext } from '../types';
import { augmentOptionalRelationSelects, hideDeletedOptionalRelations } from './hideDeletedOptionalRelations';

const dataModels = new Map(metadata.models.map((model) => [model.name, model]));
const bovine = dataModels.get('Bovine');
if (!bovine) throw new Error('Bovine: No defined');

const ctx: SoftDeleteContext = {
  config: {
    field: { name: DEFAULT_ATTRIBUTE, type: DEFAULT_TYPE },
    valueOnDelete: valuesOnDelete[DEFAULT_TYPE],
    valueOnFilter: valuesOnFilter[DEFAULT_TYPE],
  },
  models: Object.fromEntries(Prisma.dmmf.datamodel.models.map((model) => [model.name, { paranoid: true }] as const)),
  dataModels,
};

describe('hideDeletedOptionalRelations', () => {
  it('nulls an included optional relation that is soft-deleted and keeps the parent', () => {
    const row = {
      id: 1,
      animalGender: { id: 9, code: 'F', deletedAt: new Date('2026-01-01') },
    };

    const result = hideDeletedOptionalRelations(row, bovine, { animalGender: true }, ctx);

    expect(result).to.eql({ id: 1, animalGender: null });
  });

  it('keeps an included optional relation that is not deleted', () => {
    const row = {
      id: 1,
      animalGender: { id: 9, code: 'F', deletedAt: null },
    };

    const result = hideDeletedOptionalRelations(row, bovine, { animalGender: true }, ctx);

    expect(result.animalGender).to.eql(row.animalGender);
  });

  it('loads deletedAt on a partial select only to detect a soft delete, then removes it', () => {
    const select: Prisma.BovineSelect = {
      animalGender: { select: { id: true, code: true } },
    };
    augmentOptionalRelationSelects(bovine, select, ctx);

    const genderSelect = select.animalGender;
    if (!genderSelect || genderSelect === true || !('select' in genderSelect) || !genderSelect.select) {
      throw new Error('expected a select on animalGender');
    }
    expect((genderSelect.select as { deletedAt?: boolean }).deletedAt).to.eql(true);

    const row = {
      id: 1,
      animalGender: { id: 9, code: 'F', deletedAt: null as Date | null },
    };
    const result = hideDeletedOptionalRelations(row, bovine, select, ctx);

    expect(result.animalGender).to.eql({ id: 9, code: 'F' });
  });
});
