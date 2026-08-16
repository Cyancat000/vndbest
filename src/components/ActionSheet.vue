<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  // 选项列表: Array<{ value: any, label: string, icon?: string, description?: string, destructive?: boolean, count?: number }>
  options: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: [String, Number, Array],
    default: null
  },
  multiple: {
    type: Boolean,
    default: false
  },
  cancelText: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:show', 'update:modelValue', 'select', 'confirm', 'cancel'])

const { t } = useI18n()

// 临时多选状态，多选模式下在弹层内勾选，点击“确定”或切换时提交
const localMultipleValue = ref([])

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.multiple) {
      localMultipleValue.value = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    }
    window.history.pushState({ actionSheetOpen: true }, '')
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

let ignoreNextPopState = false

function isSelected(val) {
  if (props.multiple) {
    return localMultipleValue.value.includes(val)
  }
  return props.modelValue === val
}

function handleSelect(option) {
  if (props.multiple) {
    // 选项如果标记为 destructive / value === 0（如"清空/移除"）
    if (option.value === 0 || option.destructive) {
      localMultipleValue.value = []
    } else {
      const idx = localMultipleValue.value.indexOf(option.value)
      if (idx >= 0) {
        localMultipleValue.value.splice(idx, 1)
      } else {
        localMultipleValue.value.push(option.value)
      }
    }
    emit('select', option, [...localMultipleValue.value])
  } else {
    emit('update:modelValue', option.value)
    emit('select', option)
    close(false)
  }
}

function handleConfirm() {
  if (props.multiple) {
    emit('update:modelValue', [...localMultipleValue.value])
    emit('confirm', [...localMultipleValue.value])
  }
  close(false)
}

function close(fromPopState = false) {
  if (!props.show) return

  if (!fromPopState) {
    ignoreNextPopState = true
  }

  emit('update:show', false)
  emit('cancel')

  if (!fromPopState && window.history.state?.actionSheetOpen) {
    window.history.back()
  }
}

function onPopState() {
  if (ignoreNextPopState) {
    ignoreNextPopState = false
    return
  }
  if (props.show) {
    close(true)
  }
}

onMounted(() => {
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="actionsheet-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
      >
        <!-- 遮罩 -->
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          @click="close(false)"
        ></div>

        <!-- 面板容器 -->
        <div
          class="relative w-full sm:max-w-md max-h-[85vh] sm:rounded-2xl rounded-t-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom duration-200"
        >
          <!-- 拖动小指示条（移动端手感） -->
          <div class="sm:hidden flex justify-center pt-2.5 pb-1">
            <div class="w-8 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></div>
          </div>

          <!-- 标题栏 -->
          <div v-if="title || description" class="px-5 pt-3 pb-2.5 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-3">
            <div>
              <h3 v-if="title" class="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{{ title }}</h3>
              <p v-if="description" class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{{ description }}</p>
            </div>
            <button
              @click="close(false)"
              class="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <Icon icon="lucide:x" class="h-4 w-4" />
            </button>
          </div>

          <!-- 选项列表 -->
          <div class="px-2 py-2 overflow-y-auto flex-1 divide-y divide-neutral-100/50 dark:divide-neutral-800/50 space-y-1">
            <button
              v-for="opt in options"
              :key="opt.value"
              @click="handleSelect(opt)"
              class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer"
              :class="[
                isSelected(opt.value)
                  ? 'bg-neutral-100 dark:bg-neutral-800/80 font-medium text-neutral-900 dark:text-neutral-100'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300',
                opt.destructive ? '!text-red-500 dark:!text-red-400' : ''
              ]"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <Icon
                  v-if="opt.icon"
                  :icon="opt.icon"
                  class="h-4 w-4 shrink-0"
                  :class="opt.destructive ? 'text-red-500 dark:text-red-400' : 'text-neutral-400 dark:text-neutral-500'"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm truncate leading-snug">{{ opt.label }}</span>
                    <span
                      v-if="opt.count !== undefined && opt.count !== null"
                      class="text-[10px] rounded-full px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50 shrink-0"
                    >
                      {{ opt.count }}
                    </span>
                  </div>
                  <p v-if="opt.description" class="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5">{{ opt.description }}</p>
                </div>
              </div>

              <!-- 勾选指示 -->
              <div v-if="multiple" class="shrink-0 flex items-center">
                <div
                  class="w-5 h-5 rounded-md border flex items-center justify-center transition"
                  :class="[
                    isSelected(opt.value)
                      ? 'bg-neutral-900 dark:bg-neutral-100 border-neutral-900 dark:border-neutral-100 text-white dark:text-neutral-900'
                      : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
                  ]"
                >
                  <Icon v-if="isSelected(opt.value)" icon="lucide:check" class="h-3.5 w-3.5" />
                </div>
              </div>
              <Icon
                v-else-if="isSelected(opt.value)"
                icon="lucide:check"
                class="h-4 w-4 text-neutral-900 dark:text-neutral-100 shrink-0"
              />
            </button>
          </div>

          <!-- 底部按钮区 -->
          <div class="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center gap-2">
            <button
              @click="close(false)"
              class="flex-1 py-2.5 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer text-center"
            >
              {{ cancelText || t('vn.status.cancel') || '取消' }}
            </button>
            <button
              v-if="multiple"
              @click="handleConfirm"
              class="flex-1 py-2.5 px-4 text-xs font-semibold text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl transition cursor-pointer text-center shadow-xs"
            >
              {{ confirmText || t('vn.status.confirm') || '确定' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.actionsheet-fade-enter-active,
.actionsheet-fade-leave-active {
  transition: opacity 0.2s ease;
}

.actionsheet-fade-enter-from,
.actionsheet-fade-leave-to {
  opacity: 0;
}
</style>
