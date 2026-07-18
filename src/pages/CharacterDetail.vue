<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { SEX_ICONS } from '@/icons/icon-names'
import { getCharacterDetail, getCharacterQuotes } from '@/api/vndb'
import VnList from '@/components/VnList.vue'
import { useTranslation } from '@/composables/useTranslation'
import { useImageLoader } from '@/composables/useImageLoader'
import { IonPage, IonContent, IonImg, IonSpinner } from '@ionic/vue'
import { CapacitorHttp } from '@capacitor/core'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { translateTraitName } = useTranslation()
const imageLoader = useImageLoader()
const characterId = ref(route.params.id)

const character = ref(null)
const loading = ref(true)
const error = ref(null)

// 角色特征筛选状态
const traitSpoilerLevel = ref(0)
const showTraitSexual = ref(false)
const tempTraitSpoilerLevel = ref(0)
const showTraitSpoilerConfirm = ref(false)

// 台词数据
const quotes = ref([])
const quotesLoading = ref(false)
const quotesError = ref(null)
const quoteTranslations = ref({})

const translatedDescription = ref('')
const translationLoading = ref(false)
const translationError = ref('')
const translationSourceText = ref('')

// 翻译角色性别（sex 可能为数组 ["f","f"] 或字符串 "f,f"）
const translateGender = (sex) => {
  if (!sex) return t('metadata.gender.unknown')
  let primarySex
  if (Array.isArray(sex)) {
    primarySex = sex.length > 0 ? sex[0] : null
  } else if (typeof sex === 'string' && sex.length > 0) {
    primarySex = sex.includes(',') ? sex.split(',')[0].trim() : sex[0]
  } else {
    primarySex = sex
  }
  if (!primarySex) return t('metadata.gender.unknown')
  return t(`metadata.gender.${primarySex}`) || sex
}

// 翻译特征分组名（分组名可能含空格、括号如 "ENGAGES IN_(SEXUAL)"）
const translateTraitGroup = (groupName) => {
  if (!groupName) return t('metadata.trait_group.other')
  const key = groupName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')
  return t(`metadata.trait_group.${key}`) || groupName
}

// 翻译角色类型关系
const translateCharRole = (role) => {
  return t(`metadata.role.${role.toLowerCase()}`) || role
}

// BBCode 渲染函数
const parseBBCode = (text) => {
  if (!text) return ''
  let escaped = text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')

  // 1. [url=link]text[/url]
  escaped = escaped.replace(/\[url=(https?:\/\/[^\]]+)\](.*?)\[\/url\]/gi, (match, url, label) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-neutral-900 font-semibold hover:text-neutral-600 transition-colors">${label}</a>`
  })

  // 2. [url]link[/url]
  escaped = escaped.replace(/\[url\](https?:\/\/[^\[]+)\[\/url\]/gi, (match, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-neutral-900 font-semibold hover:text-neutral-600 transition-colors">${url}</a>`
  })

  return escaped
}

const getPlainTextFromBBCode = (text) => {
  if (!text) return ''
  return text
    .replace(/\[quote\][\s\S]*?\[\/quote\]/gi, ' ')
    .replace(/\[url=.*?\](.*?)\[\/url\]/gi, '$1')
    .replace(/\[img\].*?\[\/img\]/gi, ' ')
    .replace(/\[\/?.+?\]/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const resetDescriptionTranslation = () => {
  translatedDescription.value = ''
  translationLoading.value = false
  translationError.value = ''
  translationSourceText.value = ''
}

const resetQuoteTranslations = () => {
  quoteTranslations.value = {}
}

const translateQuote = async (quote) => {
  const sourceText = (quote?.quote || '').trim()
  if (!sourceText || !quote?.id) return

  const current = quoteTranslations.value[quote.id] || {}
  if (current.loading) return

  quoteTranslations.value = {
    ...quoteTranslations.value,
    [quote.id]: {
      translated: current.translated || '',
      error: '',
      loading: true,
      sourceText
    }
  }

  try {
    const response = await CapacitorHttp.post({
      url: 'https://workers.hekinyan.vip/v1/translate',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        locale: locale.value,
        messages: [
          {
            role: 'user',
            content: sourceText
          }
        ]
      }
    })

    const content = response?.data?.choices?.[0]?.message?.content?.trim()
    if (!content) {
      throw new Error(t('vn.translation.empty'))
    }

    quoteTranslations.value = {
      ...quoteTranslations.value,
      [quote.id]: {
        translated: content,
        error: '',
        loading: false,
        sourceText
      }
    }
  } catch (err) {
    console.error('角色摘录翻译失败:', err)
    quoteTranslations.value = {
      ...quoteTranslations.value,
      [quote.id]: {
        translated: current.translated || '',
        error: err?.response?.data?.error || err?.message || t('vn.translation.failed'),
        loading: false,
        sourceText
      }
    }
  }
}

const translateDescription = async () => {
  const sourceText = getPlainTextFromBBCode(character.value?.description || '')
  if (!sourceText) return

  if (translationLoading.value) return

  translationLoading.value = true
  translationError.value = ''

  try {
    const response = await CapacitorHttp.post({
      url: 'https://workers.hekinyan.vip/v1/translate',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        locale: locale.value,
        messages: [
          {
            role: 'user',
            content: sourceText
          }
        ]
      }
    })

    const content = response?.data?.choices?.[0]?.message?.content?.trim()
    if (!content) {
      throw new Error(t('vn.translation.empty'))
    }

    translatedDescription.value = content
    translationSourceText.value = sourceText
  } catch (err) {
    console.error('角色简介翻译失败:', err)
    translationError.value = err?.response?.data?.error || err?.message || t('vn.translation.failed')
  } finally {
    translationLoading.value = false
  }
}

