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
