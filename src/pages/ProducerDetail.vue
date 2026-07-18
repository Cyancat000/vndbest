<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getVnList, getProducerDetail } from '@/api/vndb'
import VnList from '@/components/VnList.vue'
import { IonPage, IonContent } from '@ionic/vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const producerId = ref(route.params.id)
const producer = ref(null)
const isProducerLoading = ref(true)

const items = ref([])
const isLoading = ref(true)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

// 排序状态
const sortBy = ref('released')
const reverse = ref(true)

async function fetchProducerInfo() {
  isProducerLoading.value = true
  try {
    const res = await getProducerDetail(producerId.value)
    if (res && res.results && res.results.length > 0) {
      producer.value = res.results[0]
    }
  } catch (err) {
    console.error('获取会社详情失败:', err)
  } finally {
    isProducerLoading.value = false
  }
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

// 当前已加载的制作商 ID，用于避免从子页面返回时重复加载
const currentLoadedId = ref(null)

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      // 如果 ID 没变（从子页面返回），跳过重新加载以保留数据/位置状态
      if (newId === currentLoadedId.value) return
      currentLoadedId.value = newId
      producerId.value = newId
      fetchProducerInfo()
      fetchList(true)
    }
  },
  { immediate: true }
)

const sortOptions = [
  { value: 'released', label: 'vn.released' },
  { value: 'rating', label: 'vn.rating' },
  { value: 'title', label: 'list.sort.title' }
]

const getProducerTypeLabel = (type) => {
  return t(`producer_type.${type}`, type)
}
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container space-y-6">
    <!-- Header/Back Navigation -->
    <div class="flex items-center gap-4 page-sticky-header page-sticky-header--lg">
      <button
        @click="router.back()"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs active:scale-95 transition-transform cursor-pointer"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
          {{ producer?.name || t('vn.producer_details') }}
        </h1>
        <p class="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{{ producerId }}</p>
      </div>
    </div>

    <!-- Producer Info Section -->
    <div v-if="isProducerLoading" class="flex justify-center py-10">
      <Icon icon="eos-icons:loading" class="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
    </div>
    <div v-else-if="producer" class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">{{ producer.name }}</h2>
          <p v-if="producer.original" class="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{{ producer.original }}</p>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
           <span class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
            {{ getProducerTypeLabel(producer.type) }}
          </span>
          <span v-if="producer.lang" class="text-xs font-bold text-neutral-400 dark:text-neutral-500 tracking-tighter bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-700">
            {{ t(`metadata.lang.${producer.lang}`, producer.lang) }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <div v-if="producer.description" class="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
        <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
          {{ producer.description.replace(/\[\/?\w+.*?\]/g, '') }}
        </p>
      </div>

      <!-- External Links -->
      <div v-if="producer.extlinks?.length" class="flex flex-wrap gap-2 pt-2">
        <a
          v-for="link in producer.extlinks"
          :key="link.url"
          :href="link.url"
          target="_blank"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
        >
          <Icon icon="lucide:external-link" class="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
          {{ link.label }}
        </a>
      </div>
    </div>

    <!-- Works List Section -->
    <div class="space-y-4 pt-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-4 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100"></div>
          <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">开发作品</h3>
        </div>
        <span class="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
          {{ items.length }}{{ hasMore ? '+' : '' }}
        </span>
      </div>
      
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
  </ion-content>
  </ion-page>
</template>
