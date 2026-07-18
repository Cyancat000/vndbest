import { ref, watch, computed } from 'vue'

const BG_KEY = 'vndb_custom_bg'

/** @type {import('vue').Ref<string|null>} */
const backgroundImage = ref(null)
/** 背景图片不透明度 0–100 */
const backgroundOpacity = ref(40)
/** 高斯模糊强度（px）0–40 */
const backgroundBlur = ref(12)

let initialized = false

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(BG_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      if (typeof data.image === 'string' && data.image.startsWith('data:image/')) {
        backgroundImage.value = data.image
      }
      if (typeof data.opacity === 'number') {
        backgroundOpacity.value = clamp(data.opacity, 0, 100)
      }
      if (typeof data.blur === 'number') {
        backgroundBlur.value = clamp(data.blur, 0, 40)
      }
    }
  } catch (e) {
    console.warn('Failed to load custom background settings:', e)
  }
}

function saveToStorage() {
  try {
    if (!backgroundImage.value) {
      localStorage.removeItem(BG_KEY)
      return
    }
    localStorage.setItem(
      BG_KEY,
      JSON.stringify({
        image: backgroundImage.value,
        opacity: backgroundOpacity.value,
        blur: backgroundBlur.value
      })
    )
  } catch (e) {
    // 可能超出 localStorage 配额
    console.error('Failed to save custom background settings:', e)
    throw e
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function applyDocumentClass() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('has-custom-bg', !!backgroundImage.value)
}

/**
 * 将选中的图片压缩为 JPEG data URL，避免 localStorage 爆仓。
 * Web / Capacitor WebView 通用。
 */
export function compressImageFile(file, maxSide = 1920, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Invalid image file'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      try {
        let { naturalWidth: width, naturalHeight: height } = img
        if (!width || !height) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Invalid image dimensions'))
          return
        }

        const scale = Math.min(1, maxSide / Math.max(width, height))
        width = Math.round(width * scale)
        height = Math.round(height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Canvas not supported'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(objectUrl)

        // 优先 JPEG 以减小体积；若失败则回退 PNG
        let dataUrl
        try {
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        } catch {
          dataUrl = canvas.toDataURL('image/png')
        }
        resolve(dataUrl)
      } catch (err) {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

/**
 * 跨端选择图片：
 * - 网页端：系统文件选择器
 * - 手机端 Capacitor WebView：系统相册 / 文件选择器
 * 均通过用户手势触发的 input[type=file] 完成，无需额外原生插件。
 */
export function pickImageFile({ accept = 'image/*' } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    // 不设置 capture，移动端会优先弹出相册/文件选择而不是直接打开相机
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.opacity = '0'

    let settled = false

    const cleanup = () => {
      input.removeEventListener('change', onChange)
      window.removeEventListener('focus', onFocus)
      if (input.parentNode) input.parentNode.removeChild(input)
    }

    const onChange = () => {
      if (settled) return
      settled = true
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        reject(new Error('cancelled'))
        return
      }
      resolve(file)
    }

    // 部分移动浏览器取消选择时不会触发 change，用 focus 兜底
    const onFocus = () => {
      setTimeout(() => {
        if (settled) return
        if (!input.files?.length) {
          settled = true
          cleanup()
          reject(new Error('cancelled'))
        }
      }, 500)
    }

    input.addEventListener('change', onChange)
    document.body.appendChild(input)
    // 下一帧再监听 focus，避免 click 前的 focus 干扰
    setTimeout(() => window.addEventListener('focus', onFocus), 0)
    input.click()
  })
}

function ensureInit() {
  if (initialized) return
  initialized = true
  loadFromStorage()
  applyDocumentClass()

  // 模块级只注册一次，避免 App / Settings 多次 useBackground 重复 watch
  watch([backgroundImage, backgroundOpacity, backgroundBlur], () => {
    applyDocumentClass()
    try {
      saveToStorage()
    } catch {
      // 保存失败时不阻断 UI，由调用方处理提示
    }
  })
}

// 模块加载时立即初始化，避免首屏闪烁
if (typeof window !== 'undefined') {
  ensureInit()
}

const hasCustomBackground = computed(() => !!backgroundImage.value)

const backgroundLayerStyle = computed(() => {
  if (!backgroundImage.value) return null
  const opacity = clamp(backgroundOpacity.value, 0, 100) / 100
  const blur = clamp(backgroundBlur.value, 0, 40)
  return {
    backgroundImage: `url("${backgroundImage.value}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: String(opacity),
    // 放大一层避免 blur 边缘露底
    transform: blur > 0 ? 'scale(1.12)' : 'scale(1)',
    filter: blur > 0 ? `blur(${blur}px)` : 'none'
  }
})

async function selectBackgroundImage() {
  const file = await pickImageFile()
  const dataUrl = await compressImageFile(file)
  backgroundImage.value = dataUrl
  // 确保立即落盘并抛出配额错误
  saveToStorage()
  applyDocumentClass()
  return dataUrl
}

function clearBackgroundImage() {
  backgroundImage.value = null
  applyDocumentClass()
  try {
    localStorage.removeItem(BG_KEY)
  } catch {
    /* ignore */
  }
}

function setOpacity(value) {
  backgroundOpacity.value = clamp(Number(value) || 0, 0, 100)
}

function setBlur(value) {
  backgroundBlur.value = clamp(Number(value) || 0, 0, 40)
}

export function useBackground() {
  ensureInit()

  return {
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
    hasCustomBackground,
    backgroundLayerStyle,
    selectBackgroundImage,
    clearBackgroundImage,
    setOpacity,
    setBlur
  }
}
