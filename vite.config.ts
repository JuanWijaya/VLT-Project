import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Mendukung variabel berawalan VITE_ maupun NEXT_PUBLIC_ agar konfigurasi fleksibel
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
});
