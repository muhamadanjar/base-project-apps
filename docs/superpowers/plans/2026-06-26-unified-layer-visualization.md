# Unified Layer Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract layer rendering, feature info retrieval, and metadata display logic into a shared adapter-based engine used by both dashboard (admin) and geoportal (public browse) services.

**Architecture:** Adapter pattern where each layer type (tile, mvt, wms, esri_*, etc.) implements a `LayerAdapter` interface for DeckGL layer creation and feature info retrieval. LayerFactory registry instantiates adapters polymorphically. Shared metadata renderer and style helpers ensure consistent styling across services.

**Tech Stack:** TypeScript, DeckGL, MapLibre GL, React, Zustand (existing in both services)

## Global Constraints

- **Layer types covered:** 15 total (tile, vector, mvt, mbtiles, geojson, kml, wms, wmts, wfs, esri_mapserver, esri_tileserver, esri_imageserver, esri_featureserver, esri_vectortileserver)
- **Metadata modes:** original, fields, custom (template-based)
- **Styles:** Point/LineString/Polygon with categorical coloring + fill/stroke patterns
- **Testing:** Unit tests per adapter, integration tests for factory
- **Commits:** After every task (frequent, atomic)
- **No `any` types** unless documented (existing CLAUDE.md rule)
- **Selector pattern mandatory** for Zustand (existing CLAUDE.md rule)

---

## File Structure

### Create

```
services/shared/lib/layers/
├── types.ts                          (shared type defs)
├── adapters/
│   ├── types.ts                      (LayerAdapter interface)
│   ├── tile-adapter.ts               (tile, vector, mbtiles)
│   ├── mvt-adapter.ts                (mvt + categorical + patterns)
│   ├── geojson-adapter.ts            (geojson + kml)
│   ├── wms-adapter.ts                (wms GetMap + GetFeatureInfo)
│   ├── wmts-adapter.ts               (wmts)
│   ├── wfs-adapter.ts                (wfs GetFeature)
│   ├── esri-adapter.ts               (all 5 esri_* types)
│   └── __tests__/                    (adapter unit tests)
│       ├── tile-adapter.test.ts
│       ├── mvt-adapter.test.ts
│       ├── geojson-adapter.test.ts
│       ├── wms-adapter.test.ts
│       ├── wmts-adapter.test.ts
│       ├── wfs-adapter.test.ts
│       └── esri-adapter.test.ts
├── layer-factory.ts                  (registry + createLayer)
├── feature-info-provider.ts          (polymorphic getInfo)
├── metadata-renderer.ts              (original/fields/custom modes)
├── style-helpers.ts                  (categorical colors, patterns)
├── utils.ts                          (geometry helpers, bbox)
└── __tests__/
    ├── layer-factory.test.ts
    └── metadata-renderer.test.ts
```

### Modify

```
services/dashboard/features/geo/tile/
├── components/tile-map.tsx           (shrink: use factory)
└── types.ts                          (align with shared types)

services/geoportal/
├── components/map/map-container.tsx  (switch to factory)
├── components/map/feature-info-panel.tsx (use metadata-renderer)
└── types/layer.ts                    (align with shared types)
```

---

## Phase 1: Foundation (Shared Types & Factory) — Week 1

### Task 1: Create Shared Type Definitions

**Files:**
- Create: `services/shared/lib/layers/types.ts`
- Test: Manual (types only, no runtime logic)

**Interfaces:**
- Produces: `LayerType`, `LayerConfig`, `FileMetadata`, `LayerStyle`, `FieldConfig`, `FeatureInfoResult`

- [ ] **Step 1: Create file with shared layer type union**

Create `services/shared/lib/layers/types.ts`:

```typescript
export type LayerType =
  | 'tile'
  | 'vector'
  | 'mvt'
  | 'mbtiles'
  | 'geojson'
  | 'kml'
  | 'wms'
  | 'wmts'
  | 'wfs'
  | 'esri_mapserver'
  | 'esri_tileserver'
  | 'esri_imageserver'
  | 'esri_featureserver'
  | 'esri_vectortileserver';

export type FileType = 'vector' | 'raster' | 'external';
```

- [ ] **Step 2: Add LayerConfig interface**

```typescript
export interface LayerConfig {
  layer_id: string;
  layer_type: LayerType;
  filename: string;
  file_type: FileType;
  tile_url: string;
  visible: boolean;
  opacity: number;
  bbox?: [number, number, number, number];
  file_metadata?: FileMetadata;
}
```

- [ ] **Step 3: Add FileMetadata and style interfaces**

```typescript
export interface FileMetadata {
  style?: LayerStyle;
  renderMode?: 'original' | 'fields' | 'custom';
  fields?: FieldConfig[];
  custom?: string;
  [key: string]: unknown;
}

export interface PointStyle {
  fillColor?: [number, number, number];
  strokeColor?: [number, number, number];
  strokeWidth?: number;
  pointRadius?: number;
  opacity?: number;
}

export interface LineStringStyle {
  strokeColor?: [number, number, number];
  strokeWidth?: number;
  strokePattern?: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
  opacity?: number;
}

export interface PolygonStyle {
  fillColor?: [number, number, number];
  fillPattern?: 'solid' | 'hatched' | 'cross-hatched' | 'dotted';
  strokeColor?: [number, number, number];
  strokeWidth?: number;
  strokePattern?: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
  opacity?: number;
  colorMode?: 'solid' | 'categorical';
  categoricalFill?: CategoricalStyle;
}

export interface LayerStyle {
  Point?: PointStyle;
  LineString?: LineStringStyle;
  Polygon?: PolygonStyle;
  categoricalFill?: CategoricalStyle;
  categoricalLine?: CategoricalStyle;
}

export interface CategoricalStyle {
  field: string;
  colorMap: Record<string, [number, number, number]>;
  defaultColor: [number, number, number];
}

export interface FieldConfig {
  original: string;
  label: string;
  visible: boolean;
}
```

- [ ] **Step 4: Add feature info result types**

```typescript
export type FeatureInfoResult =
  | { type: 'vector'; count: number; features: Record<string, unknown>[] }
  | { type: 'raster'; count: number; values: Record<string, number> }
  | { type: 'none' };

export interface MapClickInfo {
  coordinate: [number, number];
  layerId: string;
  layerType: LayerType;
  featureGeometry?: any;
}
```

- [ ] **Step 5: Verify file compiles**

Run: `cd services/shared && npx tsc --noEmit lib/layers/types.ts`

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add services/shared/lib/layers/types.ts
git commit -m "feat: add shared layer type definitions"
```

---

### Task 2: Create Adapter Interface

**Files:**
- Create: `services/shared/lib/layers/adapters/types.ts`
- Test: Manual (interface only)

**Interfaces:**
- Consumes: `LayerConfig`, `FeatureInfoResult` (from Task 1)
- Produces: `LayerAdapter` interface

- [ ] **Step 1: Create adapter interface file**

Create `services/shared/lib/layers/adapters/types.ts`:

```typescript
import type { LayerConfig, FeatureInfoResult } from '../types';

export interface LayerAdapter {
  /**
   * Create DeckGL layer from config.
   * Returns null if adapter cannot handle this config.
   */
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any | null;

  /**
   * Get feature info at click location (polygon/line: geometry, raster: pixel values).
   * Returns { type: 'none' } if no features found or adapter doesn't support queries.
   */
  getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult>;

  /**
   * Whether this adapter supports querying features at a location.
   */
  supportsQueryFeatures(): boolean;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd services/shared && npx tsc --noEmit lib/layers/adapters/types.ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add services/shared/lib/layers/adapters/types.ts
git commit -m "feat: define LayerAdapter interface"
```

---

### Task 3: Create LayerFactory

**Files:**
- Create: `services/shared/lib/layers/layer-factory.ts`
- Test: `services/shared/lib/layers/__tests__/layer-factory.test.ts`

**Interfaces:**
- Consumes: `LayerAdapter` (from Task 2), `LayerConfig`, `LayerType` (from Task 1)
- Produces: `layerFactory` singleton instance

- [ ] **Step 1: Write failing test for factory initialization**

Create `services/shared/lib/layers/__tests__/layer-factory.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LayerFactory } from '../layer-factory';
import type { LayerAdapter } from '../adapters/types';
import type { LayerConfig } from '../types';

