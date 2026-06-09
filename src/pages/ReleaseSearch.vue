<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SearchBase from '@/components/SearchBase.vue'
import ReleaseList from '@/components/ReleaseList.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { Icon } from '@iconify/vue'
import { getReleaseList } from '@/api/vndb.js'

const { t } = useI18n()

const query = ref('')
const items = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

// 筛选和排序状态
const sortBy = ref('released')
const reverse = ref(true)
const selectedLang = ref('all')
const selectedPlatform = ref('all')

const sortOptions = [
  { value: 'released', label: 'vn.releases.date' },
  { value: 'title', label: 'list.sort.title' }
]

const langOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'ja', label: 'settings.lang_names.ja' },
  { value: 'zh-Hans', label: 'settings.lang_names.zh-Hans' },
  { value: 'zh-Hant', label: 'settings.lang_names.zh-Hant' },
  { value: 'en', label: 'settings.lang_names.en' },
  { value: 'ko', label: 'settings.lang_names.ko' }
]

const platformOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'win', label: 'Windows' },
  { value: 'swi', label: 'Nintendo Switch' },
  { value: 'ps5', label: 'PlayStation 5' },
  { value: 'ps4', label: 'PlayStation 4' },
  { value: 'and', label: 'Android' },
  { value: 'ios', label: 'iOS' }
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

    const params = {
      results: resultsPerPage,
      page: page.value,
      sort: sortBy.value,
      reverse: reverse.value
    }
    
    const finalFilters = filters.length > 1 ? ['and', ...filters] : (filters[0] || [])

    const res = await getReleaseList(finalFilters, params)
    
    if (isLoadMore) {
      items.value = [...items.value, ...res.results]
    } else {
      items.value = res.results
    }
    
    hasMore.value = res.more
  } catch (error) {
    console.error('Failed to search releases:', error)
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
    type="releases" 
    :title="t('library.releases')" 
    icon="lucide:package"
    :loading="isLoading"
    @search="handleSearch"
    @clear="handleClear"
  >
    <template #filters>
      <div class="flex flex-wrap items-center gap-2 pb-2">
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

    <ReleaseList
      :items="items"
      :is-loading="isLoading"
      :has-more="hasMore"
      :sort-by="sortBy"
      :reverse="reverse"
      :custom-sort-options="sortOptions"
      @load-more="handleLoadMore"
      @sort-change="handleSortChange"
      @reverse-change="handleReverseChange"
    />
  </SearchBase>
</template>