// 分组展示特征标签（根据剧透等级和性内容过滤）
const groupTraits = (traits) => {
  if (!traits) return {}
  const filtered = traits.filter(t => {
    // 剧透级别过滤
    if (t.spoiler > traitSpoilerLevel.value) return false
    // 性内容过滤
    if (!showTraitSexual.value && t.sexual) return false
    return true
  })
  return filtered.reduce((acc, trait) => {
    const group = trait.group_name || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(trait)
    return acc
  }, {})
}

// 经过筛选后的特征数量
const filteredTraitCount = computed(() => {
  if (!character.value?.traits) return 0
  return character.value.traits.filter(t => {
    if (t.spoiler > traitSpoilerLevel.value) return false
    if (!showTraitSexual.value && t.sexual) return false
    return true
  }).length
})

// 处理特征剧透等级选择
const handleSelectTraitSpoiler = (level) => {
  if (level === 2) {
    tempTraitSpoilerLevel.value = level
    showTraitSpoilerConfirm.value = true
  } else {
    traitSpoilerLevel.value = level
  }
}

const confirmTraitSpoilerLevel = () => {
  traitSpoilerLevel.value = tempTraitSpoilerLevel.value
  showTraitSpoilerConfirm.value = false
}

async function fetchCharacterInfo() {
  loading.value = true
  error.value = null
  try {
    const res = await getCharacterDetail(characterId.value)
    if (res && res.results && res.results.length > 0) {
      character.value = res.results[0]
      resetDescriptionTranslation()
      resetQuoteTranslations()
      // 自动加载台词
      fetchQuotes()
    } else {
      error.value = t('vn.not_found')
    }
  } catch (err) {
    console.error('获取角色详情失败:', err)
    error.value = err.message || t('common.error')
  } finally {
    loading.value = false
  }
}

async function fetchQuotes() {
  if (!characterId.value) return
  quotesLoading.value = true
  quotesError.value = null
  try {
    const res = await getCharacterQuotes(characterId.value)
    if (res && res.results) {
      quotes.value = res.results
    }
  } catch (err) {
    console.error('获取角色台词失败:', err)
    quotesError.value = err.message
  } finally {
    quotesLoading.value = false
  }
}

