<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getVnList, request } from '@/api/vndb'
import VnList from '@/components/VnList.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const characterId = ref(route.params.id)

const character = ref({
  id: characterId.value,
  name: t('common.loading'),
  original: '',
  gender: '',
  description: '',
  image: null
})

const items = ref([])
const isLoading = ref(true)
const charLoading = ref(true)
const hasMore = ref(false)
const page = ref(1)
const resultsPerPage = 20

async function fetchCharacterInfo() {
  charLoading.value = true
  try {
    // 使用 POST /character 获取详情
    const res = await request('/character', {
      method: 'POST',
      body: JSON.stringify({
        filters: ['id', '=', characterId.value],
        fields: 'id, name, original, description, image{url,thumbnail}, sex'
      })
    })
    if (res && res.results && res.results.length > 0) {
      character.value = res.results[0]
    }
  } catch (err) {
    console.error('获取角色详情失败:', err)
  } finally {
    charLoading.value = false
  }
}

async function fetchList(reset = true) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  
  isLoading.value = true
  try {
    // 获取关联该角色的 VN 列表
    const filters = ['character', '=', ['id', '=', characterId.value]]
    const res = await getVnList(filters, {
      page: page.value,
      results: resultsPerPage,
      sort: 'rating',
      reverse: true
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
    console.error('获取角色相关VN列表失败:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadMore() {
  if (isLoading.value || !hasMore.value) return
  page.value += 1
  await fetchList(false)
}

onMounted(() => {
  fetchCharacterInfo()
  fetchList(true)
})
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
      <span class="text-xs font-semibold text-neutral-500">{{ t('vn.character_details') }}</span>
      <div class="w-8"></div>
    </div>

    <div class="space-y-6">
      <div class="flex items-start gap-4">
        <div class="w-24 h-32 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex-shrink-0">
          <img 
            v-if="character.image?.url" 
            :src="character.image.url" 
            class="w-full h-full object-cover" 
          />
          <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
            <Icon icon="lucide:user" class="h-10 w-10" />
          </div>
        </div>
        <div class="min-w-0 flex-1 pt-1">
          <h1 class="text-xl font-bold tracking-tight text-neutral-900 truncate">{{ character.name }}</h1>
          <p class="text-xs text-neutral-400 mt-1" v-if="character.original">{{ character.original }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="px-2 py-0.5 rounded-full bg-neutral-100 text-[10px] text-neutral-500 font-medium">ID: {{ character.id }}</span>
            <span v-if="character.sex" class="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] text-blue-600 font-medium uppercase border border-blue-100">{{ character.sex[0] }}</span>
          </div>
        </div>
      </div>

      <div v-if="character.description" class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.description') }}</h3>
        <div class="rounded-lg border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">
          {{ character.description }}
        </div>
      </div>

      <!-- 相关作品 -->
      <div class="space-y-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.relations') }}</h3>
        <VnList
          :items="items"
          :is-loading="isLoading"
          :has-more="hasMore"
          :show-sort="false"
          storage-key="vndb_char_vn_layout"
          @load-more="loadMore"
        />
      </div>
    </div>
  </div>
</template>
