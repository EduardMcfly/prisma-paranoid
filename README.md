<p align="center">
  <img width="100px" src="https://raw.githubusercontent.com/EduardMcfly/prisma-paranoid/main/.github/images/favicon512x512-npm.png" align="center" alt="prisma-paranoid" />
  <h2 align="center">prisma-paranoid</h2>
  <p align="center">Prisma extension for soft delete (paranoid pattern)</p>
  <p align="center">
    <a href="https://github.com/EduardMcfly/prisma-paranoid/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/EduardMcfly/prisma-paranoid?style=flat&color=336791" />
    </a>
    <a href="https://github.com/EduardMcfly/prisma-paranoid/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/EduardMcfly/prisma-paranoid?style=flat&color=336791" />
    </a>
    <a href="https://www.npmjs.com/package/prisma-paranoid">
      <img alt="npm weekly downloads" src="https://img.shields.io/npm/dw/prisma-paranoid?style=flat&color=336791" />
    </a>
    <a href="https://www.npmjs.com/package/prisma-paranoid">
      <img alt="npm total downloads" src="https://img.shields.io/npm/dt/prisma-paranoid?color=336791&label=Total%20downloads" />
    </a>
    <a href="https://github.com/EduardMcfly/prisma-paranoid/releases">
      <img alt="GitHub release" src="https://img.shields.io/github/release/EduardMcfly/prisma-paranoid.svg?style=flat&color=336791" />
    </a>
    <br />
    <a href="https://codecov.io/gh/EduardMcfly/prisma-paranoid">
      <img alt="codecov" src="https://codecov.io/gh/EduardMcfly/prisma-paranoid/branch/main/graph/badge.svg?token=Q9fr548J0D" />
    </a>
    <br />
    <a href="https://github.com/EduardMcfly/prisma-paranoid/issues/new/choose">Report Bug</a>
    ·
    <a href="https://github.com/EduardMcfly/prisma-paranoid/issues/new/choose">Request Feature</a>
  </p>

---

## Overview

**prisma-paranoid** is a [Prisma Client extension](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions) that implements the **paranoid** (soft delete) pattern. You choose which models use soft delete via the `models` option or `allModels: true` (see [Usage](#usage)). For those models:

- **delete** / **deleteMany** → perform an update setting the paranoid field (e.g. `deletedAt`) instead of actually deleting rows.
- **findUnique**, **findFirst**, **findMany**, **findUniqueOrThrow**, **findFirstOrThrow**, **groupBy** → automatically filter out “deleted” records (e.g. `deletedAt: null`) and apply the same logic recursively to relations.

So you keep data in the database but hide it from normal reads and turn deletes into updates.

## Prerequisites

- Node.js 18+
- [Prisma](https://www.prisma.io/) 5+ and `@prisma/client` 5+
- Generated Prisma Client (`prisma generate`)
- **Metadata generator** — you must add the `prisma-metadata-generator` to your schema and run `prisma generate` (see [Schema setup](#schema-setup))

## Installation

```bash
npm install prisma-paranoid
# or
yarn add prisma-paranoid
pnpm add prisma-paranoid
```

## Schema setup

1. **Add the metadata generator (obligatory).** The extension needs runtime metadata from your schema. Add this generator and run `prisma generate`:

```prisma
generator metadata {
  provider = "prisma-metadata-generator"
  output   = "./prisma/generated/metadata.ts"
}
```

2. Add a field to store the “deleted” state on each model that should support soft delete. The default field name is **`deletedAt`** (DateTime, optional).

Example:

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  deletedAt DateTime? // default paranoid field name
  // ... other fields
}
```

Which models are treated as paranoid is controlled when you create the extension: pass **`models`** (e.g. `{ User: true, Post: true }`) or set **`allModels: true`** so that every model that has the paranoid field is treated as paranoid. If you use another field name or type (e.g. `deleted: Boolean`), pass `defaultConfig` when creating the extension (see [Custom options](#custom-options)).

## Usage

Import the **generated metadata** (obligatory) and pass it to `softDelete()`. You must also pass **`models`** (which models use soft delete) or **`allModels: true`** (every model that has the paranoid field). Then extend your Prisma client and use it as usual:

```ts
import { PrismaClient } from '@prisma/client';
import { softDelete } from 'prisma-paranoid';
import metadata from './prisma/generated/metadata'; // path from your generator output

// Option A: only these models use soft delete
const prisma = new PrismaClient().$extends(softDelete({ metadata, models: { User: true, Post: true } }));

// Option B: every model that has the paranoid field (e.g. deletedAt) uses soft delete
// const prisma = new PrismaClient().$extends(softDelete({ metadata, allModels: true }));

// Normal usage — “deleted” rows are hidden and delete becomes update
const users = await prisma.user.findMany();
const deleted = await prisma.user.delete({ where: { id: '…' } }); // sets deletedAt
```

### Custom options

You can customize the paranoid field name and type, and the values used on “delete” and on “filter”:

```ts
import { softDelete } from 'prisma-paranoid';
import metadata from './prisma/generated/metadata';

const prisma = new PrismaClient().$extends(
  softDelete({
    metadata,
    defaultConfig: {
      field: {
        name: 'deletedAt', // default
        type: 'date', // 'date' | 'boolean' | 'other'
      },
      valueOnDelete: () => new Date(),
      valueOnFilter: () => null,
    },
  }),
);
```

For `type: 'other'` you must provide both `valueOnDelete` and `valueOnFilter` (e.g. a number or string).

## Scripts

- `npm run build` — Compile TypeScript to `lib/`.
- `npm test` — Run tests with Jest.
- `npm run lint` — Lint with ESLint.
- `npm run lint:fix` — Fix lint issues.
- `npm run format` — Format with Prettier.

## Project structure

- `src/` — TypeScript source.
- `lib/` — Compiled JS and declarations (generated by `npm run build`).

## Publishing

1. `npm login`
2. Update metadata in `package.json` if needed; `files` includes `lib/**/*`.
3. `npm version patch|minor|major`
4. `npm publish`

Or create a GitHub Release and use the publish workflow (requires `NPM_TOKEN`).

## Contributing

Contributions, issues, and feature requests are welcome:  
<https://github.com/EduardMcfly/prisma-paranoid/issues>

## License

Copyright © 2025 [@EduardMcfly](https://github.com/EduardMcfly).  
This project is [MIT](LICENSE.md) licensed.
