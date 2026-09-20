import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useAuthStore } from './stores/auth.js'
import { setupAuthErrorHandler } from './api/client.js'
import './assets/styles.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

setupAuthErrorHandler(async () => {
  const auth = useAuthStore()
  await auth.logout()

  if (router.currentRoute.value.name !== 'login') {
    await router.replace({ name: 'login' })
  }
})

app.mount('#app')
