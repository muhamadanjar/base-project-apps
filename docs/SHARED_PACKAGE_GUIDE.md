# @base-project/shared Package Guide

Unified layer visualization system for geospatial services (dashboard, geoportal).

## Overview

`@base-project/shared` provides adapter-based layer factory for 15+ geospatial layer types: tile, vector, MVT, WMS, WMTS, WFS, Esri MapServer/FeatureServer/TileServer/ImageServer/VectorTileServer, KML, GeoJSON.

## Installation

### 1. Add to Service package.json

```json
{
  "dependencies": {
    "@base-project/shared": "workspace:*"
  }
}
```

**Important:** Use `workspace:*` protocol (not just `*`). This tells pnpm to resolve from local workspace.

### 2. Install Dependencies

```bash
cd /path/to/monorepo
pnpm install
```

## Usage

### Layer Factory

```typescript
import { layerFactory } from '@base-project/shared/layer-factory'

// Create DeckGL layer
const deckLayer = layerFactory.createLayer(layerConfig, clickHandler)

// Get adapter for custom operations
const adapter = layerFactory.getAdapter('wms')
```

### Feature Info (Click Handler)

```typescript
import { getFeatureInfo } from '@base-project/shared/feature-info-provider'

const featureInfo = await getFeatureInfo(layerConfig, coordinate)
// Returns: { type: 'vector'|'raster'|'wms'|'none', count, features, values, ... }
```

### Metadata Rendering

```typescript
import { renderFeatureProperties } from '@base-project/shared/metadata-renderer'

// Mode 1: Show all properties
renderFeatureProperties(feature, { renderMode: 'original' })

// Mode 2: Select visible fields
renderFeatureProperties(feature, {
  renderMode: 'fields',
  fields: [
    { original: 'name', label: 'Name', visible: true },
    { original: 'population', label: 'Pop', visible: true },
  ],
})

// Mode 3: Custom template
renderFeatureProperties(feature, {
  renderMode: 'custom',
  custom: '<strong>{{ name }}</strong><br>Pop: {{ population }}',
})
```

### Style Helpers

```typescript
import { resolveStyle, toRGBA } from '@base-project/shared/style-helpers'

const pointStyle = resolveStyle(config.file_metadata?.style, 'Point')
const rgba = toRGBA([255, 0, 0], 0.8)
```

## Types

Import from `@base-project/shared`:

```typescript
import type {
  LayerConfig,
  LayerType,
  LayerStyle,
  PointStyle,
  LineStringStyle,
  PolygonStyle,
  CategoricalStyle,
  FileMetadata,
  TileProcess,
  DownloadProcess,
  FeatureInfoResult,
  FieldConfig,
  FileType,
} from '@base-project/shared'
```

## Layer Config Example

```typescript
const config: LayerConfig = {
  layer_id: 'layer-123',
  layer_type: 'mvt',
  filename: 'boundaries.json',
  file_type: 'vector',
  tile_url: 'https://tiles.example.com/boundaries/{z}/{x}/{y}.pbf',
  visible: true,
  opacity: 0.8,
  bbox: [-180, -90, 180, 90],
  file_metadata: {
    style: {
      Point: {
        fillColor: [74, 144, 226],
        strokeColor: [255, 255, 255],
        pointRadius: 6,
        opacity: 0.9,
      },
      Polygon: {
        fillColor: [74, 144, 226],
        fillPattern: 'solid',
        strokeColor: [0, 0, 0],
        strokeWidth: 1,
        opacity: 0.7,
        colorMode: 'categorical',
        categoricalFill: {
          field: 'type',
          colorMap: {
            residential: [200, 100, 100],
            commercial: [100, 100, 200],
          },
          defaultColor: [200, 200, 200],
        },
      },
    },
    renderMode: 'fields',
    fields: [
      { original: 'name', label: 'Name', visible: true },
      { original: 'type', label: 'Type', visible: true },
    ],
  },
}
```

## Layer Types Supported

