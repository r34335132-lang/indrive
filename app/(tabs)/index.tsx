import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type Href, Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InrideWordmark } from '@/components/InrideMark';
import { AppMap } from '@/components/maps/AppMap';
import { MapSafeBoundary } from '@/components/maps/MapSafeBoundary';
import { RateDriverModal } from '@/components/RateDriverModal';
import { SideMenu } from '@/components/SideMenu';
import { formatMoney } from '@/constants/pricing';
import { BRAND, cardShadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useLocation } from '@/hooks/useLocation';
import {
  DURANGO_PLACES,
  featuredPlaces,
  isInLaguna,
  nearbyPlaces,
  placesByCity,
  reverseGeocode,
  searchPlaces,
  type Place,
} from '@/lib/places';
import { getSkippedRatings, skipRating } from '@/lib/ratingPrompt';
import { getOsrmRouteVia, straightLineRoute } from '@/lib/routing';
import type { MapCoordinate, OsrmRoute, VehicleType } from '@/types';

const FALLBACK: MapCoordinate = { latitude: 25.555, longitude: -103.45 };

const VEHICLES: Array<{
  type: VehicleType;
  label: string;
  seats: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { type: 'Sedan', label: 'Sedan', seats: 4, icon: 'car-side' },
  { type: 'SUV', label: 'SUV', seats: 6, icon: 'car-estate' },
];

