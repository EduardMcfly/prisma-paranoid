import { expect } from 'chai';
import { AnimalGendersTypes, Prisma } from '@prisma/client';
import { deepSoftDelete, isParanoid } from './utils';
import { SoftDeleteContext } from './types';
import {
  DEFAULT_ATTRIBUTE,
  DEFAULT_TYPE,
  valuesOnDelete,
  valuesOnFilter,
} from './constants';

const dataModelsMap = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [m.name, m] as const),
);

const allModelsParanoid = Object.fromEntries(
  Prisma.dmmf.datamodel.models.map((m) => [m.name, true] as const),
);

function createCtx(models: Record<string, boolean>): SoftDeleteContext {
  return {
    config: {
      field: { name: DEFAULT_ATTRIBUTE, type: DEFAULT_TYPE },
      valueOnDelete: valuesOnDelete[DEFAULT_TYPE],
      valueOnFilter: valuesOnFilter[DEFAULT_TYPE],
    },
    models,
    dataModels: dataModelsMap,
  };
}

const UserNoParanoidModel: Prisma.DMMF.Model = {
  name: 'User',
  dbName: 'user',
  schema: '',
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  fields: [
    {
      name: 'id',
      type: 'ID',
      isId: true,
      hasDefaultValue: true,
      isList: false,
      isReadOnly: false,
      isRequired: true,
      isUnique: true,
      kind: 'scalar',
      isGenerated: true,
    },
  ],
};

