# Unified Layer Visualization & Metadata Design

**Date:** 2026-06-26  
**Goal:** Standardize geospatial layer rendering + metadata handling across dashboard (admin) and geoportal (public browse) services.  
**Approach:** Adapter pattern + shared library (quick refactor, incremental migration)  
**Timeline:** 4-6 weeks  

---

## Architecture

### Core Principle

**Separate concerns:**
- **Dashboard:** Upload, processing, styling, format conversion (admin UX)
- **Geoportal:** Viewing, interaction, feature querying (public browse)
- **Shared layer engine:** DeckGL rendering, feature info retrieval, metadata display (both services)

**Adapter pattern** for layer types:
- Each type (tile, mvt, wms, esri_*, etc.) → one adapter file
- Adapter handles: DeckGL layer creation, feature info retrieval, metadata styling
- Factory registry for polymorphic instantiation
- No type-switching in shared code; adapters encapsulate logic

---

## Directory Structure

```
services/
├── dashboard/
│   └── features/geo/tile/
│       ├── components/
│       │   ├── tile-map.tsx (shrinks, delegates to factory)
│       │   ├── layer-list.tsx
│       │   ├── layer-style-panel.tsx (uses shared metadata renderer)
│       │   └── ...
│       ├── api.ts (unchanged)
│       └── types.ts (unchanged)
├── geoportal/
│   ├── components/
│   │   ├── map/
│   │   │   ├── map-container.tsx (uses shared factory)
│   │   │   ├── feature-info-panel.tsx (uses shared feature-info)
│   │   │   └── ...
│   │   └── sidebar/
│   │       └── layer-manager-panel.tsx (uses shared metadata renderer)
│   └── types/ (unchanged)
└── shared/
    └── lib/
        └── layers/
            ├── adapters/
            │   ├── types.ts (LayerAdapter interface)
            │   ├── tile-adapter.ts (tile, vector)
            │   ├── mvt-adapter.ts (mvt + categorical colors + patterns)
            │   ├── geojson-adapter.ts (geojson, kml)
            │   ├── wms-adapter.ts (wms GetMap + GetFeatureInfo)
            │   ├── wmts-adapter.ts (wmts)
            │   ├── wfs-adapter.ts (wfs GetFeature)
            │   ├── esri-adapter.ts (esri_mapserver, esri_tileserver, esri_imageserver, esri_featureserver, esri_vectortileserver)
            │   └── mbtiles-adapter.ts (mbtiles)
            ├── layer-factory.ts (adapter registry + createLayer)
            ├── feature-info-provider.ts (polymorphic getInfo delegation)
            ├── metadata-renderer.ts (original/fields/custom modes)
            ├── style-helpers.ts (categorical colors, fill patterns, dash arrays)
            ├── utils.ts (geometry helpers, bbox validation)
            └── types.ts (shared interfaces)
```

---

## Shared Types & Interfaces

**`services/shared/lib/layers/types.ts`** — Single source of truth for layer definitions.

```typescript
// Unified layer type union (dashboard + geoportal use same)
export type LayerType = 
  | 'tile' | 'vector' | 'mvt' | 'mbtiles' | 'geojson' | 'kml'
  | 'wms' | 'wmts' | 'wfs'
  | 'esri_mapserver' | 'esri_tileserver' | 'esri_imageserver' 
  | 'esri_featureserver' | 'esri_vectortileserver';

// Unified layer config (minimal; services extend with admin-only fields)
export interface LayerConfig {
  layer_id: string;
  layer_type: LayerType;
  filename: string;
  file_type: 'vector' | 'raster' | 'external';
  tile_url: string;
  visible: boolean;
  opacity: number;
  bbox?: [number, number, number, number];
  file_metadata?: FileMetadata;
}

// Metadata (shared across services)
export interface FileMetadata {
  style?: LayerStyle;
  renderMode?: 'original' | 'fields' | 'custom';
  fields?: FieldConfig[];
  custom?: string; // template string for custom render
  [key: string]: unknown;
}

export interface LayerStyle {
  Point?: PointStyle;
  LineString?: LineStringStyle;
  Polygon?: PolygonStyle;
  categoricalFill?: CategoricalStyle;
  categoricalLine?: CategoricalStyle;
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

// Feature info result (polymorphic)
export type FeatureInfoResult = 
  | { type: 'vector'; count: number; features: Record<string, unknown>[] }
  | { type: 'raster'; count: number; values: Record<string, number> }
  | { type: 'none' };

// Click info for map click handler
export interface MapClickInfo {
  coordinate: [number, number];
  layerId: string;
  layerType: LayerType;
  featureGeometry?: any;
}
```

