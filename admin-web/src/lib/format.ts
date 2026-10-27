import type { ReviewStatus, RideStatus } from './types';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});
const moneyCents = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

export const formatMoney = (n: number) => money.format(Number.isFinite(n) ? n : 0);
export const formatMoneyCents = (n: number) => moneyCents.format(Number.isFinite(n) ? n : 0);
export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: digits }).format(n);

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const mxDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Monterrey' });

/** Hoy en La Laguna / Durango como `YYYY-MM-DD` (mismo criterio que `inride_today()` en la BD). */
export const todayMx = () => mxDay.format(new Date());

/** `2026-10-27` → `mar 27 oct` */
export function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `hace ${Math.floor(diff / 86400)} d`;
  return formatDate(iso);
}

export function ageFrom(birthdate: string | null | undefined) {
  if (!birthdate) return null;
  const b = new Date(`${birthdate}T00:00:00`);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age -= 1;
  return age;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const ACTIVE_STATUSES: RideStatus[] = [
  'searching',
  'offered',
  'accepted',
  'en_route_pickup',
  'arrived_pickup',
  'in_progress',
];

export const RIDE_STATUS: Record<RideStatus, { label: string; tone: Tone }> = {
  searching: { label: 'Buscando', tone: 'amber' },
  offered: { label: 'Ofertado', tone: 'amber' },
  accepted: { label: 'Aceptado', tone: 'sky' },
  en_route_pickup: { label: 'En camino', tone: 'sky' },
  arrived_pickup: { label: 'En pickup', tone: 'violet' },
  in_progress: { label: 'En viaje', tone: 'teal' },
  completed: { label: 'Completado', tone: 'green' },
  cancelled: { label: 'Cancelado', tone: 'rose' },
};

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Por revisar', tone: 'amber' },
  approved: { label: 'Aprobado', tone: 'green' },
  rejected: { label: 'Rechazado', tone: 'rose' },
};

export type Tone = 'amber' | 'sky' | 'violet' | 'teal' | 'green' | 'rose' | 'slate';

export const TONE_CLASSES: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-teal-500/10 text-teal-600 ring-teal-500/30',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const TONE_DOT: Record<Tone, string> = {
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  green: 'bg-emerald-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

export const TIER_LABEL: Record<string, string> = { go: 'Go', plus: 'Plus', master: 'Master' };
