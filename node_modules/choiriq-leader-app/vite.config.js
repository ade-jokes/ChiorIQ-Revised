import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174
  },
  define: {
    'window.__API_BASE_URL__': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:3001/api')
  }
});
