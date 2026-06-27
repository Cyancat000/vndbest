import { ref, watch, onMounted, onUnmounted } from 'vue'

const THEME_KEY = 'vndb_theme'

// 模块级共享状态
const themeMode = ref('system') // 'system' | 'light' | 'dark'
const isDark = ref(false)

let mediaQuery = null
function onSystemThemeChange() {
  if (themeMode.value === 'system') {
    applyTheme()
  }
}

function applyTheme() {
  let shouldBeDark = false

  if (themeMode.value === 'dark') {
    shouldBeDark = true
  } else if (themeMode.value === 'light') {
    shouldBeDark = false
  } else {
    // system
    shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  isDark.value = shouldBeDark

  if (shouldBeDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  onMounted(() => {
    // 从 localStorage 读取保存的主题设置
    const saved = localStorage.getItem(THEME_KEY)
    if (saved && ['system', 'light', 'dark'].includes(saved)) {
      themeMode.value = saved
    }

    applyTheme()

    // 监听系统主题变化
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemThemeChange)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', onSystemThemeChange)
    }
  })

  watch(themeMode, (newMode) => {
    localStorage.setItem(THEME_KEY, newMode)
    applyTheme()
  })

  return {
    themeMode,
    isDark
  }
}
