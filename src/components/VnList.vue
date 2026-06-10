<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import BaseSelect from './BaseSelect.vue'
import { usePrivacy, getImageNsfwLevel } from '@/composables/usePrivacy'

const { getCardAction } = usePrivacy()

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  // 外部传入的布局键名，用于 localStorage
  storageKey: {
    type: String,
    default: 'vndb_list_layout'
  },
  // 当前排序字段
  sortBy: {
    type: String,
    default: 'lastmod'
  },
  // 是否倒序
  reverse: {
    type: Boolean,
    default: true
  },
  // 是否显示排序控制栏
  showSort: {
    type: Boolean,
    default: true
  },
  // 默认布局：'list', 'waterfall', 'compact'；'text' 作为纯文本布局的语义化别名
  defaultLayout: {
    type: String,
    default: 'list'
  },
  // 强制使用的布局 (如果提供，将隐藏切换按钮并始终使用此布局)
  forceLayout: {
    type: String,
    default: null
  },
  // 自定义排序选项
  customSortOptions: {
    type: Array,
    default: null
  },
  // 卡片模式下是否使用紧凑高度
  compact: {
    type: Boolean,
    default: false
  },
  // 是否显示底部加载/已加载全部状态
  showFooterStatus: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['loadMore', 'sortChange', 'reverseChange'])

const router = useRouter()
const { t } = useI18n()

// 布局状态：'list', 'waterfall', 'compact'；'text' 会规范化为 'compact'
const normalizeLayout = (layout) => {
  if (layout === 'text') return 'compact'
  return ['list', 'waterfall', 'compact'].includes(layout) ? layout : 'list'
}

const savedLayout = localStorage.getItem(props.storageKey)
const layoutMode = ref(normalizeLayout(props.forceLayout || savedLayout || props.defaultLayout))

// 切换布局模式并保存偏好
function toggleLayout(mode) {
  if (props.forceLayout) return
  const normalizedMode = normalizeLayout(mode)
  layoutMode.value = normalizedMode
  localStorage.setItem(props.storageKey, normalizedMode)
}

// 隐私过滤
const filteredItems = computed(() => {
  return props.items.filter(item => {
    const action = getCardAction('vn', getImageNsfwLevel(getImage(item)))
    return action !== 'hide'
  })
})

function getItemAction(item) {
  return getCardAction('vn', getImageNsfwLevel(getImage(item)))
}

function shouldBlurCover(item) {
  const action = getItemAction(item)
  return action === 'blur' || action === 'blur_card'
}

function shouldBlurCard(item) {
  return getItemAction(item) === 'blur_card'
}

function isIconPlaceholder(item) {
  return shouldBlurCover(item) && !shouldBlurCard(item)
}

// 瀑布流双列分配
const waterfallColumns = computed(() => {
  const leftCol = []
  const rightCol = []
  filteredItems.value.forEach((item, index) => {
    if (index % 2 === 0) {
      leftCol.push(item)
    } else {
      rightCol.push(item)
    }
  })
  return { leftCol, rightCol }
})

// 处理评分显示
function formatRating(val) {
  if (!val) return null
  return (val / 10).toFixed(1)
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 统一项点击处理
function handleItemClick(item) {
  const id = item.vn?.id || item.id
  if (id) {
    router.push(`/vn/${id}`)
  }
}

// 统一属性获取
function getTitle(item) {
  const vn = item.vn || item
  if (!vn) return ''

  // 1. 如果有 titles 数组，根据优先级查找
  if (vn.titles && vn.titles.length > 0) {
    const priority = JSON.parse(localStorage.getItem('vndb_title_lang_priority') || '["zh-Hans", "zh-Hant", "ja", "en"]')
    for (const lang of priority) {
      const match = vn.titles.find(t => t.lang === lang)
      if (match) {
        return match.title
      }
    }
  }

  // 2. 兜底逻辑
  return vn.title || vn.alttitle || ''
}

function getAltTitle(item) {
  const vn = item.vn || item
  if (!vn) return ''

  const mainTitle = getTitle(item)
  
  // 如果显示的是 alttitle 或 latin，则尝试寻找原始标题作为副标题
  if (vn.alttitle && vn.alttitle !== mainTitle) return vn.alttitle
  if (vn.title && vn.title !== mainTitle) return vn.title
  
  return ''
}

function getImage(item) { return item.vn?.image || item.image || null }
function getReleased(item) { return item.vn?.released || item.released || '' }
function getOlang(item) { return item.vn?.olang || item.olang || '' }
function getRating(item) { return item.vn?.rating || item.rating || null }
function getUserVote(item) { return item.vote || null }
function getBadge(item) {
  return item.role || item.relation || null
}

const translateBadge = (val) => {
  if (!val) return null
  // 尝试翻译 role 或 relation
  return t(`metadata.role.${val.toLowerCase()}`, val) !== val.toLowerCase()
    ? t(`metadata.role.${val.toLowerCase()}`)
    : (t(`metadata.relation.${val.toLowerCase()}`, val) !== val.toLowerCase()
        ? t(`metadata.relation.${val.toLowerCase()}`)
        : val)
}

// 触底加载逻辑
const sentinel = ref(null)
let observer = null

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && props.hasMore && !props.isLoading) {
      emit('loadMore')
    }
  }, {
    rootMargin: '400px' // 增加缓冲区
  })

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// 自定义排序下拉菜单逻辑
const defaultSortOptions = [
  { value: 'lastmod', label: 'list.sort.lastmod' },
  { value: 'added', label: 'list.sort.added' },
  { value: 'started', label: 'list.sort.started' },
  { value: 'finished', label: 'list.sort.finished' },
  { value: 'vote', label: 'list.sort.vote' },
  { value: 'title', label: 'list.sort.title' }
]

