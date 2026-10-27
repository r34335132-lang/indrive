import { Ban } from 'lucide-react';
import { motion } from 'motion/react';
import type { DailyBlockStatus } from '../lib/types';

export function BlockActions({
  busy,
  onResolve,
}: {
  busy: boolean;
  onResolve: (status: DailyBlockStatus) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={busy}
        onClick={() => onResolve('paid')}
        className="rounded-xl bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-500/20 disabled:opacity-50"
        title="Pagó en efectivo en la oficina"
      >
        {busy ? '…' : 'Efectivo'}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={busy}
        onClick={() => onResolve('waived')}
        className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        title="No cobrar este bloque"
      >
        <Ban size={13} /> Condonar
      </motion.button>
    </div>
  );
}