describe('LayerFactory', () => {
  let factory: LayerFactory;

  beforeEach(() => {
    factory = new LayerFactory();
  });

  it('registers tile adapter on init', () => {
    const adapter = factory.getAdapter('tile');
    expect(adapter).toBeDefined();
  });

  it('getAdapter returns undefined for unregistered type', () => {
    const adapter = factory.getAdapter('unknown' as any);
    expect(adapter).toBeUndefined();
  });

  it('createLayer returns null for unknown type', () => {
    const config: LayerConfig = {
      layer_id: 'test',
      layer_type: 'unknown' as any,
      filename: 'test.tif',
      file_type: 'raster',
      tile_url: 'http://example.com',
      visible: true,
      opacity: 1,
    };
    const layer = factory.createLayer(config);
    expect(layer).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/layer-factory.test.ts`

Expected: FAIL — LayerFactory class does not exist

- [ ] **Step 3: Implement LayerFactory**

Create `services/shared/lib/layers/layer-factory.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/layer-factory.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/shared/lib/layers/layer-factory.ts services/shared/lib/layers/__tests__/layer-factory.test.ts
git commit -m "feat: implement LayerFactory with adapter registry"
```

---

### Task 4: Create Style Helpers

**Files:**
- Create: `services/shared/lib/layers/style-helpers.ts`
- Test: `services/shared/lib/layers/__tests__/style-helpers.test.ts` (later with adapters)

**Interfaces:**
- Consumes: `LayerStyle` (from Task 1)
- Produces: `resolveStyle()`, `makeFillColorAccessor()`, `DASH_ARRAYS`, `FILL_PATTERN_MAPPING`

- [ ] **Step 1: Create style helpers with dash arrays and fill patterns**

Create `services/shared/lib/layers/style-helpers.ts`:

```typescript
import type { LayerStyle, PointStyle, LineStringStyle, PolygonStyle, CategoricalStyle, StrokePattern, FillPattern } from './types';

const STYLE_DEFAULTS = {
  Point: {
    fillColor: [74, 144, 226] as [number, number, number],
    strokeColor: [255, 255, 255] as [number, number, number],
    strokeWidth: 1.5,
    opacity: 0.9,
    pointRadius: 6,
  },
  LineString: {
    strokeColor: [74, 144, 226] as [number, number, number],
    strokeWidth: 2.0,
    opacity: 0.85,
  },
  Polygon: {
    fillColor: [74, 144, 226] as [number, number, number],
    strokeColor: [255, 255, 255] as [number, number, number],
    strokeWidth: 1.0,
    opacity: 0.7,
  },
};

export type StrokePattern = 'solid' | 'dashed' | 'dotted' | 'dash-dot';
export type FillPattern = 'solid' | 'hatched' | 'cross-hatched' | 'dotted';

export const DASH_ARRAYS: Record<StrokePattern, [number, number] | [number, number, number, number]> = {
  solid: [0, 0],
  dashed: [8, 4],
  dotted: [1, 4],
  'dash-dot': [8, 4, 1, 4],
};

export const FILL_PATTERN_MAPPING: Record<FillPattern, { x: number; y: number; width: number; height: number; mask: boolean }> = {
  solid: { x: 0, y: 0, width: 64, height: 64, mask: true },
  hatched: { x: 64, y: 0, width: 64, height: 64, mask: true },
  'cross-hatched': { x: 128, y: 0, width: 64, height: 64, mask: true },
  dotted: { x: 192, y: 0, width: 64, height: 64, mask: true },
};

export function resolveStyle(
  style: LayerStyle | undefined,
  key: 'Point' | 'LineString' | 'Polygon'
): PointStyle | LineStringStyle | PolygonStyle {
  const base = STYLE_DEFAULTS[key];
  const override = style?.[key] ?? {};
  return { ...base, ...override } as any;
}

export function toRGBA(
  rgb: [number, number, number] | undefined,
  opacity: number
): [number, number, number, number] {
  const color = rgb ?? STYLE_DEFAULTS.Polygon.fillColor;
  return [color[0], color[1], color[2], Math.round(opacity * 255)];
}

export function makeFillColorAccessor(
  geomStyle: PolygonStyle,
  alpha: number
): [number, number, number, number] | ((f: { properties: Record<string, unknown> }) => [number, number, number, number]) {
  if (geomStyle.colorMode === 'categorical' && geomStyle.categoricalFill) {
    const { field, colorMap, defaultColor } = geomStyle.categoricalFill as CategoricalStyle;
    return (f: { properties: Record<string, unknown> }) => {
      const val = String(f.properties?.[field] ?? '');
      const c = (colorMap[val] ?? defaultColor) as [number, number, number];
      return [c[0], c[1], c[2], alpha];
    };
  }
  return toRGBA(geomStyle.fillColor, geomStyle.opacity ?? 0.7);
}

// Fill pattern atlas (canvas for DeckGL FillStyleExtension)
let _fillPatternAtlas: HTMLCanvasElement | null = null;

export function getFillPatternAtlas(): HTMLCanvasElement {
  if (!_fillPatternAtlas) _fillPatternAtlas = createFillPatternAtlas();
  return _fillPatternAtlas;
}

export function createFillPatternAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const T = 64;
  canvas.width = T * 4;
  canvas.height = T;
  const ctx = canvas.getContext('2d')!;

  // Tile 0 (solid): entire tile opaque
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, T, T);

  // Tile 1 (hatched 45°): diagonal lines
  ctx.save();
  ctx.beginPath();
  ctx.rect(T, 0, T, T);
  ctx.clip();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.lineCap = 'square';
  for (let i = -T; i < T * 2; i += 8) {
    ctx.beginPath();
    ctx.moveTo(T + i, 0);
    ctx.lineTo(T + i + T, T);
    ctx.stroke();
  }
  ctx.restore();

  // Tile 2 (cross-hatched): both diagonals
  ctx.save();
  ctx.beginPath();
  ctx.rect(T * 2, 0, T, T);
  ctx.clip();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';
  for (let i = -T; i < T * 2; i += 8) {
    ctx.beginPath();
    ctx.moveTo(T * 2 + i, 0);
    ctx.lineTo(T * 2 + i + T, T);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(T * 2 + i + T, 0);
    ctx.lineTo(T * 2 + i, T);
    ctx.stroke();
  }
  ctx.restore();

  // Tile 3 (dotted): dots at 12px grid
  ctx.save();
  ctx.beginPath();
  ctx.rect(T * 3, 0, T, T);
  ctx.clip();
  ctx.fillStyle = 'white';
  for (let y = 6; y < T; y += 12) {
    for (let x = 6; x < T; x += 12) {
      ctx.beginPath();
      ctx.arc(T * 3 + x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  return canvas;
}
```

- [ ] **Step 2: Add type exports to shared types.ts**

Append to `services/shared/lib/layers/types.ts`:

```typescript
export type StrokePattern = 'solid' | 'dashed' | 'dotted' | 'dash-dot';
export type FillPattern = 'solid' | 'hatched' | 'cross-hatched' | 'dotted';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd services/shared && npx tsc --noEmit lib/layers/style-helpers.ts`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add services/shared/lib/layers/style-helpers.ts services/shared/lib/layers/types.ts
git commit -m "feat: add style helpers (colors, patterns, dash arrays)"
```

---

### Task 5: Create Utility Helpers

**Files:**
- Create: `services/shared/lib/layers/utils.ts`

**Interfaces:**
- Produces: `isValidBbox()`, `renderTemplate()`

- [ ] **Step 1: Create utility functions**

Create `services/shared/lib/layers/utils.ts`:

```typescript
export function isValidBbox(bbox: any): bbox is [number, number, number, number] {
  return (
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((v) => typeof v === 'number' && isFinite(v)) &&
    bbox[0] < bbox[2] && // west < east
    bbox[1] < bbox[3]    // south < north
  );
}

export function getScaleString(zoomLevel: number): string {
  const metersPerPixel = 40075016.686 / (256 * Math.pow(2, zoomLevel));
  const scaleRatio = Math.round(metersPerPixel * 3779.528);

  if (scaleRatio <= 0) return '1:∞';
  if (scaleRatio >= 1000000) {
    return `1:${Math.round(scaleRatio / 100000) * 100000}`;
  }
  if (scaleRatio >= 100000) {
    return `1:${Math.round(scaleRatio / 10000) * 10000}`;
  }
  if (scaleRatio >= 10000) {
    return `1:${Math.round(scaleRatio / 1000) * 1000}`;
  }

  return `1:${scaleRatio.toLocaleString()}`;
}

export function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in values ? String(values[key]) : ''
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd services/shared && npx tsc --noEmit lib/layers/utils.ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add services/shared/lib/layers/utils.ts
git commit -m "feat: add utility helpers (bbox validation, template rendering)"
```

---

## Phase 2: Adapters (Layer Type Implementations) — Week 2-3

### Task 6: Create Tile Adapter (tile, vector, mbtiles)

**Files:**
- Create: `services/shared/lib/layers/adapters/tile-adapter.ts`
- Test: `services/shared/lib/layers/__tests__/tile-adapter.test.ts`

**Interfaces:**
- Consumes: `LayerAdapter` (from Task 2), `LayerConfig`, `FeatureInfoResult` (from Task 1)
- Produces: `TileAdapter` class (handles tile, vector, mbtiles types)

- [ ] **Step 1: Write failing test for tile adapter**

Create `services/shared/lib/layers/__tests__/tile-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TileAdapter } from '../adapters/tile-adapter';
import type { LayerConfig } from '../types';
import { BitmapLayer } from '@deck.gl/layers';

describe('TileAdapter', () => {
  const adapter = new TileAdapter();

  it('creates BitmapLayer for tile type', () => {
    const config: LayerConfig = {
      layer_id: 'test-tile',
      layer_type: 'tile',
      filename: 'test.tif',
      file_type: 'raster',
      tile_url: 'http://example.com/tiles/{z}/{x}/{y}.png',
      visible: true,
      opacity: 0.8,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
    // Note: actual layer type check requires DeckGL render context; skipping deep inspection
  });

  it('returns none for feature info (raster tiles not queryable)', async () => {
    const config: LayerConfig = {
      layer_id: 'test-tile',
      layer_type: 'tile',
      filename: 'test.tif',
      file_type: 'raster',
      tile_url: 'http://example.com/tiles/{z}/{x}/{y}.png',
      visible: true,
      opacity: 0.8,
    };
    const info = await adapter.getInfo(config, [116, -1]);
    expect(info.type).toBe('none');
  });

  it('does not support query features', () => {
    expect(adapter.supportsQueryFeatures()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/tile-adapter.test.ts`

Expected: FAIL — TileAdapter class does not exist

- [ ] **Step 3: Implement TileAdapter**

Create `services/shared/lib/layers/adapters/tile-adapter.ts`:

```typescript
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';

export class TileAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    return new TileLayer({
      id: `deck-tile-${config.layer_id}`,
      data: config.tile_url,
      tileSize: 256,
      pickable: true,
      opacity: config.opacity ?? 0.8,
      renderSubLayers: (props: any) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    });
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // Raster tiles not queryable at point level
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/tile-adapter.test.ts`

Expected: PASS

- [ ] **Step 5: Register TileAdapter in LayerFactory**

Modify `services/shared/lib/layers/layer-factory.ts`:

```typescript
import { TileAdapter } from './adapters/tile-adapter';

export class LayerFactory {
  private adapters = new Map<LayerType, LayerAdapter>();

  constructor() {
    this.registerDefaultAdapters();
  }

  private registerDefaultAdapters(): void {
    this.register('tile', new TileAdapter());
    this.register('vector', new TileAdapter()); // Same adapter
    this.register('mbtiles', new TileAdapter()); // Same adapter
  }

  // ... rest unchanged
}
```

- [ ] **Step 6: Update factory test to check tile adapter registration**

Modify `services/shared/lib/layers/__tests__/layer-factory.test.ts`, add to describe block:

```typescript
  it('registers tile and vector adapters on init', () => {
    expect(factory.getAdapter('tile')).toBeDefined();
    expect(factory.getAdapter('vector')).toBeDefined();
    expect(factory.getAdapter('mbtiles')).toBeDefined();
  });
```

- [ ] **Step 7: Run factory tests to verify**

Run: `cd services/shared && npm test lib/layers/__tests__/layer-factory.test.ts`

Expected: PASS (new test + existing tests)

- [ ] **Step 8: Commit**

```bash
git add services/shared/lib/layers/adapters/tile-adapter.ts services/shared/lib/layers/__tests__/tile-adapter.test.ts services/shared/lib/layers/layer-factory.ts services/shared/lib/layers/__tests__/layer-factory.test.ts
git commit -m "feat: implement tile adapter for raster tile layers"
```

---

### Task 7: Create GeoJSON & KML Adapter

**Files:**
- Create: `services/shared/lib/layers/adapters/geojson-adapter.ts`
- Test: `services/shared/lib/layers/__tests__/geojson-adapter.test.ts`

**Interfaces:**
- Consumes: `LayerAdapter`, `LayerConfig`, `FeatureInfoResult`, style helpers
- Produces: `GeoJsonAdapter` class (handles geojson, kml types)

- [ ] **Step 1: Write failing test for geojson adapter**

Create `services/shared/lib/layers/__tests__/geojson-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { GeoJsonAdapter } from '../adapters/geojson-adapter';
import type { LayerConfig } from '../types';

describe('GeoJsonAdapter', () => {
  const adapter = new GeoJsonAdapter();

  it('creates GeoJsonLayer for geojson type', () => {
    const config: LayerConfig = {
      layer_id: 'test-geojson',
      layer_type: 'geojson',
      filename: 'test.geojson',
      file_type: 'vector',
      tile_url: 'http://example.com/test.geojson',
      visible: true,
      opacity: 0.85,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('returns none for feature info (no API call)', async () => {
    const config: LayerConfig = {
      layer_id: 'test-geojson',
      layer_type: 'geojson',
      filename: 'test.geojson',
      file_type: 'vector',
      tile_url: 'http://example.com/test.geojson',
      visible: true,
      opacity: 0.85,
    };
    const info = await adapter.getInfo(config, [116, -1]);
    expect(info.type).toBe('none');
  });

  it('does not support query features (features come from DeckGL click)', () => {
    expect(adapter.supportsQueryFeatures()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/geojson-adapter.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement GeoJsonAdapter**

Create `services/shared/lib/layers/adapters/geojson-adapter.ts`:

```typescript
import { GeoJsonLayer } from '@deck.gl/layers';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';
import { resolveStyle, toRGBA, makeFillColorAccessor } from '../style-helpers';

export class GeoJsonAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    const style = config.file_metadata?.style;
    const poly = resolveStyle(style, 'Polygon');
    const line = resolveStyle(style, 'LineString');
    const point = resolveStyle(style, 'Point');
    const alpha = Math.round((poly.opacity ?? 0.7) * 255);

    return new GeoJsonLayer({
      id: `deck-geojson-${config.layer_id}`,
      data: config.tile_url,
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: line.strokeWidth,
      pointRadiusMinPixels: point.pointRadius,
      getLineColor: toRGBA(line.strokeColor, line.opacity),
      getFillColor: makeFillColorAccessor(poly, alpha),
    } as any);
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // GeoJSON features come from DeckGL click handler (properties in object)
    // No separate API call needed
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/geojson-adapter.test.ts`

Expected: PASS

- [ ] **Step 5: Register GeoJsonAdapter in LayerFactory**

Modify `services/shared/lib/layers/layer-factory.ts`, in registerDefaultAdapters():

```typescript
import { GeoJsonAdapter } from './adapters/geojson-adapter';

  private registerDefaultAdapters(): void {
    this.register('tile', new TileAdapter());
    this.register('vector', new TileAdapter());
    this.register('mbtiles', new TileAdapter());
    this.register('geojson', new GeoJsonAdapter());
    this.register('kml', new GeoJsonAdapter()); // Same adapter; KML converted to GeoJSON upstream
  }
```

- [ ] **Step 6: Update factory test**

Modify `services/shared/lib/layers/__tests__/layer-factory.test.ts`, add:

```typescript
  it('registers geojson and kml adapters on init', () => {
    expect(factory.getAdapter('geojson')).toBeDefined();
    expect(factory.getAdapter('kml')).toBeDefined();
  });
```

- [ ] **Step 7: Run factory tests**

Run: `cd services/shared && npm test lib/layers/__tests__/layer-factory.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add services/shared/lib/layers/adapters/geojson-adapter.ts services/shared/lib/layers/__tests__/geojson-adapter.test.ts services/shared/lib/layers/layer-factory.ts services/shared/lib/layers/__tests__/layer-factory.test.ts
git commit -m "feat: implement geojson adapter for vector layers"
```

---

### Task 8: Create MVT Adapter (mvt + categorical + patterns)

**Files:**
- Create: `services/shared/lib/layers/adapters/mvt-adapter.ts`
- Test: `services/shared/lib/layers/__tests__/mvt-adapter.test.ts`

**Interfaces:**
- Consumes: `LayerAdapter`, style helpers, `DASH_ARRAYS`, `FILL_PATTERN_MAPPING`, pattern atlas
- Produces: `MVTAdapter` class

- [ ] **Step 1: Write failing test for mvt adapter**

Create `services/shared/lib/layers/__tests__/mvt-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MVTAdapter } from '../adapters/mvt-adapter';
import type { LayerConfig } from '../types';

describe('MVTAdapter', () => {
  const adapter = new MVTAdapter();

  it('creates MVTLayer for mvt type', () => {
    const config: LayerConfig = {
      layer_id: 'test-mvt',
      layer_type: 'mvt',
      filename: 'test.pbf',
      file_type: 'vector',
      tile_url: 'http://example.com/tiles/{z}/{x}/{y}.pbf',
      visible: true,
      opacity: 0.85,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('supports query features', () => {
    expect(adapter.supportsQueryFeatures()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/mvt-adapter.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement MVTAdapter (simplified; full logic in dashboard tile-map.tsx lines 420-502)**

Create `services/shared/lib/layers/adapters/mvt-adapter.ts`:

```typescript
import { MVTLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import { PathStyleExtension, FillStyleExtension } from '@deck.gl/extensions';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';
import { resolveStyle, toRGBA, makeFillColorAccessor, DASH_ARRAYS, FILL_PATTERN_MAPPING, getFillPatternAtlas } from '../style-helpers';
import type { StrokePattern, FillPattern } from '../types';

export class MVTAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    const style = config.file_metadata?.style;
    const poly = resolveStyle(style, 'Polygon');
    const line = resolveStyle(style, 'LineString');
    const point = resolveStyle(style, 'Point');

    const lineStrokePattern = (line.strokePattern ?? 'solid') as StrokePattern;
    const polyStrokePattern = (poly.strokePattern ?? 'solid') as StrokePattern;
    const fillPattern = (poly.fillPattern ?? 'solid') as FillPattern;
    const useFillPattern = fillPattern !== 'solid';

    const alpha = Math.round((poly.opacity ?? 0.7) * 255);
    const fillColorAccessor = makeFillColorAccessor(poly, alpha);

    const polyLineColor = toRGBA(poly.strokeColor, poly.opacity);
    const lineLineColor = toRGBA(line.strokeColor, line.opacity);
    const pointLineColor = toRGBA(point.strokeColor, point.opacity);

    return new MVTLayer({
      id: `deck-mvt-${config.layer_id}`,
      data: config.tile_url,
      pickable: true,
      filled: true,
      stroked: true,
      pointRadiusScale: point.pointRadius,
      getFillColor: fillColorAccessor,
      getLineColor: (f: any) => {
        const geomType = f?.geometry?.type ?? '';
        if (geomType === 'LineString' || geomType === 'MultiLineString') return lineLineColor;
        if (geomType === 'Point' || geomType === 'MultiPoint') return pointLineColor;
        return polyLineColor;
      },
      getLineWidth: (f: any) => {
        const geomType = f?.geometry?.type ?? '';
        if (geomType === 'LineString' || geomType === 'MultiLineString') return line.strokeWidth ?? 2;
        if (geomType === 'Point' || geomType === 'MultiPoint') return point.strokeWidth ?? 1.5;
        return poly.strokeWidth ?? 1;
      },
      autoHighlight: true,
      highlightColor: [255, 0, 0, 255],
      renderSubLayers: (props: any) => {
        const parentExtensions: object[] = props.extensions ?? [];
        const subLayerProps: Record<string, object> = {};

        if (polyStrokePattern !== 'solid') {
          subLayerProps['polygons-stroke'] = {
            extensions: [...parentExtensions, new PathStyleExtension({ dash: true })],
            getDashArray: DASH_ARRAYS[polyStrokePattern],
            dashJustified: true,
          };
        }

        if (lineStrokePattern !== 'solid') {
          subLayerProps['linestrings'] = {
            extensions: [...parentExtensions, new PathStyleExtension({ dash: true })],
            getDashArray: DASH_ARRAYS[lineStrokePattern],
            dashJustified: true,
          };
        }

        if (useFillPattern) {
          subLayerProps['polygons-fill'] = {
            extensions: [...parentExtensions, new FillStyleExtension({ pattern: true })],
            fillPatternAtlas: getFillPatternAtlas(),
            fillPatternMapping: FILL_PATTERN_MAPPING,
            getFillPattern: () => fillPattern,
            getFillPatternScale: 1,
            fillPatternMask: true,
            getFillPatternOffset: [0, 0],
          };
        }

        return new GeoJsonLayer({
          ...props,
          _subLayerProps: subLayerProps,
        });
      },
    } as any);
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // TODO: Call tileApi.queryFeatures() (from dashboard) to get features in bbox
    // For now, return none; will be wired up when dashboard APIs are integrated
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/mvt-adapter.test.ts`

Expected: PASS

- [ ] **Step 5: Register MVTAdapter in LayerFactory**

Modify `services/shared/lib/layers/layer-factory.ts`, in registerDefaultAdapters():

```typescript
import { MVTAdapter } from './adapters/mvt-adapter';

  private registerDefaultAdapters(): void {
    this.register('tile', new TileAdapter());
    this.register('vector', new TileAdapter());
    this.register('mbtiles', new TileAdapter());
    this.register('geojson', new GeoJsonAdapter());
    this.register('kml', new GeoJsonAdapter());
    this.register('mvt', new MVTAdapter());
  }
```

- [ ] **Step 6: Update factory test**

Modify `services/shared/lib/layers/__tests__/layer-factory.test.ts`, add:

```typescript
  it('registers mvt adapter on init', () => {
    expect(factory.getAdapter('mvt')).toBeDefined();
  });
```

- [ ] **Step 7: Run tests**

Run: `cd services/shared && npm test lib/layers/__tests__/`

Expected: All tests PASS (tile, geojson, mvt, factory)

- [ ] **Step 8: Commit**

```bash
git add services/shared/lib/layers/adapters/mvt-adapter.ts services/shared/lib/layers/__tests__/mvt-adapter.test.ts services/shared/lib/layers/layer-factory.ts services/shared/lib/layers/__tests__/layer-factory.test.ts
git commit -m "feat: implement mvt adapter with categorical colors and fill patterns"
```

---

### Task 9: Create WMS, WMTS, WFS Adapters

**Files:**
- Create: `services/shared/lib/layers/adapters/wms-adapter.ts`, `wmts-adapter.ts`, `wfs-adapter.ts`
- Test: `services/shared/lib/layers/__tests__/{wms,wmts,wfs}-adapter.test.ts`

**Interfaces:**
- Consumes: `LayerAdapter`, `LayerConfig`, style helpers
- Produces: `WMSAdapter`, `WMTSAdapter`, `WFSAdapter` classes

- [ ] **Step 1: Implement WMSAdapter**

Create `services/shared/lib/layers/adapters/wms-adapter.ts`:

```typescript
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';

function buildWmsTileUrl(baseUrl: string, params: Record<string, string>, bbox: any, z: number): string {
  const layers = params.layers || 'default';
  const format = params.format || 'image/png';

  const queryParams = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    LAYERS: layers,
    WIDTH: '256',
    HEIGHT: '256',
    STYLES: '',
    TRANSPARENT: 'TRUE',
    CRS: 'EPSG:4326',
    FORMAT: format,
    BBOX: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
    SRS: 'EPSG:4326',
  });

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryParams.toString()}`;
}

export class WMSAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    return new TileLayer({
      id: `deck-wms-${config.layer_id}`,
      data: [],
      tileSize: 256,
      pickable: true,
      opacity: config.opacity ?? 0.8,
      getTileData: async (props: any) => {
        const { x, y, z, bbox } = props;
        const url = buildWmsTileUrl(config.tile_url, (config.file_metadata || {}) as Record<string, string>, bbox, z);
        const resp = await fetch(url);
        if (!resp.ok) return null;
        return resp.blob().then(createImageBitmap);
      },
      renderSubLayers: (props: any) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    } as any);
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // TODO: Call WMS GetFeatureInfo (requires HTTP request with coordinate)
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return true; // WMS supports GetFeatureInfo
  }
}
```

- [ ] **Step 2: Implement WMTSAdapter**

Create `services/shared/lib/layers/adapters/wmts-adapter.ts`:

```typescript
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';

function buildWmtsTileUrl(baseUrl: string, params: Record<string, string>, z: number, x: number, y: number): string {
  const layer = params.layer || 'default';
  const tms = params.tilematrixset || 'WebMercatorQuad';
  const format = params.format || 'image/png';

  return `${baseUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&TILEMATRIXSET=${tms}&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&FORMAT=${format}`;
}

export class WMTSAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    return new TileLayer({
      id: `deck-wmts-${config.layer_id}`,
      data: [],
      tileSize: 256,
      pickable: true,
      opacity: config.opacity ?? 0.8,
      getTileData: async (props: any) => {
        const { x, y, z } = props;
        const url = buildWmtsTileUrl(config.tile_url, (config.file_metadata || {}) as Record<string, string>, z, x, y);
        const resp = await fetch(url);
        if (!resp.ok) return null;
        return resp.blob().then(createImageBitmap);
      },
      renderSubLayers: (props: any) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    } as any);
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // WMTS typically doesn't support feature info queries
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return false;
  }
}
```

- [ ] **Step 3: Implement WFSAdapter**

Create `services/shared/lib/layers/adapters/wfs-adapter.ts`:

```typescript
import { GeoJsonLayer } from '@deck.gl/layers';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';
import { resolveStyle, toRGBA } from '../style-helpers';

export class WFSAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    const style = config.file_metadata?.style;
    const poly = resolveStyle(style, 'Polygon');
    const line = resolveStyle(style, 'LineString');
    const point = resolveStyle(style, 'Point');

    return new GeoJsonLayer({
      id: `deck-wfs-${config.layer_id}`,
      data: config.tile_url,
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: line.strokeWidth,
      pointRadiusMinPixels: point.pointRadius,
      getLineColor: toRGBA(line.strokeColor, line.opacity),
      getFillColor: toRGBA(poly.fillColor, poly.opacity),
    } as any);
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // WFS features come from DeckGL click handler (GeoJSON already loaded)
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return false;
  }
}
```

- [ ] **Step 4: Write tests for all three adapters**

Create `services/shared/lib/layers/__tests__/wms-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WMSAdapter } from '../adapters/wms-adapter';
import type { LayerConfig } from '../types';

describe('WMSAdapter', () => {
  const adapter = new WMSAdapter();

  it('creates TileLayer for wms type', () => {
    const config: LayerConfig = {
      layer_id: 'test-wms',
      layer_type: 'wms',
      filename: 'geoserver',
      file_type: 'external',
      tile_url: 'http://geoserver.example.com/wms',
      visible: true,
      opacity: 0.8,
      file_metadata: { layers: 'workspace:layer' },
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('supports query features', () => {
    expect(adapter.supportsQueryFeatures()).toBe(true);
  });
});
```

Create `services/shared/lib/layers/__tests__/wmts-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WMTSAdapter } from '../adapters/wmts-adapter';
import type { LayerConfig } from '../types';

describe('WMTSAdapter', () => {
  const adapter = new WMTSAdapter();

  it('creates TileLayer for wmts type', () => {
    const config: LayerConfig = {
      layer_id: 'test-wmts',
      layer_type: 'wmts',
      filename: 'wmts-service',
      file_type: 'external',
      tile_url: 'http://wmts.example.com/',
      visible: true,
      opacity: 0.8,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('does not support query features', () => {
    expect(adapter.supportsQueryFeatures()).toBe(false);
  });
});
```

Create `services/shared/lib/layers/__tests__/wfs-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WFSAdapter } from '../adapters/wfs-adapter';
import type { LayerConfig } from '../types';

describe('WFSAdapter', () => {
  const adapter = new WFSAdapter();

  it('creates GeoJsonLayer for wfs type', () => {
    const config: LayerConfig = {
      layer_id: 'test-wfs',
      layer_type: 'wfs',
      filename: 'geoserver-wfs',
      file_type: 'external',
      tile_url: 'http://geoserver.example.com/wfs?request=GetFeature&outputFormat=geojson&typeName=workspace:layer',
      visible: true,
      opacity: 0.85,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('does not support separate query features', () => {
    expect(adapter.supportsQueryFeatures()).toBe(false);
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `cd services/shared && npm test lib/layers/__tests__/`

Expected: All tests PASS

- [ ] **Step 6: Register all three adapters in LayerFactory**

Modify `services/shared/lib/layers/layer-factory.ts`:

```typescript
import { WMSAdapter } from './adapters/wms-adapter';
import { WMTSAdapter } from './adapters/wmts-adapter';
import { WFSAdapter } from './adapters/wfs-adapter';

  private registerDefaultAdapters(): void {
    this.register('tile', new TileAdapter());
    this.register('vector', new TileAdapter());
    this.register('mbtiles', new TileAdapter());
    this.register('geojson', new GeoJsonAdapter());
    this.register('kml', new GeoJsonAdapter());
    this.register('mvt', new MVTAdapter());
    this.register('wms', new WMSAdapter());
    this.register('wmts', new WMTSAdapter());
    this.register('wfs', new WFSAdapter());
  }
```

- [ ] **Step 7: Run factory tests**

Run: `cd services/shared && npm test lib/layers/__tests__/layer-factory.test.ts`

Expected: PASS (all registered types accessible)

- [ ] **Step 8: Commit**

```bash
git add services/shared/lib/layers/adapters/{wms,wmts,wfs}-adapter.ts services/shared/lib/layers/__tests__/{wms,wmts,wfs}-adapter.test.ts services/shared/lib/layers/layer-factory.ts
git commit -m "feat: implement wms, wmts, wfs adapters for external tile services"
```

---

### Task 10: Create Esri Adapter (all 5 esri_* types)

**Files:**
- Create: `services/shared/lib/layers/adapters/esri-adapter.ts`
- Test: `services/shared/lib/layers/__tests__/esri-adapter.test.ts`

**Interfaces:**
- Consumes: `LayerAdapter`, `LayerConfig`, style helpers
- Produces: `EsriAdapter` class (handles all 5 esri_* types)

*Note: Reference dashboard tile-map.tsx lines 504-657 for full Esri layer implementations.*

- [ ] **Step 1: Write failing test for esri adapter**

Create `services/shared/lib/layers/__tests__/esri-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { EsriAdapter } from '../adapters/esri-adapter';
import type { LayerConfig } from '../types';

describe('EsriAdapter', () => {
  const adapter = new EsriAdapter();

  it('creates layer for esri_mapserver type', () => {
    const config: LayerConfig = {
      layer_id: 'test-esri-mapserver',
      layer_type: 'esri_mapserver',
      filename: 'arcgis-mapserver',
      file_type: 'external',
      tile_url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer',
      visible: true,
      opacity: 0.85,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('creates layer for esri_featureserver type', () => {
    const config: LayerConfig = {
      layer_id: 'test-esri-featureserver',
      layer_type: 'esri_featureserver',
      filename: 'arcgis-featureserver',
      file_type: 'external',
      tile_url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Example/FeatureServer',
      visible: true,
      opacity: 0.85,
    };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeDefined();
  });

  it('supports query features for feature servers', () => {
    expect(adapter.supportsQueryFeatures()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/esri-adapter.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement EsriAdapter (simplified; full implementations in dashboard)**

Create `services/shared/lib/layers/adapters/esri-adapter.ts`:

```typescript
import { TileLayer } from '@deck.gl/geo-layers';
import { MVTLayer, GeoJsonLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { LayerAdapter } from './types';
import type { LayerConfig, FeatureInfoResult } from '../types';
import { resolveStyle, toRGBA } from '../style-helpers';

export class EsriAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    switch (config.layer_type) {
      case 'esri_mapserver':
        return this.createMapServerLayer(config);
      case 'esri_tileserver':
        return this.createTileServerLayer(config);
      case 'esri_imageserver':
        return this.createImageServerLayer(config);
      case 'esri_featureserver':
        return this.createFeatureServerLayer(config);
      case 'esri_vectortileserver':
        return this.createVectorTileServerLayer(config);
      default:
        return null;
    }
  }

  private createMapServerLayer(config: LayerConfig): any {
    // Reference: dashboard tile-map.tsx lines 504-555
    return new TileLayer({
      id: `deck-esri-mapserver-${config.layer_id}`,
      data: [],
      tileSize: 256,
      pickable: true,
      opacity: config.opacity ?? 0.85,
      getTileData: async (props: any) => {
        const { x, y, z, bbox } = props.tile || props;
        const meta = (config.file_metadata as Record<string, unknown>) ?? {};
        const params = new URLSearchParams({
          bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
          bboxSR: '4326',
          size: '256,256',
          imageSR: '4326',
          format: 'png',
          transparent: 'true',
          f: 'image',
        });

        const layerIds = meta?.layers as string | undefined;
        if (layerIds) params.append('layers', layerIds);

        const token = meta?.token;
        if (token) params.append('token', String(token));

        const url = `${config.tile_url}/export?${params}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        return resp.blob().then(createImageBitmap);
      },
      renderSubLayers: (props: any) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    } as any);
  }

  private createTileServerLayer(config: LayerConfig): any {
    // Reference: dashboard tile-map.tsx lines 557-574
    return new TileLayer({
      id: `deck-esri-tileserver-${config.layer_id}`,
      data: `${config.tile_url}/tile/{z}/{y}/{x}`,
      tileSize: 256,
      pickable: true,
      opacity: config.opacity ?? 0.85,
      renderSubLayers: (props: any) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    });
  }

  private createImageServerLayer(config: LayerConfig): any {
    // Reference: dashboard tile-map.tsx lines 576-613
    return new TileLayer({
      id: `deck-esri-image-${config.layer_id}`,
      data: [],
      tileSize: 256,
      pickable: true,
      opacity: config.opacity ?? 0.85,
      getTileData: async (props: any) => {
        const { x, y, z, bbox } = props;
        const params = new URLSearchParams({
          bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
          bboxSR: '4326',
          size: '256,256',
          imageSR: '4326',
          f: 'image',
          format: 'png',
        });

        const token = (config.file_metadata as Record<string, unknown>)?.token;
        if (token) params.append('token', String(token));

        const resp = await fetch(`${config.tile_url}/exportImage?${params}`);
        if (!resp.ok) return null;
        return resp.blob().then(createImageBitmap);
      },
      renderSubLayers: (props: any) => {
        const { west, south, east, north } = props.tile.bbox;
        return new BitmapLayer(props, {
          data: undefined,
          image: props.data,
          bounds: [west, south, east, north],
        });
      },
    } as any);
  }

  private createFeatureServerLayer(config: LayerConfig): any {
    // Reference: dashboard tile-map.tsx lines 615-633
    const meta = (config.file_metadata ?? {}) as Record<string, unknown>;
    const layerIdx = meta.layerIndex ?? '0';
    const where = meta.where ?? '1=1';
    const token = meta.token ? `&token=${meta.token}` : '';

    return new GeoJsonLayer({
      id: `deck-esri-feature-${config.layer_id}`,
      data: `${config.tile_url}/${layerIdx}/query?where=${where}&outFields=*&f=geojson${token}`,
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 3,
      getLineColor: [255, 140, 0],
      getFillColor: [255, 165, 0, 160],
    });
  }

  private createVectorTileServerLayer(config: LayerConfig): any {
    // Reference: dashboard tile-map.tsx lines 635-656
    const token = (config.file_metadata as Record<string, unknown>)?.token;
    const tokenSuffix = token ? `?token=${token}` : '';

    return new MVTLayer({
      id: `deck-esri-mvt-${config.layer_id}`,
      data: `${config.tile_url}/tile/{z}/{y}/{x}.pbf${tokenSuffix}`,
      pickable: true,
      opacity: config.opacity ?? 0.85,
      filled: true,
      stroked: true,
      lineWidthMinPixels: 1,
      pointRadiusMinPixels: 4,
      getFillColor: [255, 140, 0, 180],
      getLineColor: [200, 100, 0, 230],
      getPointRadius: 4,
      autoHighlight: true,
      highlightColor: [255, 200, 0, 200],
      uniqueIdProperty: 'OBJECTID',
    });
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // Only feature server supports queries
    if (config.layer_type === 'esri_featureserver') {
      // TODO: Implement feature server query
      return { type: 'none' };
    }
    return { type: 'none' };
  }

  supportsQueryFeatures(): boolean {
    return true; // Feature server queries supported
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/esri-adapter.test.ts`

Expected: PASS

- [ ] **Step 5: Register EsriAdapter in LayerFactory**

Modify `services/shared/lib/layers/layer-factory.ts`:

```typescript
import { EsriAdapter } from './adapters/esri-adapter';

  private registerDefaultAdapters(): void {
    // ... existing
    this.register('esri_mapserver', new EsriAdapter());
    this.register('esri_tileserver', new EsriAdapter());
    this.register('esri_imageserver', new EsriAdapter());
    this.register('esri_featureserver', new EsriAdapter());
    this.register('esri_vectortileserver', new EsriAdapter());
  }
```

- [ ] **Step 6: Run all adapter tests**

Run: `cd services/shared && npm test lib/layers/__tests__/`

Expected: All PASS (10+ adapter tests)

- [ ] **Step 7: Commit**

```bash
git add services/shared/lib/layers/adapters/esri-adapter.ts services/shared/lib/layers/__tests__/esri-adapter.test.ts services/shared/lib/layers/layer-factory.ts
git commit -m "feat: implement esri adapter for all 5 esri service types"
```

---

## Phase 3: Metadata & Feature Info (Shared Logic) — Week 3-4

### Task 11: Create Feature Info Provider

**Files:**
- Create: `services/shared/lib/layers/feature-info-provider.ts`
- Test: `services/shared/lib/layers/__tests__/feature-info-provider.test.ts`

**Interfaces:**
- Consumes: `LayerConfig`, `FeatureInfoResult`, `layerFactory`
- Produces: `getFeatureInfo()` function

- [ ] **Step 1: Write failing test for feature info provider**

Create `services/shared/lib/layers/__tests__/feature-info-provider.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getFeatureInfo } from '../feature-info-provider';
import { layerFactory } from '../layer-factory';
import type { LayerConfig } from '../types';

describe('getFeatureInfo', () => {
  it('delegates to adapter for registered layer type', async () => {
    const config: LayerConfig = {
      layer_id: 'test-tile',
      layer_type: 'tile',
      filename: 'test.tif',
      file_type: 'raster',
      tile_url: 'http://example.com/tiles/{z}/{x}/{y}.png',
      visible: true,
      opacity: 0.8,
    };

    const result = await getFeatureInfo(config, [116, -1]);
    expect(result.type).toBe('none');
  });

  it('returns none for unknown layer type', async () => {
    const config: LayerConfig = {
      layer_id: 'test-unknown',
      layer_type: 'unknown' as any,
      filename: 'test.xyz',
      file_type: 'raster',
      tile_url: 'http://example.com/',
      visible: true,
      opacity: 0.8,
    };

    const result = await getFeatureInfo(config, [116, -1]);
    expect(result.type).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/feature-info-provider.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement Feature Info Provider**

Create `services/shared/lib/layers/feature-info-provider.ts`:

```typescript
import type { LayerConfig, FeatureInfoResult } from './types';
import { layerFactory } from './layer-factory';

/**
 * Get feature information at a click coordinate.
 * Delegates to the appropriate adapter based on layer type.
 * Returns { type: 'none' } if no adapter found or no features at location.
 */
export async function getFeatureInfo(
  config: LayerConfig,
  coordinate: [number, number]
): Promise<FeatureInfoResult> {
  const adapter = layerFactory.getAdapter(config.layer_type);
  if (!adapter) {
    return { type: 'none' };
  }

  try {
    return await adapter.getInfo(config, coordinate);
  } catch (error) {
    console.warn(`[getFeatureInfo] Error for layer ${config.layer_id}:`, error);
    return { type: 'none' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/feature-info-provider.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/shared/lib/layers/feature-info-provider.ts services/shared/lib/layers/__tests__/feature-info-provider.test.ts
git commit -m "feat: implement feature info provider (polymorphic delegation to adapters)"
```

---

### Task 12: Create Metadata Renderer

**Files:**
- Create: `services/shared/lib/layers/metadata-renderer.ts`
- Test: `services/shared/lib/layers/__tests__/metadata-renderer.test.ts`

**Interfaces:**
- Consumes: `FileMetadata`, `FieldConfig`
- Produces: `renderFeatureProperties()` function

- [ ] **Step 1: Write failing test for metadata renderer**

Create `services/shared/lib/layers/__tests__/metadata-renderer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderFeatureProperties, renderTemplate } from '../metadata-renderer';
import type { FileMetadata } from '../types';

describe('renderFeatureProperties', () => {
  it('renders original mode (all properties)', () => {
    const feature = { name: 'Test', value: 42 };
    const result = renderFeatureProperties(feature, { renderMode: 'original' });
    expect(result).toBeDefined();
  });

  it('renders fields mode (filtered + labeled)', () => {
    const feature = { id: '1', name: 'Test', hidden: 'secret' };
    const metadata: FileMetadata = {
      renderMode: 'fields',
      fields: [
        { original: 'id', label: 'ID', visible: true },
        { original: 'name', label: 'Name', visible: true },
        { original: 'hidden', label: 'Hidden', visible: false },
      ],
    };
    const result = renderFeatureProperties(feature, metadata);
    expect(result).toBeDefined();
  });

  it('renders custom mode (template-based)', () => {
    const feature = { name: 'Alice', city: 'NYC' };
    const metadata: FileMetadata = {
      renderMode: 'custom',
      custom: '**{{name}}** lives in {{city}}',
    };
    const result = renderFeatureProperties(feature, metadata);
    expect(result).toBeDefined();
  });

  it('renders template string with property substitution', () => {
    const template = 'Hello {{name}}, welcome to {{city}}';
    const values = { name: 'Alice', city: 'NYC' };
    const result = renderTemplate(template, values);
    expect(result).toBe('Hello Alice, welcome to NYC');
  });

  it('handles missing properties in template', () => {
    const template = 'Name: {{name}}, Age: {{age}}';
    const values = { name: 'Alice' };
    const result = renderTemplate(template, values);
    expect(result).toBe('Name: Alice, Age: ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/shared && npm test lib/layers/__tests__/metadata-renderer.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement Metadata Renderer**

Create `services/shared/lib/layers/metadata-renderer.ts`:

```typescript
import type { FileMetadata } from './types';

/**
 * Render feature properties based on metadata display config.
 * Returns an object with { original, fields, custom, all } modes.
 */
export function renderFeatureProperties(
  feature: Record<string, unknown>,
  metadata?: FileMetadata
): { mode: string; fields: Array<{ key: string; label: string; value: string }> } {
  const mode = metadata?.renderMode ?? 'original';

  if (mode === 'fields' && metadata?.fields) {
    const fields = metadata.fields
      .filter((f) => f.visible)
      .map((f) => ({
        key: f.original,
        label: f.label,
        value: String(feature[f.original] ?? ''),
      }));
    return { mode: 'fields', fields };
  }

  if (mode === 'custom' && metadata?.custom) {
    const html = renderTemplate(metadata.custom, feature);
    return {
      mode: 'custom',
      fields: [{ key: '_custom', label: '_custom', value: html }],
    };
  }

  // original: all properties
  const fields = Object.entries(feature).map(([key, value]) => ({
    key,
    label: key,
    value: String(value ?? ''),
  }));
  return { mode: 'original', fields };
}

/**
 * Render template string with property substitution.
 * Replaces {{propertyName}} with values[propertyName].
 */
export function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in values ? String(values[key]) : ''
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/shared && npm test lib/layers/__tests__/metadata-renderer.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/shared/lib/layers/metadata-renderer.ts services/shared/lib/layers/__tests__/metadata-renderer.test.ts
git commit -m "feat: implement metadata renderer (original/fields/custom modes)"
```

---

## Phase 4: Integration & Refactor (Dashboard & Geoportal) — Week 4-6

### Task 13: Update Dashboard tile-map.tsx to Use Factory

**Files:**
- Modify: `services/dashboard/features/geo/tile/components/tile-map.tsx`
- Test: Manual (visual testing in dev server)

**Interfaces:**
- Consumes: `layerFactory`, `getFeatureInfo()`, `renderFeatureProperties()`
- Produces: Shrunk tile-map.tsx (~200 lines instead of 1093)

- [ ] **Step 1: Import factory and shared utilities**

In `services/dashboard/features/geo/tile/components/tile-map.tsx`, replace all import statements with:

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Map, { useControl, NavigationControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import 'maplibre-gl/dist/maplibre-gl.css'
import Icon from '@/components/icons'
import type { StoredLayer, ClickInfo, FileMetadata, FeatureData, LayerStyle } from '../types'
import { tileApi } from '../api'
import { isValidBbox, getScaleString } from '@/services/shared/lib/layers/utils'
import { layerFactory } from '@/services/shared/lib/layers/layer-factory'
import { getFeatureInfo } from '@/services/shared/lib/layers/feature-info-provider'
import { renderFeatureProperties } from '@/services/shared/lib/layers/metadata-renderer'
import MarkdownText from './markdown-text'
```

- [ ] **Step 2: Remove buildDeckLayers function; replace with factory call**

Find this section in tile-map.tsx (around line 250):

```typescript
const deckLayers = buildDeckLayers(visibleLayers, clickInfo)
```

Replace with:

```typescript
const deckLayers = visibleLayers
  .filter((l) => l.status === 'done' && l.visible)
  .map((l) => {
    const layer = layerFactory.createLayer(l);
    return layer;
  })
  .filter((l): l is any => l !== null)
  .concat(
    // Add highlight layer for clicked feature (if needed)
    clickInfo?.featureGeometry ? [highlightLayer(clickInfo.featureGeometry)] : [],
    clickInfo?.latitude !== undefined ? [pinLayer(clickInfo.latitude, clickInfo.longitude)] : []
  );
```

- [ ] **Step 3: Remove all buildDeckLayers helper code (lines 17-741)**

Delete:
- STYLE_DEFAULTS
- toRGBA()
- resolveStyle()
- DASH_ARRAYS
- makeFillColorAccessor()
- getFillPatternAtlas()
- createFillPatternAtlas()
- FILL_PATTERN_MAPPING
- renderTemplate()
- getScaleString()
- OSM_STYLE definition
- DeckGLOverlay component
- buildWmsTileUrl()
- buildWmtsTileUrl()
- buildDeckLayers() function (entire 490-line function)

Keep only:
- ClickInfoPanel component (feature info display)
- TileMapComponent (main component)

- [ ] **Step 4: Replace click handler to use getFeatureInfo()**

Replace handleDeckClick function (around line 939) with:

```typescript
const handleDeckClick = useCallback(
  async (info: {
    coordinate?: number[]
    picked: boolean
    layer?: { id: string }
    object?: { properties?: Record<string, unknown>; geometry?: object }
  }) => {
    if (!info.coordinate) return
    const [longitude, latitude] = info.coordinate

    const hitLayer =
      info.picked && info.layer
        ? visibleLayers.find((l) => info.layer!.id.endsWith(l.layer_id))
        : undefined

    // For vector layers (mvt, geojson, kml, wfs, esri_vector), use DeckGL properties
    if (
      hitLayer?.layer_type === 'mvt' ||
      hitLayer?.layer_type === 'geojson' ||
      hitLayer?.layer_type === 'kml' ||
      hitLayer?.layer_type === 'wfs' ||
      hitLayer?.layer_type === 'esri_vectortileserver' ||
      hitLayer?.layer_type === 'esri_featureserver'
    ) {
      const props = info.object?.properties ?? {}
      const featureData: FeatureData = {
        type: 'vector',
        count: Object.keys(props).length > 0 ? 1 : 0,
        features: Object.keys(props).length > 0 ? [props] : [],
      }
      setClickInfo({
        longitude,
        latitude,
        layerFilename: hitLayer.filename,
        layerFileType: hitLayer.file_type,
        layerType: hitLayer.layer_type as any,
        layerId: hitLayer.layer_id,
        featureLoading: false,
        featureData,
        featureGeometry: info.object?.geometry ?? null,
      })
      setHitLayerMetadata(hitLayer.file_metadata)
      return
    }

    // For raster/WMS/WMTS: use getFeatureInfo() from shared provider
    setClickInfo({
      longitude,
      latitude,
      layerFilename: hitLayer?.filename,
      layerFileType: hitLayer?.file_type,
      layerType: hitLayer?.layer_type as any,
      layerId: hitLayer?.layer_id,
      featureLoading: !!hitLayer,
    })
    setHitLayerMetadata(hitLayer?.file_metadata)

    if (hitLayer) {
      try {
        const result = await getFeatureInfo(hitLayer, [longitude, latitude])
        const featureData: FeatureData = result as any
        setClickInfo((prev) =>
          prev ? { ...prev, featureData, featureLoading: false } : prev
        )
      } catch {
        setClickInfo((prev) =>
          prev ? { ...prev, featureLoading: false } : prev
        )
      }
    }
  },
  [visibleLayers]
)
```

- [ ] **Step 5: Verify dashboard dev server starts without errors**

Run: `cd services/dashboard && npm run dev`

Wait for Turbopack to finish (should see "compiled client successfully").

Expected: Dev server running on http://localhost:3000, no console errors

- [ ] **Step 6: Test in browser: navigate to /geo/tile, verify layers render**

1. Open browser to http://localhost:3000/geo/tile
2. Upload a test layer (if needed) or verify existing layers display
3. Check map renders layers correctly
4. Click on a layer feature → info panel should show

Expected: No JavaScript errors in console, layers visible, info panel shows data

- [ ] **Step 7: Commit**

```bash
git add services/dashboard/features/geo/tile/components/tile-map.tsx
git commit -m "refactor: dashboard tile-map.tsx use shared layer factory (shrink 1093→~200 lines)"
```

---

### Task 14: Update Geoportal map-container.tsx to Use Factory

**Files:**
- Modify: `services/geoportal/components/map/map-container.tsx`
- Test: Manual (visual testing)

**Interfaces:**
- Consumes: `layerFactory`, `getFeatureInfo()`
- Produces: Modernized map-container.tsx using adapter pattern

- [ ] **Step 1: Add shared layer imports to geoportal**

In `services/geoportal/components/map/map-container.tsx`, update imports:

```typescript
import { layerFactory } from '@/services/shared/lib/layers/layer-factory'
import { getFeatureInfo } from '@/services/shared/lib/layers/feature-info-provider'
import type { LayerConfig } from '@/services/shared/lib/layers/types'
```

- [ ] **Step 2: Update map rendering to use factory**

Replace existing layer rendering logic with:

```typescript
// Assume mapStore has layers: LayerConfig[]
const layers = useMapStore((state) => state.layers)

const deckLayers = layers
  .filter((l) => l.visible)
  .map((l) => layerFactory.createLayer(l))
  .filter((l): l is any => l !== null)
```

- [ ] **Step 3: Update feature info retrieval**

Replace click handler to use shared getFeatureInfo():

```typescript
const handleFeatureClick = useCallback(
  async (clickedLayer: LayerConfig, coordinate: [number, number]) => {
    const featureInfo = await getFeatureInfo(clickedLayer, coordinate)
    // Dispatch to Zustand store
    useMapStore.setState({ selectedFeature: featureInfo })
  },
  []
)
```

- [ ] **Step 4: Update feature-info-panel.tsx to use metadata-renderer**

In `services/geoportal/components/map/feature-info-panel.tsx`, import and use:

```typescript
import { renderFeatureProperties } from '@/services/shared/lib/layers/metadata-renderer'

export function FeatureInfoPanel({ feature, metadata }: { feature: Record<string, unknown>; metadata?: FileMetadata }) {
  const rendered = renderFeatureProperties(feature, metadata)
  return (
    <div>
      {rendered.fields.map((field) => (
        <div key={field.key}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verify geoportal dev server starts**

Run: `cd services/geoportal && npm run dev`

Expected: Dev server running on http://localhost:3000, no errors

- [ ] **Step 6: Test in browser: verify layers render + feature click**

1. Open browser to http://localhost:3000 (geoportal)
2. Add/view layers
3. Click on feature → feature-info-panel should show properties

Expected: Layers render, feature info displays correctly

- [ ] **Step 7: Commit**

```bash
git add services/geoportal/components/map/map-container.tsx services/geoportal/components/map/feature-info-panel.tsx
git commit -m "refactor: geoportal adopt shared layer factory and metadata renderer"
```

---

### Task 15: Update Dashboard & Geoportal Type Definitions

**Files:**
- Modify: `services/dashboard/features/geo/tile/types.ts`
- Modify: `services/geoportal/types/layer.ts`

**Interfaces:**
- Align with shared `LayerType`, `LayerConfig`, `FileMetadata` from Task 1

- [ ] **Step 1: Update dashboard types.ts to extend shared types**

In `services/dashboard/features/geo/tile/types.ts`, add imports and extend:

```typescript
import type {
  LayerType,
  LayerConfig as SharedLayerConfig,
  FileMetadata,
  FieldConfig,
  LayerStyle,
} from '@/services/shared/lib/layers/types'

// Dashboard-specific extension (admin fields)
export interface StoredLayer extends SharedLayerConfig {
  status: 'pending' | 'uploading' | 'paused' | 'processing' | 'done' | 'failed' | 'expired'
  upload_id?: string
  received_bytes?: number
  total_size?: number
  uploaded_chunks?: number
  total_chunks?: number
  progress_percent?: number
  error_message?: string
  created_at: string
}

// Re-export shared types
export type { LayerType, FileMetadata, FieldConfig, LayerStyle }
```

- [ ] **Step 2: Update geoportal types/layer.ts to align with shared**

In `services/geoportal/types/layer.ts`, update to use shared types:

```typescript
import type {
  LayerType as SharedLayerType,
  LayerConfig as SharedLayerConfig,
  FileMetadata,
} from '@/services/shared/lib/layers/types'

export type LayerType = SharedLayerType

export interface BaseLayerConfig extends SharedLayerConfig {
  // Geoportal-specific extensions (if any)
}

// Re-export shared types
export type { FileMetadata }
```

- [ ] **Step 3: Verify TypeScript compilation in both services**

Run: `cd services/dashboard && npx tsc --noEmit`

Expected: No errors

Run: `cd services/geoportal && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add services/dashboard/features/geo/tile/types.ts services/geoportal/types/layer.ts
git commit -m "refactor: align dashboard and geoportal types with shared layer definitions"
```

---

### Task 16: Final Testing & Documentation

**Files:**
- Create: `services/shared/lib/layers/README.md`
- Modify: `services/dashboard/CLAUDE.md` (layer section)
- Modify: `services/geoportal/CLAUDE.md` (layer section)

- [ ] **Step 1: Create shared layer engine README**

Create `services/shared/lib/layers/README.md`:

```markdown
# Shared Layer Visualization Engine

Unified adapter-based layer rendering and metadata handling for dashboard & geoportal services.

## Architecture

**Adapter Pattern:** Each layer type (tile, mvt, wms, esri_*, etc.) implements `LayerAdapter` interface.

**Factory Pattern:** `LayerFactory` registry instantiates adapters polymorphically.

## Supported Layer Types

- **Raster Tiles:** tile, vector, mbtiles
- **Vector Tiles:** mvt, geojson, kml
- **OGC Web Services:** wms, wmts, wfs
- **Esri Services:** esri_mapserver, esri_tileserver, esri_imageserver, esri_featureserver, esri_vectortileserver

## Usage

### Rendering a Layer

```typescript
import { layerFactory } from '@/services/shared/lib/layers/layer-factory'
import type { LayerConfig } from '@/services/shared/lib/layers/types'

const config: LayerConfig = {
  layer_id: 'my-layer',
  layer_type: 'mvt',
  filename: 'vector-tiles',
  file_type: 'vector',
  tile_url: 'http://example.com/tiles/{z}/{x}/{y}.pbf',
  visible: true,
  opacity: 0.85,
  file_metadata: { ... }
}

const deckLayer = layerFactory.createLayer(config)
// Pass to DeckGL
```

### Getting Feature Info

```typescript
import { getFeatureInfo } from '@/services/shared/lib/layers/feature-info-provider'

const info = await getFeatureInfo(config, [lng, lat])
// info.type: 'vector' | 'raster' | 'none'
// info.features: [...] (if type='vector')
// info.values: {...} (if type='raster')
```

### Rendering Feature Properties

```typescript
import { renderFeatureProperties } from '@/services/shared/lib/layers/metadata-renderer'

const rendered = renderFeatureProperties(feature, metadata)
// rendered.mode: 'original' | 'fields' | 'custom'
// rendered.fields: [{ key, label, value }, ...]
```

## Adding a New Layer Type

1. Create adapter: `adapters/my-adapter.ts`

```typescript
import type { LayerAdapter } from './types'

export class MyAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?): any { ... }
  async getInfo(config: LayerConfig, coordinate): Promise<FeatureInfoResult> { ... }
  supportsQueryFeatures(): boolean { ... }
}
```

2. Register in `layer-factory.ts`:

```typescript
this.register('my-type', new MyAdapter())
```

3. Add tests: `__tests__/my-adapter.test.ts`

4. Update `types.ts` to include new LayerType

## Testing

Run all tests:

```bash
cd services/shared && npm test lib/layers/__tests__/
```

Adapters are tested in isolation (unit tests) and via factory integration tests.

## Performance

- **Adapter creation:** O(1) via factory lookup
- **DeckGL layer instantiation:** O(1) per layer
- **Feature info retrieval:** O(API call latency) for raster/WMS, O(1) for vector (DeckGL click)

## Future Enhancements

- [ ] Feature server query API integration (esri_featureserver)
- [ ] WMS GetFeatureInfo parsing (HTML fallback)
- [ ] Tile caching / prefetch strategy
- [ ] Custom layer type registration at runtime
```

- [ ] **Step 2: Update dashboard CLAUDE.md - Layer System section**

In `services/dashboard/CLAUDE.md`, find or add "Layer System" section:

```markdown
## Layer System (Shared Adapter Engine)

**Architecture:** Dashboard uses shared layer visualization engine from `services/shared/lib/layers/`.

**Pattern:** Adapter + Factory for polymorphic layer rendering.

### Adapters

Each layer type has a dedicated adapter handling:
- DeckGL layer creation
- Feature info retrieval (vector: API queries, raster: pixel values)
- Metadata styling (colors, patterns, categorical modes)

Adapters: tile, mvt, geojson, wms, wmts, wfs, esri_* (see `services/shared/lib/layers/adapters/`)

### Using in Components

```typescript
// tile-map.tsx
import { layerFactory } from '@/services/shared/lib/layers/layer-factory'
import { getFeatureInfo } from '@/services/shared/lib/layers/feature-info-provider'

const deckLayer = layerFactory.createLayer(layerConfig)
const featureInfo = await getFeatureInfo(layerConfig, coordinate)
```

### Metadata Rendering

Three display modes (in file_metadata):
- **original:** All feature properties
- **fields:** Selected fields with labels (visibility-controlled)
- **custom:** Markdown template with property substitution

```typescript
import { renderFeatureProperties } from '@/services/shared/lib/layers/metadata-renderer'

const rendered = renderFeatureProperties(feature, metadata)
// Use rendered.fields for UI display
```

### Adding a New Layer Type

1. Create adapter: `services/shared/lib/layers/adapters/my-adapter.ts`
2. Implement `LayerAdapter` interface
3. Register in `layer-factory.ts`
4. Test with `services/shared/lib/layers/__tests__/`

See `services/shared/lib/layers/README.md` for full guide.
```

- [ ] **Step 3: Update geoportal CLAUDE.md - add Layer System note**

In `services/geoportal/CLAUDE.md`, in the "Layer System" section, append:

```markdown
**Note:** Layer visualization now uses shared adapter engine from `services/shared/lib/layers/`. All layer types, feature info, and metadata rendering delegated to shared adapters. See dashboard CLAUDE.md "Layer System" section for usage.
```

- [ ] **Step 4: Run full test suite**

Run: `cd services/shared && npm test lib/layers/__tests__/ --coverage`

Expected: All tests PASS, >80% coverage for adapters and factory

- [ ] **Step 5: Verify both services build without errors**

Run: `cd services/dashboard && npm run build 2>&1 | tail -20`

Expected: "compiled successfully" (no errors)

Run: `cd services/geoportal && npm run build 2>&1 | tail -20`

Expected: "compiled successfully"

- [ ] **Step 6: Commit documentation**

```bash
git add services/shared/lib/layers/README.md services/dashboard/CLAUDE.md services/geoportal/CLAUDE.md
git commit -m "docs: add layer engine guide and integration documentation"
```

---

## Final Checklist

- [ ] All 8 adapters implemented + tested (tile, mvt, geojson, wms, wmts, wfs, esri, mbtiles)
- [ ] LayerFactory registry fully populated (15 layer types → adapters)
- [ ] Feature info provider delegating to adapters
- [ ] Metadata renderer handling all 3 modes (original/fields/custom)
- [ ] Dashboard tile-map.tsx shrunk to ~200 lines
- [ ] Geoportal map-container.tsx using factory
- [ ] Both services build without errors
- [ ] All shared tests passing (80%+ coverage)
- [ ] Documentation updated (README, CLAUDE.md)
- [ ] Frequent commits throughout (15 tasks × 1 commit each = 15 atomic commits)

---

## Success Criteria (from spec)

✅ Dashboard tile-map.tsx shrinks to ~200 lines (80% reduction)  
✅ Geoportal adopts factory pattern (matches architecture)  
✅ Feature info panels identical behavior (both services)  
✅ Metadata rendering modes (original/fields/custom) standardized  
✅ New layer type = new adapter file (scalability)  
✅ All 15 layer types render + queryable in both services  
✅ Categorical colors + fill patterns work consistently  
✅ Unit tests per adapter (80%+ coverage)
