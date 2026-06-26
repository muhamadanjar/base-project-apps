import type { LayerType, LayerConfig } from './types';
import type { LayerAdapter } from './adapters/types';

export class LayerFactory {
  private adapters = new Map<LayerType, LayerAdapter>();

  constructor() {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters(): void {
    // Placeholder — will be populated as adapters are created
    // For now, no adapters registered (tests expect getAdapter to return undefined for unknown)
  }

  register(type: LayerType, adapter: LayerAdapter): void {
    this.adapters.set(type, adapter);
  }

  createLayer(config: LayerConfig, onClick?: (info: any) => void): any | null {
    const adapter = this.getAdapter(config.layer_type);
    if (!adapter) return null;
    return adapter.createDeckLayer(config, onClick);
  }

  getAdapter(type: LayerType): LayerAdapter | undefined {
    return this.adapters.get(type);
  }
}

export const layerFactory = new LayerFactory();
