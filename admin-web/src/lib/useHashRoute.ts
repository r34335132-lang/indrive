import { useCallback, useEffect, useState } from 'react';

export type Route =
  | 'overview'
  | 'applications'
  | 'drivers'
  | 'trips'
  | 'deposits'
  | 'passengers'
  | 'tariffs';

const ROUTES: Route[] = ['overview', 'applications', 'drivers', 'trips', 'deposits', 'passengers', 'tariffs'];

function read(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(raw) ? raw : 'overview';
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = `/${next}`;
  }, []);

  return [route, navigate] as const;
}
