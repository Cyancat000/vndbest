import { ref } from 'vue'

const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref('success') // 'success' | 'error'
let toastTimer = null

/**
 * 全局 Toast 提示（跨页面共享状态，配合 AppToast 使用）
 */
export function useToast() {
  const showToast = (message, type = 'success', duration = 2000) => {
    toastMessage.value = message
    toastType.value = type
    toastVisible.value = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastVisible.value = false
    }, duration)
  }

  return {
    toastVisible,
    toastMessage,
    toastType,
    showToast
  }
}
