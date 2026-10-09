import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Prints the active profile (Vite mode) and backend URL when the dev server starts.
function logActiveProfile() {
  let mode
  let env
  return {
    name: 'log-active-profile',
    configResolved(config) {
      mode = config.mode
      env = loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_')
    },
    configureServer(server) {
      // Wrap printUrls so the profile shows right after Vite's own banner.
      const printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        printUrls()
        const host = env.VITE_API_HOST || 'localhost'
        const port = env.VITE_API_PORT || '3000'
        const apiUrl = env.VITE_API_BASE_URL || `http://${host}:${port}/api`
        const useMock = env.VITE_USE_MOCK_API !== 'false'

        server.config.logger.info(
          [
            '',
            `  Profile:  ${mode}${env.VITE_ENVIRONMENT && env.VITE_ENVIRONMENT !== mode ? ` (${env.VITE_ENVIRONMENT})` : ''}`,
            `  API:      ${useMock ? 'in-memory mock data (backend URL not used)' : apiUrl}`,
            ''
          ].join('\n')
        )
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), logActiveProfile()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.js'],
    setupFiles: ['./tests/setup.js']
  },
  server: {
    allowedHosts: true,           // allow any host (simplest for Railway)
    host: true,
    port: Number(process.env.PORT) || 5173,
  },
})
