<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SearchBase from '@/components/SearchBase.vue'
import VnList from '@/components/VnList.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { Icon } from '@iconify/vue'
import { getVnList } from '@/api/vndb.js'

const { t } = useI18n()

const query = ref('')
const items = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

// 筛选和排序状态
const sortBy = ref('votecount')
const reverse = ref(true)
const selectedLang = ref('all')
const selectedPlatform = ref('all')

const sortOptions = [
  { value: 'votecount', label: 'vn.votes_count' },
  { value: 'searchrank', label: 'search.relevance' },
  { value: 'rating', label: 'vn.rating' },
  { value: 'released', label: 'vn.released' },
  { value: 'title', label: 'list.sort.title' }
]

const langOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'ja', label: 'settings.lang_names.ja' },
  { value: 'zh-Hans', label: 'settings.lang_names.zh-Hans' },
  { value: 'zh-Hant', label: 'settings.lang_names.zh-Hant' },
  { value: 'en', label: 'settings.lang_names.en' },
  { value: 'ko', label: 'settings.lang_names.ko' },
  { value: 'fr', label: 'settings.lang_names.fr' },
  { value: 'de', label: 'settings.lang_names.de' },
  { value: 'ru', label: 'settings.lang_names.ru' },
  { value: 'es', label: 'settings.lang_names.es' },
  { value: 'it', label: 'settings.lang_names.it' },
  { value: 'vi', label: 'settings.lang_names.vi' },
  { value: 'pt-br', label: 'settings.lang_names.pt-br' }
]

const platformOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'win', label: 'Windows' },
  { value: 'swi', label: 'Nintendo Switch' },
  { value: 'ps5', label: 'PlayStation 5' },
  { value: 'ps4', label: 'PlayStation 4' },
  { value: 'ps3', label: 'PlayStation 3' },
  { value: 'psv', label: 'PlayStation Vita' },
  { value: 'psp', label: 'PlayStation Portable' },
  { value: 'and', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'mac', label: 'macOS' },
  { value: 'lin', label: 'Linux' },
  { value: 'nds', label: 'Nintendo DS' },
  { value: '3ds', label: 'Nintendo 3DS' },
  { value: 'gba', label: 'Game Boy Advance' },
  { value: 'sfc', label: 'Super Famicom' },
  { value: 'nes', label: 'Famicom' }
]

async function fetchData(isLoadMore = false) {
  if (isLoading.value) return

  isLoading.value = true
  try {
    if (!isLoadMore) {
      page.value = 1
    }

    const filters = []
    
    if (query.value) {
      filters.push(['search', '=', query.value])
    }
    
    if (selectedLang.value !== 'all') {
      filters.push(['lang', '=', selectedLang.value])
    }
    
    if (selectedPlatform.value !== 'all') {
      filters.push(['platform', '=', selectedPlatform.value])
    }

    // 处理排序。只有在有 search 过滤时才支持 searchrank
    let currentSort = sortBy.value
    if (currentSort === 'searchrank' && !query.value) {
      currentSort = 'rating'
    }

    const params = {
      results: resultsPerPage,
      page: page.value,
      sort: currentSort,
      reverse: reverse.value
    }
    
    const finalFilters = filters.length > 1 ? ['and', ...filters] : (filters[0] || [])

    const res = await getVnList(finalFilters, params)
    
    if (isLoadMore) {
      items.value = [...items.value, ...res.results]
    } else {
      items.value = res.results
    }
    
    hasMore.value = res.more
  } catch (error) {
    console.error('Failed to search VN:', error)
  } finally {
    isLoading.value = false
  }
}

function handleSearch() {
  fetchData()
}

function handleLoadMore() {
  if (hasMore.value && !isLoading.value) {
    page.value++
    fetchData(true)
  }
}

function handleSortChange(val) {
  sortBy.value = val
  fetchData()
}

function handleReverseChange(val) {
  reverse.value = val
  fetchData()
}

function handleClear() {
  query.value = ''
  fetchData()
}

// 筛选器变化时自动重新搜索
watch([selectedLang, selectedPlatform], () => {
  fetchData()
})

watch(query, (newVal) => {
  if (!newVal) {
    fetchData()
  }
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <SearchBase 
    v-model="query"
    type="vn" 
    :title="t('library.vn')" 
    icon="lucide:file-text"
    :loading="isLoading"
    @search="handleSearch"
    @clear="handleClear"
  >
    <template #filters>
      <div class="flex flex-wrap items-center gap-2 pb-2 relative z-20">
        <!-- 语言筛选 -->
        <BaseSelect
          v-model="selectedLang"
          :options="langOptions"
          :label-renderer="(l) => t(l)"
          class="!bg-neutral-50 rounded-lg border border-neutral-100"
        >
          <template #prefix>
            <Icon icon="lucide:languages" class="h-3.5 w-3.5 text-neutral-400" />
          </template>
        </BaseSelect>

        <!-- 平台筛选 -->
        <BaseSelect
          v-model="selectedPlatform"
          :options="platformOptions"
          :label-renderer="(l) => l.startsWith('list.') ? t(l) : l"
          class="!bg-neutral-50 rounded-lg border border-neutral-100"
        >
          <template #prefix>
            <Icon icon="lucide:monitor" class="h-3.5 w-3.5 text-neutral-400" />
          </template>
        </BaseSelect>
      </div>
    </template>

    <VnList
      :items="items"
      :is-loading="isLoading"
      :has-more="hasMore"
      :sort-by="sortBy"
      :reverse="reverse"
      :custom-sort-options="sortOptions"
      storage-key="vndb_search_vn_layout"
      @load-more="handleLoadMore"
      @sort-change="handleSortChange"
      @reverse-change="handleReverseChange"
    />
  </SearchBase>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
