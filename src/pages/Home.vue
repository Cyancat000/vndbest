<script setup>
defineOptions({ name: 'Home' })

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getStats, getReleaseList, getRandomVn } from '@/api/vndb'

const router = useRouter()
const { t } = useI18n()

const stats = ref(null)
const justReleased = ref([])
const upcomingReleases = ref([])

const loading = ref(true)
const loadingSections = ref({
  stats: true,
  releases: true,
  random: true
})

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]

  // 1. 获取统计数据
  getStats().then(res => {
    stats.value = res
    loadingSections.value.stats = false
  }).catch(err => {
    console.error('获取统计数据失败:', err)
    loadingSections.value.stats = false
  })

  // 2. 获取发布信息
  // 刚刚发布: 时间倒序排行今天之前的 Release
  getReleaseList(['released', '<', today], { sort: 'released', reverse: true, results: 5 })
    .then(res => {
      justReleased.value = res.results
      loadingSections.value.releases = false
    }).catch(err => {
      console.error('获取刚刚发布失败:', err)
      loadingSections.value.releases = false
    })

  // 即将发布: 时间正序排行今天之后的 Release
  getReleaseList(['released', '>', today], { sort: 'released', reverse: false, results: 5 })
    .then(res => {
      upcomingReleases.value = res.results
    }).catch(err => {
      console.error('获取即将发布失败:', err)
    })

  loadingSections.value.random = false
  loading.value = false
})

async function handleRandomClick() {
  if (loadingSections.value.random) return
  loadingSections.value.random = true
  try {
    const maxId = stats.value?.vn || 45000
    const res = await getRandomVn({ results: 1, maxId })
    if (res.results && res.results.length > 0) {
      router.push(`/vn/${res.results[0].id}`)
    }
  } catch (err) {
    console.error('随机作品跳转失败:', err)
  } finally {
    loadingSections.value.random = false
  }
}

function handleReleaseClick(release) {
  router.push(`/release/${release.id}`)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Icon icon="lucide:home" class="h-5 w-5 text-neutral-800" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">{{ t('home.title') }}</h1>
        <p class="text-xs text-neutral-500">{{ t('home.subtitle') }}</p>
      </div>
    </div>

    <!-- 统计区块 (Notion Style Block) -->
    <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
        <Icon icon="lucide:info" class="h-4 w-4 text-neutral-500" />
        {{ t('home.stats_title') }}
      </h2>
      
      <div v-if="loadingSections.stats" class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="animate-pulse rounded-lg bg-neutral-100 p-3 h-16"></div>
      </div>
      
      <div v-else-if="stats" class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.vn') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.vn?.toLocaleString() || '0' }}</div>
        </div>
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.releases') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.releases?.toLocaleString() || '0' }}</div>
        </div>
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.producers') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.producers?.toLocaleString() || '0' }}</div>
        </div>
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.staff') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.staff?.toLocaleString() || '0' }}</div>
        </div>
      </div>
    </div>

    <!-- 刚刚发布 & 即将发布 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 刚刚发布 -->
      <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Icon icon="lucide:calendar-check" class="h-4 w-4 text-emerald-500" />
            {{ t('home.just_released') }}
          </h2>
          <button @click="router.push('/search/release')" class="text-[10px] text-neutral-400 hover:text-neutral-600 transition">
            {{ t('home.view_all') }}
          </button>
        </div>
        
        <div v-if="loadingSections.releases" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse h-12 rounded-lg bg-neutral-50"></div>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in justReleased"
            :key="item.id"
            @click="handleReleaseClick(item)"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer group"
          >
            <div class="h-10 w-8 rounded bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/50">
              <img v-if="item.images?.[0]?.url" :src="item.images[0].url" class="h-full w-full object-cover" />
              <div v-else class="h-full w-full flex items-center justify-center text-neutral-300">
                <Icon icon="lucide:package" class="h-4 w-4" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-neutral-800 truncate group-hover:text-neutral-950">{{ item.alttitle || item.title }}</div>
              <div class="flex items-center gap-2">
                <div class="text-[10px] text-neutral-400">{{ item.released }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="lang in item.languages" :key="lang.lang" class="text-[8px] px-1 rounded bg-neutral-100 text-neutral-500 whitespace-nowrap">
                    {{ t(`settings.lang_names.${lang.lang}`, lang.lang) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 即将发布 -->
      <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Icon icon="lucide:calendar-days" class="h-4 w-4 text-blue-500" />
            {{ t('home.upcoming_releases') }}
          </h2>
        </div>
        
        <div v-if="loadingSections.releases" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse h-12 rounded-lg bg-neutral-50"></div>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in upcomingReleases"
            :key="item.id"
            @click="handleReleaseClick(item)"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer group"
          >
            <div class="h-10 w-8 rounded bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/50">
              <img v-if="item.images?.[0]?.url" :src="item.images[0].url" class="h-full w-full object-cover" />
              <div v-else class="h-full w-full flex items-center justify-center text-neutral-300">
                <Icon icon="lucide:package" class="h-4 w-4" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-neutral-800 truncate group-hover:text-neutral-950">{{ item.alttitle || item.title }}</div>
              <div class="flex items-center gap-2">
                <div class="text-[10px] text-neutral-400">{{ item.released }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="lang in item.languages" :key="lang.lang" class="text-[8px] px-1 rounded bg-neutral-100 text-neutral-500 whitespace-nowrap">
                    {{ t(`settings.lang_names.${lang.lang}`, lang.lang) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 随机作品 (Button Style) -->
    <button
      @click="handleRandomClick"
      :disabled="loadingSections.random"
      class="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100 shadow-xs w-full cursor-pointer disabled:opacity-50"
    >
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-lg bg-purple-50 text-purple-600">
          <Icon :icon="loadingSections.random ? 'eos-icons:loading' : 'lucide:dices'" class="h-5 w-5" />
        </div>
        <div>
          <span class="text-sm font-semibold text-neutral-800 block">{{ t('home.random_vn') }}</span>
          <span class="text-[10px] text-neutral-400">试试手气，随机跳转到一个作品页面</span>
        </div>
      </div>
      <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-400" />
    </button>
  </div>
</template>