---

## Adapter Interface

**`services/shared/lib/layers/adapters/types.ts`**

```typescript
export interface LayerAdapter {
  /**
   * Create DeckGL layer from config.
   * @param config Layer configuration
   * @param onClick Click handler for feature queries
   * @returns DeckGL Layer or null if invalid
   */
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any;

  /**
   * Get feature info at click location.
   * @param config Layer configuration
   * @param coordinate [lng, lat]
   * @returns FeatureInfoResult (vector/raster/none)
   */
  getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult>;

  /**
   * Check if adapter supports querying features at a location.
   * @returns true if adapter can retrieve feature info
   */
  supportsQueryFeatures(): boolean;
}
```

---

## Adapter: MVT (Example)

**`services/shared/lib/layers/adapters/mvt-adapter.ts`** (most complex; shows pattern)

Handles:
- MVT vector tiles (protobuf decoding via DeckGL)
- Categorical coloring per geometry type
- Fill + stroke patterns (hatched, cross-hatched, dotted)
- Feature info retrieval via bounding-box queries

```typescript
import { MVTLayer, GeoJsonLayer } from '@deck.gl/geo-layers';
import { PathStyleExtension, FillStyleExtension } from '@deck.gl/extensions';
import type { LayerAdapter, LayerConfig, FeatureInfoResult } from './types';
import { resolveStyle, makeFillColorAccessor, DASH_ARRAYS, getFillPatternAtlas, FILL_PATTERN_MAPPING } from '../style-helpers';
import { isValidBbox } from '../utils';

export class MVTAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void) {
    const style = config.file_metadata?.style;
    const poly = resolveStyle(style, 'Polygon');
    const line = resolveStyle(style, 'LineString');
    const point = resolveStyle(style, 'Point');

    // ... MVP pattern logic (dash arrays, fill patterns, categorical colors)
    // See dashboard tile-map.tsx lines 420-502 for reference

    return new MVTLayer({
      id: `mvt-${config.layer_id}`,
      data: config.tile_url,
      pickable: true,
      opacity: config.opacity ?? 0.85,
      // ... style props
      renderSubLayers: (props) => {
        // Handle patterns + categorical coloring per geometry
        // ...
      },
    });
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // Query API for features in bbox around coordinate
    // Return vector | none
    try {
      const [lng, lat] = coordinate;
      const resp = await tileApi.queryFeatures(config.layer_id, lng, lat);
      return {
        type: 'vector',
        count: resp.data?.features?.length ?? 0,
        features: resp.data?.features ?? [],
      };
    } catch {
      return { type: 'none' };
    }
  }

  supportsQueryFeatures(): boolean {
    return true; // MVT features queryable via API
  }
}
```

---

## Other Adapters (Outline)

**Tile/Vector adapters** — BitmapLayer (raster tiles from tileserver)  
**GeoJSON/KML adapters** — GeoJsonLayer (direct inline GeoJSON)  
**WMS adapter** — TileLayer + async fetch WMS GetMap tiles + GetFeatureInfo HTTP calls  
**WMTS adapter** — TileLayer + WMTS URL template  
**WFS adapter** — GeoJsonLayer fetching from WFS GetFeature endpoint  
**Esri adapters** — One adapter handling all 5 esri_* types via polymorphism  
**MBTiles adapter** — BitmapLayer (same as tile/vector but flag type=mbtiles for UI)

Each adapter ~100-300 lines. See dashboard tile-map.tsx buildDeckLayers (lines 254-502) for reference implementations.

---

## Layer Factory

**`services/shared/lib/layers/layer-factory.ts`**

```typescript
export class LayerFactory {
  private adapters = new Map<LayerType, LayerAdapter>();

  constructor() {
    // Register all adapters
    this.register('tile', new TileAdapter());
    this.register('mvt', new MVTAdapter());
    this.register('geojson', new GeoJsonAdapter());
    this.register('kml', new KMLAdapter());
    this.register('wms', new WMSAdapter());
    // ... etc
  }

  register(type: LayerType, adapter: LayerAdapter): void {
    this.adapters.set(type, adapter);
  }

  createLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    const adapter = this.adapters.get(config.layer_type);
    if (!adapter) return null;
    return adapter.createDeckLayer(config, onClick);
  }

  getAdapter(type: LayerType): LayerAdapter | undefined {
    return this.adapters.get(type);
  }
}

export const layerFactory = new LayerFactory();
```

