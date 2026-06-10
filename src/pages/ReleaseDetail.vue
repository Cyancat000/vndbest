<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getReleaseDetail } from '@/api/vndb'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const releaseId = route.params.id

const release = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchReleaseDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getReleaseDetail(releaseId)
    if (data && data.results && data.results.length > 0) {
      release.value = data.results[0]
    } else {
      error.value = t('vn.not_found')
    }
  } catch (err) {
    console.error('Failed to fetch release detail:', err)
    error.value = err.message || t('vn.not_found')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const goToVn = (vnId) => {
  router.push(`/vn/${vnId}`)
}

const goToProducer = (producerId) => {
  router.push(`/producer/${producerId}`)
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBA'
  return dateStr
}

// 统一标题处理逻辑 (参考 VnDetail.vue)
function getTitle(v) {
  if (!v) return ''
  if (v.titles && v.titles.length > 0) {
    const priority = JSON.parse(localStorage.getItem('vndb_title_lang_priority') || '["zh-Hans", "zh-Hant", "ja", "en"]')
    for (const lang of priority) {
      const match = v.titles.find(t => t.lang === lang)
      if (match) return match.title
    }
  }
  return v.title || v.alttitle || ''
}

function getAltTitle(v) {
  if (!v) return ''
  const mainTitle = getTitle(v)
  if (v.alttitle && v.alttitle !== mainTitle) return v.alttitle
  if (v.title && v.title !== mainTitle) return v.title
  return ''
}

onMounted(() => {
  fetchReleaseDetail()
})
</script>

<template>
  <div class="space-y-4 pb-8">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
      <button 
        @click="goBack"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition active:scale-95"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600" />
      </button>
      <span class="text-xs font-semibold text-neutral-500">{{ t('release.title') }}</span>
      <div class="w-8"></div>
    </div>

    <!-- 骨架屏 (参考 VnDetail) -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-44 rounded-xl bg-neutral-100"></div>
      <div class="h-8 rounded-lg bg-neutral-100 w-2/3"></div>
      <div class="h-4 rounded-lg bg-neutral-100 w-1/2"></div>
      <div class="space-y-2">
        <div class="h-4 rounded-lg bg-neutral-100"></div>
        <div class="h-4 rounded-lg bg-neutral-100"></div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else-if="error || !release" class="text-center py-12 text-sm text-neutral-400">
      {{ error || t('vn.not_found') }}
      <div class="mt-4">
        <button @click="fetchReleaseDetail" class="rounded-lg bg-neutral-900 px-4 py-2 text-white text-xs font-bold active:scale-95 transition">
          Retry
        </button>
      </div>
    </div>

    <!-- 详情内容 (参考 VnDetail 风格) -->
    <div v-else class="space-y-5 animate-in fade-in duration-500 px-0.5">
      <!-- 1. 封面与基本属性 (模仿 VnDetail 顶栏) -->
      <div class="flex flex-col items-center sm:flex-row sm:items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
        <div 
          class="relative flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm w-full max-w-[180px] aspect-[3/4]"
        >
          <img 
            v-if="release.images?.length > 0" 
            :src="release.images[0].url" 
            class="h-full w-full object-cover"
          />
          <div v-else class="h-full w-full flex items-center justify-center bg-neutral-100">
            <Icon icon="lucide:package" class="h-10 w-10 text-neutral-300" />
          </div>
        </div>

        <div class="flex-1 space-y-3 w-full">
          <div>
            <h1 class="text-lg font-bold tracking-tight text-neutral-900 leading-snug">{{ release.title }}</h1>
            <p v-if="release.alttitle" class="text-xs text-neutral-400 font-medium mt-0.5">{{ release.alttitle }}</p>
          </div>

          <!-- 标签组 (模仿 VnDetail 里的那种信息) -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span 
              class="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold border"
              :class="release.official ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-100 text-neutral-500 border-neutral-200'"
            >
              <Icon :icon="release.official ? 'lucide:check-circle' : 'lucide:users'" class="h-2.5 w-2.5" />
              {{ release.official ? t('release.official') : t('release.unofficial') }}
            </span>
            <span 
              v-if="release.patch"
              class="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 font-bold"
            >
              {{ t('release.patch') }}
            </span>
            <span 
              class="text-[9px] px-1.5 py-0.5 rounded border font-bold"
              :class="release.freeware ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'"
            >
              {{ release.freeware ? t('release.freeware') : t('release.commercial') }}
            </span>
            <span 
              v-if="release.uncensored !== null"
              class="text-[9px] px-1.5 py-0.5 rounded border font-bold"
              :class="release.uncensored ? 'bg-red-50 text-red-600 border-red-100' : 'bg-neutral-100 text-neutral-500 border-neutral-200'"
            >
              {{ release.uncensored ? t('release.uncensored') : t('release.censored') }}
            </span>
          </div>

          <div class="grid grid-cols-[80px_1fr] items-center gap-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-200/50">
            <span class="text-neutral-400">{{ t('vn.id') }}</span>
            <span class="font-mono text-neutral-800">{{ release.id }}</span>

            <span class="text-neutral-400">{{ t('vn.released') }}</span>
            <span class="text-neutral-800 font-medium">{{ formatDate(release.released) }}</span>

            <span class="text-neutral-400">{{ t('vn.languages') }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="lang in release.languages" :key="lang.lang" 
                class="text-[10px] px-1 rounded bg-white border border-neutral-200 uppercase font-bold"
                :class="{ '!bg-neutral-900 !text-white !border-neutral-900': lang.main }">
                {{ lang.lang }}
              </span>
            </div>

            <span class="text-neutral-400">{{ t('vn.platforms') }}</span>
            <span class="text-neutral-800 uppercase font-medium">{{ release.platforms?.join(', ') }}</span>

            <span v-if="release.engine" class="text-neutral-400">{{ t('release.engine') }}</span>
            <span v-if="release.engine" class="text-neutral-800 font-medium">{{ release.engine }}</span>

            <span v-if="release.resolution" class="text-neutral-400">{{ t('release.resolution') }}</span>
            <span v-if="release.resolution" class="text-neutral-800 font-medium">
               {{ Array.isArray(release.resolution) ? `${release.resolution[0]}x${release.resolution[1]}` : release.resolution }}
            </span>

            <span v-if="release.voiced" class="text-neutral-400">{{ t('release.voiced') }}</span>
            <span v-if="release.voiced" class="text-neutral-800 font-medium">
              {{ release.voiced === 1 ? t('release.voiced_none') : 
                 release.voiced === 2 ? t('release.voiced_ero') : 
                 release.voiced === 3 ? t('release.voiced_partial') : t('release.voiced_full') }}
            </span>

            <span v-if="release.media?.length" class="text-neutral-400">{{ t('release.medium') }}</span>
            <div v-if="release.media?.length" class="flex flex-wrap gap-1">
              <span v-for="(m, i) in release.media" :key="i" class="text-neutral-800 font-medium italic">
                {{ t(`release.mediums.${m.medium}`, m.medium) }}{{ m.qty > 1 ? ' x' + m.qty : '' }}{{ i < release.media.length - 1 ? ',' : '' }}
              </span>
            </div>

            <span v-if="release.minage !== null" class="text-neutral-400">{{ t('vn.releases.age') }}</span>
            <span v-if="release.minage !== null" class="font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] w-fit">
              {{ release.minage === 0 ? t('release.all_ages') : release.minage + '+' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. 图片展示 (模仿 VnDetail Tabs 里的风格) -->
      <div v-if="release.images?.length > 1" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Icon icon="lucide:image" class="h-3.5 w-3.5" />
          {{ t('vn.tabs.covers') }}
        </h3>
        <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
          <div v-for="(img, idx) in release.images" :key="idx" 
            class="shrink-0 snap-start h-48 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 shadow-xs relative group"
          >
            <img :src="img.url" class="h-full w-full object-contain" />
            <div class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest">
              {{ img.type }}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 关联作品 (模仿 VnDetail 的 Relations 风格) -->
      <div v-if="release.vns?.length > 0" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Icon icon="lucide:book-open" class="h-3.5 w-3.5" />
          {{ t('release.associated_vn') }}
        </h3>
        <div class="space-y-2">
          <div v-for="vn in release.vns" :key="vn.id" 
            @click="goToVn(vn.id)"
            class="p-2.5 rounded-xl border border-neutral-100 bg-white flex items-center gap-3 shadow-xs hover:border-neutral-200 transition cursor-pointer active:scale-[0.98]"
          >
            <div class="h-16 w-12 shrink-0 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-50">
              <img :src="vn.image?.thumbnail || vn.image?.url" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs font-bold text-neutral-900 truncate">{{ getTitle(vn) }}</h4>
              <p v-if="getAltTitle(vn)" class="text-[10px] text-neutral-400 truncate mt-0.5">{{ getAltTitle(vn) }}</p>
              <div class="mt-1 flex items-center gap-2">
                <span v-if="vn.released" class="text-[9px] text-neutral-400">{{ vn.released }}</span>
                <span v-if="vn.rating" class="text-[9px] font-black text-neutral-800 flex items-center gap-0.5">
                   <Icon icon="lucide:star" class="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                   {{ (vn.rating / 10).toFixed(1) }}
                </span>
              </div>
            </div>
            <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-300" />
          </div>
        </div>
      </div>

      <!-- 4. 关联会社 (模仿 VnDetail Staff 里的 Producer 风格) -->
      <div v-if="release.producers?.length > 0" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Icon icon="lucide:building-2" class="h-3.5 w-3.5" />
          {{ t('release.producers') }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="prod in release.producers" :key="prod.id" 
            @click="goToProducer(prod.id)"
            class="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 bg-white shadow-xs hover:border-neutral-200 cursor-pointer active:scale-[0.98] transition"
          >
            <div class="min-w-0">
              <div class="text-xs font-bold text-neutral-800 truncate">{{ prod.name }}</div>
              <div class="flex gap-1.5 mt-1">
                <span v-if="prod.developer" class="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 rounded-full">{{ t('metadata.staff_role.developer') }}</span>
                <span v-if="prod.publisher" class="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 rounded-full">{{ t('metadata.staff_role.publisher') }}</span>
              </div>
            </div>
            <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-300" />
          </div>
        </div>
      </div>

      <!-- 5. 备注 (模仿 VnDetail Description 风格) -->
      <div v-if="release.notes" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Icon icon="lucide:sticky-note" class="h-3.5 w-3.5" />
          {{ t('release.notes') }}
        </h3>
        <div class="border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap rounded-lg">
          {{ release.notes }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