| Type | Input | Output | Feature Info |
|------|-------|--------|--------------|
| `tile` | PNG/JPEG tiles | Raster layer | Pixel value |
| `vector` | Vector tiles (raster) | Raster layer | Pixel value |
| `mvt` | Mapbox vector tiles | Vector layer | Feature properties |
| `mbtiles` | MBTiles database | Raster layer | Pixel value |
| `geojson` | GeoJSON URL/data | Vector layer | Feature properties |
| `kml` | KML URL | Vector layer | Feature properties |
| `wms` | WMS GetMap URL | Raster layer | GetFeatureInfo |
| `wmts` | WMTS GetTile URL | Raster layer | Pixel value |
| `wfs` | WFS GetFeature URL | Vector layer | WFS features |
| `esri_mapserver` | ArcGIS MapServer | Raster layer | Identify |
| `esri_tileserver` | ArcGIS TileServer | Raster layer | Pixel value |
| `esri_imageserver` | ArcGIS ImageServer | Raster layer | Pixel value |
| `esri_featureserver` | ArcGIS FeatureServer | Vector layer | Query results |
| `esri_vectortileserver` | ArcGIS VectorTileServer | Vector layer | Feature properties |

## Adding New Layer Type

1. Create adapter: `services/shared/lib/layers/adapters/mytype-adapter.ts`

```typescript
import type { LayerAdapter } from './types'
import type { LayerConfig, FeatureInfoResult } from '../types'

export class MytypeAdapter implements LayerAdapter {
  createDeckLayer(config: LayerConfig, onClick?: (info: any) => void): any {
    // Return DeckGL layer
  }

  async getInfo(config: LayerConfig, coordinate: [number, number]): Promise<FeatureInfoResult> {
    // Fetch and return feature info
  }

  supportsQueryFeatures(): boolean {
    return true // or false
  }
}
```

2. Register in factory: `services/shared/lib/layers/layer-factory.ts`

```typescript
import { MytypeAdapter } from './adapters/mytype-adapter'

layerFactory.register('mytype', new MytypeAdapter())
```

3. Update type union: `services/shared/lib/layers/types.ts`

```typescript
export type LayerType = 'tile' | 'mvt' | ... | 'mytype'
```

4. Export in barrel: `services/shared/lib/layers/index.ts` (auto-exported via `export *`)

## Workspace Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - 'services/**'
```

### Package.json Dependencies

**Root (package.json):**
```json
{
  "name": "base-project-apps",
  "workspaces": ["services/shared", "services/dashboard", "services/geoportal"],
  "private": true
}
```

**Service (services/dashboard/package.json):**
```json
{
  "dependencies": {
    "@base-project/shared": "workspace:*"
  }
}
```

## Module Resolution

### Next.js Config (next.config.mjs)

```javascript
const nextConfig = {
  transpilePackages: ['@base-project/shared'],
  // ... other config
}
```

### TypeScript Config (tsconfig.json)

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Troubleshooting

### "Cannot find module '@base-project/shared'"

**Check:**
1. `workspace:*` in package.json (not `*`)
2. `pnpm install` ran successfully
3. `@base-project/shared` exists at `services/shared/`
4. tsconfig.json has `"moduleResolution": "bundler"`

### "Module not found: @deck.gl/..."

**Check:**
1. `pnpm install` at root completed
2. `services/shared/node_modules/@deck.gl/` exists
3. `transpilePackages: ['@base-project/shared']` in next.config.mjs

### Layer Not Rendering

**Check:**
1. `layer.visible === true`
2. `layer.layer_type` registered in factory
3. `layer.tile_url` is correct and accessible
4. DeckGL layer has required props (id, data, etc.)

### Feature Click Not Working

**Check:**
1. Layer has `supportsQueryFeatures() === true`
2. Adapter implements `getInfo()` method
3. Click handler registered: `layerFactory.createLayer(config, clickHandler)`
4. Backend query endpoint working (for WMS, WFS, etc.)

## Performance Tips

- **Memoize layers:** Use `useMemo()` to avoid recreating DeckGL layer array on every render
- **Debounce updates:** Debounce click handlers and style changes
- **Lazy load adapters:** Import adapters only when needed
- **Cache tile responses:** Use TileServiceFactory + TileCache for efficient tile management

## Related Docs

- `services/shared/lib/layers/README.md` - Detailed API docs
- `services/dashboard/CLAUDE.md` - Dashboard integration example
- `services/geoportal/CLAUDE.md` - Geoportal integration example