---

## Feature Info Provider

**`services/shared/lib/layers/feature-info-provider.ts`**

Delegates to adapter's `getInfo()` method. Polymorphic — no type-switching.

```typescript
export async function getFeatureInfo(
  config: LayerConfig,
  coordinate: [number, number]
): Promise<FeatureInfoResult> {
  const adapter = layerFactory.getAdapter(config.layer_type);
  if (!adapter) return { type: 'none' };
  return adapter.getInfo(config, coordinate);
}
```

---

## Metadata Renderer

**`services/shared/lib/layers/metadata-renderer.ts`**

Shared logic for displaying feature properties in 3 modes:
- **original:** Show all properties as-is
- **fields:** Show only configured fields (visibility + labels)
- **custom:** Render markdown template with property substitution

Used by both dashboard (admin layer detail panel) and geoportal (feature info slide-in).

```typescript
export function renderFeatureProperties(
  feature: Record<string, unknown>,
  metadata?: FileMetadata
): React.ReactNode {
  const mode = metadata?.renderMode ?? 'original';

  if (mode === 'fields' && metadata?.fields) {
    return metadata.fields
      .filter((f) => f.visible)
      .map((f) => (
        <div key={f.original}>
          <dt>{f.label}</dt>
          <dd>{String(feature[f.original] ?? '')}</dd>
        </div>
      ));
  }

  if (mode === 'custom' && metadata?.custom) {
    const html = renderTemplate(metadata.custom, feature);
    return <MarkdownText text={html} />;
  }

  // original: all properties
  return Object.entries(feature).map(([k, v]) => (
    <div key={k}>
      <dt>{k}</dt>
      <dd>{String(v ?? '')}</dd>
    </div>
  ));
}
```

---

## Integration Points

### Dashboard (`tile-map.tsx` shrinks)

**Before:** 1093 lines, all layer types + click handling + metadata rendering inline

**After:** ~200 lines
- Import factory + adapters
- Pass config to `layerFactory.createLayer()`
- Click handler delegates to `getFeatureInfo()`
- Metadata rendering delegates to `renderFeatureProperties()`

### Geoportal (`map-container.tsx` modernizes)

**Before:** MapContainer uses old layer logic, feature-info-panel manually renders

**After:** Uses same factory + feature-info-provider + metadata-renderer

---

## Data Flow

### Rendering

```
dashboard/geoportal layer list
    ↓
LayerConfig[] (from API)
    ↓
for each layer: layerFactory.createLayer(config)
    ↓ (adapter.createDeckLayer)
DeckGL Layer[] 
    ↓
MapLibre + DeckGL render
```

### Feature Info on Click

```
User clicks map → coordinate [lng, lat] + layerId
    ↓
getFeatureInfo(layerConfig, coordinate)
    ↓ (delegates to adapter.getInfo)
FeatureInfoResult (vector | raster | none)
    ↓
renderFeatureProperties(feature, metadata)
    ↓
Feature info panel displays (both dashboard & geoportal)
```

---

## Error Handling

### Layer Creation Failures

If adapter.createDeckLayer() returns null:
- Log warning: `"Failed to create DeckGL layer for type=${type}"`
- Return null from factory
- Map skips null layers (existing DeckGL behavior)
- UI shows placeholder: "Layer type X not supported"

### Feature Info Failures

If adapter.getInfo() throws:
- Catch error in `getFeatureInfo()`
- Log warning with layer ID + error
- Return `{ type: 'none' }`
- UI shows: "Could not retrieve feature info"

### Missing Adapter

If layer type not registered:
- `layerFactory.getAdapter(type)` returns undefined
- `getFeatureInfo()` returns `{ type: 'none' }`
- UI gracefully skips feature info

---

## Testing

### Unit Tests (per adapter)

Each adapter tested in isolation (no DeckGL instance needed):

