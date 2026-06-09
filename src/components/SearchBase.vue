<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  type: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
})

const { t } = useI18n()
const router = useRouter()
const query = ref('')

const goBack = () => router.back()
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button 
        @click="goBack"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs active:scale-95 transition-transform"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800" />
      </button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">{{ title }}</h1>
        <p class="text-xs text-neutral-500">搜索 {{ title }} 相关信息</p>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <Icon icon="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        v-model="query"
        type="search"
        :placeholder="`搜索${title}...`"
        class="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5 placeholder-neutral-400"
      />
    </div>

    <!-- Placeholder for list -->
    <div class="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-4">
      <div class="p-4 rounded-full bg-neutral-50">
        <Icon :icon="icon" class="h-8 w-8" />
      </div>
      <p class="text-sm">列表功能开发中...</p>
    </div>
  </div>
</template>
