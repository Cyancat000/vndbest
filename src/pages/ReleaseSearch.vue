<script setup>
defineOptions({ name: 'ReleaseSearch' })

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

// 高级筛选面板
const showAdvancedFilters = ref(false)

// 额外筛选项
const selectedMinAge = ref('all')
const selectedPatch = ref('all')
const selectedOfficial = ref('all')
const selectedFreeware = ref('all')
const selectedVoiced = ref('all')
const selectedEngine = ref('all')

const sortOptions = [
  { value: 'released', label: 'vn.releases.date' },
  { value: 'title', label: 'list.sort.title' },
  { value: 'id', label: 'vn.id' }
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
  { value: 'win', label: 'metadata.platform.win' },
  { value: 'mac', label: 'metadata.platform.mac' },
  { value: 'lin', label: 'metadata.platform.lin' },
  { value: 'and', label: 'metadata.platform.and' },
  { value: 'ios', label: 'metadata.platform.ios' },
  { value: 'swi', label: 'metadata.platform.swi' },
  { value: 'ps5', label: 'metadata.platform.ps5' },
  { value: 'ps4', label: 'metadata.platform.ps4' },
  { value: 'ps3', label: 'metadata.platform.ps3' },
  { value: 'psv', label: 'metadata.platform.psv' },
  { value: 'psp', label: 'metadata.platform.psp' },
  { value: 'ps2', label: 'metadata.platform.ps2' },
  { value: 'ps1', label: 'metadata.platform.ps1' },
  { value: 'nds', label: 'metadata.platform.nds' },
  { value: '3ds', label: 'metadata.platform.3ds' },
  { value: 'gba', label: 'metadata.platform.gba' },
  { value: 'gbc', label: 'metadata.platform.gbc' },
  { value: 'gb', label: 'metadata.platform.gb' },
  { value: 'sfc', label: 'metadata.platform.sfc' },
  { value: 'nes', label: 'metadata.platform.nes' },
  { value: 'n64', label: 'metadata.platform.n64' },
  { value: 'gc', label: 'metadata.platform.gc' },
  { value: 'wii', label: 'metadata.platform.wii' },
  { value: 'wiiu', label: 'metadata.platform.wiiu' },
  { value: 'x360', label: 'metadata.platform.x360' },
  { value: 'xone', label: 'metadata.platform.xone' },
  { value: 'xsxs', label: 'metadata.platform.xsxs' },
  { value: 'web', label: 'metadata.platform.web' }
]

const minAgeOptions = [
  { value: 'all', label: 'list.all' },
  { value: '0', label: '0 - 全年龄' },
  { value: '6', label: '6+' },
  { value: '12', label: '12+' },
  { value: '15', label: '15+' },
  { value: '18', label: '18+' }
]

const patchOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'yes', label: '是补丁' },
  { value: 'no', label: '非补丁' }
]

const officialOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'yes', label: '官方' },
  { value: 'no', label: '非官方' }
]

const freewareOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'yes', label: '免费' },
  { value: 'no', label: '收费' }
]

const voicedOptions = [
  { value: 'all', label: 'list.all' },
  { value: '1', label: '无配音' },
  { value: '2', label: '仅H场景配音' },
  { value: '3', label: '部分配音' },
  { value: '4', label: '全配音' }
]

const engineOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'KiriKiri', label: 'KiriKiri/KiriKiriZ' },
  { value: "Ren'Py", label: "Ren'Py" },
  { value: 'Unity', label: 'Unity' },
  { value: 'NScripter', label: 'NScripter' },
  { value: 'GameMaker', label: 'GameMaker' },
  { value: 'Unreal', label: 'Unreal Engine' }
]

// 计算是否有激活的筛选条件
function hasActiveFilters() {
  return selectedLang.value !== 'all'
    || selectedPlatform.value !== 'all'
    || selectedMinAge.value !== 'all'
    || selectedPatch.value !== 'all'
    || selectedOfficial.value !== 'all'
    || selectedFreeware.value !== 'all'
    || selectedVoiced.value !== 'all'
    || selectedEngine.value !== 'all'
}

