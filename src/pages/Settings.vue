<script setup>
defineOptions({ name: 'Settings' })

import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import AppHeader from '@/components/AppHeader.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { IonPage, IonContent } from '@ionic/vue'
import { useTheme } from '@/composables/useTheme'
import { useBackground } from '@/composables/useBackground'
import { SETTINGS_SECTION_ICONS, THEME_OPTION_ICONS } from '@/icons/icon-names'
import { cacheManager } from '@/utils/cacheManager'
import { useToast } from '@/composables/useToast'
import { useAppUpdate } from '@/composables/useAppUpdate'
import { useFavorites } from '@/composables/useFavorites'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { themeMode } = useTheme()
const { showToast } = useToast()
const {
  appVersion: APP_VERSION,
  updateState,
  latestVersion,
  latestReleaseUrl,
  latestReleaseDate,
  checkForUpdate
} = useAppUpdate()
const {
  backgroundImage,
  backgroundOpacity,
  backgroundBlur,
  hasCustomBackground,
  selectBackgroundImage,
  clearBackgroundImage
} = useBackground()

const bgSelecting = ref(false)
const bgError = ref('')

async function handleSelectBackground() {
  if (bgSelecting.value) return
  bgSelecting.value = true
  bgError.value = ''
  try {
    await selectBackgroundImage()
  } catch (err) {
    if (err?.message === 'cancelled') {
      // 用户取消选择，不提示错误
    } else if (err?.name === 'QuotaExceededError' || /quota|storage/i.test(String(err?.message || err))) {
      bgError.value = t('settings.background.error_quota')
      clearBackgroundImage()
    } else {
      console.error('选择背景图失败:', err)
      bgError.value = t('settings.background.error_select')
    }
  } finally {
    bgSelecting.value = false
  }
}

function handleClearBackground() {
  bgError.value = ''
  clearBackgroundImage()
}

const username = ref(localStorage.getItem('vndb_username') || '')
const useSandbox = ref(JSON.parse(localStorage.getItem('vndb_use_sandbox') || 'false'))
const currentLang = ref(locale.value)

