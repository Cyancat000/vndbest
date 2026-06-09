<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getVnList } from '@/api/vndb'
import VnList from '@/components/VnList.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const producerId = ref(route.params.id)
const producer = ref({
  id: '',
  name: '',
  original: '',
  description: ''
})

const items = ref([])
const isLoading = ref(true)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

// 排序状态
const sortBy = ref('released')
const reverse = ref(true)

async function fetchProducerInfo() {
  // VNDB API 好像没有直接获取 producer 详情的独立接口，通常是通过 /vn POST 带 filter ['developer', '=', id] 顺便获取
  // 或者尝试 /producer 接口（Kana API 文档中是否有此接口需要确认，这里先按通用逻辑处理）
  // 暂时我们只加载该开发商的 VN 列表
}

async function fetchList(reset = true) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  
  isLoading.value = true
  try {
    const filters = ['developer', '=', ['id', '=', producerId.value]]
    const res = await getVnList(filters, {
      page: page.value,
      results: resultsPerPage,
      sort: sortBy.value,
      reverse: reverse.value
    })
    
    if (res && res.results) {
      if (reset) {
        items.value = res.results
      } else {
        items.value = [...items.value, ...res.results]
      }
      hasMore.value = res.more || false
      
      // 如果还没获取到 producer 名字，从结果里尝试提取 (如果结果里有 developers 字段)
      // 但 getVnList 默认 fields 没带 developers，为了效率这里暂不处理
    }
  } catch (err) {
    console.error('获取开发商VN列表失败:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value += 1
  await fetchList(false)
}

function handleSortChange(s) {
  sortBy.value = s
  fetchList(true)
}

function handleReverseChange(r) {
  reverse.value = r
  fetchList(true)
}

onMounted(() => {
  fetchList(true)
})

const sortOptions = [
  { value: 'released', label: 'vn.released' },
  { value: 'rating', label: 'vn.rating' },
  { value: 'title', label: 'list.sort.title' }
]
</script>

<template>
  <div class="space-y-6 pb-8">
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
      <button
        @click="router.back()"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600" />
      </button>
      <span class="text-xs font-semibold text-neutral-500">{{ t('vn.producer_details') }}</span>
      <div class="w-8"></div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Icon icon="lucide:home" class="h-6 w-6 text-neutral-400" />
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-neutral-900">{{ producerId }}</h1>
          <p class="text-xs text-neutral-400">{{ t('home.producers') }}</p>
        </div>
      </div>

      <!-- 开发商作品列表 -->
      <div class="space-y-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('home.vn') }}</h3>
        <VnList
          :items="items"
          :is-loading="isLoading"
          :has-more="hasMore"
          :sort-by="sortBy"
          :reverse="reverse"
          :custom-sort-options="sortOptions"
          storage-key="vndb_producer_layout"
          @load-more="loadMore"
          @sort-change="handleSortChange"
          @reverse-change="handleReverseChange"
        />
      </div>
    </div>
  </div>
</template>
