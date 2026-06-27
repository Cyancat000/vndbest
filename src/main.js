import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { IonicVue } from '@ionic/vue'
import { registerAppIcons } from './icons/register-icons'
import './style.css'

registerAppIcons()

// 根据 .env 中的 VITE_VCONSOLE 环境变量决定是否启用 vConsole 调试面板
if (import.meta.env.VITE_VCONSOLE === 'true') {
  const VConsole = (await import('vconsole')).default
  new VConsole()
}

const app = createApp(App)
app.use(IonicVue)
app.use(router)
app.use(i18n)
app.mount('#app')
