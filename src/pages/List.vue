<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getUserList, getUserListLabels } from '@/api/vndb'

const router = useRouter()

// 登录状态
const isLoggedIn = ref(false)
const username = ref('')

// 布局状态：'list' 表示列表样式，'waterfall' 表示双列瀑布流样式
const layoutMode = ref(localStorage.getItem('vndb_list_layout') || 'list')

// 数据状态
const items = ref([])
const labels = ref([])
const activeLabelId = ref(null) // null 表示全部
const isLoading = ref(false)
const isLoadingLabels = ref(false)
const errorMsg = ref('')

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
  }
})

// 监听标签切换，重新加载列表
watch(activeLabelId, () => {
  if (isLoggedIn.value) {
    fetchList(true)
  }
})

// 切换布局模式并保存偏好
function toggleLayout(mode) {
  layoutMode.value = mode
  localStorage.setItem('vndb_list_layout', mode)
}

// 瀑布流双列分配（通过计算属性把 items 分配到左右两列）
const waterfallColumns = computed(() => {
  const leftCol = []
  const rightCol = []
  items.value.forEach((item, index) => {
    if (index % 2 === 0) {
      leftCol.push(item)
    } else {
      rightCol.push(item)
    }
  })
  return { leftCol, rightCol }
})

// 获取用户的自定义/系统标签
async function fetchLabels() {
  isLoadingLabels.value = true
  try {
    const data = await getUserListLabels()
    // data 格式应该为 { labels: [ { id: 7, label: "completed", private: false, count: 12 }, ... ] }
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
      fields: 'id, vote, added, lastmod, started, finished, notes, labels{id,label}, vn{id,title,alttitle,released,image{url,thumbnail},rating,votecount,olang}',
      results: resultsPerPage,
      page: page.value,
      sort: 'lastmod', // 按最后修改时间排序
      reverse: true
    }
    
    // 只有当有 filters 时才传递 filters 字段（如果是空的 filters 数组在 API 中一般代表不过滤）
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
    errorMsg.value = e.message || '获取数据失败，请稍后重试'
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

// 路由到登录
function goToLogin() {
  router.push('/login')
}

// 标签样式映射
function getLabelStyle(labelName) {
  const lowerName = labelName.toLowerCase()
  if (lowerName === 'playing' || lowerName === '正在玩') {
    return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
  }
  if (lowerName === 'completed' || lowerName === '已通关') {
    return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
  }
  if (lowerName === 'on hold' || lowerName === '搁置') {
    return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
  }
  if (lowerName === 'dropped' || lowerName === '抛弃') {
    return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
  }
  if (lowerName === 'plan to play' || lowerName === '想玩' || lowerName === 'stalled' || lowerName === 'wishlist') {
    return 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700'
  }
  return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
}

// 处理评分显示
function formatRating(vote) {
  if (!vote) return null
  // VNDB 评分范围是 10-100，转成我们熟知的 1.0 - 10.0 分制
  return (vote / 10).toFixed(1)
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
          <Icon icon="lucide:file-text" class="h-5 w-5 text-neutral-800" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900">List</h1>
          <p class="text-xs text-neutral-500">管理你的 Visual Novels 收藏清单</p>
        </div>
      </div>
      
      <!-- 刷新按钮 -->
      <button 
        v-if="isLoggedIn"
        @click="fetchList(true)"
        :disabled="isLoading"
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white transition hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50"
        title="刷新列表"
      >
        <Icon icon="lucide:refresh-cw" class="h-4 w-4 text-neutral-600" :class="{ 'animate-spin': isLoading }" />
      </button>
    </div>

    <!-- 未登录状态提示 -->
    <div v-if="!isLoggedIn" class="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xs space-y-4">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-100">
        <Icon icon="lucide:user" class="h-6 w-6 text-neutral-400" />
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-800">未连接账户</h3>
        <p class="text-xs text-neutral-400 max-w-sm mx-auto">
          你需要先登录你的 VNDB 账户，以加载 and 管理你的个人收藏清单。
        </p>
      </div>
      <button
        @click="goToLogin"
        class="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 active:bg-neutral-950"
      >
        <Icon icon="lucide:settings" class="h-4 w-4" />
        去设置登录 Token
      </button>
    </div>

    <div v-else class="space-y-4">
      <!-- Tab 筛选及布局切换 Row -->
      <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <!-- 标签筛选器 (Notion Style Tab Row) -->
        <div class="flex gap-6 overflow-x-auto pb-3 -mb-3 px-1 scroll-smooth no-scrollbar flex-1 mr-4">
          <button
            @click="activeLabelId = null"
            class="whitespace-nowrap pb-3 text-sm font-medium transition-all duration-200 border-b-2 shrink-0 flex items-center gap-1.5 focus:outline-none cursor-pointer"
            :class="activeLabelId === null 
              ? 'border-neutral-900 text-neutral-900 font-semibold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'"
          >
            全部
          </button>
          <button
            v-for="lbl in labels"
            :key="lbl.id"
            @click="activeLabelId = lbl.id"
            class="whitespace-nowrap pb-3 text-sm font-medium transition-all duration-200 border-b-2 shrink-0 flex items-center gap-1.5 focus:outline-none cursor-pointer"
            :class="activeLabelId === lbl.id
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'"
          >
            <span>{{ lbl.label }}</span>
            <span
              v-if="lbl.count !== undefined && lbl.count !== null && lbl.count !== '' && lbl.count !== 0"
              class="text-[10px] rounded-full px-1.5 py-0.5 bg-neutral-100 text-neutral-500 border border-neutral-200/50"
              :class="activeLabelId === lbl.id ? 'bg-neutral-950 text-white border-neutral-950 font-normal' : ''"
            >
              {{ lbl.count }}
            </span>
          </button>
        </div>

        <!-- 右侧对齐：布局切换按钮，对齐 pb-3 和底部线 -->
        <div class="flex items-center gap-1 pb-3 shrink-0 self-end">
          <button
            @click="toggleLayout('list')"
            class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
            :class="layoutMode === 'list' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
            title="列表布局"
          >
            <Icon icon="lucide:menu" class="h-4 w-4" />
          </button>
          <button
            @click="toggleLayout('waterfall')"
            class="p-1 rounded transition hover:bg-neutral-100 active:bg-neutral-200 cursor-pointer"
            :class="layoutMode === 'waterfall' ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400'"
            title="瀑布流布局"
          >
            <Icon icon="lucide:layout-grid" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- 1. 列表布局 (layoutMode === 'list') -->
      <div v-if="items.length > 0 && layoutMode === 'list'" class="grid grid-cols-1 gap-3.5">
        <div 
          v-for="item in items" 
          :key="item.id" 
          class="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-white shadow-xs hover:border-neutral-300 transition cursor-pointer"
          @click="router.push(`/vn/${item.id}`)"
        >
          <!-- 封面图：调大至 h-28 w-21，比例更协调 -->
          <div class="h-28 w-21 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-200 shrink-0">
            <img 
              v-if="item.vn.image?.thumbnail || item.vn.image?.url" 
              :src="item.vn.image.thumbnail || item.vn.image.url" 
              alt="cover" 
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div v-else class="h-full w-full flex items-center justify-center bg-neutral-50 text-neutral-300">
              <Icon icon="lucide:image" class="h-6 w-6" />
            </div>
          </div>

          <!-- 卡片内容区：采用 h-28，两行标签各单开一行，支持超出左右滑动且不换行 -->
          <div class="min-w-0 flex-1 flex flex-col justify-between h-28 py-0.5">
            <!-- 标题区 -->
            <div class="space-y-0.5">
              <div class="flex items-start justify-between gap-2">
                <span class="text-sm font-semibold text-neutral-900 block truncate">{{ item.vn.title }}</span>
                <!-- 同步时间 -->
                <span class="text-[10px] text-neutral-400 shrink-0 mt-0.5">{{ formatDate(item.lastmod) }}</span>
              </div>
              <span v-if="item.vn.alttitle" class="text-[10px] text-neutral-400 block truncate leading-none">
                {{ item.vn.alttitle }}
              </span>
            </div>

            <!-- 用户收藏清单的标签：单开一行，换样式为 Notion 关系属性块风格，不换行且超出滑动 -->
            <div class="overflow-x-auto pb-1 -mb-1 scroll-smooth no-scrollbar">
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

            <!-- 数据属性标签：单开一行，不换行且超出滑动 -->
            <div class="overflow-x-auto pb-1 -mb-1 scroll-smooth no-scrollbar">
              <div class="flex gap-1.5 items-center shrink-0 whitespace-nowrap">
                <!-- 用户评分（缩减为橙色星星胶囊） -->
                <span 
                  v-if="item.vote" 
                  class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-amber-50 text-amber-700 border-amber-100"
                >
                  <Icon icon="lucide:star" class="h-3 w-3 fill-amber-500 stroke-amber-500" />
                  {{ formatRating(item.vote) }}
                </span>

                <!-- 原作语言 -->
                <span class="text-[10px] rounded-full px-1.5 py-0.5 border border-neutral-200 bg-neutral-50 text-neutral-500 font-medium uppercase">
                  {{ item.vn.olang }}
                </span>

                <!-- 发布时间 -->
                <span class="text-[10px] text-neutral-400 font-medium">
                  {{ item.vn.released }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="p-2 flex justify-center">
          <button
            @click="loadMore"
            :disabled="isLoading"
            class="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition flex items-center gap-1 disabled:opacity-50 py-2 px-4 border border-neutral-200 rounded-lg bg-white cursor-pointer"
          >
            <Icon icon="lucide:more-horizontal" class="h-4 w-4" />
            {{ isLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <!-- 2. 双列瀑布流布局 (layoutMode === 'waterfall') -->
      <div v-else-if="items.length > 0 && layoutMode === 'waterfall'" class="space-y-4">
        <!-- 瀑布流容器：双列布局 -->
        <div class="grid grid-cols-2 gap-3.5 items-start">
          <!-- 左列 -->
          <div class="flex flex-col gap-3.5">
            <div 
              v-for="item in waterfallColumns.leftCol" 
              :key="item.id"
              class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition cursor-pointer"
              @click="router.push(`/vn/${item.id}`)"
            >
              <!-- 封面高度自适应 -->
              <img 
                v-if="item.vn.image?.url" 
                :src="item.vn.image.url" 
                alt="cover" 
                class="w-full h-auto object-cover max-h-72 border-b border-neutral-100"
                loading="lazy"
              />
              <div v-else class="w-full h-32 flex items-center justify-center bg-neutral-50 text-neutral-300 border-b border-neutral-100">
                <Icon icon="lucide:image" class="h-6 w-6" />
              </div>
              <!-- 仅显示 VN 名称 -->
              <div class="p-3">
                <span class="text-xs font-semibold text-neutral-900 block line-clamp-2 leading-tight">{{ item.vn.title }}</span>
              </div>
            </div>
          </div>

          <!-- 右列 -->
          <div class="flex flex-col gap-3.5">
            <div 
              v-for="item in waterfallColumns.rightCol" 
              :key="item.id"
              class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs hover:border-neutral-300 transition cursor-pointer"
              @click="router.push(`/vn/${item.id}`)"
            >
              <!-- 封面高度自适应 -->
              <img 
                v-if="item.vn.image?.url" 
                :src="item.vn.image.url" 
                alt="cover" 
                class="w-full h-auto object-cover max-h-72 border-b border-neutral-100"
                loading="lazy"
              />
              <div v-else class="w-full h-32 flex items-center justify-center bg-neutral-50 text-neutral-300 border-b border-neutral-100">
                <Icon icon="lucide:image" class="h-6 w-6" />
              </div>
              <!-- 仅显示 VN 名称 -->
              <div class="p-3">
                <span class="text-xs font-semibold text-neutral-900 block line-clamp-2 leading-tight">{{ item.vn.title }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="p-2 flex justify-center">
          <button
            @click="loadMore"
            :disabled="isLoading"
            class="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition flex items-center gap-1 disabled:opacity-50 py-2 px-4 border border-neutral-200 rounded-lg bg-white cursor-pointer"
          >
            <Icon icon="lucide:more-horizontal" class="h-4 w-4" />
            {{ isLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isLoading" class="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-xs space-y-3">
        <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-50 border border-neutral-100">
          <Icon icon="lucide:file" class="h-5 w-5 text-neutral-400" />
        </div>
        <div class="space-y-1">
          <h3 class="text-sm font-semibold text-neutral-800">列表为空</h3>
          <p class="text-xs text-neutral-400 max-w-xs mx-auto">
            在此标签下没有找到任何视觉小说。你可以在搜索或详情页中将其添加到你的收藏清单。
          </p>
        </div>
      </div>

      <!-- 加载中占位 -->
      <div v-if="isLoading && items.length === 0" class="space-y-3">
        <div 
          v-for="n in 5" 
          :key="n"
          class="h-32 w-full bg-neutral-100 rounded-xl animate-pulse"
        ></div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="flex items-center gap-2 rounded-lg bg-red-50 p-3.5 text-xs text-red-600 border border-red-100">
        <Icon icon="lucide:x" class="h-4 w-4 shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>
    </div>
  </div>
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