describe('softDelete', () => {
  describe('isParanoid', () => {
    it('should return true when model is in options.models', () => {
      expect(isParanoid('User', createCtx({ User: true }))).to.eql(true);
    });

    it('should return false when model is not in options.models', () => {
      expect(isParanoid('User', createCtx({}))).to.eql(false);
    });
  });

  describe('deepSoftWhere', () => {
    const user = dataModelsMap.get('User');
    if (!user) throw new Error('User: No defined');
    const bovine = dataModelsMap.get('Bovine');
    if (!bovine) throw new Error('Bovine: No defined');
    const ctxUser = createCtx(allModelsParanoid);
    const ctxBovine = createCtx(allModelsParanoid);
    describe('Model User paranoid', () => {
      it('should return a where object with deletedAt: null', () => {
        const { where } = deepSoftDelete<Prisma.UserWhereInput, Prisma.UserInclude>(
          user,
          {},
          {},
          ctxUser,
        );
        expect(where).to.eql({
          deletedAt: null,
        });
      });
    });

    describe('Model User no paranoid', () => {
      it('should return a where object without deletedAt when model not in options', () => {
        const { where } = deepSoftDelete<Prisma.UserWhereInput, Prisma.UserInclude>(
          UserNoParanoidModel,
          {},
          undefined,
          createCtx({}),
        );
        expect(where).to.eql({});
      });
    });

    describe('where', () => {
      describe('user', () => {
        describe('userRoles.user.commegnts', () => {
          it('should return a where object with deletedAt: null', () => {
            const { where } = deepSoftDelete<
              Prisma.UserWhereInput,
              Prisma.UserInclude
            >(
              user,
              {
                userRoles: {
                  every: {
                    roleId: 1,
                    user: { lastName: '' },
                  },
                },
              },
              {},
              ctxUser,
            );
            expect(where).to.eql({
              deletedAt: null,
              userRoles: {
                every: {
                  roleId: 1,
                  deletedAt: null,
                  user: { lastName: '', deletedAt: null },
                },
              },
            });
          });
        });
      });
      describe('bovine', () => {
        describe('farm', () => {
          it('should return a where object with deletedAt: null', () => {
            const { where } = deepSoftDelete<
              Prisma.BovineWhereInput,
              Prisma.BovineInclude
            >(
              bovine,
              {
                farm: { id: 1 },
              },
              {},
              ctxBovine,
            );
            expect(where).to.eql({
              farm: { id: 1, deletedAt: null },
              deletedAt: null,
            } as Prisma.BovineWhereInput);
          });
        });
      });

      it('With OR -> AND -> NOT', () => {
        const { where } = deepSoftDelete<
          Prisma.BovineWhereInput,
          Prisma.BovineInclude
        >(
          bovine,
          {
            farm: { id: 1 },
            OR: [
              {
                bovinePurposes: {
                  every: {
                    bovineId: 1,
                    AND: {
                      bovine: { id: 1 },
                      NOT: [{ bovinePurposeType: { id: 1 } }],
                    },
                  },
                },
              },
            ],
            animalGender: {
              is: {
                code: { equals: AnimalGendersTypes.Female },
              },
            },
          },
          {},
          ctxBovine,
        );
        const bovineWhereInput: Prisma.BovineWhereInput = {
          farm: { id: 1, deletedAt: null },
          deletedAt: null,
          OR: [
            {
              bovinePurposes: {
                every: {
                  bovineId: 1,
                  deletedAt: null,
                  AND: {
                    bovine: {
                      id: 1,
                      deletedAt: null,
                    },
                    deletedAt: null,
                    NOT: [
                      {
                        bovinePurposeType: { id: 1, deletedAt: null },
                        deletedAt: null,
                      },
                    ],
                  },
                },
              },
              deletedAt: null,
            },
          ],
          animalGender: {
            is: {
              code: { equals: AnimalGendersTypes.Female },
              deletedAt: null,
            },
          },
        };
        expect(where).to.eql(bovineWhereInput);
      });

      it('With where is', () => {
        const { where } = deepSoftDelete<
          Prisma.BovineWhereInput,
          Prisma.BovineInclude
        >(
          bovine,
          {
            animalGender: {
              is: {
                code: { equals: AnimalGendersTypes.Female },
              },
            },
          },
          {},
          ctxBovine,
        );
        const bovineWhereInput: Prisma.BovineWhereInput = {
          animalGender: {
            is: {
              code: { equals: AnimalGendersTypes.Female },
              deletedAt: null,
            },
          },
          deletedAt: null,
        };
        expect(where).to.eql(bovineWhereInput);
      });

      it('With where isNot', () => {
        const { where } = deepSoftDelete<
          Prisma.BovineWhereInput,
          Prisma.BovineInclude
        >(
          bovine,
          {
            animalGender: {
              isNot: {
                code: { equals: AnimalGendersTypes.Female },
              },
            },
          },
          {},
          ctxBovine,
        );
        const bovineWhereInput: Prisma.BovineWhereInput = {
          animalGender: {
            isNot: {
              code: { equals: AnimalGendersTypes.Female },
              deletedAt: null,
            },
          },
          deletedAt: null,
        };
        expect(where).to.eql(bovineWhereInput);
      });
    });

    describe('include', () => {
      describe('user', () => {
        describe('userRoles', () => {
          it('should return a where object with deletedAt: null', () => {
            const { where, include } = deepSoftDelete<
              Prisma.UserWhereInput,
              Prisma.UserInclude
            >(
              user,
              {},
              {
                userRoles: true,
              },
              ctxUser,
            );
            expect(where).to.eql({
              deletedAt: null,
            } as Prisma.UserWhereInput);
            expect(include).to.eql({
              userRoles: {
                where: { deletedAt: null },
              },
            } as Prisma.UserInclude);
          });
          describe('userRoles.user.comments', () => {
            it('should return a where object with deletedAt: null', () => {
              const { where, include } = deepSoftDelete<
                Prisma.UserWhereInput,
                Prisma.UserInclude
              >(
                user,
                {},
                {
                  userRoles: {
                    include: {
                      userRolePermissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
                ctxUser,
              );
              expect(where).to.eql({
                deletedAt: null,
              } as Prisma.UserWhereInput);
              const userInclude: Prisma.UserInclude = {
                userRoles: {
                  include: {
                    userRolePermissions: {
                      include: { permission: true },
                      where: {
                        deletedAt: null,
                        permission: { deletedAt: null },
                      },
                    },
                  },
                  where: {
                    deletedAt: null,
                  },
                },
              };
              expect(include).to.eql(userInclude);
            });
          });
        });
      });

      it('With AND -> NOT', () => {
        const { where, include } = deepSoftDelete<
          Prisma.BovineWhereInput,
          Prisma.BovineInclude
        >(
          bovine,
          {},
          {
            bovinePurposes: {
              where: {
                bovineId: 1,
                AND: {
                  bovine: { id: 1 },
                  NOT: [{ bovinePurposeType: { id: 1 } }],
                },
              },
            },
          },
          ctxBovine,
        );
        const bovineWhereInput: Prisma.BovineWhereInput = {
          deletedAt: null,
        };

        expect(where).to.eql(bovineWhereInput);

        const bovineInclude: Prisma.BovineInclude = {
          bovinePurposes: {
            where: {
              bovineId: 1,
              deletedAt: null,
              AND: {
                bovine: {
                  id: 1,
                  deletedAt: null,
                },
                deletedAt: null,
                NOT: [
                  {
                    bovinePurposeType: { id: 1, deletedAt: null },
                    deletedAt: null,
                  },
                ],
              },
            },
          },
        };
        expect(include).to.eql(bovineInclude);
      });
    });

    describe('where with include', () => {
      describe('bovine', () => {
        describe('farm', () => {
          it('Where object with deletedAt: null', async () => {
            const deletedAt = new Date();
            const getFarmPhotosInclude =
              (): Prisma.FarmPhotoInclude => ({
                farm: {
                  select: { id: true },
                  include: {
                    bovines: {
                      where: { deletedAt, id: 1 },
                    },
                  },
                },
              });
            const { where, include } = deepSoftDelete<
              Prisma.BovineWhereInput,
              Prisma.BovineInclude
            >(
              bovine,
              {
                farm: { id: 1 },
              },
              {
                farm: {
                  include: {
                    farmPhotos: {
                      include: getFarmPhotosInclude(),
                    },
                  },
                },
              },
              ctxBovine,
            );
            const bovineWhereInput: Prisma.BovineWhereInput = {
              farm: {
                id: 1,
                deletedAt: null,
              },
              deletedAt: null,
            };
            expect(where).to.eql(bovineWhereInput);
            const bovineInclude: Prisma.BovineInclude = {
              farm: {
                include: {
                  farmPhotos: {
                    include: getFarmPhotosInclude(),
                    where: {
                      deletedAt: null,
                      farm: { deletedAt: null },
                    },
                  },
                },
              },
            };
            expect(include).to.eql(bovineInclude);
          });
        });
      });

      it('With OR -> AND -> NOT', () => {
        const { where, include } = deepSoftDelete<
          Prisma.BovineWhereInput,
          Prisma.BovineInclude
        >(
          bovine,
          {
            farm: { id: 1 },
            OR: [
              {
                bovinePurposes: {
                  every: {
                    bovineId: 1,
                    AND: {
                      bovine: { id: 1 },
                      NOT: [{ bovinePurposeType: { id: 1 } }],
                    },
                  },
                },
              },
            ],
          },
          {
            bovinePurposes: {
              where: {
                bovineId: 1,
                AND: {
                  bovine: { id: 1 },
                  NOT: [{ bovinePurposeType: { id: 1 } }],
                },
              },
            },
          },
          ctxBovine,
        );
        expect(where).to.have.property('farm').eql({ id: 1, deletedAt: null });
        expect(where).to.have.property('deletedAt', null);
        expect(where).to.have.property('OR').that.is.an('array').with.lengthOf(1);
        expect(where.OR![0]).to.have.property('deletedAt', null);

        const bovineInclude: Prisma.BovineInclude = {
          bovinePurposes: {
            where: {
              bovineId: 1,
              deletedAt: null,
              AND: {
                bovine: {
                  id: 1,
                  deletedAt: null,
                },
                deletedAt: null,
                NOT: [
                  {
                    bovinePurposeType: { id: 1, deletedAt: null },
                    deletedAt: null,
                  },
                ],
              },
            },
          },
        };

        expect(include).to.eql(bovineInclude);
      });
    });
  });
});
