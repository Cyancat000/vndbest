<script setup>
import { ref, watch } from 'vue'
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
  },
  modelValue: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear'])

const { t } = useI18n()
const router = useRouter()
const localQuery = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  localQuery.value = newVal
})

const handleInput = (e) => {
  localQuery.value = e.target.value
  emit('update:modelValue', e.target.value)
}

const handleSearch = () => {
  emit('search', localQuery.value)
}

const handleClear = () => {
  localQuery.value = ''
  emit('update:modelValue', '')
  emit('clear')
}

const goBack = () => router.back()
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4 py-3 sticky top-0 bg-white/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100">
      <button 
        @click="goBack"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs active:scale-95 transition-transform cursor-pointer"
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
      <Icon 
        v-if="!loading"
        icon="lucide:search" 
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" 
      />
      <Icon 
        v-else
        icon="eos-icons:loading" 
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" 
      />
      <input
        :value="localQuery"
        @input="handleInput"
        @keydown.enter="handleSearch"
        type="search"
        :placeholder="`搜索${title}...`"
        class="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-10 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5 placeholder-neutral-400"
      />
      <button 
        v-if="localQuery"
        @click="handleClear"
        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
      >
        <Icon icon="lucide:x" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Filters Slot -->
    <div class="relative z-20">
      <slot name="filters"></slot>
    </div>

    <!-- Results Slot -->
    <div class="min-h-[200px] relative z-10">
      <slot></slot>
      
      <!-- Default Empty State (if no slot content and not searching) -->
      <div v-if="!$slots.default && !localQuery" class="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-4">
        <div class="p-4 rounded-full bg-neutral-50">
          <Icon :icon="icon" class="h-8 w-8" />
        </div>
        <p class="text-sm">输入关键词开始搜索</p>
      </div>
    </div>
  </div>
</template>
