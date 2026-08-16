<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  version: { type: String, default: '' },
  releaseDate: { type: String, default: '' },
  releaseBody: { type: String, default: '' },
  downloadUrl: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel'])

const { t } = useI18n()
const ignoreThisVersion = ref(false)

watch(() => props.show, (val) => {
  if (val) {
    ignoreThisVersion.value = false
  }
})

function handleConfirm() {
  if (props.downloadUrl) {
    window.open(props.downloadUrl, '_blank')
  }
  emit('confirm', { ignore: ignoreThisVersion.value })
}

function handleCancel() {
  emit('cancel', { ignore: ignoreThisVersion.value })
}

function handleBackdropClick(e) {
  if (e.target === e.currentTarget) {
    handleCancel()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="update-dialog">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
        @click="handleBackdropClick"
      >
        <div class="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-5 border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh]">
          <!-- 头部 -->
          <div class="flex items-center gap-3 mb-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Icon icon="lucide:sparkles" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {{ t('update.new_version_available') }}
                </h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                  {{ version }}
                </span>
              </div>
              <p v-if="releaseDate" class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                {{ releaseDate }}
              </p>
            </div>
          </div>

          <!-- 更新日志内容 -->
          <div class="my-2 flex-1 overflow-y-auto max-h-60 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-3.5 border border-neutral-100 dark:border-neutral-800 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 select-text">
            <div v-if="releaseBody" class="whitespace-pre-line break-words font-sans">
              {{ releaseBody }}
            </div>
            <div v-else class="text-neutral-400 dark:text-neutral-500 italic">
              {{ t('update.no_changelog') }}
            </div>
          </div>

          <!-- 勾选本版本不再提示 -->
          <label class="flex items-center gap-2 mt-3 cursor-pointer select-none text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
            <input
              v-model="ignoreThisVersion"
              type="checkbox"
              class="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 dark:bg-neutral-800 cursor-pointer"
            />
            <span>{{ t('update.dont_remind_this_version') }}</span>
          </label>

          <!-- 按钮 -->
          <div class="flex gap-2.5 mt-4">
            <button
              class="flex-1 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-medium text-xs active:scale-95 transition-all cursor-pointer dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              @click="handleCancel"
            >
              {{ t('update.later') }}
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white font-medium text-xs active:scale-95 transition-all cursor-pointer dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white flex items-center justify-center gap-1.5"
              @click="handleConfirm"
            >
              <Icon icon="lucide:download" class="h-3.5 w-3.5" />
              <span>{{ t('update.update_now') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-dialog-enter-active,
.update-dialog-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.update-dialog-enter-from,
.update-dialog-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
