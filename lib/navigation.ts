import type { OsrmStep } from '@/types';
import { distanceKmBetween, type LatLng } from '@/lib/routing';

export type ActiveGuidance = {
  step: OsrmStep;
  stepIndex: number;
  distanceToManeuverM: number;
  remainingMeters: number;
  remainingSeconds: number;
  nextStep: OsrmStep | null;
};

export function formatDistanceM(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatEtaMinutes(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export type ManeuverIcon =
  | 'flag'
  | 'navigation'
  | 'refresh-cw'
  | 'rotate-ccw'
  | 'corner-up-left'
  | 'corner-up-right'
  | 'arrow-up';

export function maneuverIcon(type: string, modifier: string): ManeuverIcon {
  const m = (modifier || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (t === 'arrive' || t === 'destination') return 'flag';
  if (t === 'depart' || t === 'notification') return 'navigation';
  if (t === 'roundabout' || t === 'rotary') return 'refresh-cw';
  if (m.includes('uturn')) return 'rotate-ccw';
  if (m.includes('left')) return 'corner-up-left';
  if (m.includes('right')) return 'corner-up-right';
  if (m.includes('straight') || t === 'new name' || t === 'continue') return 'arrow-up';
  return 'navigation';
}

/** Elige el siguiente paso según la posición del conductor. */
export function resolveGuidance(
  steps: OsrmStep[] | undefined,
  from: LatLng | null,
  remainingRouteMeters?: number,
  remainingRouteSeconds?: number,
): ActiveGuidance | null {
  if (!steps?.length) return null;
  const pos = from;
  let index = 0;

  if (pos) {
    while (index < steps.length - 1) {
      const step = steps[index];
      const distM = distanceKmBetween(pos, step.location) * 1000;
      const next = steps[index + 1];
      const distNext = distanceKmBetween(pos, next.location) * 1000;
      if (distM < 40 || (distNext + 25 < distM && index > 0)) {
        index += 1;
        continue;
      }
      break;
    }
  }

  const step = steps[index];
  const distanceToManeuverM = pos
    ? Math.max(0, distanceKmBetween(pos, step.location) * 1000)
    : step.distanceMeters;

  let remainingMeters = 0;
  let remainingSeconds = 0;
  for (let i = index; i < steps.length; i += 1) {
    remainingMeters += steps[i].distanceMeters;
    remainingSeconds += steps[i].durationSeconds;
  }
  if (Number.isFinite(remainingRouteMeters) && (remainingRouteMeters as number) > 0) {
    remainingMeters = remainingRouteMeters as number;
  }
  if (Number.isFinite(remainingRouteSeconds) && (remainingRouteSeconds as number) > 0) {
    remainingSeconds = remainingRouteSeconds as number;
  }

  return {
    step,
    stepIndex: index,
    distanceToManeuverM,
    remainingMeters,
    remainingSeconds,
    nextStep: steps[index + 1] ?? null,
  };
}
