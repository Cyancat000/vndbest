<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { searchTags, getTagList } from '@/api/vndb'
import { useTranslation } from '@/composables/useTranslation'

const { translateTagName } = useTranslation()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedTags: {
    type: Array,
    default: () => []
    // Array of tag objects: { id, name, description, category, vn_count }
  }
})

const emit = defineEmits(['close', 'confirm', 'update:selectedTags'])

const searchQuery = ref('')
const results = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 30
const localSelected = ref([...props.selectedTags])

// 频繁标签（热门标签）
const popularTags = ref([])

async function fetchTags(q = '', reset = true) {
  if (isLoading.value && !reset) return

  if (reset) {
    page.value = 1
    results.value = []
  }

  isLoading.value = true
  try {
    let res
    if (q && q.trim() !== '') {
      res = await searchTags(q, {
        page: page.value,
        results: resultsPerPage
      })
    } else {
      res = await getTagList([], {
        page: page.value,
        results: resultsPerPage,
        sort: 'vn_count',
        reverse: true
      })
    }

    if (res && res.results) {
      if (reset) {
        results.value = res.results
      } else {
        results.value = [...results.value, ...res.results]
      }
      hasMore.value = !!res.more
    }
  } catch (err) {
    console.error('获取标签列表失败:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value++
  await fetchTags(searchQuery.value, false)
}

function handleSearchInput() {
  fetchTags(searchQuery.value, true)
}

function toggleTag(tag) {
  const idx = localSelected.value.findIndex(t => t.id === tag.id)
  if (idx >= 0) {
    localSelected.value.splice(idx, 1)
  } else {
    localSelected.value.push({ ...tag })
  }
}

function isSelected(tag) {
  return localSelected.value.some(t => t.id === tag.id)
}

function handleConfirm() {
  emit('update:selectedTags', [...localSelected.value])
  emit('confirm', [...localSelected.value])
  emit('close')
}

function handleClose() {
  emit('close')
}

function getCategoryClass(category) {
  const classes = {
    'cont': 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800/50',
    'tech': 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800/50',
    'ero': 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800/50',
  }
  return classes[category] || 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:text-neutral-400 dark:bg-neutral-800 dark:border-neutral-700'
}

function cleanDescription(desc) {
  if (!desc) return ''
  return desc.replace(/\[\/?\w+.*?\]/g, '').trim()
}

// 监听 show 打开时加载热门标签
watch(() => props.show, (val) => {
  if (val) {
    searchQuery.value = ''
    localSelected.value = [...props.selectedTags]
    fetchPopularTags()
  }
})

async function fetchPopularTags() {
  try {
    const res = await getTagList([], {
      results: 20,
      sort: 'vn_count',
      reverse: true
    })
    if (res && res.results) {
      popularTags.value = res.results
    }
  } catch (err) {
    console.error('获取热门标签失败:', err)
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
        <div class="relative z-10 w-full sm:w-[420px] max-h-[80vh] bg-white dark:bg-neutral-900 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          <!-- 顶部栏 -->
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100">选择标签</h3>
            <button
              @click="handleClose"
              class="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
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
                placeholder="搜索标签名称..."
                class="w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-4 py-2 text-sm outline-none transition focus:border-neutral-400 focus:bg-white placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:placeholder-neutral-500"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''; fetchTags('', true)"
                class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
              >
                <Icon icon="lucide:x" class="h-3 w-3 text-neutral-400" />
              </button>
            </div>
          </div>

          <!-- 已选标签 -->
          <div v-if="localSelected.length > 0" class="px-4 pb-2">
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in localSelected"
                :key="tag.id"
                class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border text-[11px] font-medium cursor-pointer transition-all hover:shadow-sm"
                :class="getCategoryClass(tag.category)"
                @click="toggleTag(tag)"
              >
                {{ translateTagName(tag.name) }}
                <span class="p-0.5 rounded-full hover:bg-black/10">
                  <Icon icon="lucide:x" class="h-3 w-3" />
                </span>
              </span>
            </div>
          </div>

          <!-- 标签列表 -->
          <div class="flex-1 overflow-y-auto px-4 pb-4 min-h-[200px] max-h-[50vh]">
            <!-- 热门标签 (无搜索时显示) -->
            <div v-if="!searchQuery && popularTags.length > 0 && results.length === 0 && !isLoading">
              <p class="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-2">热门标签</p>
              <div class="space-y-1">
                <button
                  v-for="tag in popularTags"
                  :key="tag.id"
                  @click="toggleTag(tag)"
                  class="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left"
                  :class="isSelected(tag)
                    ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10 dark:border-neutral-100 dark:bg-neutral-800 dark:ring-neutral-100/10'
                    : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800'"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">{{ translateTagName(tag.name) }}</span>
                      <span
                        v-if="tag.category"
                        class="shrink-0 inline-flex items-center rounded-md px-1 py-0.5 text-[9px] font-bold border uppercase"
                        :class="getCategoryClass(tag.category)"
                      >
                        {{ tag.category }}
                      </span>
                    </div>
                    <div v-if="tag.description" class="mt-0.5">
                      <p class="text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-1">
                        {{ cleanDescription(tag.description) }}
                      </p>
                    </div>
                  </div>
                  <div class="shrink-0 flex items-center gap-2">
                    <span class="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">{{ tag.vn_count }} VNs</span>
                    <Icon
                      v-if="isSelected(tag)"
                      icon="lucide:check"
                      class="h-4 w-4 text-neutral-900 dark:text-neutral-100"
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
                  v-for="tag in results"
                  :key="tag.id"
                  @click="toggleTag(tag)"
                  class="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left"
                  :class="isSelected(tag)
                    ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10 dark:border-neutral-100 dark:bg-neutral-800 dark:ring-neutral-100/10'
                    : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800'"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">{{ translateTagName(tag.name) }}</span>
                      <span
                        v-if="tag.category"
                        class="shrink-0 inline-flex items-center rounded-md px-1 py-0.5 text-[9px] font-bold border uppercase"
                        :class="getCategoryClass(tag.category)"
                      >
                        {{ tag.category }}
                      </span>
                    </div>
                    <div v-if="tag.description" class="mt-0.5">
                      <p class="text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-1">
                        {{ cleanDescription(tag.description) }}
                      </p>
                    </div>
                  </div>
                  <div class="shrink-0 flex items-center gap-2">
                    <span class="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">{{ tag.vn_count }} VNs</span>
                    <Icon
                      v-if="isSelected(tag)"
                      icon="lucide:check"
                      class="h-4 w-4 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </button>
              </div>

              <!-- 加载更多 -->
              <div v-if="hasMore && searchQuery" class="py-3 flex justify-center">
                <button
                  @click="loadMore"
                  class="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 font-medium cursor-pointer"
                >
                  <span v-if="isLoading">加载中...</span>
                  <span v-else>加载更多</span>
                </button>
              </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoading && results.length === 0 && !popularTags.length" class="py-8 flex justify-center">
              <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-300 dark:text-neutral-600" />
            </div>

            <!-- 空状态 -->
            <div v-if="!isLoading && searchQuery && results.length === 0" class="py-8 text-center">
              <Icon icon="lucide:tags" class="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p class="text-xs text-neutral-400 dark:text-neutral-500">没有找到匹配的标签</p>
            </div>
          </div>

          <!-- 底部确认栏 -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/80">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">
              已选 <span class="font-bold text-neutral-900 dark:text-neutral-100">{{ localSelected.length }}</span> 个标签
            </span>
            <button
              @click="handleConfirm"
              class="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white active:scale-95 transition-all cursor-pointer"
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
