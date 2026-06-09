<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getStats } from '@/api/vndb'

const router = useRouter()
const { t } = useI18n()
const stats = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    stats.value = await getStats()
  } catch (err) {
    console.error('获取统计数据失败:', err)
  } finally {
    loading.value = false
  }
})
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
      
      <div v-if="loading" class="grid grid-cols-2 gap-3">
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

    <!-- 快捷入口 (Notion Style Cards) -->
    <div class="space-y-2.5">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('home.quick_explore') }}</h3>
      <div class="grid gap-2">
        <button
          @click="router.push('/search')"
          class="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3.5 text-left transition hover:bg-neutral-50 active:bg-neutral-100 shadow-xs w-full"
        >
          <div class="flex items-center gap-3">
            <Icon icon="lucide:search" class="h-4 w-4 text-neutral-600" />
            <span class="text-sm font-medium text-neutral-800">{{ t('home.search_vn') }}</span>
          </div>
          <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-400" />
        </button>

        <button
          @click="router.push('/list')"
          class="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3.5 text-left transition hover:bg-neutral-50 active:bg-neutral-100 shadow-xs w-full"
        >
          <div class="flex items-center gap-3">
            <Icon icon="lucide:file-text" class="h-4 w-4 text-neutral-600" />
            <span class="text-sm font-medium text-neutral-800">{{ t('home.my_list') }}</span>
          </div>
          <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-400" />
        </button>
      </div>
    </div>
  </div>
</template>
