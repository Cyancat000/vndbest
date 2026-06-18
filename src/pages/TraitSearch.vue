<script setup>
defineOptions({ name: 'TraitSearch' })

import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SearchBase from '@/components/SearchBase.vue'
import { searchTraits, getTraitList } from '@/api/vndb'
import { useTranslation } from '@/composables/useTranslation'
import { useSavedSearches } from '@/composables/useSavedSearches'
import { IonPage, IonContent } from '@ionic/vue'

const { t } = useI18n()
const router = useRouter()
const { translateTraitName, reverseLookupTraitName, searchTraitsByZh } = useTranslation()
const route = useRoute()
const { getById } = useSavedSearches()

const query = ref('')
const results = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 25

// i18n 本地翻译匹配结果
const i18nResults = ref([])
const isLoadingI18n = ref(false)
const loadingI18nKey = ref(null) // 当前正在加载的 i18n 项的 key

// 去重：排除已在 API 结果中出现的英文名
const filteredI18nResults = computed(() => {
  const apiNames = new Set(results.value.map(r => r.name))
  return i18nResults.value.filter(item => !apiNames.has(item.en))
})

// 触底加载逻辑
const sentinel = ref(null)
let observer = null

async function fetchTraits(q = '', reset = true) {
  if (isLoading.value && !reset) return
  
  if (reset) {
    page.value = 1
    results.value = []
    hasMore.value = false
    i18nResults.value = []
  }
  
  isLoading.value = true
  try {
    let res
    if (q && q.trim() !== '') {
      // 将中文搜索词转换为英文原文（如果匹配到翻译）
      const searchQuery = reverseLookupTraitName(q.trim())
      res = await searchTraits(searchQuery, {
        page: page.value,
        results: resultsPerPage
      })
    } else {
      res = await getTraitList([], { 
        page: page.value,
        results: resultsPerPage,
        sort: 'id',
        reverse: false
      })
    }
    
    if (res && res.results) {
      const visibleTraits = res.results.filter(item => item.char_count > 0)

      if (reset) {
        results.value = visibleTraits
      } else {
        results.value = [...results.value, ...visibleTraits]
      }
      hasMore.value = !!res.more
    }
  } catch (err) {
    console.error('获取特征列表失败:', err)
  } finally {
    isLoading.value = false
    
    // API 搜索完成后，同步执行 i18n 本地搜索
    if (reset && q && q.trim() !== '') {
      fetchI18nResults(q.trim())
    }
    
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

function fetchI18nResults(keyword) {
  isLoadingI18n.value = true
  try {
    i18nResults.value = searchTraitsByZh(keyword)
  } catch (err) {
    console.error('i18n 特征搜索失败:', err)
  } finally {
    isLoadingI18n.value = false
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value++
  await fetchTraits(query.value, false)
}

function handleSearch(q) {
  query.value = q
  fetchTraits(q, true)
}

function handleClear() {
  query.value = ''
  i18nResults.value = []
  fetchTraits('', true)
}

function goToDetail(id) {
  router.push(`/browse/characters?trait=${id}`)
}

/**
 * 点击 i18n 翻译结果：通过英文名搜索获取 ID 后跳转
 */
async function goToI18nResult(item) {
  const key = item.en
  loadingI18nKey.value = key
  try {
    const res = await searchTraits(item.en, { results: 5 })
    if (res && res.results && res.results.length > 0) {
      // 精确匹配英文名
      const exact = res.results.find(r => r.name === item.en)
      const trait = exact || res.results[0]
      goToDetail(trait.id)
    }
  } catch (err) {
    console.error('查找特征 ID 失败:', err)
  } finally {
    loadingI18nKey.value = null
  }
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
}

function handleRefresh() {
  fetchTraits(query.value, true)
}

onMounted(() => {
  // 加载已保存的搜索参数
  const savedId = route.query.savedId
  if (savedId) {
    const saved = getById(savedId)
    if (saved && saved.filters) {
      applyFilters(saved.filters)
    }
  }
  fetchTraits(query.value, true)
  setupObserver()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// 监听 sentinel，确保 DOM 稳定
watch(sentinel, (el) => {
  if (el && observer) {
    observer.observe(el)
  }
})
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container pb-24">
    <SearchBase
      type="traits"
      v-model="query"
      :title="t('library.traits')"
      icon="lucide:fingerprint"
      :loading="isLoading"
      :filters="{ query }"
      @search="handleSearch"
      @clear="handleClear"
      @refresh="handleRefresh"
    >
      <!-- API 搜索结果 -->
      <div class="grid grid-cols-1 gap-2">
        <div 
          v-for="item in results" 
          :key="item.id"
          @click="goToDetail(item.id)"
          class="group relative flex flex-col p-3 rounded-xl border border-neutral-100 bg-white shadow-xs active:scale-[0.99] transition-all cursor-pointer hover:border-neutral-200 hover:shadow-sm"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-neutral-900 truncate">
                    {{ translateTraitName(item.name) }}
                </h3>
                <span 
                  v-if="item.group_name" 
                  class="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold bg-neutral-50 text-neutral-400 border border-neutral-100 uppercase"
                >
                  {{ item.group_name }}
                </span>
              </div>
            </div>
            
            <div class="flex items-center gap-2 shrink-0">
              <span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-500">
                {{ item.char_count }} Chars
              </span>
              <Icon icon="lucide:chevron-right" class="h-3.5 w-3.5 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
            </div>
          </div>

          <div v-if="item.description" class="mt-2 line-clamp-1">
            <p class="text-[11px] text-neutral-500 italic">
              {{ item.description.replace(/\[\/?\w+.*?\]/g, '') }}
            </p>
          </div>
        </div>
      </div>

      <!-- i18n 翻译匹配结果 -->
      <div v-if="filteredI18nResults.length > 0" class="mt-3">
        <div class="flex items-center gap-2 mb-2 px-1">
          <Icon icon="lucide:languages" class="h-3.5 w-3.5 text-violet-400" />
          <span class="text-[10px] text-violet-400 font-bold uppercase tracking-widest">翻译匹配</span>
        </div>
        <div class="grid grid-cols-1 gap-2">
          <div 
            v-for="item in filteredI18nResults" 
            :key="'i18n-' + item.en"
            @click="goToI18nResult(item)"
            :class="[
              'group relative flex flex-col p-3 rounded-xl border border-dashed transition-all cursor-pointer shadow-xs',
              loadingI18nKey === item.en
                ? 'border-violet-400 bg-violet-100/80 scale-[0.98] opacity-80'
                : 'border-violet-200 bg-violet-50/50 hover:border-violet-300 hover:shadow-sm active:scale-[0.99]'
            ]"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-sm text-violet-800 truncate">
                      {{ item.zh }}
                  </h3>
                  <span class="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold bg-violet-100 text-violet-500 border border-violet-200">
                    翻译
                  </span>
                </div>
                <p class="text-[11px] text-violet-400 mt-0.5">
                  {{ item.en }}
                </p>
              </div>
              
              <div class="flex items-center gap-1 shrink-0">
                <template v-if="loadingI18nKey === item.en">
                  <Icon icon="eos-icons:loading" class="h-4 w-4 text-violet-500 animate-spin" />
                </template>
                <template v-else>
                  <Icon icon="lucide:external-link" class="h-3 w-3 text-violet-300 group-hover:text-violet-500 transition-colors" />
                  <Icon icon="lucide:chevron-right" class="h-3.5 w-3.5 text-violet-300 group-hover:text-violet-500 transition-colors" />
                </template>
              </div>
            </div>
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
        <div v-else-if="!hasMore && results.length > 0 && filteredI18nResults.length === 0" class="text-[10px] text-neutral-300 font-bold uppercase tracking-widest">
          —— {{ t('list.all_loaded', 'All Loaded') }} ——
        </div>
        <div v-else class="h-1 w-full opacity-0"></div>
      </div>

      <!-- 无搜索结果 -->
      <div v-if="results.length === 0 && filteredI18nResults.length === 0 && !isLoading && query" class="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-3">
        <Icon icon="lucide:search-x" class="h-10 w-10 text-neutral-200" />
        <p class="text-sm">未找到相关特征</p>
      </div>

      <!-- 初始加载动画 -->
      <div v-if="isLoading && results.length === 0" class="flex justify-center py-20">
        <Icon icon="eos-icons:loading" class="h-8 w-8 text-neutral-200" />
      </div>
    </SearchBase>
  </div>
  </ion-content>
  </ion-page>
</template>
