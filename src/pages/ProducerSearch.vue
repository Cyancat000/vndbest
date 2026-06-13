<script setup>
defineOptions({ name: 'ProducerSearch' })

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SearchBase from '@/components/SearchBase.vue'
import { searchProducers, getProducerList } from '@/api/vndb'
import { IonPage, IonContent } from '@ionic/vue'

const { t } = useI18n()
const router = useRouter()

const query = ref('')
const results = ref([])
const isLoading = ref(false)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 25

// 触底加载逻辑
const sentinel = ref(null)
let observer = null

async function fetchProducers(q = '', reset = true) {
  if (isLoading.value && !reset) return
  
  if (reset) {
    page.value = 1
    results.value = []
    hasMore.value = false
  }
  
  isLoading.value = true
  try {
    let res
    if (q && q.trim() !== '') {
      res = await searchProducers(q, { 
        page: page.value, 
        results: resultsPerPage 
      })
    } else {
      res = await getProducerList([], { 
        page: page.value,
        results: resultsPerPage,
        sort: 'id',
        reverse: false
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
    console.error('获取会社列表失败:', err)
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
  await fetchProducers(query.value, false)
}

function handleSearch(q) {
  query.value = q
  fetchProducers(q, true)
}

function handleClear() {
  query.value = ''
  fetchProducers('', true)
}

function goToDetail(id) {
  router.push(`/producer/${id}`)
}

const getProducerTypeLabel = (type) => {
  return t(`producer_type.${type}`, type)
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

onMounted(() => {
  fetchProducers('', true)
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
      type="producers" 
      v-model="query"
      :title="t('library.producers')" 
      icon="lucide:building-2"
      :loading="isLoading"
      @search="handleSearch"
      @clear="handleClear"
    >
      <!-- 列表内容：始终渲染，内部判断项 -->
      <div class="space-y-2">
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
                  {{ item.name }}
                </h3>
                <span class="shrink-0 inline-flex items-center rounded-md bg-neutral-50 px-1.5 py-0.5 text-[9px] font-bold text-neutral-400 border border-neutral-100">
                  {{ t(`metadata.lang.${item.lang}`, item.lang) }}
                </span>
              </div>
              <p v-if="item.original" class="text-[10px] text-neutral-400 truncate mt-0.5">
                {{ item.original }}
              </p>
            </div>
            
            <div class="flex items-center gap-2 shrink-0">
              <span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-500">
                {{ getProducerTypeLabel(item.type) }}
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

      <!-- 触底加载哨兵：无论何时都保留在 DOM 中 -->
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
        <!-- 保持一个可感知的区域 -->
        <div v-else class="h-1 w-full opacity-0"></div>
      </div>

      <!-- 无搜索结果 -->
      <div v-if="results.length === 0 && !isLoading && query" class="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-3">
        <Icon icon="lucide:search-x" class="h-10 w-10 text-neutral-200" />
        <p class="text-sm">未找到相关会社</p>
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
