<script setup>
defineOptions({ name: 'CharacterSearch' })

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SearchBase from '@/components/SearchBase.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import TraitChip from '@/components/TraitChip.vue'
import TraitFilterModal from '@/components/TraitFilterModal.vue'
import { getCharacterList } from '@/api/vndb'
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
}

// 清除所有筛选
function clearAllFilters() {
  selectedTraits.value = []
  selectedSex.value = 'all'
  selectedBloodType.value = 'all'
  selectedRole.value = 'all'
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

    // URL 参数中的 birthday
    const birthdayFilter = getBirthdayFilter()
    if (birthdayFilter) {
      filters.push(['birthday', '=', birthdayFilter])
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
}

function handleRefresh() {
  fetchData(query.value, true)
}

onMounted(() => {
  const savedId = route.query.savedId
  if (savedId) {
    const saved = getById(savedId)
    if (saved && saved.filters) {
      applyFilters(saved.filters)
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

watch(
  () => route.query.trait,
  (newTrait) => {
    if (newTrait) {
      selectedTraits.value = [{ id: newTrait, name: newTrait, category: '', vn_count: 0 }]
    }
    fetchData(query.value, true)
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
      :filters="{ query, selectedTraits, selectedSex, selectedBloodType, selectedRole }"
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

          <!-- 高级筛选面板 -->
          <Transition name="panel">
            <div v-if="showAdvancedFilters" class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
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
              @click="imageLoader.retry(`char-${item.id}`)"
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
  max-height: 200px;
}
</style>
