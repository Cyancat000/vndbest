import { createRouter, createWebHashHistory } from 'vue-router'
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
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
