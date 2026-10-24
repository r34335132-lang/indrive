import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Lee VITE_* (deploy) o reutiliza las EXPO_PUBLIC_* del .env de la app (desarrollo local).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',
  envPrefix: ['VITE_', 'EXPO_PUBLIC_SUPABASE_'],
  server: { port: 5174 },
  build: { chunkSizeWarningLimit: 1600 },
});
