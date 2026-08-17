<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import AppHeader from '@/components/AppHeader.vue'
import { getStaffDetail, getVnListByStaff } from '@/api/vndb'
import VnList from '@/components/VnList.vue'
import { useToast } from '@/composables/useToast'
import { useFavorites } from '@/composables/useFavorites'
import { IonPage, IonContent } from '@ionic/vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { showToast } = useToast()
const { isFavorite, toggleFavorite } = useFavorites()

const staffId = ref(route.params.id)
const staff = ref(null)
const isStaffLoading = ref(true)

const isCurrentStaffFavorite = computed(() => {
  return isFavorite(staff.value?.id)
})

function handleToggleStaffFavorite() {
  if (!staff.value?.id) return
  const isFav = toggleFavorite({
    id: staff.value.id,
    type: 'staff',
    title: staff.value.name || '',
    subtitle: staff.value.original || staff.value.id,
    extra: {
      lang: staff.value.lang,
      gender: staff.value.gender
    }
  })
  showToast(isFav ? t('common.favorite_added') : t('common.favorite_removed'), isFav ? 'success' : 'info')
}

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

// 当前已加载的制作人员 ID，用于避免从子页面返回时重复加载
const currentLoadedId = ref(null)

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      // 如果 ID 没变（从子页面返回），跳过重新加载以保留数据/位置状态
      if (newId === currentLoadedId.value) return
      currentLoadedId.value = newId
      staffId.value = newId
      fetchStaffInfo()
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
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container space-y-6">
    <AppHeader
      mode="detail"
      :title="staff?.name || t('library.staff')"
      :subtitle="String(staffId)"
    >
      <template #actions>
        <button
          v-if="staff"
          type="button"
          @click="handleToggleStaffFavorite"
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 active:scale-95 transition cursor-pointer"
          :title="isCurrentStaffFavorite ? t('favorites.remove') : t('favorites.title')"
        >
          <Icon
            :icon="isCurrentStaffFavorite ? 'lucide:heart' : 'lucide:heart'"
            class="h-4 w-4 transition"
            :class="isCurrentStaffFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-500 dark:text-neutral-400'"
          />
        </button>
      </template>
    </AppHeader>

    <div v-if="isStaffLoading" class="flex justify-center py-20">
      <Icon icon="eos-icons:loading" class="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
    </div>

    <div v-else-if="staff" class="space-y-6">
      <!-- Basic Info -->
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">{{ staff.name }}</h2>
            <p v-if="staff.original" class="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{{ staff.original }}</p>
          </div>
          <div v-if="staff.lang" class="shrink-0">
            <span class="text-xs font-bold text-neutral-400 dark:text-neutral-500 tracking-tighter bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-700">
              {{ t(`metadata.lang.${staff.lang}`, staff.lang) }}
            </span>
          </div>
        </div>

        <!-- Description -->
        <div v-if="staff.description" class="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
          <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
            {{ staff.description.replace(/\[\/?\w+.*?\]/g, '') }}
          </p>
        </div>

        <!-- Aliases -->
        <div v-if="staff.aliases?.length > 1" class="space-y-2">
          <h3 class="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1">其他曾用名</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="alias in staff.aliases.filter(a => a.name !== staff.name)"
              :key="alias.name"
              class="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400"
            >
              {{ alias.name }} <span v-if="alias.latin" class="text-neutral-400 dark:text-neutral-500 text-[10px]">({{ alias.latin }})</span>
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
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            <Icon icon="lucide:external-link" class="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
            {{ link.label }}
          </a>
        </div>
      </div>

      <!-- Related Works (VnList) -->
      <div class="space-y-4 pt-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="h-4 w-1 rounded-full bg-neutral-900 dark:bg-neutral-100"></div>
            <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">参与作品</h3>
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
          storage-key="vndb_staff_works_layout"
          @load-more="loadMore"
          @sort-change="handleSortChange"
          @reverse-change="handleReverseChange"
        />
      </div>
    </div>
    
    <div v-else class="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500">
      <Icon icon="lucide:user-x" class="h-10 w-10 mb-4 opacity-20" />
      <p>未找到该人物的信息</p>
    </div>
  </div>
  </ion-content>
  </ion-page>
</template>
