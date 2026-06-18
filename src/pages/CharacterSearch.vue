<script setup>
defineOptions({ name: 'CharacterSearch' })

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SearchBase from '@/components/SearchBase.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import DualRangeSlider from '@/components/DualRangeSlider.vue'
import TraitChip from '@/components/TraitChip.vue'
import TraitFilterModal from '@/components/TraitFilterModal.vue'
import { getCharacterList, getTraitList } from '@/api/vndb'
import { IonPage, IonContent, IonImg, IonSpinner } from '@ionic/vue'
import { useSavedSearches } from '@/composables/useSavedSearches'
import { useImageLoader } from '@/composables/useImageLoader'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getById } = useSavedSearches()
const imageLoader = useImageLoader()
const searchBaseRef = ref(null)
const openSaveDialog = () => searchBaseRef.value?.openSaveDialog()

const query = ref('')
const results = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 25

// 筛选状态
const selectedTraits = ref([])
const showTraitModal = ref(false)
const showAdvancedFilters = ref(false)

// 高级筛选项
const selectedSex = ref('all')
const selectedBloodType = ref('all')
const selectedRole = ref('all')

// 身体数据筛选
const heightRange = ref([100, 200])
const weightRange = ref([30, 120])
const bustRange = ref([40, 120])
const selectedCup = ref('all')

// 生日筛选
const birthdayMonth = ref(0)
const birthdayDay = ref(0)

// 身体数据筛选默认值
const defaultHeight = [100, 200]
const defaultWeight = [30, 120]
const defaultBust = [40, 120]

// 是否展开身体数据筛选面板
const showBodyFilters = ref(false)

// 是否展开生日筛选面板
const showBirthdayFilters = ref(false)

// 筛选项是否激活
function isHeightActive() {
  return heightRange.value[0] > defaultHeight[0] || heightRange.value[1] < defaultHeight[1]
}
function isWeightActive() {
  return weightRange.value[0] > defaultWeight[0] || weightRange.value[1] < defaultWeight[1]
}
function isBustActive() {
  return bustRange.value[0] > defaultBust[0] || bustRange.value[1] < defaultBust[1]
}
function isCupActive() {
  return selectedCup.value !== 'all'
}
function isBirthdayActive() {
  return birthdayMonth.value > 0
}

// 重置身体数据筛选
function resetHeight() { heightRange.value = [...defaultHeight] }
function resetWeight() { weightRange.value = [...defaultWeight] }
function resetBust() { bustRange.value = [...defaultBust] }
function resetCup() { selectedCup.value = 'all' }
function resetBirthday() { birthdayMonth.value = 0; birthdayDay.value = 0 }
function resetBodyFilters() {
  resetHeight(); resetWeight(); resetBust(); resetCup()
  showBodyFilters.value = false
}
function resetBirthdayFilters() {
  resetBirthday()
  showBirthdayFilters.value = false
}

// 月份选项
const monthOptions = [
  { value: 0, label: '不限' },
  { value: 1, label: '1月' }, { value: 2, label: '2月' }, { value: 3, label: '3月' },
  { value: 4, label: '4月' }, { value: 5, label: '5月' }, { value: 6, label: '6月' },
  { value: 7, label: '7月' }, { value: 8, label: '8月' }, { value: 9, label: '9月' },
  { value: 10, label: '10月' }, { value: 11, label: '11月' }, { value: 12, label: '12月' }
]

// 杯型选项
const cupOptions = [
  { value: 'all', label: '不限' },
  { value: 'AA', label: 'AA' }, { value: 'A', label: 'A' }, { value: 'B', label: 'B' },
  { value: 'C', label: 'C' }, { value: 'D', label: 'D' }, { value: 'E', label: 'E' },
  { value: 'F', label: 'F' }, { value: 'G', label: 'G' }, { value: 'H', label: 'H' },
  { value: 'I', label: 'I' }, { value: 'J', label: 'J' }, { value: 'K', label: 'K' }
]

