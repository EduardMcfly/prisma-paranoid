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

  const mergeDefaultIntoModel = (modelConfig: ModelConfig | undefined, paranoid: boolean): ModelConfig => ({
    ...defaultConfig,
    ...modelConfig,
    field: modelConfig?.field ?? defaultField,
    paranoid,
  });

  if (!auto) {
    const base = models ?? {};
    const out: Record<string, ModelConfig> = {};
    for (const [name, modelConfig] of Object.entries(base) as [string, ModelConfig][]) {
      out[name] = mergeDefaultIntoModel(modelConfig, modelConfig?.paranoid ?? false);
    }
    return out;
  }

  const out: Record<string, ModelConfig> = {};
  for (const [name, model] of dataModelsMap) {
    const modelConfig = models?.[name];
    const fieldName = modelConfig?.field?.name ?? defaultField.name;
    const hasField = model.fields.some((f) => f.name === fieldName);
    out[name] = mergeDefaultIntoModel(modelConfig, modelConfig?.paranoid ?? hasField);
  }
  return out;
}
