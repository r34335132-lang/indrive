import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { initialsOf, TONE_CLASSES, TONE_DOT, type Tone } from '../lib/format';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Número que cuenta hacia arriba al aparecer. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString('es-MX'),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, mv, value]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

export function Badge({ tone, children, dot }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        TONE_CLASSES[tone],
      )}
    >
      {dot ? <span className={cx('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} /> : null}
      {children}
    </span>
  );
}

const AVATAR_GRADIENTS = [
  'from-teal-400 to-teal-600',
  'from-sky-400 to-indigo-500',
  'from-violet-400 to-fuchsia-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
];

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const idx = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return src ? (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover ring-2 ring-white"
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white',
        AVATAR_GRADIENTS[idx],
      )}
    >
      {initialsOf(name)}
    </div>
  );
}

export function Card({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cx('rounded-3xl border border-line bg-white shadow-soft', className)}
    >
      {children}
    </motion.section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5">
      <div>
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-slate-200/70', className)} />;
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
        {icon}
      </div>
      <p className="font-bold text-ink">{title}</p>
      {text ? <p className="mt-1 max-w-sm text-sm text-muted">{text}</p> : null}
    </motion.div>
  );
}

/** Pestañas con indicador animado (layoutId). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  id: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-soft ring-1 ring-line">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cx(
              'relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              on ? 'text-white' : 'text-muted hover:text-ink',
            )}
          >
            {on ? (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-navy-900"
                transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
              />
            ) : null}
            <span className="relative flex items-center gap-2">
              {opt.label}
              {typeof opt.count === 'number' ? (
                <span
                  className={cx(
                    'rounded-full px-1.5 text-[11px] font-bold',
                    on ? 'bg-white/15 text-white' : 'bg-slate-100 text-muted',
                  )}
                >
                  {opt.count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex h-11 w-full max-w-xs items-center gap-2 rounded-2xl bg-white px-4 shadow-soft ring-1 ring-line focus-within:ring-2 focus-within:ring-teal-500">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-teal-600 uppercase">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