```typescript
// test/adapters/mvt-adapter.test.ts
describe('MVTAdapter', () => {
  it('createDeckLayer returns MVTLayer with correct config', () => {
    const adapter = new MVTAdapter();
    const config: LayerConfig = { /* ... */ };
    const layer = adapter.createDeckLayer(config);
    expect(layer).toBeInstanceOf(MVTLayer);
    expect(layer.props.data).toBe(config.tile_url);
  });

  it('getInfo queries API and returns vector result', async () => {
    // Mock tileApi.queryFeatures()
    // Call adapter.getInfo()
    // Assert FeatureInfoResult shape
  });
});
```

### Integration Tests

Layer factory + adapters together:

```typescript
describe('LayerFactory', () => {
  it('registers all adapters on init', () => {
    const factory = new LayerFactory();
    expect(factory.getAdapter('mvt')).toBeDefined();
    expect(factory.getAdapter('wms')).toBeDefined();
  });

  it('createLayer delegates to correct adapter', () => {
    const config: LayerConfig = { layer_type: 'mvt', /* ... */ };
    const layer = factory.createLayer(config);
    expect(layer).toBeDefined();
  });
});
```

### E2E Tests (dashboard & geoportal separately)

Render map, click feature, verify info panel shows correct properties (via dashboard & geoportal UI tests).

---

## Migration Path (Incremental)

**Phase 1 (Week 1-2):** Extract shared layer types + factory + 3 adapters (tile, mvt, geojson)
- Both services use factory for those types
- Test: layer renders correctly, feature click works

**Phase 2 (Week 2-3):** Extract remaining adapters (wms, wfs, wmts, esri_*, mbtiles)
- Dashboard tile-map.tsx shrinks by ~500 lines
- Both services fully use factory

**Phase 3 (Week 3-4):** Extract metadata renderer + style helpers
- Both services use renderFeatureProperties()
- Categorical colors + patterns consistently styled

**Phase 4 (Week 4-6):** Polish + testing + docs
- Unit tests per adapter
- Integration tests for factory
- Update CLAUDE.md for both services

---

## Success Criteria

✅ Dashboard tile-map.tsx shrinks to ~200 lines (80% reduction)  
✅ Geoportal adopts factory pattern (matches architecture)  
✅ Feature info panels identical behavior (both services)  
✅ Metadata rendering modes (original/fields/custom) standardized  
✅ New layer type = new adapter file (scalability)  
✅ All 15 layer types render + queryable in both services  
✅ Categorical colors + fill patterns work consistently  
✅ Unit tests per adapter (80%+ coverage)  

---

## Known Constraints

- **Geoportal WMS GetFeatureInfo:** May need adjustment (currently uses different parsing)
- **Esri Token Handling:** Centralize in esri-adapter (avoid duplication)
- **API Versioning:** If dashboard/geoportal call different tile service versions, adapter abstracts differences
- **Style Serialization:** FileMetadata.style must remain JSON-serializable (no function props)

---

## Files to Create

```
services/shared/lib/layers/
├── types.ts
├── adapters/
│   ├── types.ts
│   ├── tile-adapter.ts
│   ├── mvt-adapter.ts
│   ├── geojson-adapter.ts
│   ├── kml-adapter.ts
│   ├── wms-adapter.ts
│   ├── wmts-adapter.ts
│   ├── wfs-adapter.ts
│   ├── esri-adapter.ts
│   └── mbtiles-adapter.ts
├── layer-factory.ts
├── feature-info-provider.ts
├── metadata-renderer.ts
├── style-helpers.ts
└── utils.ts
```

## Files to Modify

```
services/dashboard/
├── features/geo/tile/components/tile-map.tsx (shrink + import factory)
├── features/geo/tile/types.ts (keep, align with shared types)
└── features/geo/tile/api.ts (keep)

services/geoportal/
├── components/map/map-container.tsx (switch to factory)
├── components/map/feature-info-panel.tsx (use metadata-renderer)
├── types/layer.ts (align with shared types)
└── types/tileserver.ts (keep)
```

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Adapter API too generic (can't handle edge cases) | Design adapters first, iterate on interface before implementation |
| Geoportal resistance to new architecture | Show working tile + mvt adapters first (proof of concept) |
| Missing layer type coverage | Document all 15 types → adapter mapping upfront |
| Feature info API differences (dashboard vs geoportal backends) | Abstract API differences in adapters, test with both backends |
| Metadata serialization issues (style objects) | Enforce JSON schema validation on FileMetadata in types |

