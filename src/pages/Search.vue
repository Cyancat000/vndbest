<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { searchVn } from '@/api/vndb'

const router = useRouter()
const { t } = useI18n()
const query = ref('')
const loading = ref(false)
const results = ref([])

async function handleSearch() {
  if (!query.value.trim()) return
  loading.value = true
  try {
    const data = await searchVn(query.value)
    results.value = data.results || []
  } catch (err) {
    console.error('搜索失败:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Icon icon="lucide:search" class="h-5 w-5 text-neutral-800" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">{{ t('search.title') }}</h1>
        <p class="text-xs text-neutral-500">{{ t('search.description') }}</p>
      </div>
    </div>

    <!-- 搜索输入框 (Notion Style Input) -->
    <div class="relative">
      <Icon icon="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        v-model="query"
        type="search"
        :placeholder="t('search.placeholder')"
        class="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5 placeholder-neutral-400"
        @keyup.enter="handleSearch"
      />
    </div>

    <!-- 骨架屏 / 结果列表 -->
    <div class="space-y-2">
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="animate-pulse flex items-center justify-between rounded-lg border border-neutral-150 bg-neutral-50/50 p-4 h-16"></div>
      </div>
      
      <div v-else-if="results.length > 0" class="space-y-2">
        <div
          v-for="item in results"
          :key="item.id"
          @click="router.push(`/vn/${item.id}`)"
          class="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-xs hover:bg-neutral-50 active:bg-neutral-100 transition cursor-pointer"
        >
          <div class="min-w-0 pr-4">
            <div class="text-sm font-semibold text-neutral-900 truncate">{{ item.title }}</div>
            <div class="text-xs text-neutral-500 mt-0.5 truncate">{{ item.alttitle || t('search.no_alttitle') }}</div>
          </div>
          <Icon icon="lucide:chevron-right" class="h-4 w-4 flex-shrink-0 text-neutral-400" />
        </div>
      </div>

      <div v-else-if="query && !loading" class="text-center py-12 text-sm text-neutral-400">
        {{ t('search.no_results') }}
      </div>
    </div>
  </div>
</template>
