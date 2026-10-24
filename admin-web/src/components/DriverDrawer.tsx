import {
  Calendar,
  Car,
  Check,
  FileText,
  ImageOff,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { reviewDriver, setBlockFee, signedDocUrl } from '../lib/api';
import { useAdminData } from '../lib/data';
import { ageFrom, formatDate, formatMoney, REVIEW_STATUS, TIER_LABEL, timeAgo } from '../lib/format';
import { DOC_KEYS, DOC_LABELS, type DocKey, type Driver } from '../lib/types';
import { Drawer } from './Drawer';
import { Avatar, Badge, cx } from './ui';

function useDocUrls(driver: Driver | null) {
  const [urls, setUrls] = useState<Partial<Record<DocKey, string | null>>>({});
  useEffect(() => {
    setUrls({});
    if (!driver?.docs) return;
    let alive = true;
    void Promise.all(
      DOC_KEYS.map(async (key) => {
        const path = driver.docs?.[`${key}_path` as const];
        return [key, path ? await signedDocUrl(path) : null] as const;
      }),
    ).then((entries) => {
      if (alive) setUrls(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [driver?.id, driver?.docs?.updated_at]);
  return urls;
}

export function DriverDrawer({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const { refresh } = useAdminData();
  const urls = useDocUrls(driver);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approved' | 'rejected' | 'fee' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    setNote(driver?.docs?.review_note ?? '');
    setError(null);
  }, [driver?.id]);

  const act = async (status: 'approved' | 'rejected') => {
    if (!driver) return;
    if (status === 'rejected' && !note.trim()) {
      setError('Escribe el motivo del rechazo para que el conductor sepa qué corregir.');
      return;
    }
    setBusy(status);
    setError(null);
    try {
      await reviewDriver(driver.id, status, status === 'rejected' ? note : undefined);
      await refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(null);
    }
  };

  const toggleFee = async () => {
    if (!driver) return;
    setBusy('fee');
    try {
      await setBlockFee(driver.id, !driver.block_fee_satisfied);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el depósito');
    } finally {
      setBusy(null);
    }
  };

  const status = driver?.docs?.review_status ?? 'pending';
  const age = ageFrom(driver?.birthdate);
  const uploaded = driver?.docs ? DOC_KEYS.filter((k) => driver.docs?.[k]).length : 0;

  return (
    <>
      <Drawer
        open={Boolean(driver)}
        onClose={onClose}
        width={620}
        title={
          driver ? (
            <div className="flex items-center gap-3">
              <Avatar name={driver.name} src={driver.avatar_url} size={48} />
              <div>
                <p>{driver.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone={REVIEW_STATUS[status].tone} dot>
                    {REVIEW_STATUS[status].label}
                  </Badge>
                  {driver.driver_tier ? (
                    <Badge tone="slate">{TIER_LABEL[driver.driver_tier] ?? driver.driver_tier}</Badge>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null
        }
        footer={
          driver ? (
            <div className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Motivo del rechazo (lo verá el conductor). Ej. La licencia está vencida."
                className="w-full resize-none rounded-2xl bg-canvas px-4 py-3 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-teal-500"
              />
              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={Boolean(busy)}
                  onClick={() => void act('rejected')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-50 py-3 font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  {busy === 'rejected' ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                  Rechazar
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={Boolean(busy) || !driver.docs?.complete}
                  onClick={() => void act('approved')}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-navy-900 py-3 font-bold text-white shadow-lift transition hover:bg-navy-800 disabled:opacity-50"
                  title={driver.docs?.complete ? '' : 'Faltan documentos'}
                >
                  {busy === 'approved' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Aprobar conductor
                </motion.button>
              </div>
            </div>
          ) : null
        }
      >
        {driver ? (
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2">
              <Info icon={<Mail size={16} />} label="Correo" value={driver.email} />
              <Info icon={<Phone size={16} />} label="Teléfono" value={driver.phone || '—'} />
              <Info icon={<MapPin size={16} />} label="Ciudad" value={driver.city || '—'} />
              <Info
                icon={<Calendar size={16} />}
                label="Edad"
                value={age !== null ? `${age} años` : 'No registrada'}
              />
              <Info icon={<Star size={16} />} label="Calificación" value={`${Number(driver.rating).toFixed(1)} ★`} />
              <Info icon={<Calendar size={16} />} label="Registro" value={formatDate(driver.created_at)} />
            </section>

            <section className="rounded-3xl bg-white p-5 ring-1 ring-line">
              <div className="mb-4 flex items-center gap-2 font-bold">
                <Car size={18} className="text-teal-600" /> Vehículo
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Mini label="Marca" value={driver.vehicle_make} />
                <Mini label="Modelo" value={driver.vehicle_model} />
                <Mini label="Color" value={driver.vehicle_color} />
                <Mini label="Placas" value={driver.vehicle_plate} mono />
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <Stat label="Viajes" value={String(driver.completedTrips)} />
              <Stat label="Ganancias" value={formatMoney(driver.earnings)} />
              <Stat label="Último viaje" value={driver.lastTripAt ? timeAgo(driver.lastTripAt) : '—'} />
            </section>

            <section className="flex items-center justify-between gap-4 rounded-3xl bg-white p-5 ring-1 ring-line">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'flex h-10 w-10 items-center justify-center rounded-2xl',
                    driver.block_fee_satisfied ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                  )}
                >
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <p className="font-bold">Depósito de sistema</p>
                  <p className="text-sm text-muted">
                    {driver.block_fee_satisfied
                      ? `Cubierto ${driver.block_fee_satisfied_at ? timeAgo(driver.block_fee_satisfied_at) : ''}`
                      : 'Pendiente de pago'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void toggleFee()}
                disabled={busy === 'fee'}
                className={cx(
                  'relative h-7 w-12 rounded-full transition-colors',
                  driver.block_fee_satisfied ? 'bg-teal-500' : 'bg-slate-300',
                )}
                aria-label="Cambiar estado del depósito"
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className={cx(
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow',
                    driver.block_fee_satisfied ? 'right-1' : 'left-1',
                  )}
                />
              </button>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 font-bold">
                  <FileText size={18} className="text-teal-600" /> Documentos
                </p>
                <span className="text-sm text-muted">{uploaded}/5 subidos</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DOC_KEYS.map((key, i) => {
                  const has = Boolean(driver.docs?.[key]);
                  const url = urls[key];
                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={url ? { y: -2 } : undefined}
                      onClick={() => url && setPreview({ url, label: DOC_LABELS[key] })}
                      className="group overflow-hidden rounded-2xl bg-white text-left ring-1 ring-line"
                    >
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100">
                        {url ? (
                          <img
                            src={url}
                            alt={DOC_LABELS[key]}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : has && url === undefined ? (
                          <Loader2 className="animate-spin text-muted" />
                        ) : (
                          <ImageOff className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-xs font-semibold">{DOC_LABELS[key]}</span>
                        {has ? (
                          <Check size={15} className="text-emerald-600" />
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-600">Falta</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}
      </Drawer>

      <AnimatePresence>
        {preview ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/85 p-6 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.figure
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="max-h-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={preview.url} alt={preview.label} className="max-h-[80vh] rounded-2xl shadow-2xl" />
              <figcaption className="mt-3 flex items-center justify-between text-white">
                <span className="font-semibold">{preview.label}</span>
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm text-teal-300 hover:underline">
                  Abrir original
                </a>
              </figcaption>
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-line">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Mini({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('mt-0.5 font-bold', mono && 'font-mono tracking-wider')}>{value || '—'}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-line">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
