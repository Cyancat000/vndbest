<script setup>
defineOptions({ name: 'VnSearch' })

import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import SearchBase from '@/components/SearchBase.vue'
import VnList from '@/components/VnList.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import TagChip from '@/components/TagChip.vue'
import TagFilterModal from '@/components/TagFilterModal.vue'
import DualRangeSlider from '@/components/DualRangeSlider.vue'
import { Icon } from '@iconify/vue'
import { getVnList, getTagList } from '@/api/vndb.js'
import { IonPage, IonContent } from '@ionic/vue'
import { useSavedSearches } from '@/composables/useSavedSearches'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getById } = useSavedSearches()
const searchBaseRef = ref(null)
const openSaveDialog = () => searchBaseRef.value?.openSaveDialog()

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
const selectedTags = ref([])
const showTagModal = ref(false)

// 高级筛选面板
const showAdvancedFilters = ref(false)

// 高级筛选项
const selectedOrigLang = ref('all')
const selectedLength = ref('all')
const selectedDevStatus = ref('all')
const selectedHasScreenshot = ref('all')
const selectedRatingRange = ref([0, 100])
const selectedDateFrom = ref('')
const selectedDateTo = ref('')

// URL 中的 tag 参数
const routeTag = computed(() => typeof route.query.tag === 'string' ? route.query.tag : '')

// 如果从 URL 带入了 tag，初始化到 selectedTags
const tagInitialized = ref(false)

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
  { value: 'win', label: 'metadata.platform.win' },
  { value: 'swi', label: 'metadata.platform.swi' },
  { value: 'ps5', label: 'metadata.platform.ps5' },
  { value: 'ps4', label: 'metadata.platform.ps4' },
  { value: 'ps3', label: 'metadata.platform.ps3' },
  { value: 'psv', label: 'metadata.platform.psv' },
  { value: 'psp', label: 'metadata.platform.psp' },
  { value: 'and', label: 'metadata.platform.and' },
  { value: 'ios', label: 'metadata.platform.ios' },
  { value: 'mac', label: 'metadata.platform.mac' },
  { value: 'lin', label: 'metadata.platform.lin' },
  { value: 'nds', label: 'metadata.platform.nds' },
  { value: '3ds', label: 'metadata.platform.3ds' },
  { value: 'gba', label: 'metadata.platform.gba' },
  { value: 'gbc', label: 'metadata.platform.gbc' },
  { value: 'gb', label: 'metadata.platform.gb' },
  { value: 'sfc', label: 'metadata.platform.sfc' },
  { value: 'nes', label: 'metadata.platform.nes' }
]

// 原始语言
const origLangOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'ja', label: '日语 (原始)' },
  { value: 'zh', label: '中文 (原始)' },
  { value: 'en', label: '英语 (原始)' },
  { value: 'ko', label: '韩语 (原始)' },
  { value: 'fr', label: '法语 (原始)' },
  { value: 'de', label: '德语 (原始)' },
  { value: 'ru', label: '俄语 (原始)' },
  { value: 'es', label: '西班牙语 (原始)' },
  { value: 'it', label: '意大利语 (原始)' },
  { value: 'vi', label: '越南语 (原始)' }
]

// 游戏时长
const lengthOptions = [
  { value: 'all', label: 'list.all' },
  { value: '1', label: '非常短 (< 2小时)' },
  { value: '2', label: '短 (2 - 10小时)' },
  { value: '3', label: '中等 (10 - 30小时)' },
  { value: '4', label: '长 (30 - 50小时)' },
  { value: '5', label: '非常长 (> 50小时)' }
]

// 开发状态
const devStatusOptions = [
  { value: 'all', label: 'list.all' },
  { value: '0', label: '已完结' },
  { value: '1', label: '开发中' },
  { value: '2', label: '已取消' }
]

// 有截图
const hasScreenshotOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'yes', label: '有截图' },
  { value: 'no', label: '无截图' }
]

// 评分滑动条标签
function getRatingLabel(val) {
  if (val === 0) return '不限'
  return (val / 10).toFixed(1)
}

// 评分范围描述
function getRatingRangeText() {
  const [min, max] = selectedRatingRange.value
  const minLabel = getRatingLabel(min)
  const maxLabel = getRatingLabel(max)
  if (min === 0 && max === 100) return '不限'
  if (min === 0) return `≤ ${maxLabel}`
  if (max === 100) return `≥ ${minLabel}`
  return `${minLabel} - ${maxLabel}`
}

