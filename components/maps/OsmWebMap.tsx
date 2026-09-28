import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { downsampleRoute, isValidLatLng } from '@/lib/routing';
import type { MapCoordinate } from '@/types';

export type MapMarker = {
  id: string;
  coordinate: MapCoordinate;
  color?: string;
  label?: string;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  center: MapCoordinate;
  zoom?: number;
  userLocation?: MapCoordinate | null;
  destination?: MapCoordinate | null;
  route?: MapCoordinate[];
  markers?: MapMarker[];
  followUser?: boolean;
  /** Modo navegación: zoom cercano, auto centrado y rumbo del auto. */
  navigationMode?: boolean;
  heading?: number;
  onPressMap?: (point: MapCoordinate) => void;
};

const DURANGO: MapCoordinate = { latitude: 25.555, longitude: -103.45 };

function sanitize(point: MapCoordinate | null | undefined, fallback: MapCoordinate = DURANGO): MapCoordinate {
  return isValidLatLng(point) ? point : fallback;
}

function buildHtml(initial: MapCoordinate, zoom: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#c5d5cc; }
    .dot { width:16px; height:16px; border-radius:999px; background:#2b7cff; border:3px solid #fff; box-shadow:0 0 0 6px rgba(43,124,255,.22); }
    .pin { width:18px; height:18px; border-radius:999px; border:3px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.25); }
    .car {
      width:34px; height:34px; border-radius:999px; background:#111b17; color:#fff;
      display:flex; align-items:center; justify-content:center; border:3px solid #fff;
      font-size:16px; box-shadow:0 4px 14px rgba(0,0,0,.35);
      transform-origin:50% 50%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      if (!window.L) {
        document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif;color:#16362f">Sin conexión al mapa</div>';
        return;
      }
      var map = L.map('map', { zoomControl: false, attributionControl: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OSM'
      }).addTo(map);
      map.setView([${initial.latitude}, ${initial.longitude}], ${zoom});

      var userMarker = null;
      var destMarker = null;
      var routeLine = null;
      var extra = {};
      var fittedKey = '';
      var lastNav = { lat: 0, lng: 0, heading: 0 };

      function iconHtml(html) {
        return L.divIcon({ className: '', html: html, iconSize: [34, 34], iconAnchor: [17, 17] });
      }
      function valid(p) {
        return p && typeof p.latitude === 'number' && typeof p.longitude === 'number'
          && isFinite(p.latitude) && isFinite(p.longitude);
      }
      function post(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
        }
      }
      function resize() {
        try { map.invalidateSize(true); } catch (e) {}
      }

      function carHtml(heading) {
        var rot = Number(heading) || 0;
        return '<div class="car" style="transform:rotate(' + rot + 'deg)">➤</div>';
      }

      window.__moveCar = function (lat, lng, follow, heading, navZoom) {
        if (!valid({ latitude: lat, longitude: lng })) return;
        var ll = [lat, lng];
        var h = Number(heading) || 0;
        if (!extra.car) {
          extra.car = L.marker(ll, { icon: iconHtml(carHtml(h)), zIndexOffset: 900 }).addTo(map);
        } else {
          extra.car.setLatLng(ll);
          extra.car.setIcon(iconHtml(carHtml(h)));
        }
        if (follow) {
          var z = navZoom || 17;
          // Centra el auto un poco más abajo para ver el camino por delante (estilo Google Maps)
          try {
            var target = map.project(ll, z);
            target.y = target.y - map.getSize().y * 0.18;
            var center = map.unproject(target, z);
            map.setView(center, z, { animate: true, duration: 0.45 });
          } catch (e) {
            map.setView(ll, z, { animate: true, duration: 0.45 });
          }
          lastNav = { lat: lat, lng: lng, heading: h };
        }
      };

      window.__applyMapState = function (state) {
        if (!state) return;
        resize();
        var center = valid(state.center) ? state.center : { latitude: ${initial.latitude}, longitude: ${initial.longitude} };
        var zoom = state.zoom || ${zoom};
        var nav = !!state.navigationMode;

        var routeKey = (state.route && state.route.length)
          ? (state.route[0].latitude + ',' + state.route[0].longitude + ':' + state.route.length)
          : '';

        // En navegación no hacemos fitBounds (echa el zoom atrás); solo en overview.
        if (!nav && state.fit && state.route && state.route.length > 1 && routeKey !== fittedKey) {
          fittedKey = routeKey;
          var latlngs = [];
          for (var i = 0; i < state.route.length; i++) {
            if (valid(state.route[i])) latlngs.push([state.route[i].latitude, state.route[i].longitude]);
          }
          if (valid(state.userLocation)) {
            latlngs.push([state.userLocation.latitude, state.userLocation.longitude]);
          }
          if (valid(state.destination)) {
            latlngs.push([state.destination.latitude, state.destination.longitude]);
          }
          if (latlngs.length > 1) {
            try {
              map.fitBounds(latlngs, {
                paddingTopLeft: [48, 140],
                paddingBottomRight: [48, 280],
                maxZoom: 16,
                animate: true
              });
            } catch (e) {}
          }
        } else if (!nav && state.fit && !(state.route && state.route.length) && valid(state.userLocation) && valid(state.destination)) {
          var pairKey = state.userLocation.latitude + ':' + state.destination.latitude;
          if (pairKey !== fittedKey) {
            fittedKey = pairKey;
            try {
              map.fitBounds([
                [state.userLocation.latitude, state.userLocation.longitude],
                [state.destination.latitude, state.destination.longitude]
              ], {
                paddingTopLeft: [48, 140],
                paddingBottomRight: [48, 280],
                maxZoom: 16
              });
            } catch (e) {}
          }
        } else if (state.recenter && !state.followUser && !nav) {
          map.setView([center.latitude, center.longitude], zoom, { animate: false });
        }

        if (valid(state.userLocation) && !state.followUser && !nav) {
          var ull = [state.userLocation.latitude, state.userLocation.longitude];
          if (!userMarker) userMarker = L.marker(ull, { icon: iconHtml('<div class="dot"></div>') }).addTo(map);
          else userMarker.setLatLng(ull);
        }

        if (valid(state.destination)) {
          var dll = [state.destination.latitude, state.destination.longitude];
          if (!destMarker) destMarker = L.marker(dll, { icon: iconHtml('<div class="pin" style="background:#c2410c"></div>') }).addTo(map);
          else destMarker.setLatLng(dll);
        } else if (destMarker) {
          map.removeLayer(destMarker);
          destMarker = null;
        }

        if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
        if (state.route && state.route.length > 1) {
          var line = [];
          for (var r = 0; r < state.route.length; r++) {
            if (valid(state.route[r])) line.push([state.route[r].latitude, state.route[r].longitude]);
          }
          if (line.length > 1) {
            routeLine = L.polyline(line, {
              color: nav ? '#0f6e54' : '#138a68',
              weight: nav ? 7 : 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);
          }
        }

        var keep = {};
        var markers = state.markers || [];
        for (var m = 0; m < markers.length; m++) {
          var marker = markers[m];
          if (!marker || !valid(marker.coordinate)) continue;
          if (marker.id === 'car') {
            window.__moveCar(
              marker.coordinate.latitude,
              marker.coordinate.longitude,
              nav || !!state.followUser,
              state.heading || 0,
              nav ? (state.zoom || 17) : null
            );
            keep.car = true;
            continue;
          }
          var mll = [marker.coordinate.latitude, marker.coordinate.longitude];
          var html = '<div class="pin" style="background:' + (marker.color || '#138a68') + '"></div>';
          if (!extra[marker.id]) extra[marker.id] = L.marker(mll, { icon: iconHtml(html) }).addTo(map);
          else extra[marker.id].setLatLng(mll);
          keep[marker.id] = true;
        }
        Object.keys(extra).forEach(function (id) {
          if (id === 'car') return;
          if (!keep[id]) { map.removeLayer(extra[id]); delete extra[id]; }
        });
      };

      map.on('click', function (e) {
        post('press', { latitude: e.latlng.lat, longitude: e.latlng.lng });
      });

      setTimeout(resize, 50);
      setTimeout(resize, 400);
      setTimeout(function () { post('ready', {}); }, 200);
    })();
  </script>
