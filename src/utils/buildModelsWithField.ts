import { MetadataModel, ModelConfig, SoftDeleteConfig, SoftDeleteOptions } from '../types';

interface BuildModelsWithFieldArgs<ModelName extends string> {
  options: SoftDeleteOptions<ModelName>;
  dataModelsMap: Map<ModelName, MetadataModel>;
  config: SoftDeleteConfig;
}

export function buildModelsWithField<ModelName extends string>({
  options,
  dataModelsMap,
  config,
}: BuildModelsWithFieldArgs<ModelName>): Record<string, ModelConfig> {
  const { auto, models } = options;
  const { field: defaultField, ...defaultConfig } = config;

  if (!auto) return models ?? {};

  const out: Record<string, ModelConfig> = {};
  for (const [name, model] of dataModelsMap) {
    const modelConfig = models?.[name];
    const fieldName = modelConfig?.field?.name ?? defaultField.name;
    const hasField = model.fields.some((f) => f.name === fieldName);
    const config: ModelConfig = {
      ...defaultConfig,
      field: modelConfig?.field ?? defaultField,
      paranoid: modelConfig?.paranoid ?? hasField,
    };
    out[name] = config;
  }
  return out;
}
