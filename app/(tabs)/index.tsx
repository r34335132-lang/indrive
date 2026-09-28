import { Feather } from '@expo/vector-icons';
import { type Href, Redirect, useRouter } from 'expo-router';
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
import { AppMap } from '@/components/maps/AppMap';
import { MapSafeBoundary } from '@/components/maps/MapSafeBoundary';
import { SideMenu } from '@/components/SideMenu';
import { formatMoney } from '@/constants/pricing';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useTariff } from '@/context/TariffContext';
import { useColors } from '@/hooks/useColors';
import { useLocation } from '@/hooks/useLocation';
import {
  DURANGO_PLACES,
  featuredPlaces,
  placesByCity,
  placesNear,
  reverseGeocode,
  searchPlaces,
  type Place,
} from '@/lib/places';
import { getOsrmRouteVia, straightLineRoute } from '@/lib/routing';
import type { MapCoordinate, OsrmRoute, VehicleType } from '@/types';

const FALLBACK: MapCoordinate = { latitude: 25.555, longitude: -103.45 };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, role, isReady, logout } = useAuth();
  const { requestRide, trips } = useBooking();
  const { getFare } = useTariff();
  const { coords, refresh } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>(() => featuredPlaces(12));
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

  const homePlace = featuredPlaces(1)[0] ?? DURANGO_PLACES[0];

  useEffect(() => {
    if (!coords) return;
    reverseGeocode(coords.latitude, coords.longitude).then((label) => {
      if (label) setOriginLabel(label);
    });
  }, [coords]);

  useEffect(() => {
    if (!searchOpen) return;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      const run = async () => {
        if (query.trim().length < 2) {
          if (cityFilter === 'cerca') return placesNear(coords, 18);
          if (cityFilter === 'all') return featuredPlaces(18);
          return placesByCity(cityFilter);
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
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchOpen, coords, cityFilter]);

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

  const fare = useMemo(() => {
    if (!route) return null;
    return getFare(route.distanceMeters / 1000, originLabel, destinationLabel, {
      durationMinutes: route.durationSeconds / 60,
      vehicle,
    });
  }, [destinationLabel, getFare, originLabel, route, vehicle]);

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
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.screen}>
      <MapSafeBoundary
        fallback={
          <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f2ee' }]}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#16362f' }}>Mapa cargando…</Text>
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
          followUser={!destination}
          markers={
            stop
              ? [{ id: 'stop', coordinate: stop.coordinate, color: '#e49339', label: stop.name }]
              : []
          }
        />
      </MapSafeBoundary>

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={[styles.menuBtn, { backgroundColor: '#fff' }]}
        >
          <Feather name="menu" size={20} color="#16362f" />
        </Pressable>
        <Pressable
          onPress={() => void refresh()}
          style={[styles.menuBtn, { backgroundColor: '#fff' }]}
        >
          <Feather name="crosshair" size={18} color="#16362f" />
        </Pressable>
      </SafeAreaView>

      <SafeAreaView style={styles.bottom} edges={['bottom']} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />
          {!destination ? (
            <>
              <Text style={styles.hello}>
                {greeting()} {user?.firstName ?? 'pasajero'}
              </Text>
              <Pressable style={styles.search} onPress={() => setSearchOpen(true)}>
                <Text style={styles.searchText}>¿A dónde vas?</Text>
                <Feather name="arrow-right" size={18} color="#16362f" />
              </Pressable>

              <Pressable style={styles.quick} onPress={() => pickPlace(homePlace)}>
                <View style={[styles.quickIcon, { backgroundColor: '#e8f5ef' }]}>
                  <Feather name="home" size={18} color="#138a68" />
                </View>
                <View style={styles.quickCopy}>
                  <Text style={styles.quickTitle}>Casa</Text>
                  <Text style={styles.quickSub} numberOfLines={1}>
                    {homePlace.name}
                  </Text>
                </View>
              </Pressable>

              {recent.length
                ? recent.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.quick}
                      onPress={() => {
                        if (item.place) pickPlace(item.place);
                        else setSearchOpen(true);
                      }}
                    >
                      <View style={[styles.quickIcon, { backgroundColor: '#f3f4f3' }]}>
                        <Feather name="clock" size={18} color="#16362f" />
                      </View>
                      <View style={styles.quickCopy}>
                        <Text style={styles.quickTitle}>{item.title}</Text>
                        <Text style={styles.quickSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                : featuredPlaces(6).map((place) => (
                    <Pressable
                      key={`${place.city ?? 'laguna'}-${place.name}`}
                      style={styles.quick}
                      onPress={() => pickPlace(place)}
                    >
                      <View style={[styles.quickIcon, { backgroundColor: '#f3f4f3' }]}>
                        <Feather name="map-pin" size={18} color="#16362f" />
                      </View>
                      <View style={styles.quickCopy}>
                        <Text style={styles.quickTitle}>{place.name}</Text>
                        <Text style={styles.quickSub} numberOfLines={1}>
                          {place.city || 'La Laguna'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
            </>
          ) : (
            <>
              <View style={styles.routeHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeFrom} numberOfLines={1}>
                    Desde · {originLabel}
                  </Text>
                  {stop ? (
                    <Text style={styles.routeStop} numberOfLines={1}>
                      Parada · {stop.name}
                    </Text>
                  ) : null}
                  <Text style={styles.routeTo} numberOfLines={1}>
                    Hasta · {destinationLabel}
                  </Text>
                </View>
                <Pressable onPress={clearDestination} style={styles.clear}>
                  <Feather name="x" size={18} color="#16362f" />
                </Pressable>
              </View>

              <Pressable
                style={styles.stopBtn}
                onPress={() => {
                  setPickingStop(true);
                  setSearchOpen(true);
                }}
              >
                <Feather name="plus-circle" size={18} color="#138a68" />
                <Text style={styles.stopBtnText}>
                  {stop ? 'Cambiar parada' : 'Agregar parada'}
                </Text>
                {stop ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setStop(null);
                    }}
                    hitSlop={10}
                  >
                    <Feather name="trash-2" size={16} color="#c2410c" />
                  </Pressable>
                ) : null}
              </Pressable>

              {routing ? (
                <ActivityIndicator color="#138a68" style={{ marginVertical: 8 }} />
              ) : (
                <Text style={styles.fare}>
                  {formatMoney(fare?.total ?? 0)} · {vehicle} ·{' '}
                  {Math.round((route?.durationSeconds ?? 0) / 60) || '—'} min
                </Text>
              )}

              <View style={styles.payRow}>
                <Pressable
                  onPress={() => setVehicle('Sedan')}
                  style={[styles.payChip, vehicle === 'Sedan' && styles.payChipOn]}
                >
                  <Feather name="navigation" size={14} color={vehicle === 'Sedan' ? '#fff' : '#16362f'} />
                  <Text style={[styles.payChipText, vehicle === 'Sedan' && styles.payChipTextOn]}>
                    Sedan
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setVehicle('SUV')}
                  style={[styles.payChip, vehicle === 'SUV' && styles.payChipOn]}
                >
                  <Feather name="truck" size={14} color={vehicle === 'SUV' ? '#fff' : '#16362f'} />
                  <Text style={[styles.payChipText, vehicle === 'SUV' && styles.payChipTextOn]}>
                    SUV · +20%
                  </Text>
                </Pressable>
              </View>

              <View style={styles.payRow}>
                <Pressable
                  onPress={() => setPaymentMethod('cash')}
                  style={[styles.payChip, paymentMethod === 'cash' && styles.payChipOn]}
                >
                  <Feather name="dollar-sign" size={14} color={paymentMethod === 'cash' ? '#fff' : '#16362f'} />
                  <Text style={[styles.payChipText, paymentMethod === 'cash' && styles.payChipTextOn]}>
                    Efectivo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPaymentMethod('card')}
                  style={[styles.payChip, paymentMethod === 'card' && styles.payChipOn]}
                >
                  <Feather name="credit-card" size={14} color={paymentMethod === 'card' ? '#fff' : '#16362f'} />
                  <Text style={[styles.payChipText, paymentMethod === 'card' && styles.payChipTextOn]}>
                    Tarjeta · MP
                  </Text>
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                disabled={!coords || !destination || requesting}
                onPress={() => void requestTrip()}
                style={[styles.cta, requesting && { opacity: 0.7 }]}
              >
                <Text style={styles.ctaText}>
                  {requesting
                    ? paymentMethod === 'card'
                      ? 'Abriendo pago…'
                      : 'Buscando conductor…'
                    : paymentMethod === 'card'
                      ? 'Pagar y pedir viaje'
                      : 'Pedir viaje ahora'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>

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
        onRequestClose={() => {
          setSearchOpen(false);
          setPickingStop(false);
        }}
      >
        <SafeAreaView style={styles.searchScreen} edges={['top', 'bottom']}>
          <View style={styles.searchHeader}>
            <Pressable
              onPress={() => {
                setSearchOpen(false);
                setPickingStop(false);
              }}
              style={styles.back}
            >
              <Feather name="arrow-left" size={20} color="#16362f" />
            </Pressable>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={pickingStop ? 'Buscar parada' : 'Buscar destino'}
              placeholderTextColor="#8a9a93"
              style={styles.searchInput}
            />
          </View>
          <Text style={styles.originHint}>Desde tu ubicación · {originLabel}</Text>
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
                  <Text style={[styles.cityChipText, active && styles.cityChipTextOn]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {searching ? <ActivityIndicator color="#138a68" style={{ marginTop: 16 }} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {results.length === 0 && !searching ? (
              <Text style={[styles.quickSub, { textAlign: 'center', marginTop: 24 }]}>
                No hay resultados. Prueba “Gómez”, “Lerdo” o “Galerías”.
              </Text>
            ) : null}
            {results.map((place) => (
              <Pressable
                key={`${place.city}-${place.name}-${place.coordinate.latitude}`}
                style={styles.result}
                onPress={() => pickPlace(place)}
              >
                <View style={[styles.quickIcon, { backgroundColor: '#e8f5ef' }]}>
                  <Feather name="map-pin" size={18} color="#138a68" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickTitle}>{place.name}</Text>
                  <Text style={styles.quickSub} numberOfLines={2}>
                    {place.city || place.aliases[0] || 'La Laguna'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#16362f' },
  map: { ...StyleSheet.absoluteFillObject },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  menuBtn: {
    alignItems: 'center',
    borderRadius: 12,
    elevation: 3,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: 42,
  },
  bottom: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 10,
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#d7ddd9',
    borderRadius: 99,
    height: 4,
    marginBottom: 6,
    width: 42,
  },
  hello: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 18 },
  search: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#dfe6e2',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchText: { color: '#16362f', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  quick: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8 },
  quickIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  quickCopy: { flex: 1 },
  quickTitle: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 15 },
  quickSub: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  routeHead: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  routeFrom: { color: '#6d7c75', fontFamily: 'Inter_500Medium', fontSize: 13 },
  routeStop: { color: '#138a68', fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 2 },
  routeTo: { color: '#16362f', fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 2 },
  stopBtn: {
    alignItems: 'center',
    backgroundColor: '#e8f5ef',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stopBtnText: { color: '#138a68', flex: 1, fontFamily: 'Inter_700Bold', fontSize: 14 },
  clear: {
    alignItems: 'center',
    backgroundColor: '#f1f4f2',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fare: { color: '#138a68', fontFamily: 'Inter_700Bold', fontSize: 18 },
  payRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  payChip: {
    alignItems: 'center',
    backgroundColor: '#f1f4f2',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  payChipOn: { backgroundColor: '#138a68' },
  payChipText: { color: '#16362f', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  payChipTextOn: { color: '#fff' },
  error: { color: '#c2410c', fontFamily: 'Inter_500Medium', fontSize: 13 },
  cta: {
    alignItems: 'center',
    backgroundColor: '#138a68',
    borderRadius: 14,
    marginTop: 4,
    paddingVertical: 16,
  },
  ctaText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  searchScreen: { backgroundColor: '#fff', flex: 1 },
  searchHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  back: {
    alignItems: 'center',
    backgroundColor: '#f1f4f2',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  searchInput: {
    backgroundColor: '#f5f7f6',
    borderRadius: 12,
    color: '#16362f',
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  originHint: {
    color: '#6d7c75',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  cityChips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  cityChip: {
    backgroundColor: '#f1f4f2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cityChipOn: { backgroundColor: '#138a68' },
  cityChipText: { color: '#16362f', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  cityChipTextOn: { color: '#fff' },
  result: {
    alignItems: 'center',
    borderBottomColor: '#eef2f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
});