</body>
</html>`;
}

export function OsmWebMap({
  style,
  center,
  zoom = 15,
  userLocation,
  destination,
  route = [],
  markers = [],
  followUser = false,
  navigationMode = false,
  heading = 0,
  onPressMap,
}: Props) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const lastStatic = useRef('');
  const lastCarAt = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const safeCenter = sanitize(center);
  const html = useMemo(() => buildHtml(safeCenter, zoom), []);
  const navZoom = navigationMode ? Math.max(zoom, 17) : zoom;

  const car = useMemo(() => {
    const fromMarkers = (markers ?? []).find((m) => m.id === 'car');
    if (fromMarkers && isValidLatLng(fromMarkers.coordinate)) return fromMarkers.coordinate;
    if ((followUser || navigationMode) && isValidLatLng(userLocation)) return userLocation;
    return null;
  }, [markers, followUser, navigationMode, userLocation]);

  const staticKey = useMemo(() => {
    const routePart = downsampleRoute((route ?? []).filter(isValidLatLng), 80);
    return JSON.stringify({
      zoom: navZoom,
      destination: isValidLatLng(destination) ? destination : null,
      user: isValidLatLng(userLocation) ? userLocation : null,
      route: routePart,
      markers: (markers ?? [])
        .filter((m) => m.id !== 'car' && isValidLatLng(m.coordinate))
        .map((m) => ({ id: m.id, color: m.color, coordinate: m.coordinate })),
      followUser,
      navigationMode,
      heading: Math.round(heading || 0),
    });
  }, [navZoom, destination, userLocation, route, markers, followUser, navigationMode, heading]);

  const pushStatic = (extra?: { recenter?: boolean; fit?: boolean }) => {
    if (!ready.current || !ref.current) return;
    if (staticKey === lastStatic.current && !extra?.recenter && !extra?.fit) return;
    lastStatic.current = staticKey;
    const parsed = JSON.parse(staticKey) as {
      zoom: number;
      destination: MapCoordinate | null;
      user: MapCoordinate | null;
      route: MapCoordinate[];
      markers: MapMarker[];
      followUser: boolean;
      navigationMode: boolean;
      heading: number;
    };
    const payload = {
      center: safeCenter,
      zoom: parsed.zoom,
      userLocation: parsed.user,
      destination: parsed.destination,
      route: parsed.route,
      markers: parsed.markers,
      followUser: parsed.followUser || parsed.navigationMode,
      navigationMode: parsed.navigationMode,
      heading: parsed.heading,
      recenter: extra?.recenter ?? false,
      fit: parsed.navigationMode
        ? false
        : (extra?.fit ?? (parsed.route.length > 1 || Boolean(parsed.user && parsed.destination))),
    };
    try {
      ref.current.injectJavaScript(
        `try{window.__applyMapState&&window.__applyMapState(${JSON.stringify(payload)});}catch(e){};true;`,
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    pushStatic({ fit: !navigationMode });
  }, [staticKey, size.w, size.h]);

  useEffect(() => {
    if (!ready.current || !ref.current || !car) return;
    const now = Date.now();
    if (now - lastCarAt.current < (navigationMode ? 280 : 400)) return;
    lastCarAt.current = now;
    const follow = followUser || navigationMode;
    try {
      ref.current.injectJavaScript(
        `try{window.__moveCar&&window.__moveCar(${car.latitude},${car.longitude},${follow ? 'true' : 'false'},${Number(heading) || 0},${navigationMode ? navZoom : 'null'});}catch(e){};true;`,
      );
    } catch {
      // ignore
    }
  }, [car?.latitude, car?.longitude, followUser, navigationMode, heading, navZoom]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type: string;
        payload?: MapCoordinate;
      };
      if (data.type === 'ready') {
        ready.current = true;
        lastStatic.current = '';
        pushStatic({ recenter: true, fit: !navigationMode });
      }
      if (data.type === 'press' && data.payload && onPressMap && isValidLatLng(data.payload)) {
        onPressMap(data.payload);
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <WebView
          ref={ref}
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://local.inride.app/' }}
          onMessage={onMessage}
          onLoadEnd={() => {
            setTimeout(() => {
              ready.current = true;
              lastStatic.current = '';
              pushStatic({ recenter: true, fit: !navigationMode });
            }, 200);
          }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          applicationNameForUserAgent="inride/1.0 (Expo)"
          style={styles.web}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', backgroundColor: '#c5d5cc' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