/** 由真实路由驱动：/settings 为 root，/settings/:section 为二级页 */
const activeSection = computed(() => route.meta.settingsSection || 'root')

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
    key: 'favorites',
    title: t('settings.sections.favorites.title'),
    description: t('settings.sections.favorites.description'),
    icon: SETTINGS_SECTION_ICONS.favorites
  },
  {
    key: 'storage',
    title: t('settings.sections.storage.title'),
    description: t('settings.sections.storage.description'),
    icon: SETTINGS_SECTION_ICONS.storage
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

// ====== 存储与缓存管理 ======
const storageInfo = ref({
  memoryCount: 0,
  idbCount: 0,
  usageBytes: 0,
  formattedUsage: '0 B'
})
const isClearingCache = ref(false)
const isLoadingStorage = ref(false)

async function loadStorageInfo() {
  isLoadingStorage.value = true
  try {
    const info = await cacheManager.getStorageInfo()
    storageInfo.value = info
  } catch (e) {
    console.warn('获取存储信息失败:', e)
  } finally {
    isLoadingStorage.value = false
  }
}

async function handleClearCache() {
  if (isClearingCache.value) return
  isClearingCache.value = true
  try {
    await cacheManager.clear()
    storageInfo.value = {
      memoryCount: 0,
      idbCount: 0,
      usageBytes: 0,
      formattedUsage: '0 B'
    }
    showToast(t('settings.storage.clear_success'), 'success')
  } catch (err) {
    console.error('清空缓存失败:', err)
    showToast(t('settings.storage.clear_failed'), 'error')
  } finally {
    isClearingCache.value = false
  }
}

watch(activeSection, (newSection) => {
  if (newSection === 'storage') {
    loadStorageInfo()
  }
}, { immediate: true })

onMounted(() => {
  username.value = localStorage.getItem('vndb_username') || ''
  if (activeSection.value === 'storage') {
    loadStorageInfo()
  }
})

function openSection(sectionKey) {
  if (activeSection.value === sectionKey) return
  router.push(`/settings/${sectionKey}`)
}

function goBackToRoot() {
  if (activeSection.value === 'root') return
  // 与系统返回一致：走真实路由历史栈
  router.back()
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

// ====== 本地收藏管理 ======
const { favorites: favList, counts: favCounts, removeFavorite: removeFav, clearFavorites: clearFavs } = useFavorites()
const favActiveType = ref('all')
const favFilterTypes = computed(() => [
  { key: 'all', label: `${t('favorites.all')} (${favCounts.value.all})` },
  { key: 'vn', label: `${t('favorites.item_types.vn')} (${favCounts.value.vn})` },
  { key: 'release', label: `${t('favorites.item_types.release')} (${favCounts.value.release})` },
  { key: 'character', label: `${t('favorites.item_types.character')} (${favCounts.value.character})` },
  { key: 'staff', label: `${t('favorites.item_types.staff')} (${favCounts.value.staff})` },
  { key: 'producer', label: `${t('favorites.item_types.producer')} (${favCounts.value.producer})` }
])

const filteredFavorites = computed(() => {
  if (favActiveType.value === 'all') return favList.value
  return favList.value.filter(item => item.type === favActiveType.value)
})

function handleNavigateFavorite(item) {
  if (!item || !item.id) return
  if (item.type === 'vn') router.push(`/vn/${item.id}`)
  else if (item.type === 'release') router.push(`/release/${item.id}`)
  else if (item.type === 'character') router.push(`/character/${item.id}`)
  else if (item.type === 'staff') router.push(`/staff/${item.id}`)
  else if (item.type === 'producer') router.push(`/producer/${item.id}`)
}

function handleRemoveFavorite(id, event) {
  event?.stopPropagation?.()
  removeFav(id)
  showToast(t('common.favorite_removed'), 'info')
}

function handleClearAllFavorites() {
  if (confirm(t('favorites.clear_confirm_message'))) {
    clearFavs('all')
    showToast(t('favorites.empty'), 'info')
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
      <div
        class="page-container space-y-6"
        :class="activeSection === 'root' ? 'pb-24' : 'pb-8'"
      >
        <AppHeader
          :mode="activeSection !== 'root' ? 'back' : 'page'"
          icon="lucide:settings"
          :title="activeSectionMeta ? activeSectionMeta.title : t('settings.title')"
          :subtitle="activeSectionMeta ? activeSectionMeta.description : t('settings.description')"
          :on-back="activeSection !== 'root' ? goBackToRoot : undefined"
        />

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
                  :class="themeMode === opt.value ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'"
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

          <!-- 自定义背景 -->
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-4">
            <div class="border-b border-neutral-100 dark:border-neutral-700/50 pb-2">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.background.title') }}</h2>
              <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.background.description') }}</p>
            </div>

            <div class="flex items-stretch gap-3">
              <div class="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                <div
                  v-if="hasCustomBackground"
                  class="absolute inset-0"
                  :style="{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: backgroundOpacity / 100,
                    filter: backgroundBlur > 0 ? `blur(${Math.min(backgroundBlur, 8)}px)` : 'none',
                    transform: backgroundBlur > 0 ? 'scale(1.15)' : 'none'
                  }"
                />
                <div v-else class="absolute inset-0 flex items-center justify-center">
                  <Icon icon="lucide:image" class="h-6 w-6 text-neutral-300 dark:text-neutral-600" />
                </div>
              </div>

              <div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    @click="handleSelectBackground"
                    :disabled="bgSelecting"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
                  >
                    <Icon
                      :icon="bgSelecting ? 'lucide:loader' : 'lucide:image-plus'"
                      class="h-3.5 w-3.5"
                      :class="{ 'animate-spin': bgSelecting }"
                    />
                    {{ hasCustomBackground ? t('settings.background.change') : t('settings.background.select') }}
                  </button>
                  <button
                    v-if="hasCustomBackground"
                    type="button"
                    @click="handleClearBackground"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/40"
                  >
                    <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
                    {{ t('settings.background.clear') }}
                  </button>
                </div>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                  {{ t('settings.background.hint') }}
                </p>
                <p v-if="bgError" class="text-[10px] text-red-500 dark:text-red-400">
                  {{ bgError }}
                </p>
              </div>
            </div>

            <div class="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-700/50">
              <div class="flex items-center justify-between gap-2">
                <label class="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {{ t('settings.background.opacity') }}
                </label>
                <span class="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {{ backgroundOpacity }}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                v-model.number="backgroundOpacity"
                :disabled="!hasCustomBackground"
                class="w-full accent-neutral-900 dark:accent-neutral-100 disabled:opacity-40"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <label class="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {{ t('settings.background.blur') }}
                </label>
                <span class="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {{ backgroundBlur }}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                v-model.number="backgroundBlur"
                :disabled="!hasCustomBackground"
                class="w-full accent-neutral-900 dark:accent-neutral-100 disabled:opacity-40"
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

        <template v-else-if="activeSection === 'favorites'">
          <div class="space-y-4">
            <!-- 提示小字 -->
            <div class="flex items-start gap-2 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 text-xs text-amber-800 dark:text-amber-300">
              <Icon icon="lucide:info" class="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div class="leading-relaxed">
                <span>{{ t('favorites.notice') }}</span>
              </div>
            </div>

            <!-- 分类筛选器与清空按钮 -->
            <div class="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  v-for="fType in favFilterTypes"
                  :key="fType.key"
                  type="button"
                  @click="favActiveType = fType.key"
                  class="rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                  :class="favActiveType === fType.key
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'"
                >
                  {{ fType.label }}
                </button>
              </div>

              <button
                v-if="favList.length > 0"
                type="button"
                @click="handleClearAllFavorites"
                class="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 shrink-0 px-2 py-1 transition cursor-pointer"
              >
                <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
                <span>{{ t('favorites.clear_all') }}</span>
              </button>
            </div>

            <!-- 空状态 -->
            <div
              v-if="filteredFavorites.length === 0"
              class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-10 text-center shadow-xs space-y-3"
            >
              <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <Icon icon="lucide:heart" class="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <div class="space-y-1">
                <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('favorites.empty') }}</h3>
                <p class="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  {{ t('favorites.empty_hint') }}
                </p>
              </div>
            </div>

            <!-- 收藏列表 -->
            <div v-else class="space-y-2.5">
              <div
                v-for="item in filteredFavorites"
                :key="item.id"
                @click="handleNavigateFavorite(item)"
                class="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-xs transition hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm cursor-pointer"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <!-- 缩略图 / 图标 -->
                  <div class="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.title"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center">
                      <Icon
                        :icon="
                          item.type === 'vn' ? 'lucide:gamepad-2' :
                          item.type === 'release' ? 'lucide:package' :
                          item.type === 'character' ? 'lucide:user-circle' :
                          item.type === 'staff' ? 'lucide:users' :
                          item.type === 'producer' ? 'lucide:building-2' : 'lucide:bookmark'
                        "
                        class="h-5 w-5 text-neutral-400 dark:text-neutral-500"
                      />
                    </div>
                  </div>

                  <!-- 文本信息 -->
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="flex items-center gap-1.5">
                      <span class="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80">
                        {{ t(`favorites.item_types.${item.type}`) }}
                      </span>
                      <span class="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">{{ item.id }}</span>
                    </div>
                    <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary transition">
                      {{ item.title }}
                    </h3>
                    <p v-if="item.subtitle" class="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                      {{ item.subtitle }}
                    </p>
                  </div>
                </div>

                <!-- 取消收藏按钮 -->
                <button
                  type="button"
                  @click="handleRemoveFavorite(item.id, $event)"
                  class="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0 cursor-pointer"
                  :title="t('favorites.remove')"
                >
                  <Icon icon="lucide:heart" class="h-4 w-4 fill-red-500 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeSection === 'storage'">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-4">
            <div class="border-b border-neutral-100 dark:border-neutral-700/50 pb-2">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.storage.title') }}</h2>
              <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.storage.description') }}</p>
            </div>

            <!-- 缓存统计概览卡片 -->
            <div class="space-y-3 pt-2">
              <div class="space-y-0.5">
                <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('settings.storage.cache_stats') }}</h3>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-500">{{ t('settings.storage.cache_stats_desc') }}</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div class="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-3 flex flex-col justify-between">
                  <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('settings.storage.estimated_size') }}</span>
                  <span class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
                    {{ isLoadingStorage ? '...' : storageInfo.formattedUsage }}
                  </span>
                </div>
                <div class="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-3 flex flex-col justify-between">
                  <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('settings.storage.persistent_records') }}</span>
                  <span class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
                    {{ isLoadingStorage ? '...' : storageInfo.idbCount }}
                  </span>
                </div>
                <div class="rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-3 flex flex-col justify-between">
                  <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('settings.storage.memory_records') }}</span>
                  <span class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
                    {{ isLoadingStorage ? '...' : storageInfo.memoryCount }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 清除缓存操作区 -->
            <div class="pt-4 border-t border-neutral-100 dark:border-neutral-700/50 space-y-3">
              <div class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed bg-neutral-50/70 dark:bg-neutral-800/70 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <div class="flex items-start gap-2">
                  <Icon icon="lucide:info" class="h-4 w-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                  <span>{{ t('settings.storage.clear_cache_desc') }}</span>
                </div>
              </div>

              <button
                type="button"
                @click="handleClearCache"
                :disabled="isClearingCache"
                class="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 py-2.5 px-4 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40 active:bg-red-200 dark:active:bg-red-900/60 disabled:opacity-50"
              >
                <Icon
                  :icon="isClearingCache ? 'lucide:loader' : 'lucide:trash-2'"
                  class="h-4 w-4"
                  :class="{ 'animate-spin': isClearingCache }"
                />
                <span>{{ isClearingCache ? t('settings.storage.clearing') : t('settings.storage.clear_cache') }}</span>
              </button>
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
