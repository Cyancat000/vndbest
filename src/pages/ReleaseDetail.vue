<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getReleaseDetail } from '@/api/vndb'
import { usePrivacy, getImageNsfwLevel } from '@/composables/usePrivacy'
import { useImageLoader } from '@/composables/useImageLoader'
import { IonPage, IonContent, IonImg, IonSpinner } from '@ionic/vue'

const { getDetailAction, getCardAction } = usePrivacy()
const imageLoader = useImageLoader()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const releaseId = ref(route.params.id)

const release = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchReleaseDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getReleaseDetail(releaseId.value)
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

// 隐私过滤：已揭示的内容
const revealedItems = ref(new Set())

function toggleReveal(key) {
  if (revealedItems.value.has(key)) {
    revealedItems.value.delete(key)
  } else {
    revealedItems.value.add(key)
  }
  revealedItems.value = new Set(revealedItems.value)
}

// 详情页封面过滤动作
const coverAction = computed(() => {
  if (!release.value?.images?.length) return 'show'
  return getDetailAction('release', getImageNsfwLevel(release.value.images[0]))
})

// 隐私过滤：关联 VN 卡片
function getVnCardAction(vn) {
  return getCardAction('vn', getImageNsfwLevel(vn.image))
}

function shouldBlurVnCard(vn) {
  const action = getVnCardAction(vn)
  return action === 'blur' || action === 'blur_card'
}

function isVnHidden(vn) {
  return getVnCardAction(vn) === 'hide'
}

const filteredVns = computed(() => {
  if (!release.value?.vns) return []
  return release.value.vns.filter(vn => !isVnHidden(vn))
})

// 隐私过滤：封面画廊图片
function getCoverImgAction(img) {
  return getCardAction('release', getImageNsfwLevel(img))
}

function shouldBlurCoverImg(img) {
  const action = getCoverImgAction(img)
  return action === 'blur' || action === 'blur_card'
}

function isCoverImgHidden(img) {
  return getCoverImgAction(img) === 'hide'
}

const filteredImages = computed(() => {
  if (!release.value?.images) return []
  return release.value.images.filter(img => !isCoverImgHidden(img))
})