// 清除所有筛选
function clearAllFilters() {
  selectedLang.value = 'all'
  selectedPlatform.value = 'all'
  selectedMinAge.value = 'all'
  selectedPatch.value = 'all'
  selectedOfficial.value = 'all'
  selectedFreeware.value = 'all'
  selectedVoiced.value = 'all'
  selectedEngine.value = 'all'
  fetchData()
}

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

    // 年龄分级
    if (selectedMinAge.value !== 'all') {
      filters.push(['minage', '=', parseInt(selectedMinAge.value)])
    }

    // 补丁
    if (selectedPatch.value === 'yes') {
      filters.push(['patch', '=', 1])
    } else if (selectedPatch.value === 'no') {
      filters.push(['patch', '!=', 1])
    }

    // 官方
    if (selectedOfficial.value === 'yes') {
      filters.push(['official', '=', 1])
    } else if (selectedOfficial.value === 'no') {
      filters.push(['official', '!=', 1])
    }

    // 免费
    if (selectedFreeware.value === 'yes') {
      filters.push(['freeware', '=', 1])
    } else if (selectedFreeware.value === 'no') {
      filters.push(['freeware', '!=', 1])
    }

    // 配音
    if (selectedVoiced.value !== 'all') {
      filters.push(['voiced', '=', parseInt(selectedVoiced.value)])
    }

    // 引擎
    if (selectedEngine.value !== 'all') {
      filters.push(['engine', '=', selectedEngine.value])
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

// 监听所有筛选变化
watch([selectedLang, selectedPlatform, selectedMinAge, selectedPatch, selectedOfficial, selectedFreeware, selectedVoiced, selectedEngine], () => {
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
      <div class="space-y-2 pb-2">
        <!-- 基础筛选行 -->
        <div class="flex flex-wrap items-center gap-2">
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
            :label-renderer="(l) => t(l, l)"
            class="!bg-neutral-50 rounded-lg border border-neutral-100"
          >
            <template #prefix>
              <Icon icon="lucide:monitor" class="h-3.5 w-3.5 text-neutral-400" />
            </template>
          </BaseSelect>

          <!-- 高级筛选切换 -->
          <button
            @click="showAdvancedFilters = !showAdvancedFilters"
            class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer"
            :class="showAdvancedFilters 
              ? 'bg-neutral-900 text-white' 
              : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'"
          >
            <Icon icon="lucide:sliders-horizontal" class="h-3.5 w-3.5" />
            <span>筛选</span>
          </button>

          <!-- 清除所有筛选 -->
          <button
            v-if="hasActiveFilters()"
            @click="clearAllFilters"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition cursor-pointer"
          >
            <Icon icon="lucide:x" class="h-3 w-3" />
            <span>清除</span>
          </button>
        </div>

        <!-- 高级筛选面板 -->
        <Transition name="panel">
          <div v-if="showAdvancedFilters" class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <!-- 年龄分级 -->
            <BaseSelect
              v-model="selectedMinAge"
              :options="minAgeOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:shield" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 官方/非官方 -->
            <BaseSelect
              v-model="selectedOfficial"
              :options="officialOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:badge-check" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 补丁 -->
            <BaseSelect
              v-model="selectedPatch"
              :options="patchOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:file-diff" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 免费/收费 -->
            <BaseSelect
              v-model="selectedFreeware"
              :options="freewareOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:circle-dollar-sign" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 配音 -->
            <BaseSelect
              v-model="selectedVoiced"
              :options="voicedOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:mic" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 引擎 -->
            <BaseSelect
              v-model="selectedEngine"
              :options="engineOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:cog" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>
          </div>
        </Transition>
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

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.panel-enter-to,
.panel-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