const sortOptions = computed(() => props.customSortOptions || defaultSortOptions)

function handleSortSelect(value) {
  emit('sortChange', value)
}

function toggleReverse() {
  emit('reverseChange', !props.reverse)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 工具栏 -->
    <div v-if="!forceLayout || showSort" class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 px-1">
      <!-- 左侧：排序 -->
      <div v-if="showSort" class="flex items-center gap-1">
        <BaseSelect
          :model-value="sortBy"
          :options="sortOptions"
          :label-renderer="(l) => t(l)"
          @update:model-value="handleSortSelect"
        >
          <template #prefix>
            <Icon icon="lucide:arrow-down-narrow-wide" class="h-3.5 w-3.5 text-neutral-400" />
          </template>
        </BaseSelect>

        <button
          @click="toggleReverse"
          class="p-1 rounded-md hover:bg-neutral-100 transition text-neutral-400 hover:text-neutral-900 cursor-pointer"
          :title="reverse ? t('list.descending', '降序') : t('list.ascending', '升序')"
        >
          <Icon :icon="reverse ? 'lucide:sort-desc' : 'lucide:sort-asc'" class="h-4 w-4" />
        </button>
      </div>
      <div v-else></div>

      <!-- 右侧：布局切换 -->
      <div v-if="!forceLayout" class="flex items-center gap-1 shrink-0">
        <button
          @click="toggleLayout('list')"
          class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
          :class="layoutMode === 'list' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
          :title="t('list.list_view')"
        >
          <Icon icon="lucide:menu" class="h-4 w-4" />
        </button>
        <button
          @click="toggleLayout('waterfall')"
          class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
          :class="layoutMode === 'waterfall' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
          :title="t('list.grid_view')"
        >
          <Icon icon="lucide:layout-grid" class="h-4 w-4" />
        </button>
        <button
          @click="toggleLayout('compact')"
          class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
          :class="layoutMode === 'compact' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
          :title="t('list.compact_view')"
        >
          <Icon icon="lucide:list" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- 列表容器 -->
    <div class="px-0.5">
      <!-- 1. 列表布局 -->
      <div v-if="filteredItems.length > 0 && layoutMode === 'list'" class="grid grid-cols-1 gap-3.5">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="relative flex items-start gap-3 rounded-xl border border-neutral-200 bg-white shadow-xs hover:border-neutral-300 transition cursor-pointer overflow-hidden"
          :class="[compact ? 'p-2.5' : 'p-4']"
          @click="handleItemClick(item)"
        >
          <div
            class="rounded-lg bg-neutral-50 overflow-hidden border border-neutral-200 shrink-0"
            :class="[compact ? 'h-20 w-15' : 'h-28 w-21']"
          >
            <template v-if="isIconPlaceholder(item)">
              <div class="h-full w-full flex items-center justify-center bg-neutral-100">
                <Icon icon="lucide:eye-off" class="h-5 w-5 text-neutral-400" />
              </div>
            </template>
            <template v-else>
              <img
                v-if="getImage(item)?.thumbnail || getImage(item)?.url"
                :src="getImage(item).thumbnail || getImage(item).url"
                alt="cover"
                class="h-full w-full object-cover"
                loading="lazy"
              />
              <div v-else class="h-full w-full flex items-center justify-center bg-neutral-50 text-neutral-300">
                <Icon icon="lucide:image" class="h-6 w-6" />
              </div>
            </template>
          </div>
          <!-- 整卡模糊遮罩 -->
          <div v-if="shouldBlurCard(item)" class="absolute inset-0 rounded-xl bg-white/50 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
            <Icon icon="lucide:eye-off" class="h-8 w-8 text-neutral-400" />
          </div>

          <div
            class="min-w-0 flex-1 flex flex-col justify-between py-0.5"
            :class="[compact ? 'h-20' : 'h-28']"
          >
            <div class="space-y-0.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <span class="text-sm font-semibold text-neutral-900 truncate">{{ getTitle(item) }}</span>
                    <span
                      v-if="getBadge(item)"
                      class="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      :class="[
                        getBadge(item) === 'main'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-neutral-100 text-neutral-500 border border-neutral-200/50'
                      ]"
                    >
                      {{ translateBadge(getBadge(item)) }}
                    </span>
                  </div>
                </div>
                <span v-if="item.lastmod" class="text-[10px] text-neutral-400 shrink-0 mt-0.5">{{ formatDate(item.lastmod) }}</span>
              </div>
              <span v-if="getAltTitle(item)" class="text-[10px] text-neutral-400 block truncate leading-none">
                {{ getAltTitle(item) }}
              </span>
            </div>

            <!-- 收藏列表专用标签 -->
            <div v-if="item.labels && item.labels.length > 0" class="overflow-x-auto pb-1 -mb-1 scroll-smooth no-scrollbar">
              <div class="flex gap-1.5 shrink-0 whitespace-nowrap">
                <div
                  v-for="lbl in item.labels"
                  :key="lbl.id"
                  class="inline-flex items-center gap-1 text-[10px] text-neutral-600 bg-neutral-100/80 px-2 py-0.5 rounded-md border border-neutral-200/50"
                >
                  <Icon icon="lucide:bookmark" class="h-3 w-3 text-neutral-400 shrink-0" />
                  <span>{{ lbl.label }}</span>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto pb-1 -mb-1 scroll-smooth no-scrollbar">
              <div class="flex gap-1.5 items-center shrink-0 whitespace-nowrap">
                <!-- 评分显示 -->
                <span
                  v-if="getUserVote(item)"
                  class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-amber-50 text-amber-700 border-amber-100"
                  :title="t('vn.rating')"
                >
                  <Icon icon="lucide:star" class="h-3 w-3 fill-amber-500 stroke-amber-500" />
                  {{ formatRating(getUserVote(item)) }}
                </span>
                <span
                  v-else-if="getRating(item)"
                  class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-neutral-50 text-neutral-600 border-neutral-200"
                >
                  <Icon icon="lucide:star" class="h-3 w-3 fill-neutral-400 stroke-neutral-400" />
                  {{ formatRating(getRating(item)) }}
                </span>

                <span v-if="getOlang(item)" class="text-[10px] rounded-full px-1.5 py-0.5 border border-neutral-200 bg-neutral-50 text-neutral-500 font-medium">
                  {{ t(`metadata.lang.${getOlang(item)}`, getOlang(item)) }}
                </span>
                <span v-if="getReleased(item)" class="text-[10px] text-neutral-400 font-medium">
                  {{ getReleased(item) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 双列瀑布流布局 -->
      <div v-else-if="filteredItems.length > 0 && layoutMode === 'waterfall'" class="grid grid-cols-2 gap-3.5 items-start">
        <div class="flex flex-col gap-3.5">
          <div
            v-for="item in waterfallColumns.leftCol"
            :key="item.id"
            class="relative rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition cursor-pointer"
            @click="handleItemClick(item)"
          >
            <div class="relative">
              <template v-if="isIconPlaceholder(item)">
                <div class="w-full h-32 flex items-center justify-center bg-neutral-100 border-b border-neutral-100">
                  <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-400" />
                </div>
              </template>
              <template v-else>
                <img
                  v-if="getImage(item)?.url"
                  :src="getImage(item).url"
                  alt="cover"
                  class="w-full h-auto object-cover max-h-72 border-b border-neutral-100"
                  loading="lazy"
                />
                <div v-else class="w-full h-32 flex items-center justify-center bg-neutral-50 text-neutral-300 border-b border-neutral-100">
                  <Icon icon="lucide:image" class="h-6 w-6" />
                </div>
              </template>
              <!-- 瀑布流中的评分浮层 (可选) -->
              <div v-if="!shouldBlurCard(item) && (getRating(item) || getUserVote(item))" class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-0.5">
                <Icon icon="lucide:star" class="h-2.5 w-2.5 fill-yellow-400 stroke-yellow-400" />
                {{ formatRating(getUserVote(item) || getRating(item)) }}
              </div>
            </div>
            <div class="p-3 space-y-1.5">
              <span class="text-xs font-semibold text-neutral-900 block line-clamp-2 leading-tight">{{ getTitle(item) }}</span>
              <div v-if="getBadge(item)" class="flex">
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  :class="[
                    getBadge(item) === 'main'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-neutral-100 text-neutral-500 border border-neutral-200/50'
                  ]"
                >
                  {{ translateBadge(getBadge(item)) }}
                </span>
              </div>
            </div>
            <!-- 整卡模糊遮罩 (左列) -->
            <div v-if="shouldBlurCard(item)" class="absolute inset-0 rounded-xl bg-white/50 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
              <Icon icon="lucide:eye-off" class="h-8 w-8 text-neutral-400" />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3.5">
          <div
            v-for="item in waterfallColumns.rightCol"
            :key="item.id"
            class="relative rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition cursor-pointer"
            @click="handleItemClick(item)"
          >
            <div class="relative">
              <template v-if="isIconPlaceholder(item)">
                <div class="w-full h-32 flex items-center justify-center bg-neutral-100 border-b border-neutral-100">
                  <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-400" />
                </div>
              </template>
              <template v-else>
                <img
                  v-if="getImage(item)?.url"
                  :src="getImage(item).url"
                  alt="cover"
                  class="w-full h-auto object-cover max-h-72 border-b border-neutral-100"
                  loading="lazy"
                />
                <div v-else class="w-full h-32 flex items-center justify-center bg-neutral-50 text-neutral-300 border-b border-neutral-100">
                  <Icon icon="lucide:image" class="h-6 w-6" />
                </div>
              </template>
              <div v-if="!shouldBlurCard(item) && (getRating(item) || getUserVote(item))" class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-0.5">
                <Icon icon="lucide:star" class="h-2.5 w-2.5 fill-yellow-400 stroke-yellow-400" />
                {{ formatRating(getUserVote(item) || getRating(item)) }}
              </div>
            </div>
            <div class="p-3 space-y-1.5">
              <span class="text-xs font-semibold text-neutral-900 block line-clamp-2 leading-tight">{{ getTitle(item) }}</span>
              <div v-if="getBadge(item)" class="flex">
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  :class="[
                    getBadge(item) === 'main'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-neutral-100 text-neutral-500 border border-neutral-200/50'
                  ]"
                >
                  {{ translateBadge(getBadge(item)) }}
                </span>
              </div>
              <!-- 整卡模糊遮罩 (右列) -->
              <div v-if="shouldBlurCard(item)" class="absolute inset-0 rounded-xl bg-white/50 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
                <Icon icon="lucide:eye-off" class="h-8 w-8 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 纯标题文本布局 -->
      <div v-else-if="filteredItems.length > 0 && layoutMode === 'compact'" class="divide-y divide-neutral-100 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="px-4 py-3 hover:bg-neutral-50 transition cursor-pointer flex items-center justify-between gap-4"
          @click="handleItemClick(item)"
        >
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="text-sm font-medium text-neutral-900 truncate">{{ getTitle(item) }}</span>
              <span
                v-if="getBadge(item)"
                class="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 scale-90 origin-left"
                :class="[
                  getBadge(item) === 'main'
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-neutral-100 text-neutral-500 border border-neutral-200/50'
                ]"
              >
                {{ translateBadge(getBadge(item)) }}
              </span>
            </div>
            <span v-if="getAltTitle(item)" class="text-[11px] text-neutral-400 truncate">{{ getAltTitle(item) }}</span>
          </div>
          <div v-if="getRating(item) || getUserVote(item)" class="flex items-center gap-1 shrink-0">
            <Icon icon="lucide:star" class="h-3 w-3 text-neutral-300 fill-neutral-300" />
            <span class="text-xs font-medium text-neutral-500">{{ formatRating(getUserVote(item) || getRating(item)) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中状态 (列表为空时) -->
    <div v-if="items.length === 0 && isLoading" class="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-xs space-y-3">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-50 border border-neutral-100">
        <Icon icon="eos-icons:loading" class="h-5 w-5 text-neutral-400" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-800">{{ t('common.loading') }}</h3>
        <p class="text-xs text-neutral-400 max-w-xs mx-auto">
          {{ t('list.fetching_data', '正在努力加载内容...') }}
        </p>
      </div>
    </div>

    <!-- 触底加载哨兵 & 状态 -->
    <div ref="sentinel" class="py-6 flex justify-center" v-show="filteredItems.length > 0">
      <template v-if="showFooterStatus">
        <div v-if="isLoading" class="flex items-center gap-2 text-xs text-neutral-400">
          <Icon icon="eos-icons:loading" class="h-4 w-4" />
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-else-if="!hasMore && items.length > 0" class="text-[10px] text-neutral-300 font-medium">
          —— {{ t('list.all_loaded', '已加载全部') }} ——
        </div>
      </template>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0 && !isLoading" class="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-xs space-y-3">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-50 border border-neutral-100">
        <Icon icon="lucide:file" class="h-5 w-5 text-neutral-400" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-800">{{ t('list.empty_title') }}</h3>
        <p class="text-xs text-neutral-400 max-w-xs mx-auto">
          {{ t('list.empty_desc') }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
