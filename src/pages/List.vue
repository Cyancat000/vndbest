<script setup>
defineOptions({ name: 'List' })

import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getUserList, getUserListLabels } from '@/api/vndb'
import VnList from '@/components/VnList.vue'
import { IonPage, IonContent } from '@ionic/vue'

const router = useRouter()
const { t } = useI18n()

// 登录状态
const isLoggedIn = ref(false)
const username = ref('')

// 数据状态
const items = ref([])
const labels = ref([])
const activeLabelId = ref(null) // null 表示全部
const isLoading = ref(true) // 默认为 true，防止初次进入闪烁空状态
const isLoadingLabels = ref(false)
const errorMsg = ref('')

// 排序状态
const sortBy = ref(localStorage.getItem('vndb_list_sort') || 'lastmod')
const reverse = ref(localStorage.getItem('vndb_list_reverse') !== 'false') // 默认 true (倒序)

// 分页状态
const page = ref(1)
const hasMore = ref(false)
const resultsPerPage = 25

// 检查登录状态并初始化数据
onMounted(async () => {
  const token = localStorage.getItem('vndb_api_token')
  username.value = localStorage.getItem('vndb_username') || ''
  
  if (token && token.trim()) {
    isLoggedIn.value = true
    await fetchLabels()
    await fetchList(true)
  } else {
    isLoggedIn.value = false
    isLoading.value = false // 未登录则停止加载状态
  }
})

// 监听标签切换，重新加载列表
watch(activeLabelId, () => {
  if (isLoggedIn.value) {
    fetchList(true)
  }
})

// 获取用户的自定义/系统标签
async function fetchLabels() {
  isLoadingLabels.value = true
  try {
    const data = await getUserListLabels()
    if (data && data.labels) {
      labels.value = data.labels
    }
  } catch (e) {
    console.error('获取标签失败:', e)
  } finally {
    isLoadingLabels.value = false
  }
}

// 获取收藏列表数据
async function fetchList(reset = false) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  
  isLoading.value = true
  errorMsg.value = ''
  
  try {
    const filters = []
    
    // 如果选择了特定标签，则进行过滤
    if (activeLabelId.value !== null) {
      filters.push(['label', '=', activeLabelId.value])
    }
    
    const params = {
      fields: 'id, vote, added, lastmod, started, finished, notes, labels{id,label}, vn{id,title,alttitle,released,image{url,thumbnail,sexual},rating,votecount,olang}',
      results: resultsPerPage,
      page: page.value,
      sort: sortBy.value,
      reverse: reverse.value
    }
    
    if (filters.length > 0) {
      params.filters = filters.length === 1 ? filters[0] : ['and', ...filters]
    }
    
    const res = await getUserList(params)
    
    if (res && res.results) {
      if (reset) {
        items.value = res.results
      } else {
        items.value = [...items.value, ...res.results]
      }
      hasMore.value = res.more || false
    } else {
      hasMore.value = false
    }
  } catch (e) {
    console.error('获取收藏列表失败:', e)
    errorMsg.value = e.message || t('list.error_fetching')
  } finally {
    isLoading.value = false
  }
}

// 加载下一页
async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value += 1
  await fetchList(false)
}

// 处理排序切换
function handleSortChange(newSort) {
  sortBy.value = newSort
  localStorage.setItem('vndb_list_sort', newSort)
  fetchList(true)
}

// 处理升降序切换
function handleReverseChange(newReverse) {
  reverse.value = newReverse
  localStorage.setItem('vndb_list_reverse', newReverse.toString())
  fetchList(true)
}

// 路由到登录
function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container pb-24 space-y-6">
    <div class="flex items-center justify-between page-sticky-header">
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs">
          <Icon icon="lucide:file-text" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{{ t('list.title') }}</h1>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('list.description') }}</p>
        </div>
      </div>
      
      <!-- 刷新按钮 -->
      <button
        v-if="isLoggedIn"
        @click="fetchList(true)"
        :disabled="isLoading"
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 transition hover:bg-neutral-50 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-600 disabled:opacity-50"
        :title="t('list.refresh')"
      >
        <Icon :icon="isLoading ? 'eos-icons:loading' : 'lucide:refresh-cw'" class="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
      </button>
    </div>

    <!-- 未登录状态提示 -->
    <div v-if="!isLoggedIn" class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-8 text-center shadow-xs space-y-4">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <Icon icon="lucide:user" class="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('list.not_connected_title') }}</h3>
        <p class="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto">
          {{ t('list.not_connected_desc') }}
        </p>
      </div>
      <button
        @click="goToLogin"
        class="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 active:bg-neutral-950"
      >
        <Icon icon="lucide:settings" class="h-4 w-4" />
        {{ t('list.go_to_login') }}
      </button>
    </div>

    <div v-else class="space-y-4">
      <!-- Tab 筛选 Row -->
      <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700">
        <!-- 标签筛选器 (Notion Style Tab Row) -->
        <div class="flex gap-6 overflow-x-auto pb-3 -mb-3 px-1 scroll-smooth no-scrollbar flex-1">
          <button
            @click="activeLabelId = null"
            class="whitespace-nowrap pb-3 text-sm font-medium transition-all duration-200 border-b-2 shrink-0 flex items-center gap-1.5 focus:outline-none cursor-pointer"
            :class="activeLabelId === null ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'"
          >
            {{ t('list.all') }}
          </button>
          <button
            v-for="lbl in labels"
            :key="lbl.id"
            @click="activeLabelId = lbl.id"
            class="whitespace-nowrap pb-3 text-sm font-medium transition-all duration-200 border-b-2 shrink-0 flex items-center gap-1.5 focus:outline-none cursor-pointer"
            :class="activeLabelId === lbl.id ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-semibold' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'"
          >
            <span>{{ lbl.label }}</span>
            <span
              v-if="lbl.count !== undefined && lbl.count !== null && lbl.count !== '' && lbl.count !== 0"
              class="text-[10px] rounded-full px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50"
              :class="activeLabelId === lbl.id ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-950 dark:border-neutral-100 font-normal' : ''"
            >
              {{ lbl.count }}
            </span>
          </button>
        </div>
      </div>

      <!-- 使用 VnList 组件 -->
      <VnList
        :items="items"
        :is-loading="isLoading"
        :has-more="hasMore"
        :sort-by="sortBy"
        :reverse="reverse"
        @load-more="loadMore"
        @sort-change="handleSortChange"
        @reverse-change="handleReverseChange"
      />

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 p-3.5 text-xs text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
        <Icon icon="lucide:x" class="h-4 w-4 shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>
    </div>
  </div>
  </ion-content>
  </ion-page>
</template>

<style scoped>
/* 隐藏滚动条 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
