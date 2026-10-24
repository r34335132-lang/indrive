import { Award, Check, Clock, Loader2, MinusCircle, Navigation, Plane, Shield, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Card, PageHeader, Skeleton, cx } from '../components/ui';
import { fetchActiveTariff, updateTariff } from '../lib/api';
import { formatMoneyCents } from '../lib/format';
import type { Tariff } from '../lib/types';

type NumKey = Exclude<keyof Tariff, 'id' | 'high_demand_active' | 'updated_at'>;

const SECTIONS: { title: string; subtitle: string; icon: typeof Clock; fields: { key: NumKey; label: string; unit?: string }[] }[] = [
  {
    title: 'Tarifa por kilómetro',
    subtitle: 'Cuánto cuesta cada km y cómo se reparte',
    icon: Navigation,
    fields: [
      { key: 'per_km_total', label: 'Precio por km (total)' },
      { key: 'per_km_driver', label: 'Por km · Conductor' },
      { key: 'per_km_app', label: 'Por km · App' },
    ],
  },
  {
    title: 'Tiempo y espera',
    subtitle: 'Minuto de viaje, minuto de espera y cuota fija',
    icon: Clock,
    fields: [
      { key: 'per_minute', label: 'Precio por minuto' },
      { key: 'wait_per_minute', label: 'Espera por minuto' },
      { key: 'app_flat_fee', label: 'Cuota fija app' },
    ],
  },
  {
    title: 'Precio inicial',
    subtitle: 'Banderazo y tarifa mínima',
    icon: MinusCircle,
    fields: [
      { key: 'base_fare', label: 'Precio inicial' },
      { key: 'min_fare', label: 'Tarifa más baja' },
      { key: 'min_distance_km', label: 'Distancia mínima', unit: 'km' },
    ],
  },
  {
    title: 'Bloque de sistema',
    subtitle: 'Depósito del conductor (no se cobra al pasajero)',
    icon: Shield,
    fields: [{ key: 'system_block_fee', label: 'Bloque de sistema' }],
  },
  {
    title: 'Aeropuerto · Peaje',
    subtitle: 'Cargo extra en viajes al aeropuerto',
    icon: Plane,
    fields: [
      { key: 'airport_toll_total', label: 'Peaje (total)' },
      { key: 'airport_toll_driver', label: 'Peaje · Conductor' },
      { key: 'airport_toll_app', label: 'Peaje · App' },
    ],
  },
  {
    title: 'Bonos por nivel',
    subtitle: 'Go / Plus / Master',
    icon: Award,
    fields: [
      { key: 'bonus_go', label: 'Bono Go' },
      { key: 'bonus_plus', label: 'Bono Plus' },
      { key: 'bonus_master', label: 'Bono Master' },
    ],
  },
  {
    title: 'Alta demanda',
    subtitle: 'Multiplicador aplicado en horas pico',
    icon: TrendingUp,
    fields: [{ key: 'surge_multiplier', label: 'Multiplicador', unit: '×' }],
  },
];

export function Tariffs() {
  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [draft, setDraft] = useState<Partial<Record<NumKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchActiveTariff()
      .then(setTariff)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo cargar la tarifa'))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => Object.keys(draft).length > 0, [draft]);

  const value = (key: NumKey) => draft[key] ?? String(tariff?.[key] ?? '');

  const save = async () => {
    if (!tariff || !dirty) return;
    const patch: Partial<Tariff> = {};
    for (const [key, raw] of Object.entries(draft) as [NumKey, string][]) {
      const n = Number.parseFloat(raw);
      if (Number.isNaN(n) || n < 0) {
        setError('Revisa los valores: deben ser números positivos.');
        return;
      }
      if (key === 'surge_multiplier' && n < 1) {
        setError('El multiplicador debe ser 1 o mayor.');
        return;
      }
      (patch as Record<string, number>)[key] = n;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await updateTariff(tariff.id, patch);
      setTariff(next);
      setDraft({});
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleSurge = async () => {
    if (!tariff) return;
    try {
      setTariff(await updateTariff(tariff.id, { high_demand_active: !tariff.high_demand_active }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Configuración"
        title="Tarifas"
        subtitle="Los cambios se aplican al instante a los nuevos viajes en la app."
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-3xl" />
          ))}
        </div>
      ) : tariff ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Precio inicial', value: formatMoneyCents(Number(tariff.base_fare ?? 0)) },
              { label: 'Por km', value: formatMoneyCents(Number(tariff.per_km_total)) },
              { label: 'Tarifa mínima', value: formatMoneyCents(Number(tariff.min_fare)) },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="grid-glow rounded-3xl p-5 text-white shadow-lift"
              >
                <p className="text-sm text-white/60">{s.label}</p>
                <p className="mt-1 text-3xl font-extrabold">{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {SECTIONS.map((section, si) => {
              const Icon = section.icon;
              return (
                <Card key={section.title} delay={si * 0.04} className="p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
                        <Icon size={19} />
                      </span>
                      <div>
                        <p className="font-bold">{section.title}</p>
                        <p className="text-sm text-muted">{section.subtitle}</p>
                      </div>
                    </div>
                    {section.title === 'Alta demanda' ? (
                      <button
                        onClick={() => void toggleSurge()}
                        className={cx(
                          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                          tariff.high_demand_active ? 'bg-teal-500' : 'bg-slate-300',
                        )}
                        aria-label="Activar alta demanda"
                      >
                        <motion.span
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                          className={cx(
                            'absolute top-1 h-5 w-5 rounded-full bg-white shadow',
                            tariff.high_demand_active ? 'right-1' : 'left-1',
                          )}
                        />
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {section.fields.map((f) => {
                      const changed = draft[f.key] !== undefined;
                      return (
                        <label key={f.key} className="block">
                          <span className="mb-1.5 block text-xs font-semibold text-muted">{f.label}</span>
                          <span
                            className={cx(
                              'flex items-center gap-1 rounded-2xl bg-canvas px-3.5 py-3 ring-1 transition focus-within:ring-2 focus-within:ring-teal-500',
                              changed ? 'ring-teal-500 bg-teal-500/5' : 'ring-line',
                            )}
                          >
                            {!f.unit ? <span className="text-muted">$</span> : null}
                            <input
                              inputMode="decimal"
                              value={value(f.key)}
                              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                              className="w-full bg-transparent font-bold outline-none"
                            />
                            {f.unit ? <span className="text-muted">{f.unit}</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-muted">{error ?? 'No hay una tarifa activa.'}</p>
      )}

      <AnimatePresence>
        {dirty || saved ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
          >
            <div className="flex items-center gap-4 rounded-2xl bg-navy-900 py-3 pr-3 pl-5 text-white shadow-2xl">
              {saved ? (
                <span className="flex items-center gap-2 font-semibold text-teal-300">
                  <Check size={18} /> Tarifas guardadas
                </span>
              ) : (
                <>
                  <span className="text-sm">
                    {error ?? `${Object.keys(draft).length} cambio(s) sin guardar`}
                  </span>
                  <button
                    onClick={() => {
                      setDraft({});
                      setError(null);
                    }}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => void save()}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white hover:bg-teal-400 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                    Guardar
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
