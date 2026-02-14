#!/usr/bin/env node

const { mkdirSync, writeFileSync } = require('node:fs');
const { join, dirname, basename, extname } = require('node:path');

const { generatorHandler } = require('@prisma/generator-helper');

const VALID_EXTENSIONS = ['.ts', '.js'];
generatorHandler({
  onManifest() {
    return {
      prettyName: 'Prisma Metadata Generator',
    };
  },
  async onGenerate(options) {
    const data = options.dmmf.datamodel.models.map((model) => ({
      name: model.name,
      fields: model.fields,
      uniqueIndexes: model.uniqueIndexes,
    }));

    const outputFile = options.generator.output?.value;
    if (!outputFile) throw new Error('No output file defined for metadata generator');

    const pathDir = dirname(outputFile);
    const pathFile = basename(outputFile);

    if (!pathFile) throw new Error('No output file defined for metadata generator');
    const extension = extname(pathFile).toLowerCase();

    if (!VALID_EXTENSIONS.includes(extension)) throw new Error('Invalid output file extension for metadata generator');

    mkdirSync(pathDir, { recursive: true });

    switch (extension) {
      case '.ts': {
        const contents = [];
        contents.push(`import type { Prisma } from '@prisma/client';`);
        contents.push(`type Model = { name: string; fields: Prisma.DMMF.Field[], uniqueIndexes: Prisma.DMMF.uniqueIndex[] };`);
        contents.push(`const models: Model[] = ${JSON.stringify(data, null, 2)};`);
        contents.push(`const metadata = { models };`);
        contents.push(`export default metadata;`);
        writeFileSync(outputFile, contents.join('\n'), 'utf8');
        break;
      }
      case '.js':
        {
          const content = `module.exports = { models: ${JSON.stringify(data, null, 2)}};`;
          writeFileSync(outputFile, content);
        }
        break;
      default:
        throw new Error('Invalid output file extension for metadata generator');
    }
    {
      const contents = [];
      contents.push(`declare type MetadataModels = ${JSON.stringify(data, null, 2)};`);
      contents.push(`declare const metadata: { models: MetadataModels };`);
      const declaration = `export default metadata;`;
      writeFileSync(join(pathDir, pathFile.replace(extension, '.d.ts')), contents.join('\n'));
    }
  },
});
