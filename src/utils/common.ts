import { DEFAULT_ATTRIBUTE } from '../constants';
import { SoftDeleteContext, SoftDeleteConfig, FieldInclude } from '../types';

export const isParanoid = (modelName: string, ctx: SoftDeleteContext): boolean =>
  ctx.models[modelName]?.paranoid === true;

export const uncapitalize = <T extends string>(str: T) =>
  (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<T>;

export function getParanoidField(config: SoftDeleteConfig | undefined): string {
  return config?.field?.name ?? DEFAULT_ATTRIBUTE;
}

export function parseInclude(fieldInclude: boolean | FieldInclude | null | undefined) {
  return typeof fieldInclude === 'object' ? fieldInclude : undefined;
}
