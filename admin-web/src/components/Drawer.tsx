import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal
            style={{ maxWidth: width }}
            className="absolute top-0 right-0 flex h-full w-full flex-col bg-canvas shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-5">
              <div className="min-w-0">
                <div className="text-lg font-bold text-ink">{title}</div>
                {subtitle ? <div className="mt-0.5 text-sm text-muted">{subtitle}</div> : null}
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-muted transition hover:bg-slate-100 hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </header>
            <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer ? <footer className="border-t border-line bg-white px-6 py-4">{footer}</footer> : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
