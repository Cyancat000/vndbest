import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { IonicVue, createAnimation } from '@ionic/vue'
import { registerAppIcons } from './icons/register-icons'
import './style.css'

registerAppIcons()

// 根据 .env 中的 VITE_VCONSOLE 环境变量决定是否启用 vConsole 调试面板
if (import.meta.env.VITE_VCONSOLE === 'true') {
  const VConsole = (await import('vconsole')).default
  new VConsole()
}

const LEAVING_CLASS = 'app-page-leaving'
const PAGE_STYLE_KEYS = [
  'opacity',
  'transform',
  'visibility',
  'pointer-events',
  'z-index',
  'display'
]

/** 清掉页面上可能残留的过渡内联样式（Capacitor WebView 二次进入尤其关键） */
function resetPageChrome(el) {
  if (!el) return
  el.classList.remove('ion-page-invisible', 'ion-page-hidden', LEAVING_CLASS)
  for (const key of PAGE_STYLE_KEYS) {
    el.style.removeProperty(key)
  }
  // 兜底：若仍只剩空 style，去掉属性，避免 WebView 怪异残留
  if (el.getAttribute('style')?.trim() === '') {
    el.removeAttribute('style')
  }
}

/**
 * 自定义页面切换动画（尽量不污染内联样式）：
 * - 新页：短淡入 + 轻微位移；进入前强制 reset
 * - 旧页：用 class 立刻隐藏，不写 visibility 内联样式
 *   （APP 端二次进入时，残留 visibility:hidden 会导致白屏）
 */
const pageTransition = (_baseEl, opts = {}) => {
  const enteringEl = opts.enteringEl
  const leavingEl = opts.leavingEl
  const backDirection = opts.direction === 'back'
  const DURATION = 220

  const root = createAnimation().duration(DURATION).easing('cubic-bezier(0.32, 0.72, 0, 1)')

  if (enteringEl) {
    const fromX = backDirection ? '-12px' : '12px'
    const enter = createAnimation()
      .addElement(enteringEl)
      .beforeAddWrite(() => {
        resetPageChrome(enteringEl)
      })
      .beforeStyles({
        opacity: '0',
        transform: `translateX(${fromX})`,
        zIndex: '101'
      })
      .fromTo('opacity', '0', '1')
      .fromTo('transform', `translateX(${fromX})`, 'translateX(0px)')
      .afterAddWrite(() => {
        resetPageChrome(enteringEl)
      })

    root.addAnimation(enter)
  }

  if (leavingEl) {
    const leave = createAnimation()
      .addElement(leavingEl)
      .beforeAddWrite(() => {
        // 仅用 class 隐藏，避免 WebView 残留内联 visibility/opacity
        leavingEl.classList.add(LEAVING_CLASS)
      })
      // 占位动画，时长与 enter 对齐
      .fromTo('opacity', '1', '1')
      .afterAddWrite(() => {
        leavingEl.classList.add('ion-page-hidden')
        leavingEl.classList.add(LEAVING_CLASS)
      })

    root.addAnimation(leave)
  }

  return root
}

const app = createApp(App)
app.use(IonicVue, {
  animated: true,
  navAnimation: pageTransition
})
app.use(router)
app.use(i18n)

// 路由完成后再次清理当前可见页（APP 二次进入白屏兜底）
router.afterEach(() => {
  requestAnimationFrame(() => {
    const outlet = document.querySelector('ion-router-outlet')
    if (!outlet) return
    const pages = Array.from(outlet.children).filter((el) => el.classList?.contains('ion-page'))
    for (const page of pages) {
      if (!page.classList.contains('ion-page-hidden')) {
        resetPageChrome(page)
      }
    }
    // 再补一帧，覆盖 Ionic 动画结束后的写回
    setTimeout(() => {
      for (const page of pages) {
        if (!page.classList.contains('ion-page-hidden')) {
          resetPageChrome(page)
        }
      }
    }, 260)
  })
})

app.mount('#app')
