import { createI18n } from 'vue-i18n'
import zh from './locales/zh.json'
import en from './locales/en.json'

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: localStorage.getItem('vndb_lang') || 'zh', // 默认语言
  fallbackLocale: 'en', // 备用语言
  messages: {
    zh,
    en
  }
})

export default i18n
