import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'inride.rating.skipped';

/** Viajes que el pasajero decidió no calificar (para no volver a preguntarle). */
export async function getSkippedRatings(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function skipRating(rideId: string) {
  const list = await getSkippedRatings();
  if (list.includes(rideId)) return;
  await AsyncStorage.setItem(KEY, JSON.stringify([rideId, ...list].slice(0, 50))).catch(() => {});
}
