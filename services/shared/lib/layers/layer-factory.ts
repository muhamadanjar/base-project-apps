import type { LayerType, LayerConfig } from './types';
import type { LayerAdapter } from './adapters/types';
import { TileAdapter } from './adapters/tile-adapter';

export class LayerFactory {
  private adapters = new Map<LayerType, LayerAdapter>();

  constructor() {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters(): void {
    this.register('tile', new TileAdapter());
    this.register('vector', new TileAdapter());
    this.register('mbtiles', new TileAdapter());
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