// 复制台词内容
const copiedQuoteId = ref(null)
const copyQuote = async (quote) => {
  try {
    await navigator.clipboard.writeText(quote.quote)
    copiedQuoteId.value = quote.id
    setTimeout(() => {
      if (copiedQuoteId.value === quote.id) copiedQuoteId.value = null
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 性别图标和颜色（sex 可能为数组、逗号分隔字符串或单字符）
const getSexIcon = (sex) => {
  let s
  if (Array.isArray(sex)) {
    s = sex.length > 0 ? sex[0] : null
  } else if (typeof sex === 'string' && sex.length > 0) {
    s = sex.includes(',') ? sex.split(',')[0].trim() : sex[0]
  } else {
    s = sex
  }
  if (s === 'f') return SEX_ICONS.f
  if (s === 'm') return SEX_ICONS.m
  if (s === 'b') return SEX_ICONS.b
  return null
}

const getSexClass = (sex) => {
  let s
  if (Array.isArray(sex)) {
    s = sex.length > 0 ? sex[0] : null
  } else if (typeof sex === 'string' && sex.length > 0) {
    s = sex.includes(',') ? sex.split(',')[0].trim() : sex[0]
  } else {
    s = sex
  }
  if (s === 'f') return 'text-rose-400 bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:border-rose-800/50'
  if (s === 'm') return 'text-blue-400 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/50'
  return 'text-neutral-400 bg-neutral-50 border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700'
}

// 当前已加载的角色 ID，用于避免从子页面返回时重复加载
const currentLoadedId = ref(null)

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      // 如果 ID 没变（从子页面返回），跳过重新加载以保留数据/位置状态
      if (newId === currentLoadedId.value) return
      currentLoadedId.value = newId
      characterId.value = newId
      fetchCharacterInfo()
    }
  },
  { immediate: true }
)
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container space-y-6">
    <!-- Header/Back Navigation -->
    <div class="flex items-center gap-4 page-sticky-header page-sticky-header--lg">
      <button
        @click="router.back()"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs dark:bg-neutral-800 dark:border-neutral-700 active:scale-95 transition-transform cursor-pointer"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
          {{ character?.name || t('vn.character_details') }}
        </h1>
        <p class="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{{ characterId }}</p>
      </div>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="flex gap-4 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/50">
        <div class="w-24 h-32 rounded-lg bg-neutral-100 dark:bg-neutral-800"></div>
        <div class="flex-1 space-y-3 py-1">
          <div class="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2"></div>
          <div class="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/3"></div>
          <div class="grid grid-cols-2 gap-2 pt-2">
            <div class="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
            <div class="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
            <div class="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
            <div class="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
          </div>
        </div>
      </div>
      <div class="space-y-2 px-1">
        <div class="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/6"></div>
        <div class="h-24 bg-neutral-50 dark:bg-neutral-800 rounded-lg"></div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else-if="error || !character" class="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500 space-y-4">
      <Icon icon="lucide:user-x" class="h-12 w-12 opacity-20" />
      <p class="text-sm font-medium">{{ error || t('vn.not_found') }}</p>
      <button @click="router.back()" class="text-xs text-neutral-900 dark:text-neutral-100 font-bold underline">{{ t('common.go_back') }}</button>
    </div>

    <!-- 详情内容 -->
    <div v-else class="space-y-6">
      <!-- 角色基本信息卡片 -->
      <div class="flex flex-col sm:flex-row items-start gap-5 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-xs dark:border-neutral-700 dark:bg-neutral-800">
        <div class="w-full sm:w-32 aspect-[3/4] sm:h-44 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900 relative">
          <ion-img
            v-if="character.image?.url"
            :key="`char-img-${imageLoader.getRetryCount('char-main')}`"
            :src="character.image.url"
            class="w-full h-full object-cover object-top transition-opacity duration-500"
            :class="{ 'opacity-0': !imageLoader.isSuccess('char-main') }"
            @ionImgDidLoad="imageLoader.onLoad('char-main')"
            @ionError="imageLoader.onError('char-main')"
          />
          <ion-spinner
            v-if="character.image?.url && imageLoader.isLoading('char-main')"
            name="crescent"
            class="absolute inset-0 m-auto z-10 text-neutral-400 dark:text-neutral-500"
            style="width: 24px; height: 24px;"
          />
          <div
            v-if="character.image?.url && imageLoader.isError('char-main')"
            @click="imageLoader.retry('char-main')"
            class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 z-10 cursor-pointer"
          >
            <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div v-if="!character.image?.url" class="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600">
            <Icon icon="lucide:user" class="h-12 w-12" />
          </div>
        </div>
        
        <div class="flex-1 min-w-0 w-full space-y-3">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 leading-tight">{{ character.name }}</h1>
              <div 
                v-if="getSexIcon(character.sex)" 
                class="shrink-0 inline-flex items-center rounded-lg px-2 py-1 border"
                :class="getSexClass(character.sex)"
              >
                <Icon :icon="getSexIcon(character.sex)" class="h-3.5 w-3.5" />
              </div>
            </div>
            <p v-if="character.original" class="text-sm text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">{{ character.original }}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
            <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-1">
              <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.characters.gender') }}</span>
              <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ translateGender(character.sex) }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-1">
              <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.characters.blood_type') }}</span>
              <span class="text-neutral-800 dark:text-neutral-200 font-bold uppercase">{{ character.blood_type || '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-1">
              <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.characters.age') }}</span>
              <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ character.age || '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-1">
              <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.characters.height') }}</span>
              <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ character.height ? `${character.height}cm` : '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-1">
              <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.characters.weight') }}</span>
              <span class="text-neutral-800 dark:text-neutral-200 font-bold">{{ character.weight ? `${character.weight}kg` : '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-700/50 pb-1">
              <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.characters.birthday') }}</span>
              <span class="text-neutral-800 dark:text-neutral-200 font-bold">
                {{ character.birthday ? t('vn.characters.birthday_val', { month: character.birthday[0], day: character.birthday[1] }) : '?' }}
              </span>
            </div>
          </div>

          <div v-if="character.bust || character.waist || character.hips" class="bg-white/50 dark:bg-neutral-800/50 rounded-lg px-3 py-2 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between">
            <span class="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">{{ t('vn.characters.measurements') }}</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-black text-neutral-800 dark:text-neutral-200 tracking-tighter">{{ character.bust || '?' }} / {{ character.waist || '?' }} / {{ character.hips || '?' }}</span>
              <span v-if="character.cup" class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] font-black uppercase">{{ t('vn.characters.cup', { cup: character.cup }) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 角色简述 -->
      <div v-if="character.description" class="space-y-3">
        <div class="flex items-center justify-between gap-3 px-1">
          <div class="flex items-center gap-2">
            <div class="h-3 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100"></div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{{ t('vn.description') }}</h3>
          </div>
          <button
            @click="translateDescription"
            :disabled="translationLoading"
            class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 transition disabled:cursor-not-allowed disabled:opacity-60 hover:border-neutral-300 hover:text-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
          >
            <Icon :icon="translationLoading ? 'lucide:loader-circle' : 'lucide:languages'" class="h-3.5 w-3.5" :class="{ 'animate-spin': translationLoading }" />
            {{ translationLoading ? t('vn.translation.loading') : (translatedDescription ? t('vn.translation.retranslate') : t('vn.translation.action')) }}
          </button>
        </div>
        <div
          class="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 px-5 py-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap bbcode-container shadow-xs"
          v-html="parseBBCode(character.description)"
        ></div>
        <div v-if="translatedDescription || translationError || translationLoading" class="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-5 py-4 space-y-2 shadow-xs">
          <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
            <Icon icon="lucide:languages" class="h-3.5 w-3.5" />
            <span>{{ t('vn.translation.title') }}</span>
          </div>
          <div v-if="translationLoading" class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Icon icon="lucide:loader-circle" class="h-4 w-4 animate-spin" />
            <span>{{ t('vn.translation.loading') }}</span>
          </div>
          <div v-else-if="translationError" class="text-sm leading-relaxed text-rose-500 dark:text-rose-400">
            {{ translationError }}
          </div>
          <p v-else class="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
            {{ translatedDescription }}
          </p>
        </div>
      </div>

      <!-- 特征标签 -->
      <div v-if="character.traits && character.traits.length > 0" class="space-y-3">
        <div class="flex items-center gap-2 px-1">
          <div class="h-3 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100"></div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{{ t('library.traits') }}</h3>
          <span class="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            {{ filteredTraitCount }}
          </span>
        </div>

        <!-- 特征筛选控件 -->
        <div class="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-3 space-y-3">
          <!-- 剧透等级筛选 -->
          <span class="text-xs text-neutral-600 dark:text-neutral-400 font-medium flex items-center gap-1.5">
            <Icon icon="lucide:shield-alert" class="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            {{ t('vn.characters.trait_spoiler_filter') }}
          </span>
          <div class="grid grid-cols-3 gap-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 p-0.5 text-center">
            <button
              v-for="level in [
                { val: 0, label: t('vn.characters.trait_spoiler_0') },
                { val: 1, label: t('vn.characters.trait_spoiler_1') },
                { val: 2, label: t('vn.characters.trait_spoiler_2') }
              ]"
              :key="level.val"
              @click="handleSelectTraitSpoiler(level.val)"
              class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
              :class="[ traitSpoilerLevel === level.val ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200' ]"
            >
              {{ level.label }}
            </button>
          </div>

          <!-- 性内容过滤 -->
          <span class="text-xs text-neutral-600 dark:text-neutral-400 font-medium flex items-center gap-1.5 mt-1">
            <Icon icon="lucide:layers" class="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            {{ t('vn.characters.trait_sexual_filter') }}
          </span>
          <div class="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 p-0.5 text-center">
            <button
              @click="showTraitSexual = false"
              class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
              :class="[ !showTraitSexual ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200' ]"
            >
              {{ t('vn.characters.trait_sexual_hide') }}
            </button>
            <button
              @click="showTraitSexual = true"
              class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
              :class="[ showTraitSexual ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200' ]"
            >
              {{ t('vn.characters.trait_sexual_show') }}
            </button>
          </div>
        </div>

        <!-- 筛选后无结果提示 -->
        <div v-if="filteredTraitCount === 0" class="text-center py-4 text-xs text-neutral-400 dark:text-neutral-500">
          {{ t('vn.characters.trait_empty') }}
        </div>

        <!-- 特征分组展示 -->
        <div v-else class="grid grid-cols-1 gap-4">
          <div
            v-for="(traits, group) in groupTraits(character.traits)"
            :key="group"
            class="space-y-2 bg-neutral-50/30 dark:bg-neutral-800/30 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800"
          >
            <h5 class="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              {{ translateTraitGroup(group) }}
            </h5>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="trait in traits"
                :key="trait.id || trait.name"
                @click="router.push(`/browse/characters?trait=${trait.id}`)"
                class="px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
                :class="[ trait.spoiler === 2 ? 'bg-red-50 text-red-700 border border-red-100 hover:border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 dark:hover:border-red-600' : trait.spoiler === 1 ? 'bg-amber-50 text-amber-700 border border-amber-100 hover:border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50 dark:hover:border-amber-600' : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-500' ]"
              >
                {{ translateTraitName(trait.name) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Other Instances（其他出场作品） -->
      <div v-if="character.vns && character.vns.length > 0" class="space-y-4 pt-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <div class="h-4 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100"></div>
            <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">{{ t('vn.other_instances') }}</h3>
          </div>
          <span class="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            {{ character.vns.length }}
          </span>
        </div>
        <VnList
          :items="character.vns"
          :show-sort="false"
          :compact="true"
          :show-footer-status="false"
          storage-key="vndb_char_vn_layout"
        />
      </div>
      <div v-else-if="!loading && character" class="space-y-4 pt-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <div class="h-4 w-1 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
            <h3 class="text-sm font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{{ t('vn.other_instances') }}</h3>
          </div>
        </div>
        <div class="text-center py-8 text-xs text-neutral-400 dark:text-neutral-500">
          {{ t('vn.other_instances_empty') }}
        </div>
      </div>

      <!-- Quotes（经典台词） -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center gap-2 px-1">
          <div class="h-4 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100"></div>
          <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">{{ t('vn.char_quotes') }}</h3>
          <span v-if="quotes.length > 0" class="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            {{ quotes.length }}
          </span>
        </div>

        <!-- 加载中 -->
        <div v-if="quotesLoading" class="flex justify-center py-8">
          <Icon icon="lucide:loader-2" class="h-5 w-5 text-neutral-300 animate-spin" />
        </div>

        <!-- 错误 -->
        <div v-else-if="quotesError" class="text-center py-6 text-xs text-red-400">
          {{ quotesError }}
        </div>

        <!-- 空状态 -->
        <div v-else-if="quotes.length === 0" class="text-center py-8 text-xs text-neutral-400 dark:text-neutral-500">
          {{ t('vn.char_quotes_empty') }}
        </div>

        <!-- 台词列表 -->
        <div v-else class="space-y-3">
          <div
            v-for="quote in quotes"
            :key="quote.id"
            class="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <!-- 台词内容 -->
            <p @click="copyQuote(quote)" class="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 italic whitespace-pre-wrap">
              "{{ quote.quote }}"
            </p>

            <div v-if="quoteTranslations[quote.id]?.translated || quoteTranslations[quote.id]?.error || quoteTranslations[quote.id]?.loading" class="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-900/20 p-3 space-y-2">
              <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                <Icon icon="lucide:languages" class="h-3.5 w-3.5" />
                <span>{{ t('vn.translation.title') }}</span>
              </div>
              <div v-if="quoteTranslations[quote.id]?.loading" class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Icon icon="lucide:loader-circle" class="h-4 w-4 animate-spin" />
                <span>{{ t('vn.translation.loading') }}</span>
              </div>
              <div v-else-if="quoteTranslations[quote.id]?.error" class="text-sm leading-relaxed text-rose-500 dark:text-rose-400">
                {{ quoteTranslations[quote.id].error }}
              </div>
              <p v-else class="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {{ quoteTranslations[quote.id].translated }}
              </p>
            </div>

            <!-- 台词来源和评分 -->
            <div class="flex items-center justify-between gap-3 text-[10px] text-neutral-400 dark:text-neutral-500">
              <div class="flex items-center gap-1.5">
                <Icon icon="lucide:book-open" class="h-3 w-3" />
                <span class="font-medium">
                  {{ t('vn.char_quotes_from') }}
                  <span v-if="quote.vn" class="text-neutral-600 dark:text-neutral-300 font-semibold">{{ quote.vn.title }}</span>
                  <span v-else class="text-neutral-500 dark:text-neutral-400">{{ t('vn.char_quotes_narrator') }}</span>
                </span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  @click.stop="translateQuote(quote)"
                  :disabled="quoteTranslations[quote.id]?.loading"
                  :title="quoteTranslations[quote.id]?.translated ? t('vn.quotes.retranslate') : t('vn.quotes.translate')"
                  :aria-label="quoteTranslations[quote.id]?.translated ? t('vn.quotes.retranslate') : t('vn.quotes.translate')"
                  class="inline-flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900 p-1.5 text-neutral-500 dark:text-neutral-400 transition disabled:cursor-not-allowed disabled:opacity-60 hover:border-neutral-300 hover:text-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
                >
                  <Icon :icon="quoteTranslations[quote.id]?.loading ? 'lucide:loader-circle' : 'lucide:languages'" class="h-3.5 w-3.5" :class="{ 'animate-spin': quoteTranslations[quote.id]?.loading }" />
                </button>
                <div @click="copyQuote(quote)" class="flex items-center gap-1.5">
                  <template v-if="copiedQuoteId === quote.id">
                    <Icon icon="lucide:check" class="h-3 w-3 text-green-500" />
                    <span class="font-semibold text-green-600">{{ t('vn.quotes.copied') }}</span>
                  </template>
                  <template v-else>
                    <Icon icon="lucide:copy" class="h-3 w-3 text-neutral-400" />
                    <div v-if="quote.score !== null && quote.score !== undefined" class="flex items-center gap-1">
                      <Icon icon="lucide:star" class="h-3 w-3 text-amber-400" />
                      <span class="font-semibold text-neutral-500 dark:text-neutral-400">{{ quote.score }}</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Teleport: 角色特征剧透确认框 -->
  <Teleport to="body">
    <div 
      v-if="showTraitSpoilerConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
      @click="showTraitSpoilerConfirm = false"
    >
      <div 
        class="w-full max-w-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5 shadow-xl space-y-4"
        @click.stop
      >
        <div class="flex items-center gap-2 text-red-600">
          <Icon icon="lucide:info" class="h-4 w-4" />
          <h3 class="text-xs font-bold uppercase tracking-wider">{{ t('vn.spoiler_alert.title') }}</h3>
        </div>
        <p class="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          {{ t('vn.spoiler_alert.desc') }}
        </p>
        <div class="flex gap-2 justify-end text-xs">
          <button
            @click="showTraitSpoilerConfirm = false"
            class="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600 active:bg-neutral-100 dark:active:bg-neutral-500"
          >
            {{ t('vn.spoiler_alert.cancel') }}
          </button>
          <button
            @click="confirmTraitSpoilerLevel"
            class="h-7 px-2.5 rounded-lg border border-transparent bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-700 dark:active:bg-neutral-300"
          >
            {{ t('vn.spoiler_alert.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
  </ion-content>
  </ion-page>
</template>

<style scoped>
.bbcode-container :deep(a) {
  color: #171717;
  text-decoration: underline;
  font-weight: 600;
}
.bbcode-container :deep(a:hover) {
  color: #525252;
}
:global(.dark) .bbcode-container :deep(a) {
  color: #e5e5e5;
}
:global(.dark) .bbcode-container :deep(a:hover) {
  color: #a3a3a3;
}
</style>
