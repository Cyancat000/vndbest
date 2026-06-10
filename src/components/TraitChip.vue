<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useTranslation } from '@/composables/useTranslation'

const { translateTraitName } = useTranslation()

const props = defineProps({
  trait: {
    type: Object,
    required: true
    // { id, name, description, group_name, group_id, char_count }
  }
})

const emit = defineEmits(['remove', 'show-detail'])

const showTooltip = ref(false)

function handleRemove(e) {
  e.stopPropagation()
  emit('remove', props.trait)
}

function handleClick() {
  showTooltip.value = !showTooltip.value
}

function handleDetail() {
  showTooltip.value = false
  emit('show-detail', props.trait)
}

function cleanDescription(desc) {
  if (!desc) return ''
  return desc.replace(/\[\/?\w+.*?\]/g, '').trim()
}
</script>

<template>
  <div class="relative inline-flex">
    <button
      @click="handleClick"
      class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border text-[11px] font-medium transition-all cursor-pointer hover:shadow-sm bg-violet-50 text-violet-600 border-violet-200"
    >
      <span class="max-w-[120px] truncate">{{ translateTraitName(trait.name) }}</span>
      <span
        @click="handleRemove"
        class="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
      >
        <Icon icon="lucide:x" class="h-3 w-3" />
      </span>
    </button>

    <!-- 点击后弹出的简要信息 -->
    <Teleport to="body">
      <div
        v-if="showTooltip"
        class="fixed inset-0 z-[100]"
        @click.self="showTooltip = false"
      >
        <div class="fixed inset-0 bg-black/20" @click="showTooltip = false"></div>
        <div class="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[85vw] bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-150">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold border uppercase bg-violet-50 text-violet-600 border-violet-200"
              >
                {{ trait.group_name || 'trait' }}
              </span>
              <h3 class="font-bold text-sm text-neutral-900 truncate">{{ translateTraitName(trait.name) }}</h3>
            </div>
            <button
              @click="showTooltip = false"
              class="shrink-0 p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Icon icon="lucide:x" class="h-4 w-4 text-neutral-400" />
            </button>
          </div>

          <!-- Char Count -->
          <div class="px-4 pb-2">
            <span class="text-[11px] text-neutral-400 font-medium">
              {{ trait.char_count }} Characters
            </span>
          </div>

          <!-- Description -->
          <div v-if="trait.description" class="px-4 pb-3 max-h-[200px] overflow-y-auto">
            <p class="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap">
              {{ cleanDescription(trait.description) }}
            </p>
          </div>
          <div v-else class="px-4 pb-3">
            <p class="text-xs text-neutral-400 italic">暂无描述</p>
          </div>

          <!-- Footer -->
          <div class="px-4 pb-4">
            <button
              @click="handleDetail"
              class="w-full py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              查看相关角色
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
