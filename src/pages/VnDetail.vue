<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getVnDetail } from '@/api/vndb'

const route = useRoute()
const router = useRouter()
const vnId = route.params.id

const vn = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await getVnDetail(vnId)
    if (data && data.results && data.results.length > 0) {
      vn.value = data.results[0]
    }
  } catch (err) {
    console.error('获取VN详情失败:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6 pb-8">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
      <button 
        @click="router.back()"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600" />
      </button>
      <span class="text-xs font-semibold text-neutral-500">Visual Novel Details</span>
      <div class="w-8"></div> <!-- 占位符以居中标题 -->
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-40 rounded-xl bg-neutral-100"></div>
      <div class="h-8 rounded-lg bg-neutral-100 w-2/3"></div>
      <div class="h-4 rounded-lg bg-neutral-100 w-1/2"></div>
      <div class="space-y-2">
        <div class="h-4 rounded-lg bg-neutral-100"></div>
        <div class="h-4 rounded-lg bg-neutral-100"></div>
        <div class="h-4 rounded-lg bg-neutral-100 w-4/5"></div>
      </div>
    </div>

    <!-- 详情内容 (Notion Style Layout) -->
    <div v-else-if="vn" class="space-y-6">
      <!-- 封面图 -->
      <div class="relative h-44 sm:h-52 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
        <img 
          v-if="vn.image?.url" 
          :src="vn.image.url" 
          :alt="vn.title" 
          class="h-full w-full object-cover object-top"
        />
        <div v-else class="h-full w-full flex items-center justify-center bg-neutral-100">
          <Icon icon="lucide:image" class="h-10 w-10 text-neutral-300" />
        </div>
      </div>

      <!-- 标题 -->
      <div class="space-y-1">
        <h1 class="text-xl font-bold tracking-tight text-neutral-900 leading-tight">{{ vn.title }}</h1>
        <p class="text-xs text-neutral-400 font-medium">{{ vn.alttitle }}</p>
      </div>

      <!-- 信息面板 (Notion Properties block) -->
      <div class="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs space-y-2">
        <div class="grid grid-cols-[80px_1fr] items-center gap-2 text-xs">
          <span class="text-neutral-400">ID</span>
          <span class="font-mono text-neutral-800">{{ vn.id }}</span>
        </div>
        <div class="grid grid-cols-[80px_1fr] items-center gap-2 text-xs" v-if="vn.released">
          <span class="text-neutral-400">Released</span>
          <span class="text-neutral-800">{{ vn.released }}</span>
        </div>
        <div class="grid grid-cols-[80px_1fr] items-center gap-2 text-xs" v-if="vn.olang">
          <span class="text-neutral-400">Language</span>
          <span class="uppercase text-neutral-800">{{ vn.olang }}</span>
        </div>
      </div>

      <!-- 描述 (Notion Style Block Quote) -->
      <div class="space-y-2" v-if="vn.description">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">简介</h3>
        <div class="rounded-lg border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">
          {{ vn.description }}
        </div>
      </div>

      <!-- 角色关联列表 -->
      <div class="space-y-2" v-if="vn.relations && vn.relations.length > 0">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">相关作品</h3>
        <div class="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
          <div 
            v-for="rel in vn.relations" 
            :key="rel.id"
            @click="router.push(`/vn/${rel.id}`)"
            class="flex items-center justify-between p-3 text-xs hover:bg-neutral-50 active:bg-neutral-100 transition cursor-pointer"
          >
            <span class="font-medium text-neutral-800 truncate pr-4">{{ rel.title }}</span>
            <span class="text-[10px] text-neutral-400 flex-shrink-0 uppercase bg-neutral-100 px-1.5 py-0.5 rounded-sm">{{ rel.relation_official }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else class="text-center py-12 text-sm text-neutral-400">
      找不到该 Visual Novel 详情信息
    </div>
  </div>
</template>
