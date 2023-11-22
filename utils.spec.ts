import { expect } from 'chai';
import { AnimalGendersTypes, Prisma } from '@prisma/client';
import { deepSoftDelete, isParanoid } from './utils';
import { dataModels } from './constants';

const UserParanoidModel: Prisma.DMMF.Model = {
  name: 'User',
  dbName: 'user',
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
    {
      name: 'deletedAt',
      type: 'DateTime',
      isId: false,
      hasDefaultValue: false,
      isList: false,
      isReadOnly: false,
      isRequired: false,
      isUnique: false,
      kind: 'scalar',
      isGenerated: false,
    },
  ],
};

const UserNoParanoidModel: Prisma.DMMF.Model = {
  name: 'User',
  dbName: 'user',
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
    it('should return true if model has deletedAt field', () => {
      expect(isParanoid(UserParanoidModel)).to.eql(true);
    });

    it('should return false if model has no deletedAt field', () => {
      expect(isParanoid(UserNoParanoidModel)).to.eql(false);
    });
  });

  describe('deepSoftWhere', () => {
    const user = dataModels.get(Prisma.ModelName.User);
    if (!user)
      throw new Error(`${Prisma.ModelName.User}: No defined`);
    const bovine = dataModels.get(Prisma.ModelName.Bovine);
    if (!bovine)
      throw new Error(`${Prisma.ModelName.Bovine}: No defined`);
    describe('Model User paranoid', () => {
      it('should return a where object with deletedAt: null', () => {
        const { where } = deepSoftDelete<
          Prisma.UserWhereInput,
          Prisma.UserInclude
        >(user, {}, {});
        expect(where).to.eql({
          deletedAt: null,
        });
      });
    });

    describe('Model User no paranoid', () => {
      it('should return a where object with deletedAt: null', () => {
        const { where } = deepSoftDelete<
          Prisma.UserWhereInput,
          Prisma.UserInclude
        >(UserNoParanoidModel, {});
        expect(where).to.eql({});
      });
    });

    describe('where', () => {
      describe('user', () => {
        describe('messages.user.commegnts', () => {
          it('should return a where object with deletedAt: null', () => {
            const { where } = deepSoftDelete<
              Prisma.UserWhereInput,
              Prisma.UserInclude
            >(
              user,
              {
                messages: {
                  every: {
                    text: {
                      in: [''],
                    },
                    user: { lastName: '' },
                  },
                },
              },
              {},
            );
            expect(where).to.eql({
              deletedAt: null,
              messages: {
                every: {
                  text: {
                    in: '',
                  },
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
        describe('messages', () => {
          it('should return a where object with deletedAt: null', () => {
            const { where, include } = deepSoftDelete<
              Prisma.UserWhereInput,
              Prisma.UserInclude
            >(
              user,
              {},
              {
                messages: true,
              },
            );
            expect(where).to.eql({
              deletedAt: null,
            } as Prisma.UserWhereInput);
            expect(include).to.eql({
              messages: {
                where: { deletedAt: null },
              },
            } as Prisma.UserInclude);
          });
          describe('messages.user.comments', () => {
            it('should return a where object with deletedAt: null', () => {
              const { where, include } = deepSoftDelete<
                Prisma.UserWhereInput,
                Prisma.UserInclude
              >(
                user,
                {},
                {
                  messages: {
                    include: {
                      comments: {
                        include: {
                          user: true,
                        },
                      },
                    },
                  },
                },
              );
              expect(where).to.eql({
                deletedAt: null,
              } as Prisma.UserWhereInput);
              const userInclude: Prisma.UserInclude = {
                messages: {
                  include: {
                    comments: {
                      include: { user: true },
                      where: {
                        deletedAt: null,
                        user: {
                          deletedAt: null,
                        },
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
  });
});
