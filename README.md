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

**prisma-paranoid** is a [Prisma Client extension](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions) that implements the **paranoid** (soft delete) pattern. You choose which models use soft delete via the `models` option or `auto: true` (see [Usage](#usage)). For those models:

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

Which models are paranoid is set when you create the extension: use **`models`** or **`auto: true`** (see [Configuration](#configuration)).

## Configuration

`prismaParanoid()` accepts a single options object with the following properties:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| **`metadata`** | `{ models: MetadataModel[] }` | Yes | Output of the metadata generator. Import from the path set in your schema (e.g. `./prisma/generated/metadata`). |
| **`models`** | `Record<string, ModelConfig>` | No* | Map of model names to their config. Each entry can set `paranoid`, `field`, `valueOnDelete`, `valueOnFilter`. Ignored when `auto: true`. *Required if `auto` is not `true`. |
| **`auto`** | `boolean` | No | When `true`, every model that has the paranoid field (e.g. `deletedAt`) is treated as paranoid. You can still pass `models` to override specific models. Default: `false`. |
| **`defaultConfig`** | `SoftDeleteDefaultConfig` | No | Defaults for all models: field name/type and callbacks for delete/filter. Overridable per model in `models`. |
| **`log`** | `boolean \| LogLevel` | No | Enable logging of paranoid models and their config. `true` = `'info'`, `false` or `'silent'` = disabled. Levels: `'silent'`, `'info'`, `'debug'`, `'warn'`, `'error'`. Default: `false`. |

### ModelConfig (per model)

When you pass `models`, each value can include:

| Property | Type | Description |
|----------|------|-------------|
| **`paranoid`** | `boolean` | Whether this model uses soft delete. |
| **`field`** | `{ name: string; type: 'date' \| 'boolean' \| 'other' }` | Override the paranoid field name or type for this model. |
| **`valueOnDelete`** | `() => Date \| string \| number \| boolean \| null` | Value set when "deleting". Overrides `defaultConfig`. |
| **`valueOnFilter`** | `() => ...` | Value that means "not deleted" in queries. Overrides `defaultConfig`. |

### defaultConfig (global defaults)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **`field.name`** | `string` | `'deletedAt'` | Name of the column used for soft delete. |
| **`field.type`** | `'date' \| 'boolean' \| 'other'` | `'date'` | Type of the field. With `'other'` you must set both `valueOnDelete` and `valueOnFilter`. |
| **`valueOnDelete`** | `() => ValidValue` | `() => new Date()` (for date) | Value written to the field when a record is "deleted". |
| **`valueOnFilter`** | `() => ValidValue` | `() => null` (for date) | Value used in filters to mean "not deleted" (e.g. `where: { deletedAt: null }`). |

### Logging

Set **`log`** to `true` or a level (`'info'` | `'debug'`) to print a table of paranoid models and their field config when the extension is applied. Useful to verify which models use soft delete and with which attribute.

```ts
prismaParanoid({
  metadata,
  auto: true,
  log: true,        // or 'info' — prints table of paranoid models
  // log: 'debug',  // table + short debug hint
  // log: false,    // disabled (default)
});
```

Example output:

```
[prisma-paranoid] Paranoid models (3):
┌────────┬──────────────────┬────────────┐
│ Model  │ Paranoid field    │ Field type │
├────────┼──────────────────┼────────────┤
│ User   │ deletedAt        │ date       │
│ Post   │ deletedAt        │ date       │
│ Comment│ archivedAt       │ date       │
└────────┴──────────────────┴────────────┘
```

---

## Usage

Import the **generated metadata** and pass it to `prismaParanoid()` with **`models`** or **`auto: true`** (see [Configuration](#configuration)). Then extend your Prisma client:

```ts
import { PrismaClient } from '@prisma/client';
import prismaParanoid from 'prisma-paranoid';
import metadata from './prisma/generated/metadata'; // path from your generator output

// Only these models use soft delete (each needs paranoid: true)
const prisma = new PrismaClient().$extends(
  prismaParanoid({
    metadata,
    models: {
      User: { paranoid: true },
      Post: { paranoid: true },
    },
  }),
);

// Normal usage — “deleted” rows are hidden and delete becomes update
const users = await prisma.user.findMany();
const deleted = await prisma.user.delete({ where: { id: '…' } }); // sets deletedAt
```

### Automatic detection (`auto: true`)

Every model that has the paranoid field (e.g. `deletedAt`) is treated as paranoid. You can still pass `models` to override one model (e.g. `paranoid: false`):

```ts
import { PrismaClient } from '@prisma/client';
import prismaParanoid from 'prisma-paranoid';
import metadata from './prisma/generated/metadata';

const prisma = new PrismaClient().$extends(prismaParanoid({ metadata, auto: true }));

const users = await prisma.user.findMany();   // User has deletedAt → soft delete applied
const posts = await prisma.post.findMany();   // Post has deletedAt → soft delete applied
```

### Custom field and values (`defaultConfig`)

Use a different field name or type (e.g. `deleted: Boolean`), or custom values on delete/filter:

```ts
import prismaParanoid from 'prisma-paranoid';
import metadata from './prisma/generated/metadata';

const prisma = new PrismaClient().$extends(
  prismaParanoid({
    metadata,
    auto: true,
    defaultConfig: {
      field: {
        name: 'deletedAt', // default
        type: 'date',     // 'date' | 'boolean' | 'other'
      },
      valueOnDelete: () => new Date(),
      valueOnFilter: () => null,
    },
  }),
);
```

For `field.type: 'other'` you must provide both `valueOnDelete` and `valueOnFilter` (e.g. number or string).

### Per-model overrides

Override the field or paranoid flag for specific models:

```ts
prismaParanoid({
  metadata,
  auto: true,
  models: {
    // This model uses a different field name
    AuditLog: { field: { name: 'archivedAt', type: 'date' }, paranoid: true },
    // Disable soft delete for this model even though it has deletedAt
    Session: { paranoid: false },
  },
  defaultConfig: {
    field: { name: 'deletedAt', type: 'date' },
    valueOnDelete: () => new Date(),
    valueOnFilter: () => null,
  },
});
```

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