// URL 参数中的 birthday (格式: "month,day")
function getBirthdayFilter() {
  const b = route.query.birthday
  if (typeof b === 'string' && b.includes(',')) {
    const parts = b.split(',').map(Number)
    if (parts.length === 2 && parts[0] >= 1 && parts[0] <= 12 && parts[1] >= 0 && parts[1] <= 31) {
      return parts
    }
  }
  return null
}

function getSelectedTrait() {
  return typeof route.query.trait === 'string' ? route.query.trait : ''
}

// 从 URL 解析身体数据筛选
function parseRangeParam(param, min, max) {
  const val = route.query[param]
  if (typeof val === 'string' && val.includes('-')) {
    const parts = val.split('-').map(Number)
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [Math.max(min, Math.min(max, parts[0])), Math.max(min, Math.min(max, parts[1]))]
    }
  }
  return null
}

// 筛选选项
const sexOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'm', label: '男' },
  { value: 'f', label: '女' },
  { value: 'b', label: '双性' },
  { value: 'n', label: '无性' }
]

const bloodTypeOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'a', label: 'A 型' },
  { value: 'b', label: 'B 型' },
  { value: 'ab', label: 'AB 型' },
  { value: 'o', label: 'O 型' }
]

const roleOptions = [
  { value: 'all', label: 'list.all' },
  { value: 'main', label: '视点角色' },
  { value: 'primary', label: '主要角色' },
  { value: 'side', label: '配角' },
  { value: 'appears', label: '客串/出场' }
]

// 计算是否有激活的筛选条件
function hasActiveFilters() {
  return selectedTraits.value.length > 0
    || selectedSex.value !== 'all'
    || selectedBloodType.value !== 'all'
    || selectedRole.value !== 'all'
    || getBirthdayFilter() !== null
    || isHeightActive()
    || isWeightActive()
    || isBustActive()
    || isCupActive()
    || isBirthdayActive()
}

// 清除所有筛选
function clearAllFilters() {
  selectedTraits.value = []
  selectedSex.value = 'all'
  selectedBloodType.value = 'all'
  selectedRole.value = 'all'
  resetHeight()
  resetWeight()
  resetBust()
  resetCup()
  resetBirthday()
  showBodyFilters.value = false
  showBirthdayFilters.value = false
  fetchData()
}

// 触底加载逻辑
const sentinel = ref(null)
let observer = null

