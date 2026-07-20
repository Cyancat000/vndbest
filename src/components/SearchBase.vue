<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import AppHeader from '@/components/AppHeader.vue'
import SaveSearchDialog from './SaveSearchDialog.vue'
import { useSavedSearches, SEARCH_TYPE_MAP } from '@/composables/useSavedSearches'

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
  },
  /** 当前筛选条件，用于保存功能 */
  filters: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear', 'refresh'])

const { t } = useI18n()
const { getByType, add, isNameExists } = useSavedSearches()

const localQuery = ref(props.modelValue)

// 保存弹窗状态
const showSaveDialog = ref(false)
const existingNames = computed(() => getByType(props.type).map(item => item.name))

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

/** 搜索/刷新按钮 */
const handleRefresh = () => {
  emit('refresh')
}

/** 打开保存弹窗 */
const handleSaveClick = () => {
  showSaveDialog.value = true
}

/** 确认保存 */
const handleSaveConfirm = (name) => {
  add({
    name,
    type: props.type,
    filters: { ...props.filters }
  })
  showSaveDialog.value = false
}

/** 取消保存 */
const handleSaveCancel = () => {
  showSaveDialog.value = false
}

// 暴露保存弹窗控制给父组件使用（通过 template ref）
defineExpose({
  openSaveDialog: handleSaveClick
})
</script>

<template>
  <div class="space-y-6">
    <AppHeader mode="back" :title="title" :subtitle="`搜索 ${title} 相关信息`" />

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
        type="text"
        :placeholder="`搜索${title}...`"
        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-16 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5 placeholder-neutral-400 dark:placeholder-neutral-500"
      />
      <!-- 清除按钮 -->
      <button
        v-if="localQuery"
        @click="handleClear"
        class="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
      >
        <Icon icon="lucide:x" class="h-3.5 w-3.5" />
      </button>
      <!-- 搜索按钮（搜索框内部） -->
      <button
        @click="handleSearch"
        class="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md bg-white text-neutral-900 hover:bg-neutral-100 border border-neutral-200 dark:!bg-neutral-800 dark:!text-neutral-100 dark:hover:!bg-neutral-700 dark:!border-neutral-700 active:scale-95 transition-all cursor-pointer shrink-0"
        title="搜索"
      >
        <Icon icon="lucide:search" class="h-3.5 w-3.5" />
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
      <div v-if="!$slots.default && !localQuery" class="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500 space-y-4">
        <div class="p-4 rounded-full bg-neutral-50 dark:bg-neutral-800">
          <Icon :icon="icon" class="h-8 w-8" />
        </div>
        <p class="text-sm">输入关键词开始搜索</p>
      </div>
    </div>

    <!-- 保存搜索弹窗 -->
    <SaveSearchDialog
      :show="showSaveDialog"
      :existing-names="existingNames"
      :initial-name="''"
      @confirm="handleSaveConfirm"
      @cancel="handleSaveCancel"
    />
  </div>
</template>
