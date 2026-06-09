<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { searchVn } from '@/api/vndb'
import VnList from '@/components/VnList.vue'

const router = useRouter()
const { t } = useI18n()
const query = ref('')

const results = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

// 排序状态
const sortBy = ref('search')
const reverse = ref(false)

async function handleSearch(reset = true) {
  if (!query.value.trim()) return
  
  if (reset) {
    page.value = 1
    results.value = []
  }
  
  isLoading.value = true
  try {
    const data = await searchVn(query.value, {
      results: resultsPerPage,
      page: page.value,
      sort: sortBy.value === 'search' ? null : sortBy.value,
      reverse: reverse.value
    })
    
    if (data && data.results) {
      if (reset) {
        results.value = data.results
      } else {
        results.value = [...results.value, ...data.results]
      }
      hasMore.value = data.more || false
    } else {
      hasMore.value = false
    }
  } catch (err) {
    console.error('搜索失败:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value += 1
  await handleSearch(false)
}

function handleSortChange(s) {
  sortBy.value = s
  handleSearch(true)
}

function handleReverseChange(r) {
  reverse.value = r
  handleSearch(true)
}

// 监听查询变化
watch(query, (newVal) => {
  if (!newVal.trim()) {
    results.value = []
    hasMore.value = false
  }
})

const sortOptions = [
  { value: 'search', label: 'common.connected' }, // 这里的 label 需要修正
  { value: 'released', label: 'vn.released' },
  { value: 'rating', label: 'vn.rating' },
  { value: 'title', label: 'list.sort.title' }
]
// 修正一下 label 的语义，在 Search 场景下
const searchSortOptions = [
  { value: 'search', label: '相关度' },
  { value: 'released', label: t('vn.released') },
  { value: 'rating', label: t('vn.rating') },
  { value: 'title', label: t('list.sort.title') }
]
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
        @keyup.enter="handleSearch(true)"
      />
    </div>

    <!-- 使用统一的 VnList 组件 -->
    <VnList
      v-if="results.length > 0 || isLoading"
      :items="results"
      :is-loading="isLoading"
      :has-more="hasMore"
      :sort-by="sortBy"
      :reverse="reverse"
      :custom-sort-options="[
        { value: 'search', label: 'search.relevance' },
        { value: 'released', label: 'vn.released' },
        { value: 'rating', label: 'vn.rating' },
        { value: 'title', label: 'list.sort.title' }
      ]"
      storage-key="vndb_search_layout"
      @load-more="loadMore"
      @sort-change="handleSortChange"
      @reverse-change="handleReverseChange"
    />

    <div v-if="query && !isLoading && results.length === 0" class="text-center py-12 text-sm text-neutral-400">
      {{ t('search.no_results') }}
    </div>
  </div>
</template>