// 计算是否有激活的筛选条件
function hasActiveFilters() {
  return selectedLang.value !== 'all' 
    || selectedPlatform.value !== 'all'
    || selectedTags.value.length > 0
    || selectedOrigLang.value !== 'all'
    || selectedLength.value !== 'all'
    || selectedDevStatus.value !== 'all'
    || selectedHasScreenshot.value !== 'all'
    || selectedRatingRange.value[0] > 0
    || selectedRatingRange.value[1] < 100
    || selectedDateFrom.value !== ''
    || selectedDateTo.value !== ''
}

// 清除所有筛选
function clearAllFilters() {
  selectedLang.value = 'all'
  selectedPlatform.value = 'all'
  selectedTags.value = []
  selectedOrigLang.value = 'all'
  selectedLength.value = 'all'
  selectedDevStatus.value = 'all'
  selectedHasScreenshot.value = 'all'
  selectedRatingRange.value = [0, 100]
  selectedDateFrom.value = ''
  selectedDateTo.value = ''
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

    // 多个标签用 or 组合
    if (selectedTags.value.length > 0) {
      if (selectedTags.value.length === 1) {
        filters.push(['tag', '=', selectedTags.value[0].id])
      } else {
        const tagFilters = selectedTags.value.map(t => ['tag', '=', t.id])
        filters.push(['or', ...tagFilters])
      }
    } else if (routeTag.value) {
      // 兼容 URL 参数
      filters.push(['tag', '=', routeTag.value])
    }

    // 原始语言
    if (selectedOrigLang.value !== 'all') {
      filters.push(['olang', '=', selectedOrigLang.value])
    }

    // 游戏时长
    if (selectedLength.value !== 'all') {
      filters.push(['length', '=', parseInt(selectedLength.value)])
    }

    // 开发状态
    if (selectedDevStatus.value !== 'all') {
      filters.push(['devstatus', '=', parseInt(selectedDevStatus.value)])
    }

    // 有截图
    if (selectedHasScreenshot.value === 'yes') {
      filters.push(['has_screenshot', '=', 1])
    } else if (selectedHasScreenshot.value === 'no') {
      filters.push(['has_screenshot', '!=', 1])
    }

    // 评分范围
    const [ratingMin, ratingMax] = selectedRatingRange.value
    if (ratingMin > 0) {
      filters.push(['rating', '>=', ratingMin])
    }
    if (ratingMax < 100) {
      filters.push(['rating', '<=', ratingMax])
    }

    // 发布日期范围（'today' 为特殊状态，API 调用时解析为当天日期）
    if (selectedDateFrom.value) {
      const dateFrom = selectedDateFrom.value === 'today' ? getTodayStr() : selectedDateFrom.value
      filters.push(['released', '>=', dateFrom.replace(/-/g, '')])
    }
    if (selectedDateTo.value) {
      const dateTo = selectedDateTo.value === 'today' ? getTodayStr() : selectedDateTo.value
      filters.push(['released', '<=', dateTo.replace(/-/g, '')])
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

// Tag 相关
function handleRemoveTag(tag) {
  selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
}

function handleTagDetail(tag) {
  router.push(`/browse/vn?tag=${tag.id}`)
}

function handleTagModalConfirm(tags) {
  selectedTags.value = tags
}

// 筛选器变化时自动重新搜索
watch([selectedLang, selectedPlatform, selectedOrigLang, selectedLength, selectedDevStatus, selectedHasScreenshot], () => {
  fetchData()
})

// 评分范围使用防抖，避免拖动过程中频繁请求
let ratingDebounceTimer = null
watch(selectedRatingRange, () => {
  if (ratingDebounceTimer) clearTimeout(ratingDebounceTimer)
  ratingDebounceTimer = setTimeout(() => {
    fetchData()
  }, 500)
}, { deep: true })

// 发布日期使用防抖
let dateDebounceTimer = null
watch([selectedDateFrom, selectedDateTo], () => {
  if (dateDebounceTimer) clearTimeout(dateDebounceTimer)
  dateDebounceTimer = setTimeout(() => {
    fetchData()
  }, 500)
})

onUnmounted(() => {
  if (ratingDebounceTimer) clearTimeout(ratingDebounceTimer)
  if (dateDebounceTimer) clearTimeout(dateDebounceTimer)
})

watch(selectedTags, () => {
  fetchData()
}, { deep: true })

watch(query, (newVal) => {
  if (!newVal) {
    fetchData()
  }
})

// 监听 URL 中 tag 参数变化（从 VnDetail 点击标签导航回来时，组件可能已存在于 Ionic 页面栈中）
watch(routeTag, async (newTag) => {
  if (newTag) {
    tagInitialized.value = true
    // 先用 ID 作为占位名称
    selectedTags.value = [{ id: newTag, name: newTag, category: '', vn_count: 0 }]
    // 通过 API 获取实际标签名称
    try {
      const res = await getTagList(['id', '=', newTag], { results: 1 })
      if (res && res.results && res.results.length > 0) {
        const tag = res.results[0]
        selectedTags.value = [{ id: tag.id, name: tag.name, description: tag.description, category: tag.category, vn_count: tag.vn_count }]
      }
    } catch (err) {
      console.error('获取标签详情失败:', err)
    }
    // fetchData 会由 selectedTags 的 watcher 自动触发
  }
})

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function applyFilters(filters) {
  if (!filters) return
  if (filters.query !== undefined) query.value = filters.query
  if (filters.sortBy !== undefined) sortBy.value = filters.sortBy
  if (filters.reverse !== undefined) reverse.value = filters.reverse
  if (filters.selectedLang !== undefined) selectedLang.value = filters.selectedLang
  if (filters.selectedPlatform !== undefined) selectedPlatform.value = filters.selectedPlatform
  if (filters.selectedTags !== undefined) selectedTags.value = filters.selectedTags
  if (filters.selectedOrigLang !== undefined) selectedOrigLang.value = filters.selectedOrigLang
  if (filters.selectedLength !== undefined) selectedLength.value = filters.selectedLength
  if (filters.selectedDevStatus !== undefined) selectedDevStatus.value = filters.selectedDevStatus
  if (filters.selectedHasScreenshot !== undefined) selectedHasScreenshot.value = filters.selectedHasScreenshot
  if (filters.selectedRatingRange !== undefined) selectedRatingRange.value = filters.selectedRatingRange
  // 保留 'today' 特殊状态，不转换为具体日期
  if (filters.selectedDateFrom !== undefined) selectedDateFrom.value = filters.selectedDateFrom || ''
  if (filters.selectedDateTo !== undefined) selectedDateTo.value = filters.selectedDateTo || ''
}

function handleRefresh() {
  fetchData()
}

function setTodayDateTo() {
  // 切换：如果已经是 'today' 则清除，否则设为 'today'
  selectedDateTo.value = selectedDateTo.value === 'today' ? '' : 'today'
}

function setTodayDateFrom() {
  // 切换：如果已经是 'today' 则清除，否则设为 'today'
  selectedDateFrom.value = selectedDateFrom.value === 'today' ? '' : 'today'
}

onMounted(async () => {
  const savedId = route.query.savedId
  if (savedId) {
    const saved = getById(savedId)
    if (saved && saved.filters) {
      applyFilters(saved.filters)
    }
  }
  // 如果 URL 带了 tag 参数，先获取标签名称再加载数据
  if (routeTag.value && !tagInitialized.value) {
    tagInitialized.value = true
    selectedTags.value = [{ id: routeTag.value, name: routeTag.value, category: '', vn_count: 0 }]
    try {
      const res = await getTagList(['id', '=', routeTag.value], { results: 1 })
      if (res && res.results && res.results.length > 0) {
        const tag = res.results[0]
        selectedTags.value = [{ id: tag.id, name: tag.name, description: tag.description, category: tag.category, vn_count: tag.vn_count }]
      }
    } catch (err) {
      console.error('获取标签详情失败:', err)
    }
  }
  fetchData()
})
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container pb-24">
  <SearchBase
    ref="searchBaseRef"
    v-model="query"
    type="vn"
    :title="t('library.vn')"
    icon="lucide:file-text"
    :loading="isLoading"
    :filters="{ query, sortBy, reverse, selectedLang, selectedPlatform, selectedTags, selectedOrigLang, selectedLength, selectedDevStatus, selectedHasScreenshot, selectedRatingRange, selectedDateFrom, selectedDateTo }"
    @search="handleSearch"
    @clear="handleClear"
    @refresh="handleRefresh"
  >
    <template #filters>
      <div class="space-y-2 pb-2">
        <!-- 筛选操作行 -->
        <div class="flex flex-wrap items-center gap-2">
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

          <!-- 保存筛选 -->
          <button
            v-if="hasActiveFilters()"
            @click="openSaveDialog"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition cursor-pointer"
          >
            <Icon icon="lucide:bookmark" class="h-3 w-3" />
            <span>保存</span>
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

        <!-- 已选标签展示区域 -->
        <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-1.5">
          <TagChip
            v-for="tag in selectedTags"
            :key="tag.id"
            :tag="tag"
            @remove="handleRemoveTag"
            @show-detail="handleTagDetail"
          />
        </div>

        <!-- 高级筛选面板 -->
        <Transition name="panel">
          <div v-if="showAdvancedFilters" class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
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

            <!-- 标签筛选按钮 -->
            <button
              @click="showTagModal = true"
              class="flex w-full items-center justify-between gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer"
              :class="selectedTags.length > 0
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'"
            >
              <Icon icon="lucide:tags" class="h-3.5 w-3.5" />
              <span>标签</span>
              <span
                v-if="selectedTags.length > 0"
                class="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold"
                :class="selectedTags.length > 0 ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'"
              >
                {{ selectedTags.length }}
              </span>
              <Icon v-else icon="lucide:chevron-down" class="h-3 w-3 text-neutral-400" />
            </button>

            <!-- 原始语言 -->
            <BaseSelect
              v-model="selectedOrigLang"
              :options="origLangOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:book-open" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 游戏时长 -->
            <BaseSelect
              v-model="selectedLength"
              :options="lengthOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:clock" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 开发状态 -->
            <BaseSelect
              v-model="selectedDevStatus"
              :options="devStatusOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:flag" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 有截图 -->
            <BaseSelect
              v-model="selectedHasScreenshot"
              :options="hasScreenshotOptions"
              :label-renderer="(l) => t(l, l)"
              class="!bg-neutral-50 rounded-lg border border-neutral-100"
            >
              <template #prefix>
                <Icon icon="lucide:image" class="h-3.5 w-3.5 text-neutral-400" />
              </template>
            </BaseSelect>

            <!-- 发布日期范围 -->
            <div class="flex flex-col gap-1 px-2 py-1.5 rounded-lg border border-neutral-100 bg-neutral-50 col-span-2 sm:col-span-3">
              <div class="flex items-center gap-1.5 mb-1">
                <Icon icon="lucide:calendar" class="h-3.5 w-3.5 text-neutral-400" />
                <span class="text-xs font-medium text-neutral-600">发布日期范围</span>
                <span v-if="selectedDateFrom || selectedDateTo" class="text-[10px] font-bold text-neutral-900">
                  {{ selectedDateFrom === 'today' ? '今天' : (selectedDateFrom || '不限') }} ~ {{ selectedDateTo === 'today' ? '今天' : (selectedDateTo || '不限') }}
                </span>
              </div>
              <!-- 开始日期 -->
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-neutral-400 w-6 shrink-0">从</span>
                <input
                  v-if="selectedDateFrom !== 'today'"
                  v-model="selectedDateFrom"
                  type="date"
                  class="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/5"
                />
                <button
                  @click="setTodayDateFrom"
                  class="rounded-md border px-3 py-1 text-[10px] font-medium transition-colors"
                  :class="selectedDateFrom === 'today'
                    ? 'flex-1 border-neutral-800 bg-neutral-800 text-white'
                    : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100 active:bg-neutral-200'"
                >{{ selectedDateFrom === 'today' ? '今天 ✓' : '今天' }}</button>
              </div>
              <!-- 结束日期 -->
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-neutral-400 w-6 shrink-0">到</span>
                <input
                  v-if="selectedDateTo !== 'today'"
                  v-model="selectedDateTo"
                  type="date"
                  class="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-900/5"
                />
                <button
                  @click="setTodayDateTo"
                  class="rounded-md border px-3 py-1 text-[10px] font-medium transition-colors"
                  :class="selectedDateTo === 'today'
                    ? 'flex-1 border-neutral-800 bg-neutral-800 text-white'
                    : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-100 active:bg-neutral-200'"
                >{{ selectedDateTo === 'today' ? '今天 ✓' : '今天' }}</button>
              </div>
            </div>

            <!-- 评分范围滑动条 -->
            <div class="flex flex-col gap-1 px-2 py-1.5 rounded-lg border border-neutral-100 bg-neutral-50 col-span-2 sm:col-span-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <Icon icon="lucide:star" class="h-3.5 w-3.5 text-neutral-400" />
                  <span class="text-xs font-medium text-neutral-600">评分范围</span>
                </div>
                <span class="text-xs font-bold text-neutral-900">{{ getRatingRangeText() }}</span>
              </div>
              <DualRangeSlider
                v-model="selectedRatingRange"
                :min="0"
                :max="100"
                :step="1"
              />
              <div class="flex justify-between text-[9px] text-neutral-400 font-medium px-1">
                <span>不限</span>
                <span>5.0</span>
                <span>6.0</span>
                <span>7.0</span>
                <span>8.0</span>
                <span>10.0</span>
              </div>
            </div>
          </div>
        </Transition>
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

  <!-- 标签选择弹窗 -->
  <TagFilterModal
    :show="showTagModal"
    :selected-tags="selectedTags"
    @close="showTagModal = false"
    @confirm="handleTagModalConfirm"
  />
  </div>
  </ion-content>
  </ion-page>
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
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
