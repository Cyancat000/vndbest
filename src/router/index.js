import { createRouter } from '@ionic/vue-router'
import { createWebHashHistory, START_LOCATION } from 'vue-router'
import Home from '@/pages/Home.vue'
import Library from '@/pages/Library.vue'
import List from '@/pages/List.vue'
import Settings from '@/pages/Settings.vue'
import Login from '@/pages/Login.vue'
import VnDetail from '@/pages/VnDetail.vue'
import CharacterDetail from '@/pages/CharacterDetail.vue'
import ProducerDetail from '@/pages/ProducerDetail.vue'
import VnSearch from '@/pages/VnSearch.vue'
import ReleaseSearch from '@/pages/ReleaseSearch.vue'
import ProducerSearch from '@/pages/ProducerSearch.vue'
import StaffSearch from '@/pages/StaffSearch.vue'
import StaffDetail from '@/pages/StaffDetail.vue'
import CharacterSearch from '@/pages/CharacterSearch.vue'
import TagSearch from '@/pages/TagSearch.vue'
import TraitSearch from '@/pages/TraitSearch.vue'
import ReleaseDetail from '@/pages/ReleaseDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { showTabBar: true }
  },
  {
    path: '/library',
    name: 'Library',
    component: Library,
    meta: { showTabBar: true }
  },
  {
    path: '/list',
    name: 'List',
    component: List,
    meta: { showTabBar: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { showTabBar: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { showTabBar: false }
  },
  {
    path: '/vn/:id',
    name: 'VnDetail',
    component: VnDetail,
    meta: { showTabBar: false }
  },
  {
    path: '/character/:id',
    name: 'CharacterDetail',
    component: CharacterDetail,
    meta: { showTabBar: false }
  },
  {
    path: '/producer/:id',
    name: 'ProducerDetail',
    component: ProducerDetail,
    meta: { showTabBar: false }
  },
  {
    path: '/release/:id',
    name: 'ReleaseDetail',
    component: ReleaseDetail,
    meta: { showTabBar: false }
  },
  {
    path: '/browse/vn',
    name: 'VnSearch',
    component: VnSearch,
    meta: { showTabBar: true }
  },
  {
    path: '/browse/releases',
    name: 'ReleaseSearch',
    component: ReleaseSearch,
    meta: { showTabBar: true }
  },
  {
    path: '/browse/producers',
    name: 'ProducerSearch',
    component: ProducerSearch,
    meta: { showTabBar: true }
  },
  {
    path: '/browse/staff',
    name: 'StaffSearch',
    component: StaffSearch,
    meta: { showTabBar: true }
  },
  {
    path: '/staff/:id',
    name: 'StaffDetail',
    component: StaffDetail,
    meta: { showTabBar: false }
  },
  {
    path: '/browse/characters',
    name: 'CharacterSearch',
    component: CharacterSearch,
    meta: { showTabBar: true }
  },
  {
    path: '/browse/tags',
    name: 'TagSearch',
    component: TagSearch,
    meta: { showTabBar: true }
  },
  {
    path: '/browse/traits',
    name: 'TraitSearch',
    component: TraitSearch,
    meta: { showTabBar: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// ========== 滚动位置管理 ==========
// Ionic 的 ion-router-outlet 在路由切换时会重置隐藏页面的 scrollTop
// 需要手动保存/恢复滚动位置

const scrollPositions = new Map()

/** 获取 ion-page 内的 inner-scroll 元素（Shadow DOM） */
function getInnerScroll(pageEl) {
  const ionContent = pageEl?.querySelector('ion-content')
  return ionContent?.shadowRoot?.querySelector('.inner-scroll')
}

/** 获取 ion-router-outlet 内的所有页面（排除 ion-app 本身） */
function getRouterPages() {
  const outlet = document.querySelector('ion-router-outlet')
  if (!outlet) return []
  return Array.from(outlet.children).filter(el => el.classList.contains('ion-page'))
}

/** 获取当前活跃的 ion-page（router-outlet 内可见的页面） */
function getActivePage() {
  const pages = getRouterPages()
  for (const page of pages) {
    if (!page.classList.contains('ion-page-hidden')) {
      return page
    }
  }
  return null
}

/** 恢复指定路径的滚动位置 */
function restoreScrollPosition(fullPath) {
  const savedPos = scrollPositions.get(fullPath)
  if (savedPos == null) return

  const activePage = getActivePage()
  if (!activePage) return
  const innerScroll = getInnerScroll(activePage)
  if (!innerScroll) return
  innerScroll.scrollTop = savedPos
}

// 导航前：保存当前页面的滚动位置
router.beforeEach((to, from) => {
  if (from === START_LOCATION) return
  const activePage = getActivePage()
  if (!activePage) return
  const innerScroll = getInnerScroll(activePage)
  if (innerScroll) {
    scrollPositions.set(from.fullPath, innerScroll.scrollTop)
  }
})

// 导航后：恢复或重置滚动位置
// - 返回已访问页面：恢复之前保存的滚动位置（Bug 1 修复）
// - 前进到新页面：确保从顶部开始（Bug 2 修复）
router.afterEach((to) => {
  const savedPos = scrollPositions.get(to.fullPath)
  const hasSavedPos = savedPos != null

  requestAnimationFrame(() => {
    if (hasSavedPos) {
      // 返回已访问页面：恢复滚动位置，Ionic 过渡动画可能重置，需多次尝试
      restoreScrollPosition(to.fullPath)
      setTimeout(() => restoreScrollPosition(to.fullPath), 50)
      setTimeout(() => restoreScrollPosition(to.fullPath), 150)
      setTimeout(() => restoreScrollPosition(to.fullPath), 300)
    } else {
      // 前进到新页面：确保从顶部开始，Ionic 过渡动画可能干扰，需多次尝试
      resetScrollToTop()
      setTimeout(() => resetScrollToTop(), 50)
      setTimeout(() => resetScrollToTop(), 150)
      setTimeout(() => resetScrollToTop(), 300)
    }
  })
})

/** 将当前活跃页面的滚动位置重置为顶部 */
function resetScrollToTop() {
  const activePage = getActivePage()
  if (!activePage) return
  const innerScroll = getInnerScroll(activePage)
  if (innerScroll) {
    innerScroll.scrollTop = 0
  }
}

export default router
