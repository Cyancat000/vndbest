<script setup>
/**
 * 页面顶栏组件，统一 sticky + safe-area 样式。
 *
 * 模式:
 * - page:   左侧图标 + 大标题/副标题（Home / Library / Settings 根）
 * - back:   返回按钮 + 大标题/副标题（Login / Search / Settings 子页）
 * - detail: 返回按钮 + 中号标题 + ID 副标题（Character/Producer/Staff 详情）
 * - center: 紧凑返回 + 居中小标题（VnDetail / ReleaseDetail）
 *
 * 插槽:
 * - leading: 覆盖左侧图标/按钮区域
 * - actions: 右侧操作区
 * - default: 完全自定义中间内容（少用）
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const props = defineProps({
  /** 布局模式 */
  mode: {
    type: String,
    default: 'page',
    validator: (v) => ['page', 'back', 'detail', 'center'].includes(v)
  },
  /** 主标题 */
  title: {
    type: String,
    default: ''
  },
  /** 副标题 / 描述 / ID */
  subtitle: {
    type: String,
    default: ''
  },
  /** page 模式左侧图标 (lucide:xxx) */
  icon: {
    type: String,
    default: ''
  },
  /**
   * 内边距尺寸:
   * - md: 默认 page-sticky-header
   * - lg: page-sticky-header--lg（详情页）
   * center 模式固定用 md
   */
  size: {
    type: String,
    default: null,
    validator: (v) => v == null || ['md', 'lg'].includes(v)
  },
  /** 是否显示返回按钮（back/detail/center 默认 true；page 默认 false） */
  showBack: {
    type: Boolean,
    default: undefined
  },
  /** 自定义返回行为；不传则 router.back() */
  onBack: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['back'])

const router = useRouter()

const resolvedShowBack = computed(() => {
  if (props.showBack !== undefined) return props.showBack
  return props.mode !== 'page'
})

const resolvedSize = computed(() => {
  if (props.size) return props.size
  return props.mode === 'detail' ? 'lg' : 'md'
})

const rootClass = computed(() => {
  const classes = ['page-sticky-header']
  if (resolvedSize.value === 'lg') classes.push('page-sticky-header--lg')

  if (props.mode === 'center') {
    classes.push('flex', 'items-center', 'justify-between')
  } else if (props.mode === 'detail') {
    classes.push('flex', 'items-center', 'gap-4')
  } else {
    // page / back：有 actions 时两端对齐
    classes.push('flex', 'items-center', 'gap-3')
  }
  return classes.join(' ')
})

function handleBack() {
  emit('back')
  if (props.onBack) {
    props.onBack()
    return
  }
  router.back()
}
</script>

<template>
  <div :class="rootClass">
    <!-- ===== center 模式 ===== -->
    <template v-if="mode === 'center'">
      <button
        v-if="resolvedShowBack"
        type="button"
        @click="handleBack"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-600 transition active:scale-95 cursor-pointer"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
      </button>
      <div v-else class="w-8" />

      <slot>
        <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{{ title }}</span>
      </slot>

      <div class="min-w-8 flex items-center justify-end">
        <slot name="actions">
          <div class="w-8" />
        </slot>
      </div>
    </template>

    <!-- ===== page / back / detail ===== -->
    <template v-else>
      <!-- 左侧 leading -->
      <slot name="leading">
        <button
          v-if="resolvedShowBack"
          type="button"
          @click="handleBack"
          class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs active:scale-95 transition-transform cursor-pointer shrink-0"
        >
          <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
        </button>
        <div
          v-else-if="icon"
          class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs shrink-0"
        >
          <Icon :icon="icon" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
        </div>
      </slot>

      <!-- 标题区 -->
      <div class="flex-1 min-w-0">
        <slot>
          <h1
            class="font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
            :class="mode === 'detail'
              ? 'text-lg truncate'
              : 'text-2xl'"
          >
            {{ title }}
          </h1>
          <p
            v-if="subtitle"
            :class="mode === 'detail'
              ? 'text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest'
              : 'text-xs text-neutral-500 dark:text-neutral-400'"
          >
            {{ subtitle }}
          </p>
        </slot>
      </div>

      <!-- 右侧操作 -->
      <div v-if="$slots.actions" class="shrink-0 flex items-center">
        <slot name="actions" />
      </div>
    </template>
  </div>
</template>
