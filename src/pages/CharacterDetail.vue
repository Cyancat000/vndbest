<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getCharacterDetail } from '@/api/vndb'
import VnList from '@/components/VnList.vue'
import { useTranslation } from '@/composables/useTranslation'
import { IonPage, IonContent } from '@ionic/vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { translateTraitName } = useTranslation()
const characterId = ref(route.params.id)

const character = ref(null)
const loading = ref(true)
const error = ref(null)

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

// 分组展示特征标签
const groupTraits = (traits) => {
  if (!traits) return {}
  // 默认不显示剧透标签，或者根据需要调整
  const filtered = traits.filter(t => t.spoiler === 0)
  return filtered.reduce((acc, trait) => {
    const group = trait.group_name || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(trait)
    return acc
  }, {})
}

async function fetchCharacterInfo() {
  loading.value = true
  error.value = null
  try {
    const res = await getCharacterDetail(characterId.value)
    if (res && res.results && res.results.length > 0) {
      character.value = res.results[0]
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
  if (s === 'f') return 'lucide:venus'
  if (s === 'm') return 'lucide:mars'
  if (s === 'b') return 'lucide:venus-mars'
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
  if (s === 'f') return 'text-rose-400 bg-rose-50 border-rose-100'
  if (s === 'm') return 'text-blue-400 bg-blue-50 border-blue-100'
  return 'text-neutral-400 bg-neutral-50 border-neutral-100'
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
    <div class="flex items-center gap-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100">
      <button
        @click="router.back()"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs active:scale-95 transition-transform cursor-pointer"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg font-bold text-neutral-900 truncate">
          {{ character?.name || t('vn.character_details') }}
        </h1>
        <p class="text-[10px] text-neutral-400 uppercase tracking-widest">{{ characterId }}</p>
      </div>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="flex gap-4 p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
        <div class="w-24 h-32 rounded-lg bg-neutral-100"></div>
        <div class="flex-1 space-y-3 py-1">
          <div class="h-6 bg-neutral-100 rounded w-1/2"></div>
          <div class="h-4 bg-neutral-100 rounded w-1/3"></div>
          <div class="grid grid-cols-2 gap-2 pt-2">
            <div class="h-4 bg-neutral-100 rounded w-full"></div>
            <div class="h-4 bg-neutral-100 rounded w-full"></div>
            <div class="h-4 bg-neutral-100 rounded w-full"></div>
            <div class="h-4 bg-neutral-100 rounded w-full"></div>
          </div>
        </div>
      </div>
      <div class="space-y-2 px-1">
        <div class="h-3 bg-neutral-100 rounded w-1/6"></div>
        <div class="h-24 bg-neutral-50 rounded-lg"></div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else-if="error || !character" class="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-4">
      <Icon icon="lucide:user-x" class="h-12 w-12 opacity-20" />
      <p class="text-sm font-medium">{{ error || t('vn.not_found') }}</p>
      <button @click="router.back()" class="text-xs text-neutral-900 font-bold underline">{{ t('common.go_back') }}</button>
    </div>

    <!-- 详情内容 -->
    <div v-else class="space-y-6">
      <!-- 角色基本信息卡片 -->
      <div class="flex flex-col sm:flex-row items-start gap-5 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-xs">
        <div class="w-full sm:w-32 aspect-[3/4] sm:h-44 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-200 bg-white shadow-sm">
          <img
            v-if="character.image?.url"
            :src="character.image.url"
            class="w-full h-full object-cover object-top"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
            <Icon icon="lucide:user" class="h-12 w-12" />
          </div>
        </div>
        
        <div class="flex-1 min-w-0 w-full space-y-3">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-black tracking-tight text-neutral-900 leading-tight">{{ character.name }}</h1>
              <div 
                v-if="getSexIcon(character.sex)" 
                class="shrink-0 inline-flex items-center rounded-lg px-2 py-1 border"
                :class="getSexClass(character.sex)"
              >
                <Icon :icon="getSexIcon(character.sex)" class="h-3.5 w-3.5" />
              </div>
            </div>
            <p v-if="character.original" class="text-sm text-neutral-500 font-medium mt-0.5">{{ character.original }}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
            <div class="flex items-center justify-between border-b border-neutral-200/50 pb-1">
              <span class="text-neutral-400">{{ t('vn.characters.gender') }}</span>
              <span class="text-neutral-800 font-bold">{{ translateGender(character.sex) }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 pb-1">
              <span class="text-neutral-400">{{ t('vn.characters.blood_type') }}</span>
              <span class="text-neutral-800 font-bold uppercase">{{ character.blood_type || '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 pb-1">
              <span class="text-neutral-400">{{ t('vn.characters.age') }}</span>
              <span class="text-neutral-800 font-bold">{{ character.age || '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 pb-1">
              <span class="text-neutral-400">{{ t('vn.characters.height') }}</span>
              <span class="text-neutral-800 font-bold">{{ character.height ? `${character.height}cm` : '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 pb-1">
              <span class="text-neutral-400">{{ t('vn.characters.weight') }}</span>
              <span class="text-neutral-800 font-bold">{{ character.weight ? `${character.weight}kg` : '?' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-neutral-200/50 pb-1">
              <span class="text-neutral-400">{{ t('vn.characters.birthday') }}</span>
              <span class="text-neutral-800 font-bold">
                {{ character.birthday ? t('vn.characters.birthday_val', { month: character.birthday[0], day: character.birthday[1] }) : '?' }}
              </span>
            </div>
          </div>

          <div v-if="character.bust || character.waist || character.hips" class="bg-white/50 rounded-lg px-3 py-2 border border-neutral-200/50 flex items-center justify-between">
            <span class="text-[11px] text-neutral-400 font-medium">{{ t('vn.characters.measurements') }}</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-black text-neutral-800 tracking-tighter">{{ character.bust || '?' }} / {{ character.waist || '?' }} / {{ character.hips || '?' }}</span>
              <span v-if="character.cup" class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-black uppercase">{{ t('vn.characters.cup', { cup: character.cup }) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 角色简述 -->
      <div v-if="character.description" class="space-y-3">
        <div class="flex items-center gap-2 px-1">
          <div class="h-3 w-1 rounded-full bg-neutral-900"></div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-400">{{ t('vn.description') }}</h3>
        </div>
        <div 
          class="rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-4 text-sm leading-relaxed text-neutral-600 whitespace-pre-wrap bbcode-container shadow-xs"
          v-html="parseBBCode(character.description)"
        ></div>
      </div>

      <!-- 特征标签 -->
      <div v-if="character.traits && character.traits.length > 0" class="space-y-3">
        <div class="flex items-center gap-2 px-1">
          <div class="h-3 w-1 rounded-full bg-neutral-900"></div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-400">{{ t('library.traits') }}</h3>
        </div>
        <div class="grid grid-cols-1 gap-4">
          <div
            v-for="(traits, group) in groupTraits(character.traits)"
            :key="group"
            class="space-y-2 bg-neutral-50/30 p-3 rounded-xl border border-neutral-100"
          >
            <h5 class="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              {{ translateTraitGroup(group) }}
            </h5>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="trait in traits"
                :key="trait.id || trait.name"
                @click="router.push(`/browse/characters?trait=${trait.id}`)"
                class="px-2.5 py-1 rounded-lg bg-white text-neutral-700 text-[11px] font-semibold border border-neutral-200 shadow-xs hover:border-neutral-400 transition-colors cursor-pointer active:scale-[0.98]"
              >
                {{ translateTraitName(trait.name) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 参与作品 (Visual Novels) -->
      <div v-if="character.vns && character.vns.length > 0" class="space-y-4 pt-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <div class="h-4 w-1 rounded-full bg-neutral-900"></div>
            <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider">{{ t('vn.relations') }}</h3>
          </div>
          <span class="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
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
    </div>
  </div>
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
</style>
