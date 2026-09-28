import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { OsmWebMap, type MapMarker } from '@/components/maps/OsmWebMap';
import type { MapCoordinate } from '@/types';

export type { MapMarker };

type Props = {
  style?: StyleProp<ViewStyle>;
  center: MapCoordinate;
  zoom?: number;
  userLocation?: MapCoordinate | null;
  destination?: MapCoordinate | null;
  route?: MapCoordinate[];
  markers?: MapMarker[];
  followUser?: boolean;
  navigationMode?: boolean;
  heading?: number;
  onPressMap?: (point: MapCoordinate) => void;
};

/** Mapa de inride: OpenStreetMap (Leaflet en WebView). Sin Google Maps. */
export function AppMap(props: Props) {
  return <OsmWebMap {...props} style={[styles.fill, props.style]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
