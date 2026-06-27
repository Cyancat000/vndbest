<script setup>
defineOptions({ name: 'Settings' })

import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { IonPage, IonContent } from '@ionic/vue'
import { useTheme } from '@/composables/useTheme'
import { SETTINGS_SECTION_ICONS, THEME_OPTION_ICONS } from '@/icons/icon-names'

const router = useRouter()
const { t, locale } = useI18n()
const { themeMode } = useTheme()

const username = ref(localStorage.getItem('vndb_username') || '')
const useSandbox = ref(JSON.parse(localStorage.getItem('vndb_use_sandbox') || 'false'))
const currentLang = ref(locale.value)
const activeSection = ref('root')
let ignoreNextPopState = false

const settingsSections = computed(() => ([
  {
    key: 'appearance',
    title: t('settings.sections.appearance.title'),
    description: t('settings.sections.appearance.description'),
    icon: SETTINGS_SECTION_ICONS.appearance
  },
  {
    key: 'privacy',
    title: t('settings.sections.privacy.title'),
    description: t('settings.sections.privacy.description'),
    icon: SETTINGS_SECTION_ICONS.privacy
  },
  {
    key: 'about',
    title: t('settings.sections.about.title'),
    description: t('settings.sections.about.description'),
    icon: SETTINGS_SECTION_ICONS.about
  }
]))

const activeSectionMeta = computed(() => {
  return settingsSections.value.find(section => section.key === activeSection.value) || null
})

// 语言优先级列表
const titleLangPriority = ref(JSON.parse(localStorage.getItem('vndb_title_lang_priority') || '["zh-Hans", "zh-Hant", "ja", "en"]'))

const languageOptions = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
]

// 可选的标题语言
const availableTitleLangs = [
  'ja', 'en', 'zh-Hans', 'zh-Hant', 'zh', 'ko', 'ru', 'fr', 'de', 'it', 'es', 'pt-br', 'vi'
]

const availableTitleLangOptions = computed(() => {
  return availableTitleLangs.map(lang => ({
    value: lang,
    label: `settings.lang_names.${lang}`
  }))
})

