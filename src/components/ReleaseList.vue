<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import BaseSelect from './BaseSelect.vue'
import { IonImg, IonSpinner } from '@ionic/vue'
import { usePrivacy, getImageNsfwLevel } from '@/composables/usePrivacy'
import { useImageLoader } from '@/composables/useImageLoader'

const { getCardAction } = usePrivacy()
const imageLoader = useImageLoader()

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
  storageKey: {
    type: String,
    default: 'vndb_release_list_layout'
  },
  sortBy: {
    type: String,
    default: 'released'
  },
  reverse: {
    type: Boolean,
    default: true
  },
  showSort: {
    type: Boolean,
    default: true
  },
  defaultLayout: {
    type: String,
    default: 'list'
  },
  // 强制使用的布局 (如果提供，将隐藏切换按钮并始终使用此布局)
  forceLayout: {
    type: String,
    default: null
  },
  // 卡片模式下是否使用紧凑高度 (仅代码控制，无 UI 切换)
  compact: {
    type: Boolean,
    default: false
  },
  customSortOptions: {
    type: Array,
    default: null
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

// ── 布局状态 ──
// 支持的布局值: 'list', 'list_compact', 'waterfall', 'text'
const normalizeLayout = (layout) => {
  if (layout === 'compact') return 'text' // 兼容旧值
  return ['list', 'list_compact', 'waterfall', 'text'].includes(layout) ? layout : 'list'
}

const savedLayout = localStorage.getItem(props.storageKey)
const layoutMode = ref(normalizeLayout(props.forceLayout || savedLayout || props.defaultLayout))

// 从 layoutMode 派生布局状态
const isList = computed(() => layoutMode.value.startsWith('list'))
const isWaterfall = computed(() => layoutMode.value === 'waterfall')
const isText = computed(() => layoutMode.value === 'text')

// 紧凑模式：优先使用 layoutMode 中的 _compact，否则使用 prop
const isCompact = computed(() => layoutMode.value === 'list_compact' || props.compact)

// 主布局切换 (list / waterfall / text)
function setMainLayout(mode) {
  if (props.forceLayout) return
  if (mode === 'list') {
    // 切换到 list 时，如果当前是 list_compact 则保持紧凑
    if (layoutMode.value !== 'list_compact') {
      layoutMode.value = 'list'
    }
  } else {
    layoutMode.value = mode
  }
  localStorage.setItem(props.storageKey, layoutMode.value)
}

// ── 数据处理 ──
function handleItemClick(item) {
  router.push(`/release/${item.id}`)
}

function getTitle(item) {
  return item.title || item.alttitle || ''
}

function getAltTitle(item) {
  if (item.alttitle && item.alttitle !== item.title) return item.alttitle
  return ''
}

function getImage(item) {
  if (!item) return null
  if (item.images && item.images.length > 0) {
    return item.images[0]
  }
  return null
}

function hasCover(item) {
  const img = getImage(item)
  return !!(img && (img.thumbnail || img.url))
}

// 获取关联 VN 名称
function getVnTitle(item) {
  if (item.vns && item.vns.length > 0) {
    const vn = item.vns[0]
    return vn.title || vn.alttitle || null
  }
  return null
}

// 格式化介质标签
function getMediumLabel(medium) {
  const map = {
    cd: 'CD', dvd: 'DVD', blr: 'Blu-ray', gdr: 'GD-ROM',
    flp: 'Floppy', msc: 'Cassette', mrt: 'Cartridge',
    in: 'Digital', otc: 'Other'
  }
  return map[medium] || medium
}

// ── 隐私过滤 ──
function getItemAction(item) {
  return getCardAction('release', getImageNsfwLevel(getImage(item)))
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

// 隐私过滤：过滤掉需要隐藏的项目
const filteredItems = computed(() => {
  return props.items.filter(item => {
    const action = getCardAction('release', getImageNsfwLevel(getImage(item)))
    return action !== 'hide'
  })
})

// ── 瀑布流双列分配 ──
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

// ── 排序 ──
const defaultSortOptions = [
  { value: 'released', label: 'vn.releases.date' },
  { value: 'title', label: 'list.sort.title' }
]

const sortOptions = computed(() => props.customSortOptions || defaultSortOptions)

function handleSortSelect(value) {
  emit('sortChange', value)
}

function toggleReverse() {
  emit('reverseChange', !props.reverse)
}

// ── 触底加载 ──
const sentinel = ref(null)
let observer = null

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && props.hasMore && !props.isLoading) {
      emit('loadMore')
    }
  }, { rootMargin: '400px' })

  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
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
          class="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
          :title="reverse ? t('list.descending', '降序') : t('list.ascending', '升序')"
        >
          <Icon :icon="reverse ? 'lucide:sort-desc' : 'lucide:sort-asc'" class="h-4 w-4" />
        </button>
      </div>
      <div v-else></div>

      <!-- 右侧：布局切换 -->
      <div v-if="!forceLayout" class="flex items-center gap-1 shrink-0">
        <button
          @click="setMainLayout('list')"
          class="p-1 rounded transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 cursor-pointer"
          :class="isList ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500'"
          :title="t('list.list_view')"
        >
          <Icon icon="lucide:menu" class="h-4 w-4" />
        </button>
        <button
          @click="setMainLayout('waterfall')"
          class="p-1 rounded transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 cursor-pointer"
          :class="isWaterfall ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500'"
          :title="t('list.grid_view')"
        >
          <Icon icon="lucide:layout-grid" class="h-4 w-4" />
        </button>
        <button
          @click="setMainLayout('text')"
          class="p-1 rounded transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 cursor-pointer"
          :class="isText ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800' : 'text-neutral-400 dark:text-neutral-500'"
          :title="t('list.compact_view')"
        >
          <Icon icon="lucide:list" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- 列表容器 -->
    <div class="px-0.5">

      <!-- ═══════════ 1. 卡片布局 (list) ═══════════ -->
      <div v-if="filteredItems.length > 0 && isList" class="grid grid-cols-1 gap-3">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition cursor-pointer overflow-hidden"
          :class="isCompact ? 'p-2' : 'p-3'"
          @click="handleItemClick(item)"
        >
          <div class="flex items-start gap-3">

            <!-- 封面 -->
            <div
              class="rounded-lg bg-neutral-50 dark:bg-neutral-800 overflow-hidden border border-neutral-100 dark:border-neutral-700 shrink-0"
              :class="isCompact ? 'h-16 w-12' : 'h-24 w-18'"
            >
              <template v-if="isIconPlaceholder(item)">
                <div class="h-full w-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-700">
                  <Icon icon="lucide:eye-off" class="h-5 w-5 text-neutral-400" />
                </div>
              </template>
              <template v-else>
                <div class="relative h-full w-full">
                  <ion-img
                    v-if="hasCover(item)"
                    :key="`list-${item.id}-${imageLoader.getRetryCount('list-' + item.id)}`"
                    :src="getImage(item).thumbnail || getImage(item).url"
                    alt="cover"
                    class="h-full w-full object-cover transition-opacity duration-500"
                    :class="{ 'opacity-0': !imageLoader.isSuccess('list-' + item.id) }"
                    @ionImgDidLoad="imageLoader.onLoad('list-' + item.id)"
                    @ionError="imageLoader.onError('list-' + item.id)"
                  />
                  <div v-else class="h-full w-full flex items-center justify-center text-neutral-200 dark:text-neutral-600">
                    <Icon icon="lucide:package" :class="isCompact ? 'h-4 w-4' : 'h-6 w-6'" />
                  </div>
                  <div v-if="imageLoader.isLoading('list-' + item.id) && !imageLoader.isError('list-' + item.id)" class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                    <ion-spinner name="crescent" class="h-5 w-5 text-neutral-400" />
                  </div>
                  <button
                    v-if="imageLoader.isError('list-' + item.id)"
                    class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                    @click.stop="imageLoader.retry('list-' + item.id)"
                  >
                    <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400" />
                  </button>
                </div>
              </template>
            </div>

            <!-- 内容区域 -->
            <div
              class="min-w-0 flex-1 flex flex-col justify-between"
              :class="isCompact ? 'h-16 py-0.5' : 'h-24 py-0.5'"
            >
              <!-- 标题区 -->
              <div class="space-y-0.5">
                <div class="flex items-start justify-between gap-2">
                  <h3
                    class="font-semibold text-neutral-900 dark:text-neutral-100 truncate"
                    :class="isCompact ? 'text-xs' : 'text-sm'"
                  >{{ getTitle(item) }}</h3>
                  <span
                    class="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                    :class="[
                      isCompact ? 'scale-90 origin-right' : '',
                      item.official
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50'
                    ]"
                  >
                    {{ item.official ? t('vn.releases.official') : t('vn.releases.unofficial') }}
                  </span>
                </div>
                <p
                  v-if="getAltTitle(item) && !isCompact"
                  class="text-[10px] text-neutral-400 dark:text-neutral-500 truncate"
                >{{ getAltTitle(item) }}</p>
                <!-- 关联 VN 名称 -->
                <p
                  v-if="!isCompact && getVnTitle(item)"
                  class="text-[10px] text-neutral-400 dark:text-neutral-500 truncate"
                >
                  <Icon icon="lucide:link" class="h-2.5 w-2.5 inline-block mr-0.5 -mt-px" />
                  {{ getVnTitle(item) }}
                </p>
              </div>

              <!-- 标签行 -->
              <div v-if="!isCompact" class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="lang in item.languages"
                  :key="lang.lang"
                  class="text-[9px] px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                >{{ t(`metadata.lang.${lang.lang}`, lang.lang) }}</span>
                <span
                  v-if="item.patch"
                  class="text-[9px] px-1 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50"
                >{{ t('release.patch') }}</span>
                <template v-if="item.medium && item.medium.length > 0">
                  <span
                    v-for="m in item.medium.slice(0, 3)"
                    :key="m"
                    class="text-[9px] px-1 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-100 dark:border-neutral-700"
                  >{{ getMediumLabel(m) }}</span>
                </template>
              </div>

              <!-- 底部信息 -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span
                    v-if="item.released"
                    class="text-neutral-500 dark:text-neutral-400 font-medium truncate shrink-0"
                    :class="isCompact ? 'text-[9px]' : 'text-[10px]'"
                  >{{ item.released }}</span>
                  <span
                    v-if="item.minage === 0"
                    class="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold shrink-0"
                    :class="isCompact ? 'text-[8px] scale-90 origin-left' : 'text-[9px]'"
                  >{{ t('release.all_ages') }}</span>
                  <span
                    v-if="item.voiced && item.voiced > 0 && !isCompact"
                    class="text-[9px] text-neutral-400 dark:text-neutral-500 shrink-0"
                  >
                    <Icon icon="lucide:mic" class="h-2.5 w-2.5 inline-block -mt-px" />
                  </span>
                </div>
                <div class="flex gap-1 shrink-0">
                  <Icon
                    v-for="plat in (isCompact ? item.platforms?.slice(0, 3) : item.platforms)"
                    :key="plat"
                    :icon="`simple-icons:${plat}`"
                    :title="t(`metadata.platform.${plat}`, plat)"
                    :class="isCompact ? 'h-2.5 w-2.5 text-neutral-300 dark:text-neutral-600' : 'h-3 w-3 text-neutral-400 dark:text-neutral-500'"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 整卡模糊遮罩 -->
          <div v-if="shouldBlurCard(item)" class="absolute inset-0 rounded-xl bg-white/50 dark:bg-neutral-900/70 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
            <Icon icon="lucide:eye-off" class="h-8 w-8 text-neutral-400" />
          </div>
        </div>
      </div>

      <!-- ═══════════ 2. 瀑布流布局 (waterfall) ═══════════ -->
      <div v-else-if="filteredItems.length > 0 && isWaterfall" class="grid grid-cols-2 gap-3 items-start">
        <div class="flex flex-col gap-3">
          <div
            v-for="item in waterfallColumns.leftCol"
            :key="item.id"
            class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition cursor-pointer"
            @click="handleItemClick(item)"
          >
            <div class="relative">
              <!-- 固定纵向 3:2 封面占位 -->
              <div class="w-full relative" style="padding-top: 150%;">
                <template v-if="isIconPlaceholder(item)">
                  <div class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800">
                    <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                  </div>
                </template>
                <template v-else>
                  <div class="absolute inset-0">
                    <ion-img
                      v-if="hasCover(item)"
                      :key="`card-${item.id}-${imageLoader.getRetryCount('card-' + item.id)}`"
                      :src="getImage(item).thumbnail || getImage(item).url"
                      alt="cover"
                      class="absolute inset-0 w-full h-full object-cover border-b border-neutral-100 dark:border-neutral-800 transition-opacity duration-500"
                      :class="{ 'opacity-0': !imageLoader.isSuccess('card-' + item.id) }"
                      @ionImgDidLoad="imageLoader.onLoad('card-' + item.id)"
                      @ionError="imageLoader.onError('card-' + item.id)"
                    />
                    <div v-else class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 text-neutral-200 dark:text-neutral-600 border-b border-neutral-100 dark:border-neutral-800">
                      <Icon icon="lucide:package" class="h-10 w-10" />
                    </div>
                    <div v-if="imageLoader.isLoading('card-' + item.id) && !imageLoader.isError('card-' + item.id)" class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                      <ion-spinner name="crescent" class="h-5 w-5 text-neutral-400" />
                    </div>
                    <button
                      v-if="imageLoader.isError('card-' + item.id)"
                      class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                      @click.stop="imageLoader.retry('card-' + item.id)"
                    >
                      <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400" />
                    </button>
                  </div>
                </template>
                <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  :class="item.official ? 'bg-blue-600 text-white' : 'bg-neutral-600 text-white'"
                >
                  {{ item.official ? t('vn.releases.official') : t('vn.releases.unofficial') }}
                </div>
              </div>
            </div>
            <div class="p-2.5 space-y-1.5">
              <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block line-clamp-2 leading-tight">{{ getTitle(item) }}</span>
              <p v-if="getAltTitle(item)" class="text-[10px] text-neutral-400 dark:text-neutral-500 line-clamp-1 leading-tight">{{ getAltTitle(item) }}</p>
              <p v-if="getVnTitle(item)" class="text-[10px] text-neutral-400 dark:text-neutral-500 line-clamp-1 leading-tight">
                <Icon icon="lucide:link" class="h-2.5 w-2.5 inline-block mr-0.5 -mt-px" />
                {{ getVnTitle(item) }}
              </p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="lang in item.languages.slice(0, 3)"
                  :key="lang.lang"
                  class="text-[9px] px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                >{{ t(`metadata.lang.${lang.lang}`, lang.lang) }}</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
                <div class="flex items-center gap-1 min-w-0">
                  <span v-if="item.released" class="truncate">{{ item.released }}</span>
                  <span v-if="item.minage === 0" class="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 scale-90 origin-left font-bold">
                    {{ t('release.all_ages') }}
                  </span>
                </div>
                <div class="flex gap-1 shrink-0">
                  <Icon
                    v-for="plat in (item.platforms?.slice(0, 4))"
                    :key="plat"
                    :icon="`simple-icons:${plat}`"
                    :title="t(`metadata.platform.${plat}`, plat)"
                    class="h-2.5 w-2.5 text-neutral-300 dark:text-neutral-600"
                  />
                </div>
              </div>
            </div>
            <!-- 整卡模糊遮罩 -->
            <div v-if="shouldBlurCard(item)" class="absolute inset-0 rounded-xl bg-white/50 dark:bg-neutral-900/70 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
              <Icon icon="lucide:eye-off" class="h-8 w-8 text-neutral-400" />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <div
            v-for="item in waterfallColumns.rightCol"
            :key="item.id"
            class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs hover:border-neutral-300 dark:hover:border-neutral-600 transition cursor-pointer"
            @click="handleItemClick(item)"
          >
            <div class="relative">
              <div class="w-full relative" style="padding-top: 150%;">
                <template v-if="isIconPlaceholder(item)">
                  <div class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800">
                    <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                  </div>
                </template>
                <template v-else>
                  <div class="absolute inset-0">
                    <ion-img
                      v-if="hasCover(item)"
                      :key="`mag-${item.id}-${imageLoader.getRetryCount('mag-' + item.id)}`"
                      :src="getImage(item).thumbnail || getImage(item).url"
                      alt="cover"
                      class="absolute inset-0 w-full h-full object-cover border-b border-neutral-100 dark:border-neutral-800 transition-opacity duration-500"
                      :class="{ 'opacity-0': !imageLoader.isSuccess('mag-' + item.id) }"
                      @ionImgDidLoad="imageLoader.onLoad('mag-' + item.id)"
                      @ionError="imageLoader.onError('mag-' + item.id)"
                    />
                    <div v-else class="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 text-neutral-200 dark:text-neutral-600 border-b border-neutral-100 dark:border-neutral-800">
                      <Icon icon="lucide:package" class="h-10 w-10" />
                    </div>
                    <div v-if="imageLoader.isLoading('mag-' + item.id) && !imageLoader.isError('mag-' + item.id)" class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                      <ion-spinner name="crescent" class="h-5 w-5 text-neutral-400" />
                    </div>
                    <button
                      v-if="imageLoader.isError('mag-' + item.id)"
                      class="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                      @click.stop="imageLoader.retry('mag-' + item.id)"
                    >
                      <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400" />
                    </button>
                  </div>
                </template>
                <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
                  :class="item.official ? 'bg-blue-600 text-white' : 'bg-neutral-600 text-white'"
                >
                  {{ item.official ? t('vn.releases.official') : t('vn.releases.unofficial') }}
                </div>
              </div>
            </div>
            <div class="p-2.5 space-y-1.5">
              <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block line-clamp-2 leading-tight">{{ getTitle(item) }}</span>
              <p v-if="getAltTitle(item)" class="text-[10px] text-neutral-400 dark:text-neutral-500 line-clamp-1 leading-tight">{{ getAltTitle(item) }}</p>
              <p v-if="getVnTitle(item)" class="text-[10px] text-neutral-400 dark:text-neutral-500 line-clamp-1 leading-tight">
                <Icon icon="lucide:link" class="h-2.5 w-2.5 inline-block mr-0.5 -mt-px" />
                {{ getVnTitle(item) }}
              </p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="lang in item.languages.slice(0, 3)"
                  :key="lang.lang"
                  class="text-[9px] px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                >{{ t(`metadata.lang.${lang.lang}`, lang.lang) }}</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
                <div class="flex items-center gap-1 min-w-0">
                  <span v-if="item.released" class="truncate">{{ item.released }}</span>
                  <span v-if="item.minage === 0" class="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 scale-90 origin-left font-bold">
                    {{ t('release.all_ages') }}
                  </span>
                </div>
                <div class="flex gap-1 shrink-0">
                  <Icon
                    v-for="plat in (item.platforms?.slice(0, 4))"
                    :key="plat"
                    :icon="`simple-icons:${plat}`"
                    :title="t(`metadata.platform.${plat}`, plat)"
                    class="h-2.5 w-2.5 text-neutral-300 dark:text-neutral-600"
                  />
                </div>
              </div>
            </div>
            <div v-if="shouldBlurCard(item)" class="absolute inset-0 rounded-xl bg-white/50 dark:bg-neutral-900/70 backdrop-blur-md flex items-center justify-center z-10 pointer-events-none">
              <Icon icon="lucide:eye-off" class="h-8 w-8 text-neutral-400" />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ 3. 文本布局 (text) ═══════════ -->
      <div v-else-if="filteredItems.length > 0 && isText" class="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-xs">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="px-3.5 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center justify-between gap-3"
          @click="handleItemClick(item)"
        >
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ getTitle(item) }}</span>
              <span
                class="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 scale-90 origin-left"
                :class="item.official
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50'"
              >{{ item.official ? t('vn.releases.official') : t('vn.releases.unofficial') }}</span>
            </div>
            <span v-if="getAltTitle(item)" class="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">{{ getAltTitle(item) }}</span>
            <span v-if="getVnTitle(item)" class="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
              <Icon icon="lucide:link" class="h-2.5 w-2.5 inline-block mr-0.5 -mt-px" />
              {{ getVnTitle(item) }}
            </span>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span
                v-if="item.released"
                class="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium"
              >{{ item.released }}</span>
              <span
                v-if="item.minage === 0"
                class="text-[9px] px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-bold"
              >{{ t('release.all_ages') }}</span>
              <span v-if="item.patch" class="text-[9px] px-1 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">{{ t('release.patch') }}</span>
              <div class="flex gap-1">
                <span v-for="lang in item.languages.slice(0, 3)" :key="lang.lang" class="text-[9px] text-neutral-400 dark:text-neutral-500">{{ t(`metadata.lang.${lang.lang}`, lang.lang) }}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <Icon
              v-for="plat in item.platforms?.slice(0, 4)"
              :key="plat"
              :icon="`simple-icons:${plat}`"
              :title="t(`metadata.platform.${plat}`, plat)"
              class="h-3 w-3 text-neutral-300 dark:text-neutral-600"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中状态 (列表为空时) -->
    <div v-if="items.length === 0 && isLoading" class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-12 text-center shadow-xs space-y-3">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
        <Icon icon="eos-icons:loading" class="h-5 w-5 text-neutral-400" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('common.loading') }}</h3>
        <p class="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto">
          {{ t('list.fetching_data', '正在努力加载内容...') }}
        </p>
      </div>
    </div>

    <!-- 触底加载哨兵 & 状态 -->
    <div ref="sentinel" class="py-6 flex justify-center" v-show="filteredItems.length > 0">
      <template v-if="showFooterStatus">
        <div v-if="isLoading" class="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
          <Icon icon="eos-icons:loading" class="h-4 w-4" />
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-else-if="!hasMore && items.length > 0" class="text-[10px] text-neutral-300 dark:text-neutral-600 font-medium">
          —— {{ t('list.all_loaded', '已加载全部') }} ——
        </div>
      </template>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0 && !isLoading" class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-12 text-center shadow-xs space-y-3">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
        <Icon icon="lucide:file" class="h-5 w-5 text-neutral-400" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('list.empty_title') }}</h3>
        <p class="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto">
          {{ t('list.empty_desc') }}
        </p>
      </div>
    </div>
  </div>
</template>