// 当前已加载的版本 ID，用于避免从子页面返回时重复加载
const currentLoadedId = ref(null)

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      // 如果 ID 没变（从子页面返回），跳过重新加载以保留数据/位置状态
      if (newId === currentLoadedId.value) return
      currentLoadedId.value = newId
      releaseId.value = newId
      fetchReleaseDetail()
    }
  },
  { immediate: true }
)
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container space-y-4">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between page-sticky-header">
      <button
        @click="goBack"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:active:bg-neutral-600 transition active:scale-95"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
      </button>
      <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{{ t('release.title') }}</span>
      <div class="w-8"></div>
    </div>

    <!-- 骨架屏 (参考 VnDetail) -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-44 rounded-xl bg-neutral-100 dark:bg-neutral-800"></div>
      <div class="h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 w-2/3"></div>
      <div class="h-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 w-1/2"></div>
      <div class="space-y-2">
        <div class="h-4 rounded-lg bg-neutral-100 dark:bg-neutral-800"></div>
        <div class="h-4 rounded-lg bg-neutral-100 dark:bg-neutral-800"></div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else-if="error || !release" class="text-center py-12 text-sm text-neutral-400 dark:text-neutral-500">
      {{ error || t('vn.not_found') }}
      <div class="mt-4">
        <button @click="fetchReleaseDetail" class="rounded-lg bg-neutral-900 px-4 py-2 text-white text-xs font-bold dark:bg-neutral-100 dark:text-neutral-900 active:scale-95 transition">
          Retry
        </button>
      </div>
    </div>

    <!-- 详情内容 (参考 VnDetail 风格) -->
    <div v-else class="space-y-5 animate-in fade-in duration-500 px-0.5">
      <!-- 1. 封面与基本属性 (模仿 VnDetail 顶栏) -->
      <div class="flex flex-col items-center sm:flex-row sm:items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
        <div
          class="relative flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm w-full max-w-[180px] aspect-[3/4] dark:border-neutral-700 dark:bg-neutral-900"
        >
          <!-- 正常图片 -->
          <ion-img
            v-if="release.images?.length > 0 && !(coverAction === 'hide' && !revealedItems.has('cover'))"
            :key="`release-cover-${imageLoader.getRetryCount('release-cover')}`"
            :src="release.images[0].url"
            class="h-full w-full object-cover transition-opacity duration-500"
            :class="{ 'opacity-0': !imageLoader.isSuccess('release-cover') }"
            @ionImgDidLoad="imageLoader.onLoad('release-cover')"
            @ionError="imageLoader.onError('release-cover')"
          />
          <ion-spinner
            v-if="release.images?.length > 0 && !(coverAction === 'hide' && !revealedItems.has('cover')) && imageLoader.isLoading('release-cover')"
            name="crescent"
            class="absolute inset-0 m-auto z-20 text-neutral-400"
            style="width: 24px; height: 24px;"
          />
          <div
            v-if="release.images?.length > 0 && !(coverAction === 'hide' && !revealedItems.has('cover')) && imageLoader.isError('release-cover')"
            @click="imageLoader.retry('release-cover')"
            class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 z-20 cursor-pointer"
          >
            <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <!-- 图标占位 -->
          <div v-if="coverAction === 'hide' && !revealedItems.has('cover')" class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 z-10">
            <Icon icon="lucide:eye-off" class="h-10 w-10 text-neutral-400 dark:text-neutral-500" />
          </div>
          <!-- 无封面兜底 -->
          <div v-if="!release.images?.length" class="h-full w-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
            <Icon icon="lucide:package" class="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          </div>
          <!-- 小眼睛切换按钮 -->
          <button
            v-if="coverAction === 'hide'"
            @click.stop="toggleReveal('cover')"
            class="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition z-20"
          >
            <Icon :icon="revealedItems.has('cover') ? 'lucide:eye' : 'lucide:eye-off'" class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="flex-1 space-y-3 w-full">
          <div>
            <h1 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug">{{ release.title }}</h1>
            <p v-if="release.alttitle" class="text-xs text-neutral-400 dark:text-neutral-500 font-medium mt-0.5">{{ release.alttitle }}</p>
          </div>

          <!-- 标签组 (模仿 VnDetail 里的那种信息) -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span 
              class="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold border"
              :class="release.official ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100' : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'"
            >
              <Icon :icon="release.official ? 'lucide:check-circle' : 'lucide:users'" class="h-2.5 w-2.5" />
              {{ release.official ? t('release.official') : t('release.unofficial') }}
            </span>
            <span 
              v-if="release.patch"
              class="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50 font-bold"
            >
              {{ t('release.patch') }}
            </span>
            <span 
              class="text-[9px] px-1.5 py-0.5 rounded border font-bold"
              :class="release.freeware ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'"
            >
              {{ release.freeware ? t('release.freeware') : t('release.commercial') }}
            </span>
            <span 
              v-if="release.uncensored !== null"
              class="text-[9px] px-1.5 py-0.5 rounded border font-bold"
              :class="release.uncensored ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'"
            >
              {{ release.uncensored ? t('release.uncensored') : t('release.censored') }}
            </span>
          </div>

          <div class="grid grid-cols-[80px_1fr] items-center gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
            <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.id') }}</span>
            <span class="font-mono text-neutral-800 dark:text-neutral-200">{{ release.id }}</span>

            <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.released') }}</span>
            <span class="text-neutral-800 dark:text-neutral-200 font-medium">{{ formatDate(release.released) }}</span>

            <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.languages') }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="lang in release.languages" :key="lang.lang"
                class="text-[10px] px-1 rounded bg-white border border-neutral-200 font-bold dark:bg-neutral-800 dark:border-neutral-700"
                :class="{ '!bg-neutral-900 !text-white !border-neutral-900 dark:!bg-neutral-100 dark:!text-neutral-900 dark:!border-neutral-100': lang.main }">
                {{ t(`metadata.lang.${lang.lang}`, lang.lang) }}
              </span>
            </div>

            <span class="text-neutral-400 dark:text-neutral-500">{{ t('vn.platforms') }}</span>
            <span class="text-neutral-800 dark:text-neutral-200 font-medium">{{ release.platforms?.map(p => t(`metadata.platform.${p}`, p)).join(', ') }}</span>

            <span v-if="release.engine" class="text-neutral-400 dark:text-neutral-500">{{ t('release.engine') }}</span>
            <span v-if="release.engine" class="text-neutral-800 dark:text-neutral-200 font-medium">{{ release.engine }}</span>

            <span v-if="release.resolution" class="text-neutral-400 dark:text-neutral-500">{{ t('release.resolution') }}</span>
            <span v-if="release.resolution" class="text-neutral-800 dark:text-neutral-200 font-medium">
               {{ Array.isArray(release.resolution) ? `${release.resolution[0]}x${release.resolution[1]}` : release.resolution }}
            </span>

            <span v-if="release.voiced" class="text-neutral-400 dark:text-neutral-500">{{ t('release.voiced') }}</span>
            <span v-if="release.voiced" class="text-neutral-800 dark:text-neutral-200 font-medium">
              {{ release.voiced === 1 ? t('release.voiced_none') : 
                 release.voiced === 2 ? t('release.voiced_ero') : 
                 release.voiced === 3 ? t('release.voiced_partial') : t('release.voiced_full') }}
            </span>

            <span v-if="release.media?.length" class="text-neutral-400 dark:text-neutral-500">{{ t('release.medium') }}</span>
            <div v-if="release.media?.length" class="flex flex-wrap gap-1">
              <span v-for="(m, i) in release.media" :key="i" class="text-neutral-800 dark:text-neutral-200 font-medium italic">
                {{ t(`release.mediums.${m.medium}`, m.medium) }}{{ m.qty > 1 ? ' x' + m.qty : '' }}{{ i < release.media.length - 1 ? ',' : '' }}
              </span>
            </div>

            <span v-if="release.minage !== null" class="text-neutral-400 dark:text-neutral-500">{{ t('vn.releases.age') }}</span>
            <span v-if="release.minage !== null" class="font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] w-fit">
              {{ release.minage === 0 ? t('release.all_ages') : release.minage + '+' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. 图片展示 (模仿 VnDetail Tabs 里的风格) -->
      <div v-if="filteredImages.length > 1" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <Icon icon="lucide:image" class="h-3.5 w-3.5" />
          {{ t('vn.tabs.covers') }}
        </h3>
        <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
          <div v-for="(img, idx) in filteredImages" :key="idx"
            class="shrink-0 snap-start h-48 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 shadow-xs relative group"
          >
            <ion-img
              :key="`rel-img-${idx}-${imageLoader.getRetryCount(`rel-img-${idx}`)}`"
              :src="img.url"
              class="h-full w-full object-contain transition-opacity duration-500"
              :class="{ 'blur-md': shouldBlurCoverImg(img), 'opacity-0': !imageLoader.isSuccess(`rel-img-${idx}`) }"
              @ionImgDidLoad="imageLoader.onLoad(`rel-img-${idx}`)"
              @ionError="imageLoader.onError(`rel-img-${idx}`)"
            />
            <ion-spinner
              v-if="imageLoader.isLoading(`rel-img-${idx}`)"
              name="crescent"
              class="absolute inset-0 m-auto z-20 text-neutral-400"
              style="width: 20px; height: 20px;"
            />
            <div
              v-if="imageLoader.isError(`rel-img-${idx}`)"
              @click="imageLoader.retry(`rel-img-${idx}`)"
              class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 z-20 cursor-pointer"
            >
              <Icon icon="lucide:refresh-cw" class="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            </div>
            <div v-if="shouldBlurCoverImg(img)" class="absolute inset-0 flex items-center justify-center bg-neutral-100/80 dark:bg-neutral-800/80 z-10 pointer-events-none">
              <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <div class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest z-20">
              {{ img.type }}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 关联作品 (模仿 VnDetail 的 Relations 风格) -->
      <div v-if="filteredVns.length > 0" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <Icon icon="lucide:book-open" class="h-3.5 w-3.5" />
          {{ t('release.associated_vn') }}
        </h3>
        <div class="space-y-2">
          <div v-for="vn in filteredVns" :key="vn.id"
            @click="goToVn(vn.id)"
            class="p-2.5 rounded-xl border border-neutral-100 bg-white flex items-center gap-3 shadow-xs hover:border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 transition cursor-pointer active:scale-[0.98]"
          >
            <div class="h-16 w-12 shrink-0 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 relative">
              <ion-img
                :key="`vn-card-${vn.id}-${imageLoader.getRetryCount(`vn-card-${vn.id}`)}`"
                :src="vn.image?.thumbnail || vn.image?.url"
                class="h-full w-full object-cover transition-opacity duration-500"
                :class="{ 'blur-md': shouldBlurVnCard(vn), 'opacity-0': !imageLoader.isSuccess(`vn-card-${vn.id}`) }"
                @ionImgDidLoad="imageLoader.onLoad(`vn-card-${vn.id}`)"
                @ionError="imageLoader.onError(`vn-card-${vn.id}`)"
              />
              <ion-spinner
                v-if="imageLoader.isLoading(`vn-card-${vn.id}`)"
                name="crescent"
                class="absolute inset-0 m-auto z-20 text-neutral-400"
                style="width: 16px; height: 16px;"
              />
              <div
                v-if="imageLoader.isError(`vn-card-${vn.id}`)"
                @click.stop="imageLoader.retry(`vn-card-${vn.id}`)"
                class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 z-20 cursor-pointer"
              >
                <Icon icon="lucide:refresh-cw" class="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
              </div>
              <div v-if="shouldBlurVnCard(vn)" class="absolute inset-0 flex items-center justify-center bg-neutral-100/80 dark:bg-neutral-800/80 z-10 pointer-events-none">
                <Icon icon="lucide:eye-off" class="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ getTitle(vn) }}</h4>
              <p v-if="getAltTitle(vn)" class="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">{{ getAltTitle(vn) }}</p>
              <div class="mt-1 flex items-center gap-2">
                <span v-if="vn.released" class="text-[9px] text-neutral-400">{{ vn.released }}</span>
                <span v-if="vn.rating" class="text-[9px] font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-0.5">
                   <Icon icon="lucide:star" class="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                   {{ (vn.rating / 10).toFixed(1) }}
                </span>
              </div>
            </div>
            <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
          </div>
        </div>
      </div>

      <!-- 4. 关联会社 (模仿 VnDetail Staff 里的 Producer 风格) -->
      <div v-if="release.producers?.length > 0" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <Icon icon="lucide:building-2" class="h-3.5 w-3.5" />
          {{ t('release.producers') }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="prod in release.producers" :key="prod.id"
            @click="goToProducer(prod.id)"
            class="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 bg-white shadow-xs hover:border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 cursor-pointer active:scale-[0.98] transition"
          >
            <div class="min-w-0">
              <div class="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{{ prod.name }}</div>
              <div class="flex gap-1.5 mt-1">
                <span v-if="prod.developer" class="text-[8px] font-black text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 px-1.5 rounded-full">{{ t('metadata.staff_role.developer') }}</span>
                <span v-if="prod.publisher" class="text-[8px] font-black text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 px-1.5 rounded-full">{{ t('metadata.staff_role.publisher') }}</span>
              </div>
            </div>
            <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
          </div>
        </div>
      </div>

      <!-- 5. 备注 (模仿 VnDetail Description 风格) -->
      <div v-if="release.notes" class="space-y-1.5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <Icon icon="lucide:sticky-note" class="h-3.5 w-3.5" />
          {{ t('release.notes') }}
        </h3>
        <div class="border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 whitespace-pre-wrap rounded-lg">
          {{ release.notes }}
        </div>
      </div>
    </div>
  </div>
  </ion-content>
  </ion-page>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
