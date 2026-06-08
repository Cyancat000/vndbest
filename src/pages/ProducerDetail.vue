<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const route = useRoute()
const router = useRouter()
const producerId = route.params.id

const producer = ref({
  id: producerId,
  name: '加载中...',
  original: '',
  description: '开发商/制作组详情接口已写好，这是临时占位符。'
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
      <span class="text-xs font-semibold text-neutral-500">Producer Details</span>
      <div class="w-8"></div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Icon icon="lucide:home" class="h-6 w-6 text-neutral-400" />
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-neutral-900">{{ producer.name }}</h1>
          <p class="text-xs text-neutral-400" v-if="producer.original">{{ producer.original }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs space-y-2">
        <div class="grid grid-cols-[80px_1fr] items-center gap-2 text-xs">
          <span class="text-neutral-400">ID</span>
          <span class="font-mono text-neutral-800">{{ producer.id }}</span>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">简介</h3>
        <div class="rounded-lg border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600">
          {{ producer.description }}
        </div>
      </div>
    </div>
  </div>
</template>