onMounted(() => {
  username.value = localStorage.getItem('vndb_username') || ''
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

function openSection(sectionKey) {
  if (activeSection.value === sectionKey) return
  window.history.pushState({ settingsSection: sectionKey }, '')
  activeSection.value = sectionKey
}

function goBackToRoot() {
  if (activeSection.value === 'root') return
  ignoreNextPopState = true
  activeSection.value = 'root'
  window.history.back()
}

function handlePopState() {
  if (ignoreNextPopState) {
    ignoreNextPopState = false
    return
  }

  if (activeSection.value !== 'root') {
    activeSection.value = 'root'
  }
}

function moveLanguage(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= titleLangPriority.value.length) return

  const temp = titleLangPriority.value[index]
  titleLangPriority.value[index] = titleLangPriority.value[newIndex]
  titleLangPriority.value[newIndex] = temp
  savePriority()
}

function removeLanguage(index) {
  titleLangPriority.value.splice(index, 1)
  savePriority()
}

const showAddLang = ref(false)
const selectedNewLang = ref('en')

function addLanguage() {
  if (!titleLangPriority.value.includes(selectedNewLang.value)) {
    titleLangPriority.value.push(selectedNewLang.value)
    savePriority()
  }
  showAddLang.value = false
}

function savePriority() {
  localStorage.setItem('vndb_title_lang_priority', JSON.stringify(titleLangPriority.value))
}

// ====== 隐私与内容过滤设置 ======
const defaultPrivacyCardList = {
  sexual_vn: 1,
  sexual_release: 1,
  nsfw_cover_vn: 1,
  nsfw_cover_release: 1
}

const defaultPrivacyDetail = {
  sexual_vn: 1,
  sexual_release: 1,
  nsfw_cover_vn: 1,
  nsfw_cover_release: 1
}

const defaultPrivacyScreenshots = {
  sexual_screenshot: 1,
  nsfw_screenshot: 1
}

function mergePrivacySettings(storageKey, defaults) {
  try {
    return {
      ...defaults,
      ...(JSON.parse(localStorage.getItem(storageKey) || 'null') || {})
    }
  } catch {
    return { ...defaults }
  }
}

const privacyCardList = ref(mergePrivacySettings('vndb_privacy_card_list', defaultPrivacyCardList))
const privacyDetail = ref(mergePrivacySettings('vndb_privacy_detail', defaultPrivacyDetail))
const privacyScreenshots = ref(mergePrivacySettings('vndb_privacy_screenshots', defaultPrivacyScreenshots))

const cardListOptions = [
  { value: 0, label: 'settings.privacy.option_show_all' },
  { value: 1, label: 'settings.privacy.option_blur_cover' },
  { value: 2, label: 'settings.privacy.option_blur_card' },
  { value: 3, label: 'settings.privacy.option_hide_card' }
]

const detailOptions = [
  { value: 0, label: 'settings.privacy.option_show_all' },
  { value: 1, label: 'settings.privacy.option_blur_cover' }
]

const screenshotOptions = [
  { value: 0, label: 'settings.privacy.option_show_all' },
  { value: 1, label: 'settings.privacy.option_blur_thumb' },
  { value: 2, label: 'settings.privacy.option_hide_screenshot' }
]

function savePrivacySettings() {
  localStorage.setItem('vndb_privacy_card_list', JSON.stringify(privacyCardList.value))
  localStorage.setItem('vndb_privacy_detail', JSON.stringify(privacyDetail.value))
  localStorage.setItem('vndb_privacy_screenshots', JSON.stringify(privacyScreenshots.value))
}

watch(privacyCardList, savePrivacySettings, { deep: true })
watch(privacyDetail, savePrivacySettings, { deep: true })
watch(privacyScreenshots, savePrivacySettings, { deep: true })

watch(currentLang, (newLang) => {
  locale.value = newLang
  localStorage.setItem('vndb_lang', newLang)
})

function goToLogin() {
  router.push('/login')
}

// ====== 更新检查 ======
const APP_VERSION = '1.0.0-beta.4'
const updateState = ref('idle')
const latestVersion = ref('')
const latestReleaseUrl = ref('')
const latestReleaseDate = ref('')

function parseVersion(v) {
  const cleaned = v.replace(/^v/i, '')
  const [main, pre] = cleaned.split('-', 2)
  const segments = main.split('.').map(Number)
  return {
    major: segments[0] || 0,
    minor: segments[1] || 0,
    patch: segments[2] || 0,
    pre: pre || ''
  }
}

function isNewer(a, b) {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  if (va.major !== vb.major) return va.major > vb.major
  if (va.minor !== vb.minor) return va.minor > vb.minor
  if (va.patch !== vb.patch) return va.patch > vb.patch
  if (va.pre && !vb.pre) return false
  if (!va.pre && vb.pre) return true
  return false
}

async function checkForUpdate() {
  updateState.value = 'checking'
  try {
    const res = await fetch('https://api.github.com/repos/Cyancat000/vndbest/releases/latest')
    if (res.status === 404) {
      updateState.value = 'up-to-date'
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    latestVersion.value = data.tag_name
    latestReleaseUrl.value = data.html_url
    latestReleaseDate.value = new Date(data.published_at).toLocaleDateString()
    updateState.value = isNewer(data.tag_name, APP_VERSION) ? 'available' : 'up-to-date'
  } catch (e) {
    console.error('检查更新失败:', e)
    updateState.value = 'error'
  }
}

// ====== 主题选项 ======
const themeOptions = [
  { value: 'system', icon: THEME_OPTION_ICONS.system, labelKey: 'settings.theme_follow_system' },
  { value: 'light', icon: THEME_OPTION_ICONS.light, labelKey: 'settings.theme_light' },
  { value: 'dark', icon: THEME_OPTION_ICONS.dark, labelKey: 'settings.theme_dark' }
]
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="page-container pb-24 space-y-6">
        <div class="flex items-center gap-3 py-3 sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100 dark:border-neutral-800">
          <button
            v-if="activeSection !== 'root'"
            @click="goBackToRoot"
            class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs text-neutral-700 dark:text-neutral-300"
          >
            <Icon icon="lucide:chevron-left" class="h-5 w-5" />
          </button>
          <div
            v-else
            class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs"
          >
            <Icon icon="lucide:settings" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {{ activeSectionMeta ? activeSectionMeta.title : t('settings.title') }}
            </h1>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ activeSectionMeta ? activeSectionMeta.description : t('settings.description') }}
            </p>
          </div>
        </div>

        <template v-if="activeSection === 'root'">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-3">
            <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-700/50 pb-2">{{ t('settings.account_sync') }}</h2>

            <button
              @click="goToLogin"
              class="w-full flex items-center justify-between rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700"
            >
              <div class="flex items-center gap-3">
                <div class="grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <Icon icon="lucide:user" class="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <div class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {{ username ? username : t('settings.not_logged_in') }}
                  </div>
                  <div class="text-[10px] text-neutral-400 dark:text-neutral-500">
                    {{ username ? t('settings.logged_in_desc') : t('settings.login_sync_desc') }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <span
                  v-if="username"
                  class="rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/30"
                >
                  {{ t('common.connected') }}
                </span>
                <span
                  v-else
                  class="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                >
                  {{ t('common.not_connected') }}
                </span>
                <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              </div>
            </button>
          </div>

          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-xs">
            <button
              v-for="section in settingsSections"
              :key="section.key"
              @click="openSection(section.key)"
              class="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  <Icon :icon="section.icon" class="h-5 w-5" />
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-medium text-neutral-800 dark:text-neutral-200">{{ section.title }}</div>
                  <div class="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{{ section.description }}</div>
                </div>
              </div>
              <Icon icon="lucide:chevron-right" class="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            </button>
          </div>
        </template>

        <template v-else-if="activeSection === 'appearance'">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-4">
            <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-700/50 pb-2">{{ t('settings.system_preferences') }}</h2>

            <div class="space-y-2 py-2">
              <label class="block text-sm font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{{ t('settings.theme') }}</label>
              <div class="flex rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-0.5 gap-0.5">
                <button
                  v-for="opt in themeOptions"
                  :key="opt.value"
                  @click="themeMode = opt.value"
                  class="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap"
                  :class="themeMode === opt.value
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'"
                >
                  <Icon :icon="opt.icon" class="h-4 w-4" />
                  <span>{{ t(opt.labelKey) }}</span>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 py-2 border-t border-neutral-100 dark:border-neutral-700/50">
              <label class="text-sm font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap shrink-0">{{ t('settings.language') }}</label>
              <BaseSelect
                v-model="currentLang"
                :options="languageOptions"
              />
            </div>

          </div>

          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700/50 pb-2">
              <div class="space-y-0.5">
                <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.vn_title_priority') }}</h2>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.vn_title_priority_desc') }}</p>
              </div>
              <button
                @click="showAddLang = !showAddLang"
                class="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition"
              >
                <Icon :icon="showAddLang ? 'lucide:x' : 'lucide:plus'" class="h-4 w-4" />
              </button>
            </div>

            <div v-if="showAddLang" class="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg border border-neutral-100 dark:border-neutral-700">
              <div class="flex-1">
                <BaseSelect
                  v-model="selectedNewLang"
                  :options="availableTitleLangOptions"
                  :label-renderer="(l) => t(l)"
                  class="w-full"
                />
              </div>
              <button
                @click="addLanguage"
                class="px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200"
              >
                {{ t('settings.add_language') }}
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(lang, index) in titleLangPriority"
                :key="lang"
                class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold text-neutral-300 dark:text-neutral-600 w-4">{{ index + 1 }}</span>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-neutral-800 dark:text-neutral-200">{{ t(`settings.lang_names.${lang}`) }}</span>
                    <span class="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase">{{ lang }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    @click="moveLanguage(index, -1)"
                    :disabled="index === 0"
                    class="p-1.5 rounded-md hover:bg-white dark:hover:bg-neutral-700 hover:shadow-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon icon="lucide:chevron-up" class="h-4 w-4" />
                  </button>
                  <button
                    @click="moveLanguage(index, 1)"
                    :disabled="index === titleLangPriority.length - 1"
                    class="p-1.5 rounded-md hover:bg-white dark:hover:bg-neutral-700 hover:shadow-sm text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon icon="lucide:chevron-down" class="h-4 w-4" />
                  </button>
                  <button
                    @click="removeLanguage(index)"
                    class="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <Icon icon="lucide:x" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeSection === 'privacy'">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-4">
            <div class="border-b border-neutral-100 dark:border-neutral-700/50 pb-2">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.privacy.title') }}</h2>
              <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.privacy.description') }}</p>
            </div>

            <div class="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
              <div class="space-y-0.5">
                <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.privacy.card_list') }}</h3>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.privacy.card_list_desc') }}</p>
              </div>
              <div class="space-y-2">
                <div
                  v-for="key in ['sexual_vn', 'sexual_release', 'nsfw_cover_vn', 'nsfw_cover_release']"
                  :key="'card-' + key"
                  class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50"
                >
                  <span class="w-20 text-xs font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap shrink-0">{{ t(`settings.privacy.label_${key}`) }}</span>
                  <BaseSelect
                    v-model="privacyCardList[key]"
                    :options="cardListOptions"
                    :label-renderer="(l) => t(l)"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
              <div class="space-y-0.5">
                <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.privacy.detail_page') }}</h3>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.privacy.detail_page_desc') }}</p>
              </div>
              <div class="space-y-2">
                <div
                  v-for="key in ['sexual_vn', 'sexual_release', 'nsfw_cover_vn', 'nsfw_cover_release']"
                  :key="'detail-' + key"
                  class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50"
                >
                  <span class="w-20 text-xs font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap shrink-0">{{ t(`settings.privacy.label_${key}`) }}</span>
                  <BaseSelect
                    v-model="privacyDetail[key]"
                    :options="detailOptions"
                    :label-renderer="(l) => t(l)"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
              <div class="space-y-0.5">
                <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.privacy.screenshots') }}</h3>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.privacy.screenshots_desc') }}</p>
              </div>
              <div class="space-y-2">
                <div
                  v-for="key in ['sexual_screenshot', 'nsfw_screenshot']"
                  :key="'screenshot-' + key"
                  class="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50"
                >
                  <span class="w-20 text-xs font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap shrink-0">{{ t(`settings.privacy.label_${key}`) }}</span>
                  <BaseSelect
                    v-model="privacyScreenshots[key]"
                    :options="screenshotOptions"
                    :label-renderer="(l) => t(l)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeSection === 'about'">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-3">
            <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-700/50 pb-2">{{ t('settings.about.title') }}</h2>
            <div class="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <div class="flex justify-between">
                <span class="text-neutral-500 dark:text-neutral-400">{{ t('settings.about.version') }}</span>
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-neutral-800 dark:text-neutral-200">{{ APP_VERSION }}</span>
                  <span
                    v-if="updateState === 'available'"
                    class="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0"
                  />
                </div>
              </div>

              <button
                @click="checkForUpdate"
                :disabled="updateState === 'checking'"
                class="flex items-center justify-between w-full py-2 px-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-150 disabled:opacity-50"
              >
                <span class="text-neutral-500 dark:text-neutral-400">{{ t('settings.about.check_update') }}</span>
                <div class="flex items-center gap-1.5">
                  <template v-if="updateState === 'idle'">
                    <Icon icon="lucide:refresh-cw" class="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                  </template>
                  <template v-else-if="updateState === 'checking'">
                    <Icon icon="lucide:refresh-cw" class="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 animate-spin" />
                    <span class="text-neutral-400 dark:text-neutral-500">{{ t('settings.about.checking') }}</span>
                  </template>
                  <template v-else-if="updateState === 'available'">
                    <span class="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full border border-green-100 dark:border-green-800/30">
                      {{ latestVersion }}
                    </span>
                    <Icon icon="lucide:external-link" class="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </template>
                  <template v-else-if="updateState === 'up-to-date'">
                    <Icon icon="lucide:check" class="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span class="text-green-600 dark:text-green-400">{{ t('settings.about.up_to_date') }}</span>
                  </template>
                  <template v-else-if="updateState === 'error'">
                    <Icon icon="lucide:info" class="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                    <span class="text-neutral-400 dark:text-neutral-500">{{ t('settings.about.check_failed') }}</span>
                  </template>
                </div>
              </button>

              <a
                v-if="updateState === 'available'"
                :href="latestReleaseUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg border border-green-100 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10 transition hover:bg-green-50 dark:hover:bg-green-900/20 active:bg-green-100 dark:active:bg-green-900/30"
              >
                <span class="text-green-700 dark:text-green-300 font-medium">{{ t('settings.about.download_update') }}</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-green-600 dark:text-green-400">{{ latestReleaseDate }}</span>
                  <Icon icon="lucide:external-link" class="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                </div>
              </a>

              <div class="flex justify-between">
                <span class="text-neutral-500 dark:text-neutral-400">{{ t('settings.about.developer') }}</span>
                <span class="font-medium text-neutral-800 dark:text-neutral-200">Heki喵 (Cyancat000)</span>
              </div>
              <a
                href="https://github.com/Cyancat000/vndbest"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-between py-2 px-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-150"
              >
                <span class="text-neutral-500 dark:text-neutral-400">{{ t('settings.about.github') }}</span>
                <div class="flex items-center gap-1">
                  <span class="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">Cyancat000/vndbest</span>
                  <Icon icon="lucide:external-link" class="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                </div>
              </a>
            </div>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>
