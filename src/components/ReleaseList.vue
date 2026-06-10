<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import BaseSelect from './BaseSelect.vue'

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
  customSortOptions: {
    type: Array,
    default: null
  }
})

const emit = defineEmits(['loadMore', 'sortChange', 'reverseChange'])

const router = useRouter()
const { t } = useI18n()

const layoutMode = ref(localStorage.getItem(props.storageKey) || props.defaultLayout)

function toggleLayout(mode) {
  layoutMode.value = mode
  localStorage.setItem(props.storageKey, mode)
}

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
  if (item.images && item.images.length > 0) {
    return item.images[0]
  }
  return null
}

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

// 触底加载
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
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3 px-1">
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
        >
          <Icon :icon="reverse ? 'lucide:sort-desc' : 'lucide:sort-asc'" class="h-4 w-4" />
        </button>
      </div>
      <div v-else></div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="toggleLayout('list')"
          class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
          :class="layoutMode === 'list' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
        >
          <Icon icon="lucide:menu" class="h-4 w-4" />
        </button>
        <button
          @click="toggleLayout('grid')"
          class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
          :class="layoutMode === 'grid' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
        >
          <Icon icon="lucide:layout-grid" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="px-0.5">
      <div v-if="layoutMode === 'list'" class="grid grid-cols-1 gap-3.5">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white shadow-xs hover:border-neutral-300 transition cursor-pointer"
          @click="handleItemClick(item)"
        >
          <div class="h-24 w-18 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-100 shrink-0">
            <img
              v-if="getImage(item)"
              :src="getImage(item).url"
              alt="cover"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div v-else class="h-full w-full flex items-center justify-center text-neutral-300">
              <Icon icon="lucide:package" class="h-8 w-8" />
            </div>
          </div>

          <div class="min-w-0 flex-1 flex flex-col justify-between py-0.5 h-24">
            <div class="space-y-1">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-sm font-semibold text-neutral-900 truncate">{{ getTitle(item) }}</h3>
                <span v-if="item.official" class="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                  {{ t('vn.releases.official') }}
                </span>
              </div>
              <p v-if="getAltTitle(item)" class="text-[10px] text-neutral-400 truncate">{{ getAltTitle(item) }}</p>
              
              <div class="flex flex-wrap gap-1 mt-1">
                <span v-for="lang in item.languages" :key="lang.lang" class="text-[9px] px-1 rounded bg-neutral-100 text-neutral-600 uppercase">
                  {{ lang.lang }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex gap-2 items-center min-w-0">
                <span v-if="item.released" class="text-[10px] text-neutral-500 font-medium truncate shrink-0">{{ item.released }}</span>
                <span v-if="item.minage === 0" class="text-[9px] px-1 rounded bg-neutral-100 text-neutral-500 font-bold shrink-0">
                  {{ t('release.all_ages') }}
                </span>
                <div class="flex gap-1 shrink-0">
                  <Icon v-for="plat in item.platforms" :key="plat" :icon="`simple-icons:${plat}`" class="h-3 w-3 text-neutral-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-2 gap-3.5">
        <div
          v-for="item in items"
          :key="item.id"
          class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition cursor-pointer"
          @click="handleItemClick(item)"
        >
          <div class="aspect-3/4 relative bg-neutral-50">
            <img
              v-if="getImage(item)"
              :src="getImage(item).url"
              alt="cover"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-neutral-200">
              <Icon icon="lucide:package" class="h-12 w-12" />
            </div>
            <div v-if="item.official" class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[8px] font-bold">
              OFFICIAL
            </div>
          </div>
          <div class="p-2.5 space-y-1">
            <h3 class="text-xs font-semibold text-neutral-900 line-clamp-1">{{ getTitle(item) }}</h3>
            <div class="flex items-center justify-between text-[10px] text-neutral-400">
              <div class="flex items-center gap-1.5 min-w-0">
                <span>{{ item.released }}</span>
                <span v-if="item.minage === 0" class="px-1 rounded bg-neutral-100 text-neutral-500 scale-90 origin-left font-bold">
                  {{ t('release.all_ages') }}
                </span>
              </div>
              <div class="flex gap-1">
                <span v-for="lang in item.languages.slice(0, 2)" :key="lang.lang" class="uppercase">{{ lang.lang }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div ref="sentinel" class="py-8 flex justify-center">
      <div v-if="isLoading" class="flex items-center gap-2 text-xs text-neutral-400">
        <Icon icon="eos-icons:loading" class="h-4 w-4" />
        <span>{{ t('common.loading') }}</span>
      </div>
      <div v-else-if="!hasMore && items.length > 0" class="text-[10px] text-neutral-300">
        —— {{ t('list.all_loaded') }} ——
      </div>
    </div>
  </div>
</template>
