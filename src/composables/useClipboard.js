/**
 * 剪贴板复制工具
 * 优先使用 Clipboard API，失败时回退到 textarea + execCommand
 */
export function useClipboard() {
  /**
   * 复制文本到剪贴板
   * @param {string} text
   * @returns {Promise<boolean>} 是否复制成功
   */
  const copyText = async (text) => {
    const value = String(text ?? '').trim()
    if (!value) return false

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return true
      }
    } catch (err) {
      console.warn('Clipboard API 复制失败，尝试回退方案:', err)
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, value.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch (err) {
      console.error('复制失败:', err)
      return false
    }
  }

  return { copyText }
}