async function fetchData(q = '', reset = true) {
  if (isLoading.value && !reset) return
  
  if (reset) {
    page.value = 1
    results.value = []
    hasMore.value = false
  }
  
  isLoading.value = true
  try {
    const filters = []
    const searchQ = q || query.value

    if (searchQ && searchQ.trim() !== '') {
      filters.push(['search', '=', searchQ])
    }

    // URL 参数中的 trait
    const routeTrait = getSelectedTrait()
    if (routeTrait) {
      filters.push(['trait', '=', routeTrait])
    }

    // 选择的特征（多选用 or）
    if (selectedTraits.value.length > 0) {
      if (selectedTraits.value.length === 1) {
        filters.push(['trait', '=', selectedTraits.value[0].id])
      } else {
        const traitFilters = selectedTraits.value.map(t => ['trait', '=', t.id])
        filters.push(['or', ...traitFilters])
      }
    }

    // 性别
    if (selectedSex.value !== 'all') {
      filters.push(['sex', '=', selectedSex.value])
    }

    // 血型
    if (selectedBloodType.value !== 'all') {
      filters.push(['blood_type', '=', selectedBloodType.value])
    }

    // 角色定位
    if (selectedRole.value !== 'all') {
      filters.push(['role', '=', selectedRole.value])
    }

    // 身高范围
    if (heightRange.value[0] > defaultHeight[0]) {
      filters.push(['height', '>=', heightRange.value[0]])
    }
    if (heightRange.value[1] < defaultHeight[1]) {
      filters.push(['height', '<=', heightRange.value[1]])
    }

    // 体重范围
    if (weightRange.value[0] > defaultWeight[0]) {
      filters.push(['weight', '>=', weightRange.value[0]])
    }
    if (weightRange.value[1] < defaultWeight[1]) {
      filters.push(['weight', '<=', weightRange.value[1]])
    }

    // 胸围范围
    if (bustRange.value[0] > defaultBust[0]) {
      filters.push(['bust', '>=', bustRange.value[0]])
    }
    if (bustRange.value[1] < defaultBust[1]) {
      filters.push(['bust', '<=', bustRange.value[1]])
    }

    // 杯型
    if (selectedCup.value !== 'all') {
      filters.push(['cup', '=', selectedCup.value])
    }

    // 生日筛选
    if (birthdayMonth.value > 0) {
      filters.push(['birthday', '=', [birthdayMonth.value, birthdayDay.value]])
    }

    const finalFilters = filters.length > 1 ? ['and', ...filters] : (filters[0] || [])

    const res = await getCharacterList(finalFilters, {
      page: page.value,
      results: resultsPerPage,
      sort: searchQ && searchQ.trim() !== '' ? 'searchrank' : 'id',
      reverse: false
    })
    
    if (res && res.results) {
      if (reset) {
        results.value = res.results
      } else {
        results.value = [...results.value, ...res.results]
      }
      hasMore.value = !!res.more
    }
  } catch (err) {
    console.error('获取角色列表失败:', err)
  } finally {
    isLoading.value = false
    
    // 如果首屏没填满，且还有数据，递归加载
    nextTick(() => {
      if (hasMore.value && !isLoading.value) {
        const rect = sentinel.value?.getBoundingClientRect()
        if (rect && rect.top < window.innerHeight + 100) {
          loadMore()
        }
      }
    })
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value++
  await fetchData(query.value, false)
}

function handleSearch(q) {
  query.value = q
  fetchData(q, true)
}

function handleClear() {
  query.value = ''
  fetchData('', true)
}

function goToDetail(id) {
  router.push(`/character/${id}`)
}

// Trait 相关
function handleRemoveTrait(trait) {
  selectedTraits.value = selectedTraits.value.filter(t => t.id !== trait.id)
}

function handleTraitDetail(trait) {
  router.push(`/browse/characters?trait=${trait.id}`)
}

function handleTraitModalConfirm(traits) {
  selectedTraits.value = traits
}

// 统一观察器初始化
function setupObserver() {
  if (observer) observer.disconnect()
  
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
      loadMore()
    }
  }, {
    rootMargin: '400px',
    threshold: 0
  })

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
}

function applyFilters(filters) {
  if (!filters) return
  if (filters.query !== undefined) query.value = filters.query
  if (filters.selectedTraits !== undefined) selectedTraits.value = filters.selectedTraits
  if (filters.selectedSex !== undefined) selectedSex.value = filters.selectedSex
  if (filters.selectedBloodType !== undefined) selectedBloodType.value = filters.selectedBloodType
  if (filters.selectedRole !== undefined) selectedRole.value = filters.selectedRole
  if (filters.heightRange !== undefined) heightRange.value = filters.heightRange
  if (filters.weightRange !== undefined) weightRange.value = filters.weightRange
  if (filters.bustRange !== undefined) bustRange.value = filters.bustRange
  if (filters.selectedCup !== undefined) selectedCup.value = filters.selectedCup
  if (filters.birthdayMonth !== undefined) birthdayMonth.value = filters.birthdayMonth
  if (filters.birthdayDay !== undefined) birthdayDay.value = filters.birthdayDay
  // 如果有身体数据筛选，自动展开面板
  if (filters.heightRange || filters.weightRange || filters.bustRange || filters.selectedCup) {
    showBodyFilters.value = true
  }
  if (filters.birthdayMonth) {
    showBirthdayFilters.value = true
  }
}

function handleRefresh() {
  fetchData(query.value, true)
}

