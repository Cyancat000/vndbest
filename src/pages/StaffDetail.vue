<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getStaffDetail, getVnListByStaff } from '@/api/vndb'
import VnList from '@/components/VnList.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const staffId = ref(route.params.id)
const staff = ref(null)
const isStaffLoading = ref(true)

const items = ref([])
const isLoading = ref(true)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

// 排序状态
const sortBy = ref('released')
const reverse = ref(true)

async function fetchStaffInfo() {
  isStaffLoading.value = true
  try {
    const res = await getStaffDetail(staffId.value)
    if (res && res.results && res.results.length > 0) {
      staff.value = res.results[0]
    }
  } catch (err) {
    console.error('获取人物详情失败:', err)
  } finally {
    isStaffLoading.value = false
  }
}

async function fetchList(reset = true) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  
  isLoading.value = true
  try {
    const res = await getVnListByStaff(staffId.value, {
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
    console.error('获取人物关联作品失败:', err)
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
  fetchStaffInfo()
  fetchList(true)
})

const sortOptions = [
  { value: 'released', label: 'vn.released' },
  { value: 'rating', label: 'vn.rating' },
  { value: 'title', label: 'list.sort.title' }
]
</script>

<template>
  <div class="px-4 pb-8 space-y-6">
    <!-- Header/Back Navigation -->
    <div class="flex items-center gap-4 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100">
      <button
        @click="router.back()"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs active:scale-95 transition-transform cursor-pointer"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg font-bold text-neutral-900 truncate">
          {{ staff?.name || '人物详情' }}
        </h1>
        <p class="text-[10px] text-neutral-400 uppercase tracking-widest">{{ staffId }}</p>
      </div>
    </div>

    <div v-if="isStaffLoading" class="flex justify-center py-20">
      <Icon icon="eos-icons:loading" class="h-8 w-8 text-neutral-300" />
    </div>

    <div v-else-if="staff" class="space-y-6">
      <!-- Basic Info -->
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-2xl font-black tracking-tight text-neutral-900">{{ staff.name }}</h2>
            <p v-if="staff.original" class="text-sm text-neutral-500 font-medium">{{ staff.original }}</p>
          </div>
          <div v-if="staff.lang" class="shrink-0">
            <span class="text-xs font-bold text-neutral-400 tracking-tighter bg-neutral-50 px-2 py-1 rounded border border-neutral-100">
              {{ t(`metadata.lang.${staff.lang}`, staff.lang) }}
            </span>
          </div>
        </div>

        <!-- Description -->
        <div v-if="staff.description" class="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
          <p class="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
            {{ staff.description.replace(/\[\/?\w+.*?\]/g, '') }}
          </p>
        </div>

        <!-- Aliases -->
        <div v-if="staff.aliases?.length > 1" class="space-y-2">
          <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">其他曾用名</h3>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="alias in staff.aliases.filter(a => a.name !== staff.name)" 
              :key="alias.name"
              class="px-2.5 py-1 rounded-lg bg-neutral-100 text-xs text-neutral-600"
            >
              {{ alias.name }} <span v-if="alias.latin" class="text-neutral-400 text-[10px]">({{ alias.latin }})</span>
            </span>
          </div>
        </div>

        <!-- External Links -->
        <div v-if="staff.extlinks?.length" class="flex flex-wrap gap-2 pt-2">
          <a 
            v-for="link in staff.extlinks" 
            :key="link.url"
            :href="link.url"
            target="_blank"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-xs font-medium text-neutral-700 hover:border-neutral-400 transition-colors"
          >
            <Icon icon="lucide:external-link" class="h-3 w-3 text-neutral-400" />
            {{ link.label }}
          </a>
        </div>
      </div>

      <!-- Related Works (VnList) -->
      <div class="space-y-4 pt-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="h-4 w-1 rounded-full bg-neutral-900"></div>
            <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider">参与作品</h3>
          </div>
          <span class="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
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
          storage-key="vndb_staff_works_layout"
          @load-more="loadMore"
          @sort-change="handleSortChange"
          @reverse-change="handleReverseChange"
        />
      </div>
    </div>
    
    <div v-else class="flex flex-col items-center justify-center py-20 text-neutral-400">
      <Icon icon="lucide:user-x" class="h-10 w-10 mb-4 opacity-20" />
      <p>未找到该人物的信息</p>
    </div>
  </div>
</template>
