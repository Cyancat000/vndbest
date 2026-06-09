<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getCharacterDetail } from '@/api/vndb'
import VnList from '@/components/VnList.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const characterId = ref(route.params.id)

const character = ref(null)
const loading = ref(true)
const error = ref(null)

// 翻译角色性别
const translateGender = (sex) => {
  if (!sex || sex.length === 0) return t('metadata.gender.unknown')
  const primarySex = sex[0]
  return t(`metadata.gender.${primarySex}`) || primarySex
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

onMounted(() => {
  fetchCharacterInfo()
})
</script>

<template>
  <div class="space-y-4 pb-8">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
      <button 
        @click="router.back()"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600" />
      </button>
      <span class="text-xs font-semibold text-neutral-500">{{ t('vn.character_details') }}</span>
      <div class="w-8"></div>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="flex gap-4">
        <div class="w-24 h-32 rounded-xl bg-neutral-100"></div>
        <div class="flex-1 space-y-2 py-1">
          <div class="h-6 bg-neutral-100 rounded w-1/2"></div>
          <div class="h-4 bg-neutral-100 rounded w-1/3"></div>
          <div class="flex gap-2 pt-2">
            <div class="h-5 bg-neutral-100 rounded-full w-12"></div>
            <div class="h-5 bg-neutral-100 rounded-full w-12"></div>
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="h-4 bg-neutral-100 rounded w-1/4"></div>
        <div class="h-20 bg-neutral-100 rounded"></div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else-if="error || !character" class="text-center py-12 text-sm text-neutral-400">
      {{ error || t('vn.not_found') }}
    </div>

    <!-- 详情内容 -->
    <div v-else class="space-y-6">
      <!-- 角色基本信息卡片 -->
      <div class="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
        <div class="w-24 h-32 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 bg-white shadow-sm">
          <img
            v-if="character.image?.url"
            :src="character.image.url"
            class="w-full h-full object-cover object-top"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
            <Icon icon="lucide:user" class="h-10 w-10" />
          </div>
        </div>
        
        <div class="flex-1 min-w-0 pt-1">
          <h1 class="text-xl font-bold tracking-tight text-neutral-900 leading-tight">{{ character.name }}</h1>
          <p v-if="character.original" class="text-xs text-neutral-400 font-medium mt-1">{{ character.original }}</p>
          
          <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-neutral-500">
            <div v-if="character.sex">
              {{ t('vn.characters.gender') }}: <span class="text-neutral-800 font-semibold">{{ translateGender(character.sex) }}</span>
            </div>
            <div v-if="character.age">
              {{ t('vn.characters.age') }}: <span class="text-neutral-800 font-semibold">{{ character.age }}</span>
            </div>
            <div v-if="character.height">
              {{ t('vn.characters.height') }}: <span class="text-neutral-800 font-semibold">{{ character.height }}cm</span>
            </div>
            <div v-if="character.weight">
              {{ t('vn.characters.weight') }}: <span class="text-neutral-800 font-semibold">{{ character.weight }}kg</span>
            </div>
            <div v-if="character.blood_type">
              {{ t('vn.characters.blood_type') }}: <span class="text-neutral-800 font-semibold uppercase">{{ character.blood_type }}</span>
            </div>
            <div v-if="character.birthday">
              {{ t('vn.characters.birthday') }}: <span class="text-neutral-800 font-semibold">{{ t('vn.characters.birthday_val', { month: character.birthday[0], day: character.birthday[1] }) }}</span>
            </div>
          </div>

          <div v-if="character.bust || character.waist || character.hips" class="mt-1 text-[10px] text-neutral-500">
            {{ t('vn.characters.measurements') }}: 
            <span class="text-neutral-800 font-semibold">{{ character.bust || '?' }}/{{ character.waist || '?' }}/{{ character.hips || '?' }}</span>
            <span v-if="character.cup" class="text-purple-600 font-semibold ml-1">({{ t('vn.characters.cup', { cup: character.cup }) }})</span>
          </div>
        </div>
      </div>

      <!-- 角色简述 -->
      <div v-if="character.description" class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.description') }}</h3>
        <div 
          class="rounded-lg border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap bbcode-container shadow-xs"
          v-html="parseBBCode(character.description)"
        ></div>
      </div>

      <!-- 特征标签 -->
      <div v-if="character.traits && character.traits.length > 0" class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">特征标签 (Traits)</h3>
        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="(traits, group) in groupTraits(character.traits)"
            :key="group"
            class="space-y-1.5"
          >
            <h5 class="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter flex items-center gap-1">
              <span class="w-1 h-1 rounded-full bg-neutral-300"></span>
              {{ group }}
            </h5>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="trait in traits"
                :key="trait.name"
                class="px-2 py-0.5 rounded bg-white text-neutral-600 text-[10px] font-medium border border-neutral-100 shadow-xs"
              >
                {{ trait.name }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 参与作品 (Visual Novels) -->
      <div v-if="character.vns && character.vns.length > 0" class="space-y-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.relations') }}</h3>
        <VnList
          :items="character.vns"
          :show-sort="false"
          :compact="true"
          storage-key="vndb_char_vn_layout"
        />
      </div>
    </div>
  </div>
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
