<script setup>
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { searchTraits, getTraitList } from '@/api/vndb'
import { useTranslation } from '@/composables/useTranslation'

const { translateTraitName } = useTranslation()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedTraits: {
    type: Array,
    default: () => []
    // Array of trait objects: { id, name, description, group_name, char_count }
  }
})

const emit = defineEmits(['close', 'confirm', 'update:selectedTraits'])

const searchQuery = ref('')
const results = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 30
const localSelected = ref([...props.selectedTraits])

// 热门特征
const popularTraits = ref([])

async function fetchTraits(q = '', reset = true) {
  if (isLoading.value && !reset) return

  if (reset) {
    page.value = 1
    results.value = []
  }

  isLoading.value = true
  try {
    let res
    if (q && q.trim() !== '') {
      res = await searchTraits(q, {
        page: page.value,
        results: resultsPerPage
      })
    } else {
      res = await getTraitList([], {
        page: page.value,
        results: resultsPerPage,
        sort: 'char_count',
        reverse: true
      })
    }

    if (res && res.results) {
      const filtered = res.results.filter(item => item.char_count > 0)
      if (reset) {
        results.value = filtered
      } else {
        results.value = [...results.value, ...filtered]
      }
      hasMore.value = !!res.more
    }
  } catch (err) {
    console.error('获取特征列表失败:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value++
  await fetchTraits(searchQuery.value, false)
}

function handleSearchInput() {
  fetchTraits(searchQuery.value, true)
}

function toggleTrait(trait) {
  const idx = localSelected.value.findIndex(t => t.id === trait.id)
  if (idx >= 0) {
    localSelected.value.splice(idx, 1)
  } else {
    localSelected.value.push({ ...trait })
  }
}

function isSelected(trait) {
  return localSelected.value.some(t => t.id === trait.id)
}

function handleConfirm() {
  emit('update:selectedTraits', [...localSelected.value])
  emit('confirm', [...localSelected.value])
  emit('close')
}

function handleClose() {
  emit('close')
}

function cleanDescription(desc) {
  if (!desc) return ''
  return desc.replace(/\[\/?\w+.*?\]/g, '').trim()
}

// 监听 show 打开时加载热门特征
watch(() => props.show, (val) => {
  if (val) {
    searchQuery.value = ''
    localSelected.value = [...props.selectedTraits]
    fetchPopularTraits()
  }
})

async function fetchPopularTraits() {
  try {
    const res = await getTraitList([], {
      results: 20,
      sort: 'char_count',
      reverse: true
    })
    if (res && res.results) {
      popularTraits.value = res.results.filter(item => item.char_count > 0)
    }
  } catch (err) {
    console.error('获取热门特征失败:', err)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/40" @click="handleClose"></div>

        <!-- 弹窗内容 -->
        <div class="relative z-10 w-full sm:w-[420px] max-h-[80vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          <!-- 顶部栏 -->
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 class="text-base font-bold text-neutral-900">选择特征</h3>
            <button
              @click="handleClose"
              class="p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Icon icon="lucide:x" class="h-4 w-4 text-neutral-400" />
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="px-4 pb-3">
            <div class="relative">
              <Icon icon="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                v-model="searchQuery"
                @input="handleSearchInput"
                type="text"
                placeholder="搜索特征名称..."
                class="w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-4 py-2 text-sm outline-none transition focus:border-neutral-400 focus:bg-white placeholder-neutral-400"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''; fetchTraits('', true)"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-200 transition cursor-pointer"
              >
                <Icon icon="lucide:x" class="h-3 w-3 text-neutral-400" />
              </button>
            </div>
          </div>

          <!-- 已选特征 -->
          <div v-if="localSelected.length > 0" class="px-4 pb-2">
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="trait in localSelected"
                :key="trait.id"
                class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border text-[11px] font-medium cursor-pointer transition-all hover:shadow-sm bg-violet-50 text-violet-600 border-violet-200"
                @click="toggleTrait(trait)"
              >
                {{ translateTraitName(trait.name) }}
                <span class="p-0.5 rounded-full hover:bg-black/10">
                  <Icon icon="lucide:x" class="h-3 w-3" />
                </span>
              </span>
            </div>
          </div>

          <!-- 特征列表 -->
          <div class="flex-1 overflow-y-auto px-4 pb-4 min-h-[200px] max-h-[50vh]">
            <!-- 热门特征 (无搜索时显示) -->
            <div v-if="!searchQuery && popularTraits.length > 0 && results.length === 0 && !isLoading">
              <p class="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-2">热门特征</p>
              <div class="space-y-1">
                <button
                  v-for="trait in popularTraits"
                  :key="trait.id"
                  @click="toggleTrait(trait)"
                  class="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left"
                  :class="isSelected(trait) 
                    ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400/20' 
                    : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50'"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-neutral-900 truncate">{{ translateTraitName(trait.name) }}</span>
                      <span class="shrink-0 inline-flex items-center rounded-md px-1 py-0.5 text-[9px] font-bold border uppercase bg-violet-50 text-violet-600 border-violet-200">
                        {{ trait.group_name || 'trait' }}
                      </span>
                    </div>
                    <div v-if="trait.description" class="mt-0.5">
                      <p class="text-[11px] text-neutral-400 line-clamp-1">
                        {{ cleanDescription(trait.description) }}
                      </p>
                    </div>
                  </div>
                  <div class="shrink-0 flex items-center gap-2">
                    <span class="text-[10px] text-neutral-400 font-medium">{{ trait.char_count }} Chars</span>
                    <Icon
                      v-if="isSelected(trait)"
                      icon="lucide:check"
                      class="h-4 w-4 text-violet-600"
                    />
                  </div>
                </button>
              </div>
            </div>

            <!-- 搜索结果 -->
            <div v-if="searchQuery || results.length > 0">
              <p v-if="searchQuery" class="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-2">
                搜索结果
              </p>
              <div class="space-y-1">
                <button
                  v-for="trait in results"
                  :key="trait.id"
                  @click="toggleTrait(trait)"
                  class="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left"
                  :class="isSelected(trait) 
                    ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400/20' 
                    : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50'"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-neutral-900 truncate">{{ translateTraitName(trait.name) }}</span>
                      <span class="shrink-0 inline-flex items-center rounded-md px-1 py-0.5 text-[9px] font-bold border uppercase bg-violet-50 text-violet-600 border-violet-200">
                        {{ trait.group_name || 'trait' }}
                      </span>
                    </div>
                    <div v-if="trait.description" class="mt-0.5">
                      <p class="text-[11px] text-neutral-400 line-clamp-1">
                        {{ cleanDescription(trait.description) }}
                      </p>
                    </div>
                  </div>
                  <div class="shrink-0 flex items-center gap-2">
                    <span class="text-[10px] text-neutral-400 font-medium">{{ trait.char_count }} Chars</span>
                    <Icon
                      v-if="isSelected(trait)"
                      icon="lucide:check"
                      class="h-4 w-4 text-violet-600"
                    />
                  </div>
                </button>
              </div>

              <!-- 加载更多 -->
              <div v-if="hasMore && searchQuery" class="py-3 flex justify-center">
                <button
                  @click="loadMore"
                  class="text-xs text-neutral-500 hover:text-neutral-700 font-medium cursor-pointer"
                >
                  <span v-if="isLoading">加载中...</span>
                  <span v-else>加载更多</span>
                </button>
              </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoading && results.length === 0 && !popularTraits.length" class="py-8 flex justify-center">
              <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-300" />
            </div>

            <!-- 空状态 -->
            <div v-if="!isLoading && searchQuery && results.length === 0" class="py-8 text-center">
              <Icon icon="lucide:scan-search" class="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p class="text-xs text-neutral-400">没有找到匹配的特征</p>
            </div>
          </div>

          <!-- 底部确认栏 -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-neutral-100 bg-neutral-50/80">
            <span class="text-xs text-neutral-500">
              已选 <span class="font-bold text-neutral-900">{{ localSelected.length }}</span> 个特征
            </span>
            <button
              @click="handleConfirm"
              class="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
