import { table, getBorderCharacters } from 'table';
import type { ModelConfig } from '../types';
import type { LogLevel } from '../types';

const LOG_PREFIX = '[prisma-paranoid]';

function shouldLogTables(level: LogLevel): boolean {
  return level === 'info' || level === 'debug';
}

function resolveLogLevel(log: boolean | LogLevel | undefined): LogLevel {
  if (log === undefined || log === false) return 'silent';
  if (log === true) return 'info';
  return log;
}

/**
 * Logs a table of paranoid models and their field config. Only runs when log is enabled and level is info or debug.
 */
export function logParanoidModels(
  models: Record<string, ModelConfig>,
  logOption: boolean | LogLevel | undefined,
): void {
  const level = resolveLogLevel(logOption);
  if (level === 'silent' || !shouldLogTables(level)) return;

  const paranoidEntries = Object.entries(models).filter(([, config]) => config.paranoid === true);
  if (paranoidEntries.length === 0) {
    console.log(`${LOG_PREFIX} No paranoid models configured.`);
    return;
  }

  const rows: string[][] = paranoidEntries.map(([name, config]) => [
    name,
    config.field?.name ?? '—',
    String(config.field?.type ?? '—'),
  ]);

  const data: string[][] = [['Model', 'Paranoid field', 'Field type'], ...rows];

  const output = table(data, {
    border: getBorderCharacters('norc'),
    columns: [
      { alignment: 'left', paddingLeft: 1, paddingRight: 2 },
      { alignment: 'left', paddingLeft: 1, paddingRight: 2 },
      { alignment: 'left', paddingLeft: 1, paddingRight: 1 },
    ],
    drawHorizontalLine: (index, size) => index === 0 || index === 1 || index === size,
  });

  console.log('');
  console.log(`${LOG_PREFIX} Paranoid models (${paranoidEntries.length}):`);
  console.log(output);

  if (level === 'debug') {
    console.log(`${LOG_PREFIX} [debug] Default filter value: "not deleted" | Delete sets field to valueOnDelete().`);
  }
}