onMounted(async () => {
  // 从 URL 解析身体数据筛选参数
  const hRange = parseRangeParam('height', 100, 200)
  if (hRange) { heightRange.value = hRange; showBodyFilters.value = true }

  const wRange = parseRangeParam('weight', 30, 120)
  if (wRange) { weightRange.value = wRange; showBodyFilters.value = true }

  const bRange = parseRangeParam('bust', 40, 120)
  if (bRange) { bustRange.value = bRange; showBodyFilters.value = true }

  const cupParam = route.query.cup
  if (typeof cupParam === 'string' && cupParam) {
    selectedCup.value = cupParam.toUpperCase()
    showBodyFilters.value = true
  }

  // 从 URL 解析生日筛选
  const bdFilter = getBirthdayFilter()
  if (bdFilter) {
    birthdayMonth.value = bdFilter[0]
    birthdayDay.value = bdFilter[1]
    showBirthdayFilters.value = true
  }

  const savedId = route.query.savedId
  if (savedId) {
    const saved = getById(savedId)
    if (saved && saved.filters) {
      applyFilters(saved.filters)
    }
  }
  // 如果 URL 带了 trait 参数，先获取特征名称再加载数据
  const routeTrait = getSelectedTrait()
  if (routeTrait) {
    selectedTraits.value = [{ id: routeTrait, name: routeTrait, category: '', vn_count: 0 }]
    try {
      const res = await getTraitList(['id', '=', routeTrait], { results: 1 })
      if (res && res.results && res.results.length > 0) {
        const trait = res.results[0]
        selectedTraits.value = [{ id: trait.id, name: trait.name, description: trait.description, group_name: trait.group_name, group_id: trait.group_id, char_count: trait.char_count }]
      }
    } catch (err) {
      console.error('获取特征详情失败:', err)
    }
  }
  fetchData(query.value, true)
  setupObserver()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// 筛选器变化时自动重新搜索
watch([selectedSex, selectedBloodType, selectedRole], () => {
  fetchData()
})

watch(selectedTraits, () => {
  fetchData()
}, { deep: true })

// 身体数据筛选变化时自动重新搜索
watch([heightRange, weightRange, bustRange], () => {
  fetchData()
}, { deep: true })

watch(selectedCup, () => {
  fetchData()
})

watch([birthdayMonth, birthdayDay], () => {
  fetchData()
})

watch(
  () => route.query.trait,
  async (newTrait) => {
    if (newTrait) {
      // 先用 ID 作为占位名称
      selectedTraits.value = [{ id: newTrait, name: newTrait, category: '', vn_count: 0 }]
      // 通过 API 获取实际特征名称
      try {
        const res = await getTraitList(['id', '=', newTrait], { results: 1 })
        if (res && res.results && res.results.length > 0) {
          const trait = res.results[0]
          selectedTraits.value = [{ id: trait.id, name: trait.name, description: trait.description, group_name: trait.group_name, group_id: trait.group_id, char_count: trait.char_count }]
        }
      } catch (err) {
        console.error('获取特征详情失败:', err)
      }
    }
    fetchData(query.value, true)
  }
)

// 监听身体数据相关的 URL 参数变化（如从生日/身高链接跳转进来）
watch(
  () => route.query,
  (newQuery) => {
    // 身高
    const hRange = parseRangeParam('height', 100, 200)
    if (hRange) { heightRange.value = hRange; showBodyFilters.value = true }
    else { resetHeight() }

    // 体重
    const wRange = parseRangeParam('weight', 30, 120)
    if (wRange) { weightRange.value = wRange; showBodyFilters.value = true }
    else { resetWeight() }

    // 胸围
    const bRange = parseRangeParam('bust', 40, 120)
    if (bRange) { bustRange.value = bRange; showBodyFilters.value = true }
    else { resetBust() }

    // 杯型
    const cupParam = newQuery.cup
    if (typeof cupParam === 'string' && cupParam) {
      selectedCup.value = cupParam.toUpperCase()
      showBodyFilters.value = true
    } else {
      selectedCup.value = 'all'
    }

    // 生日
    const bdFilter = getBirthdayFilter()
    if (bdFilter) {
      birthdayMonth.value = bdFilter[0]
      birthdayDay.value = bdFilter[1]
      showBirthdayFilters.value = true
    } else {
      birthdayMonth.value = 0
      birthdayDay.value = 0
    }

    // 如果没有任何身体数据参数，检查是否需要关闭面板
    if (!hRange && !wRange && !bRange && !cupParam && !bdFilter) {
      // 不关闭面板，因为可能有其他筛选
    }
  }
)

// 监听 sentinel，确保 DOM 稳定
watch(sentinel, (el) => {
  if (el && observer) {
    observer.observe(el)
  }
})

// 性别展示
const getSexIcon = (sex) => {
  if (sex === 'f') return 'lucide:venus'
  if (sex === 'm') return 'lucide:mars'
  if (sex === 'b') return 'lucide:venus-mars'
  return null
}

const getSexClass = (sex) => {
  if (sex === 'f') return 'text-rose-400 bg-rose-50 border-rose-100'
  if (sex === 'm') return 'text-blue-400 bg-blue-50 border-blue-100'
  return 'text-neutral-400 bg-neutral-50 border-neutral-100'
}
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container pb-24">
    <SearchBase
      ref="searchBaseRef"
      type="characters"
      v-model="query"
      :title="t('library.characters')"
      icon="lucide:user-circle"
      :loading="isLoading"
      :filters="{ query, selectedTraits, selectedSex, selectedBloodType, selectedRole, heightRange, weightRange, bustRange, selectedCup, birthdayMonth, birthdayDay }"
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

          <!-- 已选特征展示区域 -->
          <div v-if="selectedTraits.length > 0" class="flex flex-wrap gap-1.5">
            <TraitChip
              v-for="trait in selectedTraits"
              :key="trait.id"
              :trait="trait"
              @remove="handleRemoveTrait"
              @show-detail="handleTraitDetail"
            />
          </div>

          <!-- 生日筛选 chip -->
          <div v-if="isBirthdayActive()" class="flex flex-wrap gap-1.5">
            <div
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-50 border border-pink-200 text-[11px] font-medium text-pink-700"
            >
              <Icon icon="lucide:cake" class="h-3 w-3" />
              <span>{{ birthdayMonth }}月{{ birthdayDay > 0 ? birthdayDay + '日' : '' }}</span>
              <button @click="resetBirthdayFilters" class="ml-0.5 p-0.5 rounded-full hover:bg-pink-100 transition cursor-pointer">
                <Icon icon="lucide:x" class="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          <!-- 身体数据筛选 chips -->
          <div v-if="isHeightActive() || isWeightActive() || isBustActive() || isCupActive()" class="flex flex-wrap gap-1.5">
            <div
              v-if="isHeightActive()"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-medium text-blue-700"
            >
              <Icon icon="lucide:ruler" class="h-3 w-3" />
              <span>{{ heightRange[0] }}-{{ heightRange[1] }}cm</span>
              <button @click="resetHeight" class="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 transition cursor-pointer">
                <Icon icon="lucide:x" class="h-2.5 w-2.5" />
              </button>
            </div>
            <div
              v-if="isWeightActive()"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-[11px] font-medium text-green-700"
            >
              <Icon icon="lucide:weight" class="h-3 w-3" />
              <span>{{ weightRange[0] }}-{{ weightRange[1] }}kg</span>
              <button @click="resetWeight" class="ml-0.5 p-0.5 rounded-full hover:bg-green-100 transition cursor-pointer">
                <Icon icon="lucide:x" class="h-2.5 w-2.5" />
              </button>
            </div>
            <div
              v-if="isBustActive()"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-medium text-purple-700"
            >
              <Icon icon="lucide:circle" class="h-3 w-3" />
              <span>{{ bustRange[0] }}-{{ bustRange[1] }}cm</span>
              <button @click="resetBust" class="ml-0.5 p-0.5 rounded-full hover:bg-purple-100 transition cursor-pointer">
                <Icon icon="lucide:x" class="h-2.5 w-2.5" />
              </button>
            </div>
            <div
              v-if="isCupActive()"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700"
            >
              <Icon icon="lucide:heart" class="h-3 w-3" />
              <span>Cup {{ selectedCup }}</span>
              <button @click="resetCup" class="ml-0.5 p-0.5 rounded-full hover:bg-amber-100 transition cursor-pointer">
                <Icon icon="lucide:x" class="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          <!-- 高级筛选面板 -->
          <Transition name="panel">
            <div v-if="showAdvancedFilters" class="space-y-2 pt-1">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <!-- 特征筛选按钮 -->
                <button
                  @click="showTraitModal = true"
                  class="flex w-full items-center justify-between gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer"
                  :class="selectedTraits.length > 0
                    ? 'bg-violet-600 text-white'
                    : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'"
                >
                  <Icon icon="lucide:scan-search" class="h-3.5 w-3.5" />
                  <span>特征</span>
                  <span
                    v-if="selectedTraits.length > 0"
                    class="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold"
                    :class="selectedTraits.length > 0 ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'"
                  >
                    {{ selectedTraits.length }}
                  </span>
                  <Icon v-else icon="lucide:chevron-down" class="h-3 w-3 text-neutral-400" />
                </button>

                <!-- 性别 -->
                <BaseSelect
                  v-model="selectedSex"
                  :options="sexOptions"
                  :label-renderer="(l) => t(l, l)"
                  class="!bg-neutral-50 rounded-lg border border-neutral-100"
                >
                  <template #prefix>
                    <Icon icon="lucide:users" class="h-3.5 w-3.5 text-neutral-400" />
                  </template>
                </BaseSelect>

                <!-- 血型 -->
                <BaseSelect
                  v-model="selectedBloodType"
                  :options="bloodTypeOptions"
                  :label-renderer="(l) => t(l, l)"
                  class="!bg-neutral-50 rounded-lg border border-neutral-100"
                >
                  <template #prefix>
                    <Icon icon="lucide:droplets" class="h-3.5 w-3.5 text-neutral-400" />
                  </template>
                </BaseSelect>

                <!-- 角色定位 -->
                <BaseSelect
                  v-model="selectedRole"
                  :options="roleOptions"
                  :label-renderer="(l) => t(l, l)"
                  class="!bg-neutral-50 rounded-lg border border-neutral-100"
                >
                  <template #prefix>
                    <Icon icon="lucide:badge" class="h-3.5 w-3.5 text-neutral-400" />
                  </template>
                </BaseSelect>

                <!-- 生日 -->
                <button
                  @click="showBirthdayFilters = !showBirthdayFilters"
                  class="flex w-full items-center justify-between gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer"
                  :class="isBirthdayActive()
                    ? 'bg-pink-500 text-white'
                    : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'"
                >
                  <Icon icon="lucide:cake" class="h-3.5 w-3.5" />
                  <span>生日</span>
                  <Icon v-if="!isBirthdayActive()" icon="lucide:chevron-down" class="h-3 w-3 text-neutral-400" />
                  <Icon v-else icon="lucide:x" class="h-3 w-3" />
                </button>

                <!-- 身体数据 -->
                <button
                  @click="showBodyFilters = !showBodyFilters"
                  class="flex w-full items-center justify-between gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer"
                  :class="isHeightActive() || isWeightActive() || isBustActive() || isCupActive()
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'"
                >
                  <Icon icon="lucide:ruler" class="h-3.5 w-3.5" />
                  <span>身体数据</span>
                  <span
                    v-if="isHeightActive() || isWeightActive() || isBustActive() || isCupActive()"
                    class="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold bg-white/20 text-white"
                  >
                    {{ [isHeightActive(), isWeightActive(), isBustActive(), isCupActive()].filter(Boolean).length }}
                  </span>
                  <Icon v-else icon="lucide:chevron-down" class="h-3 w-3 text-neutral-400" />
                </button>

                <!-- 清除身体数据 -->
                <button
                  v-if="isHeightActive() || isWeightActive() || isBustActive() || isCupActive()"
                  @click="resetBodyFilters"
                  class="flex w-full items-center justify-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition cursor-pointer"
                >
                  <Icon icon="lucide:x" class="h-3 w-3" />
                  <span>清除身体数据</span>
                </button>
              </div>

              <!-- 生日筛选面板 -->
              <Transition name="panel">
                <div v-if="showBirthdayFilters" class="rounded-xl bg-neutral-50 border border-neutral-100 p-3 space-y-3">
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <Icon icon="lucide:cake" class="h-3 w-3" />
                      <span>生日</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <select
                        v-model.number="birthdayMonth"
                        class="px-2 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                      >
                        <option v-for="opt in monthOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                      <input
                        v-model.number="birthdayDay"
                        type="number"
                        min="0"
                        max="31"
                        placeholder="日"
                        :disabled="birthdayMonth <= 0"
                        class="px-2 py-1.5 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- 身体数据筛选面板 -->
              <Transition name="panel">
                <div v-if="showBodyFilters" class="rounded-xl bg-neutral-50 border border-neutral-100 p-3 space-y-3">
                  <!-- 身高 -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        <Icon icon="lucide:ruler" class="h-3 w-3" />
                        <span>身高 (cm)</span>
                      </div>
                      <span class="text-[10px] text-neutral-400 font-medium">{{ heightRange[0] }} - {{ heightRange[1] }}</span>
                    </div>
                    <DualRangeSlider v-model="heightRange" :min="100" :max="200" :step="1" />
                  </div>

                  <!-- 体重 -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        <Icon icon="lucide:weight" class="h-3 w-3" />
                        <span>体重 (kg)</span>
                      </div>
                      <span class="text-[10px] text-neutral-400 font-medium">{{ weightRange[0] }} - {{ weightRange[1] }}</span>
                    </div>
                    <DualRangeSlider v-model="weightRange" :min="30" :max="120" :step="1" />
                  </div>

                  <!-- 胸围 -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        <Icon icon="lucide:circle" class="h-3 w-3" />
                        <span>胸围 (cm)</span>
                      </div>
                      <span class="text-[10px] text-neutral-400 font-medium">{{ bustRange[0] }} - {{ bustRange[1] }}</span>
                    </div>
                    <DualRangeSlider v-model="bustRange" :min="40" :max="120" :step="1" />
                  </div>

                  <!-- 杯型 -->
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <Icon icon="lucide:heart" class="h-3 w-3" />
                      <span>杯型</span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="opt in cupOptions"
                        :key="opt.value"
                        @click="selectedCup = opt.value"
                        class="px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer"
                        :class="selectedCup === opt.value
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </Transition>
        </div>
      </template>

      <!-- 列表内容 -->
      <div class="grid grid-cols-1 gap-3">
        <div 
          v-for="item in results" 
          :key="item.id"
          @click="goToDetail(item.id)"
          class="group relative flex items-start p-3 rounded-xl border border-neutral-100 bg-white shadow-xs active:scale-[0.99] transition-all cursor-pointer hover:border-neutral-200 hover:shadow-sm overflow-hidden"
        >
          <!-- Avatar/Image -->
          <div class="shrink-0 w-16 h-20 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-100 mr-3 relative">
            <ion-img
              v-if="item.image?.url"
              :key="`char-img-${item.id}-${imageLoader.getRetryCount(`char-${item.id}`)}`"
              :src="item.image.url"
              class="w-full h-full object-cover transition-opacity duration-500"
              :class="{ 'opacity-0': !imageLoader.isSuccess(`char-${item.id}`) }"
              @ionImgDidLoad="imageLoader.onLoad(`char-${item.id}`)"
              @ionError="imageLoader.onError(`char-${item.id}`)"
            />
            <ion-spinner
              v-if="item.image?.url && imageLoader.isLoading(`char-${item.id}`)"
              name="crescent"
              class="absolute inset-0 m-auto z-10 text-neutral-400"
              style="width: 20px; height: 20px;"
            />
            <div
              v-if="item.image?.url && imageLoader.isError(`char-${item.id}`)"
              @click.stop="imageLoader.retry(`char-${item.id}`)"
              class="absolute inset-0 flex items-center justify-center bg-neutral-50 z-10 cursor-pointer"
            >
              <Icon icon="lucide:refresh-cw" class="h-4 w-4 text-neutral-400" />
            </div>
            <div v-if="!item.image?.url" class="w-full h-full flex items-center justify-center">
              <Icon icon="lucide:user" class="h-6 w-6 text-neutral-200" />
            </div>
          </div>

          <div class="flex-1 min-w-0 py-0.5">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-sm text-neutral-900 truncate">
                {{ item.name }}
              </h3>
              <div 
                v-if="getSexIcon(item.sex)" 
                class="shrink-0 inline-flex items-center rounded-md px-1 py-0.5 border"
                :class="getSexClass(item.sex)"
              >
                <Icon :icon="getSexIcon(item.sex)" class="h-2.5 w-2.5" />
              </div>
            </div>
            
            <p v-if="item.original" class="text-[10px] text-neutral-400 truncate mt-0.5 font-medium">
              {{ item.original }}
            </p>

            <!-- Attributes -->
            <div class="flex flex-wrap gap-1.5 mt-2">
              <span v-if="item.age" class="inline-flex items-center rounded-full bg-neutral-50 px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 border border-neutral-100">
                Age: {{ item.age }}
              </span>
              <span v-if="item.birthday" class="inline-flex items-center rounded-full bg-neutral-50 px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 border border-neutral-100 uppercase">
                BD: {{ item.birthday[1] }}/{{ item.birthday[0] }}
              </span>
              <span v-if="item.blood_type" class="inline-flex items-center rounded-full bg-neutral-50 px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 border border-neutral-100 uppercase">
                {{ item.blood_type }}
              </span>
              <span v-if="item.height" class="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-500 border border-blue-100">
                {{ item.height }}cm
              </span>
              <span v-if="item.weight" class="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-500 border border-green-100">
                {{ item.weight }}kg
              </span>
              <span v-if="item.bust" class="inline-flex items-center rounded-full bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-500 border border-purple-100">
                {{ item.bust }}cm
              </span>
              <span v-if="item.cup" class="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-100 uppercase">
                {{ item.cup }}
              </span>
            </div>
            
            <div v-if="item.description" class="mt-2 line-clamp-1">
              <p class="text-[11px] text-neutral-500 italic">
                {{ item.description.replace(/\[\/?\w+.*?\]/g, '') }}
              </p>
            </div>
          </div>
          
          <div class="self-center ml-2 shrink-0">
            <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
          </div>
        </div>
      </div>

      <!-- 触底加载哨兵 -->
      <div 
        ref="sentinel" 
        class="py-12 flex flex-col items-center justify-center min-h-[100px]"
      >
        <div v-if="isLoading && results.length > 0" class="flex flex-col items-center gap-2">
          <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-400" />
          <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{{ t('common.loading') }}</span>
        </div>
        <div v-else-if="!hasMore && results.length > 0" class="text-[10px] text-neutral-300 font-bold uppercase tracking-widest">
          —— {{ t('list.all_loaded', 'All Loaded') }} ——
        </div>
        <div v-else class="h-1 w-full opacity-0"></div>
      </div>

      <!-- 无搜索结果 -->
      <div v-if="results.length === 0 && !isLoading && query" class="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-3">
        <Icon icon="lucide:search-x" class="h-10 w-10 text-neutral-200" />
        <p class="text-sm">未找到相关角色</p>
      </div>

      <!-- 初始加载动画 -->
      <div v-if="isLoading && results.length === 0" class="flex justify-center py-20">
        <Icon icon="eos-icons:loading" class="h-8 w-8 text-neutral-200" />
      </div>
    </SearchBase>

    <!-- 特征选择弹窗 -->
    <TraitFilterModal
      :show="showTraitModal"
      :selected-traits="selectedTraits"
      @close="showTraitModal = false"
      @confirm="handleTraitModalConfirm"
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
  max-height: 600px;
}
</style>
