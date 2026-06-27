<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  options: {
    type: Array,
    required: true
  },
  // 允许外部传入翻译函数或自定义标签处理
  labelRenderer: {
    type: Function,
    default: (label) => label
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const containerRef = ref(null)
const menuRef = ref(null)
const menuPosition = ref('left-0 mt-1')
const menuDirection = ref('down')
const scrollThreshold = 24
let openTriggerRect = null
let scrollTargets = []

const currentOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const currentLabel = computed(() => {
  return currentOption.value ? props.labelRenderer(currentOption.value.label) : ''
})

function closeMenu() {
  isOpen.value = false
  detachScrollListener()
}

async function openMenu() {
  isOpen.value = true
  await nextTick()
  calculatePosition()
  attachScrollListener()
}

async function toggleMenu() {
  if (isOpen.value) {
    closeMenu()
    return
  }

  await openMenu()
}

function calculatePosition() {
  if (!menuRef.value || !containerRef.value) return

  const menuRect = menuRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let horizontalClass = 'left-0'
  let verticalClass = 'mt-1'
  let direction = 'down'

  // 检查右侧溢出
  if (menuRect.right > viewportWidth - 10) {
    horizontalClass = 'right-0'
  }

  // 检查底部溢出 (如果需要向上弹出)
  if (menuRect.bottom > viewportHeight - 10) {
    // 简单逻辑：如果下方空间不足，则向上弹出
    // 这里的 'bottom-full mb-1' 需要父容器是 relative
    verticalClass = 'bottom-full mb-1'
    direction = 'up'
  }

  menuDirection.value = direction
  menuPosition.value = `${horizontalClass} ${verticalClass}`
}

function handleSelect(value) {
  emit('update:modelValue', value)
  closeMenu()
}

function getScrollTargets() {
  const targets = [window]
  const pageEl = containerRef.value?.closest('.ion-page')
  const ionContent = pageEl?.querySelector('ion-content')
  const innerScroll = ionContent?.shadowRoot?.querySelector('.inner-scroll')

  if (innerScroll) {
    targets.push(innerScroll)
  }

  return targets
}

function getTriggerRect() {
  const trigger = containerRef.value
  if (!trigger) return null

  const { top, left, width, height } = trigger.getBoundingClientRect()
  return { top, left, width, height }
}

function handleScrollClose() {
  if (!isOpen.value || !openTriggerRect) return

  const currentRect = getTriggerRect()
  if (!currentRect) return

  const movedY = Math.abs(currentRect.top - openTriggerRect.top)
  const movedX = Math.abs(currentRect.left - openTriggerRect.left)
  const resized = Math.abs(currentRect.width - openTriggerRect.width) > 1 || Math.abs(currentRect.height - openTriggerRect.height) > 1

  if (movedY >= scrollThreshold || movedX >= scrollThreshold || resized) {
    closeMenu()
  }
}

function attachScrollListener() {
  detachScrollListener()
  openTriggerRect = getTriggerRect()
  scrollTargets = getScrollTargets()

  scrollTargets.forEach((target) => {
    if (target === window) {
      target.addEventListener('scroll', handleScrollClose, { passive: true, capture: true })
      return
    }

    target.addEventListener('scroll', handleScrollClose, { passive: true })
  })

  window.addEventListener('resize', handleScrollClose, { passive: true })
}

function detachScrollListener() {
  scrollTargets.forEach((target) => {
    if (target === window) {
      target.removeEventListener('scroll', handleScrollClose, true)
      return
    }

    target.removeEventListener('scroll', handleScrollClose)
  })

  window.removeEventListener('resize', handleScrollClose)
  scrollTargets = []
  openTriggerRect = null
}

function handleClickOutside(event) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  detachScrollListener()
})
</script>

<template>
  <div class="relative block w-full" ref="containerRef">
    <button
      type="button"
      @click="toggleMenu"
      class="flex w-full items-center justify-between gap-1.5 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 cursor-pointer"
    >
      <slot name="prefix"></slot>
      <span>{{ currentLabel }}</span>
      <Icon 
        icon="lucide:chevron-down" 
        class="h-3 w-3 text-neutral-400 dark:text-neutral-500 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }" 
      />
    </button>

    <Transition name="select-menu">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="absolute min-w-[140px] w-max max-w-[220px] z-50 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-1 shadow-lg ring-1 ring-black/5 dark:ring-white/5 max-h-[40vh] overflow-y-auto"
        :class="[menuPosition, menuDirection === 'up' ? 'origin-bottom' : 'origin-top']"
      >
        <button
          v-for="opt in options"
          :key="opt.value"
          @click="handleSelect(opt.value)"
          class="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-md transition cursor-pointer"
          :class="modelValue === opt.value ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100'"
        >
          <span>{{ labelRenderer(opt.label) }}</span>
          <Icon v-if="modelValue === opt.value" icon="lucide:check" class="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.select-menu-enter-active,
.select-menu-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.select-menu-enter-from,
.select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.origin-bottom.select-menu-enter-from,
.origin-bottom.select-menu-leave-to {
  transform: translateY(4px) scale(0.98);
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
