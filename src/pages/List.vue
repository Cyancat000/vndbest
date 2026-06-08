<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const items = ref([
  { id: '1', title: 'Steins;Gate', status: 'Playing', rating: 9.5 },
  { id: '2', title: 'Fate/stay night', status: 'Completed', rating: 9.0 },
  { id: '3', title: 'Clannad', status: 'Plan to play', rating: null }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Icon icon="lucide:file-text" class="h-5 w-5 text-neutral-800" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">List</h1>
        <p class="text-xs text-neutral-500">管理你的 Visual Novels 收藏清单</p>
      </div>
    </div>

    <!-- 列表展示 (Notion Style List) -->
    <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
      <div class="border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5 flex items-center justify-between">
        <span class="text-xs font-semibold text-neutral-500">名称</span>
        <span class="text-xs font-semibold text-neutral-500">状态</span>
      </div>

      <div class="divide-y divide-neutral-100">
        <div 
          v-for="item in items" 
          :key="item.id" 
          class="flex items-center justify-between p-4 hover:bg-neutral-50 transition"
        >
          <div class="min-w-0 pr-4">
            <span class="text-sm font-semibold text-neutral-900 block truncate">{{ item.title }}</span>
            <span class="text-xs text-neutral-400 mt-1 flex items-center gap-1" v-if="item.rating">
              <Icon icon="lucide:star" class="h-3 w-3 fill-amber-400 stroke-amber-400" />
              {{ item.rating }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span 
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
              :class="{
                'bg-blue-50 text-blue-700 border-blue-100': item.status === 'Playing',
                'bg-green-50 text-green-700 border-green-100': item.status === 'Completed',
                'bg-neutral-50 text-neutral-600 border-neutral-200': item.status === 'Plan to play'
              }"
            >
              {{ item.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
