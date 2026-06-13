import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { IonicVue } from '@ionic/vue'
import './style.css'

const app = createApp(App)
app.use(IonicVue)
app.use(router)
app.use(i18n)
app.mount('#app')
