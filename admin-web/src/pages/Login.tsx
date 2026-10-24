import { ArrowRight, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { InrideMark } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';

export function Login({ notAdmin = false }: { notAdmin?: boolean }) {
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-glow relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-teal-400/20"
            style={{ width: 380 + i * 220, height: 380 + i * 220, left: -120 - i * 110, bottom: -160 - i * 110 }}
            animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-sm font-semibold tracking-[0.2em] text-teal-300 uppercase"
        >
          Panel de control
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <InrideMark size={190} tone="light" />
          </motion.div>
          <h1 className="mt-10 max-w-md text-5xl leading-[1.05] font-extrabold tracking-tight text-white">
            Toda tu operación, <span className="text-teal-400">en un vistazo.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/60">
            Aprueba conductores, sigue viajes en vivo y ajusta tarifas desde un solo lugar.
          </p>
        </motion.div>
        <p className="relative text-sm text-white/40">© {new Date().getFullYear()} INRIDEE · La Laguna</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <InrideMark size={90} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Bienvenido de vuelta</h2>
          <p className="mt-2 text-muted">Entra con tu cuenta de administrador de INRIDEE.</p>

          {notAdmin ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200"
            >
              <ShieldAlert size={20} className="shrink-0" />
              <div>
                Esta cuenta no tiene permisos de administrador.{' '}
                <button onClick={() => void signOut()} className="font-bold underline">
                  Usar otra cuenta
                </button>
              </div>
            </motion.div>
          ) : null}

          {!isConfigured ? (
            <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
              Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno.
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field icon={<Mail size={18} />} label="Correo">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inride.app"
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
              />
            </Field>
            <Field icon={<Lock size={18} />} label="Contraseña">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
              />
            </Field>

            {error ? (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                className="text-sm font-medium text-rose-600"
              >
                {error}
              </motion.p>
            ) : null}

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 py-3.5 font-bold text-white shadow-lift transition hover:bg-navy-800 disabled:opacity-70"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              Entrar al panel
              {!busy ? <ArrowRight size={18} className="transition group-hover:translate-x-1" /> : null}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <span className="flex h-13 items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-ink shadow-soft ring-1 ring-line transition focus-within:ring-2 focus-within:ring-teal-500">
        <span className="text-muted">{icon}</span>
        {children}
      </span>
    </label>
  );
}
