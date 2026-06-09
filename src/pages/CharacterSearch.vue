<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import SearchBase from '@/components/SearchBase.vue'
import { searchCharacters, getCharacterList } from '@/api/vndb'

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

async function fetchCharacters(q = '', reset = true) {
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
      res = await searchCharacters(q, { 
        page: page.value, 
        results: resultsPerPage 
      })
    } else {
      res = await getCharacterList([], { 
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
  await fetchCharacters(query.value, false)
}

function handleSearch(q) {
  query.value = q
  fetchCharacters(q, true)
}

function handleClear() {
  query.value = ''
  fetchCharacters('', true)
}

function goToDetail(id) {
  router.push(`/character/${id}`)
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
  fetchCharacters('', true)
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
  <div class="px-4 py-6">
    <SearchBase 
      type="characters" 
      v-model="query"
      :title="t('library.characters')" 
      icon="lucide:user-circle"
      :loading="isLoading"
      @search="handleSearch"
      @clear="handleClear"
    >
      <!-- 列表内容 -->
      <div class="grid grid-cols-1 gap-3">
        <div 
          v-for="item in results" 
          :key="item.id"
          @click="goToDetail(item.id)"
          class="group relative flex items-start p-3 rounded-xl border border-neutral-100 bg-white shadow-xs active:scale-[0.99] transition-all cursor-pointer hover:border-neutral-200 hover:shadow-sm overflow-hidden"
        >
          <!-- Avatar/Image -->
          <div class="shrink-0 w-16 h-20 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-100 mr-3">
            <img 
              v-if="item.image?.url" 
              :src="item.image.url" 
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
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
  </div>
</template>