type QuickItem = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, role, isReady, logout } = useAuth();
  const { requestRide, trips, activeRide, completedRide, dismissCompletedRide, rateRide } = useBooking();
  const [focused, setFocused] = useState(true);
  const [skippedRatings, setSkippedRatings] = useState<string[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    void getSkippedRatings().then(setSkippedRatings);
  }, []);

  const tripToRate = useMemo(() => {
    if (!skippedRatings || activeRide) return null;
    return (
      trips.find(
        (t) =>
          t.role === 'passenger' &&
          t.status === 'Completado' &&
          typeof t.rating !== 'number' &&
          Date.now() - new Date(t.createdAt).getTime() < 24 * 60 * 60 * 1000 &&
          !skippedRatings.includes(t.id),
      ) ?? null
    );
  }, [activeRide, skippedRatings, trips]);
  const { getFare } = useTariff();
  const { coords, refresh, status: locationStatus } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState<MapCoordinate | null>(null);
  const [destinationLabel, setDestinationLabel] = useState('');
  const [stop, setStop] = useState<Place | null>(null);
  const [pickingStop, setPickingStop] = useState(false);
  const [originLabel, setOriginLabel] = useState('Mi ubicación');
  const [route, setRoute] = useState<OsrmRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<'cerca' | 'gomez' | 'torreon' | 'lerdo' | 'all'>(
    'cerca',
  );
  const [mapPick, setMapPick] = useState<'destination' | 'stop' | null>(null);
  const [pinPoint, setPinPoint] = useState<MapCoordinate | null>(null);
  const [pinLabel, setPinLabel] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [vehicle, setVehicle] = useState<VehicleType>('Sedan');

  const center = coords ?? FALLBACK;
  const recent = useMemo(() => {
    const done = trips.filter((t) => t.status === 'Completado').slice(0, 3);
    const seen = new Set<string>();
    return done
      .map((t) => {
        const title = (t.destination.split(',')[0] || t.destination || 'Destino').trim();
        const subtitle = t.destination || title;
        const place =
          DURANGO_PLACES.find((p) =>
            subtitle.toLowerCase().includes(p.name.toLowerCase()),
          ) ?? null;
        return {
          id: t.id,
          title,
          subtitle,
          place,
        };
      })
      .filter((item) => {
        const key = item.subtitle.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [trips]);

  const inLaguna = isInLaguna(coords);
  const [nearby, setNearby] = useState<Place[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);

  useEffect(() => {
    if (locationStatus === 'denied' && !coords) {
      setNearby(featuredPlaces(8));
      setLoadingNearby(false);
    }
  }, [locationStatus, coords]);

  useEffect(() => {
    if (!coords) return;
    reverseGeocode(coords.latitude, coords.longitude).then((label) => {
      if (label) setOriginLabel(label);
    });
  }, [coords]);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setLoadingNearby(true);
    nearbyPlaces(coords, 8)
      .then((next) => {
        if (!cancelled) setNearby(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingNearby(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  useEffect(() => {
    if (!mapPick || !pinPoint) return;
    let cancelled = false;
    setPinLoading(true);
    const timer = setTimeout(() => {
      reverseGeocode(pinPoint.latitude, pinPoint.longitude)
        .then((label) => {
          if (!cancelled) setPinLabel(label);
        })
        .finally(() => {
          if (!cancelled) setPinLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mapPick, pinPoint]);

  useEffect(() => {
    if (searchOpen) setResults(nearby);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      const run = async () => {
        if (query.trim().length < 2) {
          if (!coords && locationStatus !== 'denied') return [];
          const filter = isInLaguna(coords) ? cityFilter : 'cerca';
          if (filter === 'cerca') return nearbyPlaces(coords, 18);
          if (filter === 'all') return featuredPlaces(18);
          return placesByCity(filter);
        }
        return searchPlaces(query, coords);
      };
      run()
        .then((next) => {
          if (!cancelled) setResults(next);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, query.trim().length < 2 ? 150 : 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchOpen, coords, cityFilter, locationStatus]);

  useEffect(() => {
    if (!coords || !destination) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setRouting(true);
    setError(null);
    const via = stop ? [stop.coordinate] : [];
    getOsrmRouteVia([coords, ...via, destination])
      .then((next) => {
        if (cancelled) return;
        setRoute(next);
        setError(next.source === 'fallback' ? 'Ruta estimada (servidor de calles no respondió).' : null);
      })
      .catch((error) => {
        if (!cancelled) {
          setRoute(straightLineRoute(coords, destination, via));
          setError(error instanceof Error ? error.message : 'Ruta estimada.');
        }
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, destination, stop]);

  const fares = useMemo(() => {
    if (!route) return null;
    const km = route.distanceMeters / 1000;
    const durationMinutes = route.durationSeconds / 60;
    return {
      Sedan: getFare(km, originLabel, destinationLabel, { durationMinutes, vehicle: 'Sedan' }),
      SUV: getFare(km, originLabel, destinationLabel, { durationMinutes, vehicle: 'SUV' }),
    };
  }, [destinationLabel, getFare, originLabel, route]);

  const pickPlace = useCallback(
    (place: Place) => {
      if (pickingStop) {
        setStop(place);
        setPickingStop(false);
        setSearchOpen(false);
        setQuery('');
        return;
      }
      setDestination(place.coordinate);
      setDestinationLabel(place.name);
      setSearchOpen(false);
      setQuery('');
    },
    [pickingStop],
  );

  const startMapPick = () => {
    setMapPick(pickingStop ? 'stop' : 'destination');
    setPinPoint(null);
    setPinLabel('');
    setSearchOpen(false);
    setQuery('');
  };

  const cancelMapPick = () => {
    setMapPick(null);
    setPickingStop(false);
  };

  const confirmMapPick = () => {
    if (!pinPoint) return;
    const place: Place = {
      name: pinLabel || 'Punto en el mapa',
      aliases: [],
      coordinate: pinPoint,
    };
    if (mapPick === 'stop') {
      setStop(place);
    } else {
      setDestination(place.coordinate);
      setDestinationLabel(place.name);
    }
    setMapPick(null);
    setPickingStop(false);
  };

  const clearDestination = () => {
    setDestination(null);
    setDestinationLabel('');
    setStop(null);
    setRoute(null);
    setError(null);
  };

  const requestTrip = async () => {
    if (!coords || !destination || requesting) return;
    const activeRoute =
      route ?? straightLineRoute(coords, destination, stop ? [stop.coordinate] : []);
    setRequesting(true);
    setError(null);
    try {
      const destName = stop
        ? `${destinationLabel} (vía ${stop.name})`
        : destinationLabel || 'Destino';
      const ride = await requestRide({
        origin: originLabel || 'Mi ubicación',
        destination: destName,
        originLat: coords.latitude,
        originLng: coords.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        distanceKm: Math.round((activeRoute.distanceMeters / 1000) * 10) / 10,
        durationMinutes: activeRoute.durationSeconds / 60,
        paymentMethod,
        vehicle,
      });
      // Tarjeta: cobrar inmediatamente antes de buscar conductor
      if (paymentMethod === 'card') {
        router.replace({
          pathname: '/pay',
          params: {
            rideId: ride.id,
            amount: String(ride.price ?? 0),
            next: 'waiting',
          },
        } as Href);
        return;
      }
      router.push('/waiting' as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo pedir el viaje.');
    } finally {
      setRequesting(false);
    }
  };

  if (isReady && role === 'driver') {
    return <Redirect href="/driver" />;
  }
  if (isReady && role === 'admin') {
    return <Redirect href="/admin" />;
  }
  if (isReady && !user) {
    return <Redirect href="/welcome" />;
  }

  const suggestions: QuickItem[] = recent.length
    ? recent.map((item) => ({
        key: item.id,
        icon: 'clock',
        title: item.title,
        sub: item.subtitle,
        onPress: () => {
          if (item.place) pickPlace(item.place);
          else setSearchOpen(true);
        },
      }))
    : nearby.slice(0, 6).map((place) => ({
        key: `${place.city ?? 'cerca'}-${place.name}`,
        icon: 'map-pin',
        title: place.name,
        sub: place.city || 'Cerca de ti',
        onPress: () => pickPlace(place),
      }));

  const tiles: QuickItem[] = suggestions.slice(0, 3);
  const moreSuggestions = suggestions.slice(3, 6);
  const routeMinutes = Math.round((route?.durationSeconds ?? 0) / 60);

  return (
    <View style={styles.screen}>
      <MapSafeBoundary
        fallback={
          <View style={[styles.map, styles.mapFallback]}>
            <Text style={styles.mapFallbackText}>Mapa cargando…</Text>
          </View>
        }
      >
        <AppMap
          style={styles.map}
          center={center}
          zoom={15}
          userLocation={coords}
          destination={destination}
          route={route?.coordinates ?? []}
          followUser={!destination && !mapPick}
          markers={
            stop
              ? [{ id: 'stop', coordinate: stop.coordinate, color: BRAND.orange, label: stop.name }]
              : []
          }
          onCenterChange={mapPick ? setPinPoint : undefined}
        />
      </MapSafeBoundary>

      {mapPick ? (
        <View style={styles.pinWrap} pointerEvents="none">
          <MaterialCommunityIcons
            name="map-marker"
            size={52}
            color={mapPick === 'stop' ? BRAND.orange : BRAND.red}
          />
          <View style={styles.pinShadow} />
        </View>
      ) : null}

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        <Pressable onPress={() => setMenuOpen(true)} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={BRAND.primary} />
        </Pressable>
        <View style={styles.brandPill}>
          <InrideWordmark size={24} />
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
          <Text style={styles.avatarBtnText}>{user?.initials ?? 'IR'}</Text>
        </Pressable>
      </SafeAreaView>

      {mapPick ? (
        <View style={[styles.bottom, styles.pickPanel, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
          <Text style={styles.pickTitle}>
            {mapPick === 'stop' ? 'Coloca tu parada' : 'Coloca tu destino'}
          </Text>
          <Text style={styles.pickHint}>Mueve el mapa hasta que el marcador quede en el lugar exacto.</Text>
          <View style={styles.pickAddress}>
            <View
              style={[
                styles.routeDot,
                { backgroundColor: mapPick === 'stop' ? BRAND.orange : BRAND.red },
              ]}
            />
            <Text style={styles.pickAddressText} numberOfLines={2}>
              {!pinPoint
                ? 'Mueve el mapa para elegir el punto'
                : pinLoading
                  ? 'Buscando dirección…'
                  : pinLabel || 'Punto en el mapa'}
            </Text>
            {pinLoading ? <ActivityIndicator size="small" color={BRAND.green} /> : null}
          </View>
          <View style={styles.pickButtons}>
            <Pressable onPress={cancelMapPick} style={[styles.pickBtn, styles.pickBtnGhost]}>
              <Text style={styles.pickBtnGhostText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={confirmMapPick}
              disabled={!pinPoint}
              style={[styles.pickBtn, styles.pickBtnMain, !pinPoint && { opacity: 0.5 }]}
            >
              <Text style={styles.pickBtnMainText}>
                {mapPick === 'stop' ? 'Confirmar parada' : 'Confirmar destino'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.floatRow} pointerEvents="box-none">
          <Pressable onPress={() => void refresh()} style={styles.locateBtn}>
            <Feather name="crosshair" size={20} color={BRAND.primary} />
          </Pressable>
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
          <View style={styles.handle} />
          {!destination ? (
            <>
              <Text style={styles.hello}>
                {greeting()}, {user?.firstName ?? 'pasajero'}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.searchCard, pressed && styles.pressed]}
                onPress={() => setSearchOpen(true)}
              >
                <View style={styles.searchDot} />
                <Text style={styles.searchText}>¿A dónde vas?</Text>
                <Pressable
                  hitSlop={10}
                  onPress={startMapPick}
                  style={styles.searchMapBtn}
                  accessibilityLabel="Elegir destino en el mapa"
                >
                  <MaterialCommunityIcons name="map-marker-radius" size={18} color={BRAND.primary} />
                  <Text style={styles.searchMapText}>Mapa</Text>
                </Pressable>
              </Pressable>

              {loadingNearby && !tiles.length ? (
                <ActivityIndicator color={BRAND.green} style={{ marginVertical: 8 }} />
              ) : null}

              <View style={styles.tiles}>
                {tiles.map((tile) => (
                  <Pressable
                    key={tile.key}
                    onPress={tile.onPress}
                    style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
                  >
                    <Feather name={tile.icon} size={20} color={BRAND.primary} />
                    <Text style={styles.tileTitle} numberOfLines={1}>
                      {tile.title}
                    </Text>
                    <Text style={styles.tileSub} numberOfLines={1}>
                      {tile.sub}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {moreSuggestions.length ? (
                <View style={styles.listCard}>
                  {moreSuggestions.map((item, index) => (
                    <Pressable
                      key={item.key}
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        styles.listRow,
                        index > 0 && styles.listRowBorder,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.listIcon}>
                        <Feather name={item.icon} size={16} color={BRAND.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.listSub} numberOfLines={1}>
                          {item.sub}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={BRAND.muted} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.requestHead}>
                <View style={styles.requestIcon}>
                  <MaterialCommunityIcons name="car-side" size={20} color="#fff" />
                </View>
                <Text style={styles.requestTitle}>Solicitar viaje</Text>
                <Pressable onPress={clearDestination} style={styles.closeBtn} hitSlop={6}>
                  <Feather name="x" size={18} color={BRAND.primary} />
                </Pressable>
              </View>

              <View style={styles.routeCard}>
                <View style={styles.routeRows}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: BRAND.green }]} />
                    <View style={styles.routeCopy}>
                      <Text style={styles.routeTitle} numberOfLines={1}>
                        {originLabel}
                      </Text>
                      <Text style={styles.routeSub}>Punto de partida</Text>
                    </View>
                  </View>
                  {stop ? (
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: BRAND.orange }]} />
                      <View style={styles.routeCopy}>
                        <Text style={styles.routeTitle} numberOfLines={1}>
                          {stop.name}
                        </Text>
                        <Text style={styles.routeSub}>Parada</Text>
                      </View>
                      <Pressable onPress={() => setStop(null)} hitSlop={10}>
                        <Feather name="trash-2" size={16} color={BRAND.red} />
                      </Pressable>
                    </View>
                  ) : null}
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: BRAND.red }]} />
                    <View style={styles.routeCopy}>
                      <Text style={styles.routeTitle} numberOfLines={1}>
                        {destinationLabel}
                      </Text>
                      <Text style={styles.routeSub}>Destino</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    setPickingStop(true);
                    setSearchOpen(true);
                  }}
                  style={styles.addStop}
                  hitSlop={6}
                >
                  <Feather name={stop ? 'edit-2' : 'plus'} size={20} color={BRAND.primary} />
                </Pressable>
              </View>

              <View style={styles.vehicles}>
                {VEHICLES.map((option) => {
                  const active = vehicle === option.type;
                  const optionFare = fares?.[option.type];
                  return (
                    <Pressable
                      key={option.type}
                      onPress={() => setVehicle(option.type)}
                      style={[styles.vehicleCard, active && styles.vehicleCardOn]}
                    >
                      <MaterialCommunityIcons name={option.icon} size={32} color={BRAND.primary} />
                      <Text style={styles.vehicleName}>{option.label}</Text>
                      <View style={styles.vehicleSeats}>
                        <Feather name="user" size={11} color={BRAND.muted} />
                        <Text style={styles.vehicleSeatsText}>{option.seats}</Text>
                      </View>
                      {routing ? (
                        <ActivityIndicator color={BRAND.green} style={{ marginVertical: 3 }} />
                      ) : (
                        <Text style={styles.vehiclePrice}>{formatMoney(optionFare?.total ?? 0)}</Text>
                      )}
                      <Text style={styles.vehicleEta}>{routeMinutes || '—'} min</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.payCard}>
                <View style={styles.payIcon}>
                  <Feather
                    name={paymentMethod === 'card' ? 'credit-card' : 'dollar-sign'}
                    size={18}
                    color={BRAND.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payLabel}>Forma de pago</Text>
                  <Text style={styles.payValue}>
                    {paymentMethod === 'card' ? 'Tarjeta · Mercado Pago' : 'Efectivo'}
                  </Text>
                </View>
                <View style={styles.paySwitch}>
                  <Pressable
                    onPress={() => setPaymentMethod('cash')}
                    style={[styles.paySeg, paymentMethod === 'cash' && styles.paySegOn]}
                  >
                    <Text style={[styles.paySegText, paymentMethod === 'cash' && styles.paySegTextOn]}>
                      Efectivo
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPaymentMethod('card')}
                    style={[styles.paySeg, paymentMethod === 'card' && styles.paySegOn]}
                  >
                    <Text style={[styles.paySegText, paymentMethod === 'card' && styles.paySegTextOn]}>
                      Tarjeta
                    </Text>
                  </Pressable>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                disabled={!coords || !destination || requesting}
                onPress={() => void requestTrip()}
                style={({ pressed }) => [
                  styles.cta,
                  requesting && { opacity: 0.7 },
                  pressed && styles.pressed,
                ]}
              >
                {requesting ? <ActivityIndicator color="#fff" /> : null}
                <Text style={styles.ctaText}>
                  {requesting
                    ? paymentMethod === 'card'
                      ? 'Abriendo pago…'
                      : 'Buscando conductor…'
                    : paymentMethod === 'card'
                      ? 'Pagar y solicitar viaje'
                      : 'Solicitar viaje'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      )}

      <RateDriverModal
        visible={focused && !!tripToRate && !searchOpen && !menuOpen && !requesting}
        driverName={tripToRate?.driverName && tripToRate.driverName !== '—' ? tripToRate.driverName : 'tu conductor'}
        subtitle={tripToRate ? `${tripToRate.destination.split(',')[0]} · ${tripToRate.time}` : undefined}
        onSubmit={async (stars, comment) => {
          if (!tripToRate) return;
          await rateRide(tripToRate.id, stars, comment);
          if (completedRide?.id === tripToRate.id) dismissCompletedRide();
        }}
        onSkip={() => {
          if (!tripToRate) return;
          const id = tripToRate.id;
          void skipRating(id);
          setSkippedRatings((cur) => [id, ...(cur ?? [])]);
          if (completedRide?.id === id) dismissCompletedRide();
        }}
      />

      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={user?.name ?? 'Pasajero'}
        subtitle={user?.email}
        rating={user?.rating}
        items={[
          {
            key: 'trips',
            label: 'Mis viajes',
            icon: 'clock',
            onPress: () => router.push('/(tabs)/trips'),
          },
          {
            key: 'profile',
            label: 'Ajustes',
            icon: 'settings',
            onPress: () => router.push('/(tabs)/profile'),
          },
          {
            key: 'help',
            label: 'Ayuda',
            icon: 'help-circle',
            onPress: () => router.push('/(tabs)/profile'),
          },
          {
            key: 'logout',
            label: 'Cerrar sesión',
            icon: 'log-out',
            onPress: () => void logout(),
          },
        ]}
      />

      <Modal
        visible={searchOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          setSearchOpen(false);
          setPickingStop(false);
        }}
      >
        <View
          style={[
            styles.searchScreen,
            { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <View style={styles.searchHeader}>
            <Pressable
              onPress={() => {
                setSearchOpen(false);
                setPickingStop(false);
              }}
              style={styles.back}
            >
              <Feather name="arrow-left" size={20} color={BRAND.primary} />
            </Pressable>
            <View style={styles.searchInputWrap}>
              <Feather name="search" size={18} color={BRAND.muted} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={pickingStop ? 'Buscar parada' : '¿A dónde vas?'}
                placeholderTextColor="#8a9a93"
                style={styles.searchInput}
              />
            </View>
          </View>
          <View style={styles.originHintRow}>
            <View style={[styles.routeDot, { backgroundColor: BRAND.green }]} />
            <Text style={styles.originHint} numberOfLines={1}>
              Desde tu ubicación · {originLabel}
            </Text>
          </View>
          {inLaguna ? (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityChips}
              keyboardShouldPersistTaps="handled"
            >
              {(
                [
                  { id: 'cerca', label: 'Cerca de ti' },
                  { id: 'gomez', label: 'Gómez Palacio' },
                  { id: 'torreon', label: 'Torreón' },
                  { id: 'lerdo', label: 'Lerdo' },
                  { id: 'all', label: 'Toda La Laguna' },
                ] as const
              ).map((chip) => {
                const active = cityFilter === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => {
                      setCityFilter(chip.id);
                      setQuery('');
                    }}
                    style={[styles.cityChip, active && styles.cityChipOn]}
                  >
                    <Text style={[styles.cityChipText, active && styles.cityChipTextOn]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          ) : null}
          {searching ? <ActivityIndicator color={BRAND.green} style={{ marginTop: 16 }} /> : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultsContent}
          >
            <Pressable
              onPress={startMapPick}
              style={({ pressed }) => [styles.mapPickRow, pressed && styles.pressed]}
            >
              <View style={styles.mapPickIcon}>
                <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>Elegir en el mapa</Text>
                <Text style={styles.listSub}>Coloca el marcador en el punto exacto</Text>
              </View>
              <Feather name="chevron-right" size={18} color={BRAND.muted} />
            </Pressable>
            {results.length === 0 && !searching ? (
              <Text style={styles.emptyText}>
                {inLaguna
                  ? 'No hay resultados. Prueba “Gómez”, “Lerdo” o “Galerías”.'
                  : 'No encontramos lugares. Escribe una calle, colonia o negocio de tu ciudad.'}
              </Text>
            ) : null}
            {results.length ? (
              <View style={styles.listCard}>
                {results.map((place, index) => (
                  <Pressable
                    key={`${place.city}-${place.name}-${place.coordinate.latitude}`}
                    style={({ pressed }) => [
                      styles.listRow,
                      index > 0 && styles.listRowBorder,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => pickPlace(place)}
                  >
                    <View style={styles.listIcon}>
                      <Feather name="map-pin" size={16} color={BRAND.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{place.name}</Text>
                      <Text style={styles.listSub} numberOfLines={2}>
                        {place.city || place.aliases[0] || 'Cerca de ti'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: BRAND.bg, flex: 1 },
  map: { ...StyleSheet.absoluteFill },
  mapFallback: { alignItems: 'center', backgroundColor: '#e8f2ee', justifyContent: 'center' },
  mapFallbackText: { color: BRAND.primary, fontFamily: 'Inter_600SemiBold' },
  pressed: { opacity: 0.8 },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconBtn: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  brandPill: {
    ...cardShadow,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarBtn: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderColor: '#fff',
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  bottom: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  floatRow: { alignItems: 'flex-end', paddingBottom: 12, paddingHorizontal: 16 },
  locateBtn: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sheet: {
    backgroundColor: BRAND.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 12,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#cfdad4',
    borderRadius: 99,
    height: 5,
    marginBottom: 2,
    width: 44,
  },
  hello: { color: BRAND.muted, fontFamily: 'Inter_600SemiBold', fontSize: 14, marginLeft: 4 },
  searchCard: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  searchDot: {
    backgroundColor: BRAND.green,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  searchText: { color: BRAND.text, flex: 1, fontFamily: 'Inter_700Bold', fontSize: 18 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    flex: 1,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  tileTitle: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 13 },
  tileSub: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 10 },
  listCard: {
    ...cardShadow,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  listRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 },
  listRowBorder: { borderTopColor: BRAND.border, borderTopWidth: 1 },
  listIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  listTitle: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 14 },
  listSub: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  requestHead: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  requestIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  requestTitle: { color: BRAND.text, flex: 1, fontFamily: 'Inter_700Bold', fontSize: 18 },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  routeCard: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  routeRows: { flex: 1, gap: 10 },
  routeRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  routeDot: { borderColor: '#fff', borderRadius: 7, borderWidth: 2, height: 12, width: 12 },
  routeCopy: { flex: 1 },
  routeTitle: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 14 },
  routeSub: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  addStop: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  vehicles: { flexDirection: 'row', gap: 10 },
  vehicleCard: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    gap: 2,
    paddingVertical: 12,
  },
  vehicleCardOn: { backgroundColor: BRAND.mint, borderColor: BRAND.primary },
  vehicleName: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 14 },
  vehicleSeats: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  vehicleSeatsText: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 11 },
  vehiclePrice: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 4 },
  vehicleEta: { color: BRAND.muted, fontFamily: 'Inter_400Regular', fontSize: 11 },
  payCard: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  payIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  payLabel: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 11 },
  payValue: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 1 },
  paySwitch: {
    backgroundColor: BRAND.bg,
    borderRadius: 14,
    flexDirection: 'row',
    padding: 3,
  },
  paySeg: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7 },
  paySegOn: { backgroundColor: BRAND.primary },
  paySegText: { color: BRAND.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  paySegTextOn: { color: '#fff' },
  error: { color: '#c2410c', fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' },
  cta: {
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 17 },
  searchScreen: { backgroundColor: BRAND.bg, flex: 1 },
  searchMapBtn: {
    alignItems: 'center',
    backgroundColor: BRAND.mint,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchMapText: { color: BRAND.primary, fontFamily: 'Inter_700Bold', fontSize: 12 },
  mapPickRow: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  mapPickIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pinWrap: {
    alignItems: 'center',
    left: '50%',
    marginLeft: -26,
    marginTop: -52,
    position: 'absolute',
    top: '50%',
    width: 52,
  },
  pinShadow: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    height: 6,
    marginTop: -4,
    width: 14,
  },
  pickPanel: {
    ...cardShadow,
    backgroundColor: BRAND.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  pickTitle: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 20 },
  pickHint: { color: BRAND.muted, fontFamily: 'Inter_500Medium', fontSize: 13 },
  pickAddress: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickAddressText: { color: BRAND.text, flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  pickButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pickBtn: {
    alignItems: 'center',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
  },
  pickBtnGhost: { backgroundColor: '#fff', borderColor: BRAND.border, borderWidth: 1, flex: 1 },
  pickBtnGhostText: { color: BRAND.text, fontFamily: 'Inter_700Bold', fontSize: 15 },
  pickBtnMain: { backgroundColor: BRAND.primary, flex: 2 },
  pickBtnMainText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  searchHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  back: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  searchInputWrap: {
    ...cardShadow,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchInput: {
    color: BRAND.text,
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    paddingVertical: 12,
  },
  originHintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  originHint: { color: BRAND.muted, flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12 },
  cityChips: { gap: 8, paddingBottom: 6, paddingHorizontal: 16, paddingTop: 12 },
  cityChip: {
    backgroundColor: '#fff',
    borderColor: BRAND.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cityChipOn: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
  cityChipText: { color: BRAND.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  cityChipTextOn: { color: '#fff' },
  resultsContent: { padding: 16, paddingBottom: 40 },
  emptyText: {
    color: BRAND.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginTop: 24,
    textAlign: 'center',
  },
});
