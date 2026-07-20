<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { CapacitorHttp } from '@capacitor/core'
import { useI18n } from 'vue-i18n'
import { useTranslation } from '@/composables/useTranslation'

const { t, locale } = useI18n()
const { translateTagName } = useTranslation()

const props = defineProps({
  tag: {
    type: Object,
    required: true
    // { id, name, description, category, vn_count }
  }
})

const emit = defineEmits(['remove', 'show-detail'])

const showTooltip = ref(false)
const translatedDescription = ref('')
const translationLoading = ref(false)
const translationError = ref('')
const translationSourceText = ref('')

const getCategoryClass = (category) => {
  const classes = {
    'cont': 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800/50',
    'tech': 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800/50',
    'ero': 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800/50',
  }
  return classes[category] || 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:text-neutral-400 dark:bg-neutral-800 dark:border-neutral-700'
}

function handleRemove(e) {
  e.stopPropagation()
  emit('remove', props.tag)
}

function handleClick() {
  showTooltip.value = !showTooltip.value
}

function handleDetail() {
  showTooltip.value = false
  emit('show-detail', props.tag)
}

function cleanDescription(desc) {
  if (!desc) return ''
  return desc.replace(/\[\/?\w+.*?\]/g, '').trim()
}

function resetDescriptionTranslation() {
  translatedDescription.value = ''
  translationLoading.value = false
  translationError.value = ''
  translationSourceText.value = ''
}

async function translateDescription() {
  const sourceText = cleanDescription(props.tag?.description || '')
  if (!sourceText) return
  if (translationLoading.value) return

  if (translatedDescription.value && translationSourceText.value === sourceText) {
    resetDescriptionTranslation()
  }

  translationLoading.value = true
  translationError.value = ''

  try {
    const response = await CapacitorHttp.post({
      url: 'https://workers.hekinyan.vip/v1/translate',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        locale: locale.value,
        messages: [
          {
            role: 'user',
            content: sourceText
          }
        ]
      }
    })

    const content = response?.data?.choices?.[0]?.message?.content?.trim()
    if (!content) {
      throw new Error(t('vn.translation.empty'))
    }

    translatedDescription.value = content
    translationSourceText.value = sourceText
  } catch (err) {
    console.error('标签简介翻译失败:', err)
    translationError.value = err?.response?.data?.error || err?.message || t('vn.translation.failed')
  } finally {
    translationLoading.value = false
  }
}
</script>

<template>
  <div class="relative inline-flex">
    <button
      @click="handleClick"
      class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border text-[11px] font-medium transition-all cursor-pointer hover:shadow-sm"
      :class="getCategoryClass(tag.category)"
    >
      <span class="max-w-[120px] truncate">{{ translateTagName(tag.name) }}</span>
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
        <div class="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[85vw] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in duration-150">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold border uppercase"
                :class="getCategoryClass(tag.category)"
              >
                {{ tag.category }}
              </span>
              <h3 class="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">{{ translateTagName(tag.name) }}</h3>
            </div>
            <button
              @click="showTooltip = false"
              class="shrink-0 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Icon icon="lucide:x" class="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            </button>
          </div>

          <!-- VN Count -->
          <div class="px-4 pb-2">
            <span class="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
              {{ tag.vn_count }} VNs
            </span>
          </div>

          <!-- Description -->
          <div v-if="tag.description" class="px-4 pb-3 space-y-3">
            <div class="max-h-[200px] overflow-y-auto space-y-3">
              <div class="flex items-start justify-between gap-3">
                <p class="flex-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap selectable-text">
                  {{ cleanDescription(tag.description) }}
                </p>
                <button
                  @click="translateDescription"
                  :disabled="translationLoading"
                  :title="translatedDescription ? t('vn.translation.retranslate') : t('vn.translation.action')"
                  :aria-label="translatedDescription ? t('vn.translation.retranslate') : t('vn.translation.action')"
                  class="shrink-0 inline-flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800 p-1.5 text-neutral-500 dark:text-neutral-400 transition disabled:cursor-not-allowed disabled:opacity-60 hover:border-neutral-300 hover:text-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
                >
                  <Icon :icon="translationLoading ? 'lucide:loader-circle' : 'lucide:languages'" class="h-3.5 w-3.5" :class="{ 'animate-spin': translationLoading }" />
                </button>
              </div>

              <div v-if="translatedDescription || translationError || translationLoading" class="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-900/20 p-3 space-y-2">
                <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                  <Icon icon="lucide:languages" class="h-3.5 w-3.5" />
                  <span>{{ t('vn.translation.title') }}</span>
                </div>
                <div v-if="translationLoading" class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <Icon icon="lucide:loader-circle" class="h-4 w-4 animate-spin" />
                  <span>{{ t('vn.translation.loading') }}</span>
                </div>
                <div v-else-if="translationError" class="text-xs leading-relaxed text-rose-500 dark:text-rose-400">
                  {{ translationError }}
                </div>
                <p v-else class="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap selectable-text">
                  {{ translatedDescription }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="px-4 pb-3">
            <p class="text-xs text-neutral-400 dark:text-neutral-500 italic">暂无描述</p>
          </div>

          <!-- Footer -->
          <div class="px-4 pb-4">
            <button
              @click="handleDetail"
              class="w-full py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white transition-colors cursor-pointer"
            >
              查看相关作品
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
