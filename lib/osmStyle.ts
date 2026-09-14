import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Raster tiles. No Google Maps key required. */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  name: 'OpenStreetMap',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};
