import { motion } from 'motion/react';
import { InrideMark } from './components/Logo';
import { Shell } from './components/Shell';
import { useAuth } from './lib/auth';
import { AdminDataProvider } from './lib/data';
import { useHashRoute } from './lib/useHashRoute';
import { Applications } from './pages/Applications';
import { Drivers } from './pages/Drivers';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Passengers } from './pages/Passengers';
import { Tariffs } from './pages/Tariffs';
import { Trips } from './pages/Trips';

function Splash() {
  return (
    <div className="grid-glow flex h-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: [0.95, 1, 0.95] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <InrideMark size={110} tone="light" />
      </motion.div>
    </div>
  );
}

export default function App() {
  const { ready, session, isAdmin } = useAuth();
  const [route, navigate] = useHashRoute();

  if (!ready) return <Splash />;
  if (!session) return <Login />;
  if (!isAdmin) return <Login notAdmin />;

  return (
    <AdminDataProvider>
      <Shell route={route} onNavigate={navigate}>
        {route === 'overview' ? <Overview onNavigate={navigate} /> : null}
        {route === 'applications' ? <Applications /> : null}
        {route === 'drivers' ? <Drivers /> : null}
        {route === 'trips' ? <Trips /> : null}
        {route === 'passengers' ? <Passengers /> : null}
        {route === 'tariffs' ? <Tariffs /> : null}
      </Shell>
    </AdminDataProvider>
  );
}
