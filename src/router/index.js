import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import Search from '@/pages/Search.vue'
import List from '@/pages/List.vue'
import Settings from '@/pages/Settings.vue'
import Login from '@/pages/Login.vue'
import VnDetail from '@/pages/VnDetail.vue'
import CharacterDetail from '@/pages/CharacterDetail.vue'
import ProducerDetail from '@/pages/ProducerDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { showTabBar: true }
  },
  {
    path: '/search',
    name: 'Search',
    component: Search,
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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
