<script setup>
defineOptions({ name: 'Library' })

import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { IonPage, IonContent } from '@ionic/vue'

const router = useRouter()
const { t } = useI18n()

const libraryItems = [
  { 
    id: 'vn',
    title: t('library.vn'), 
    icon: 'lucide:file-text', 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-50',
    path: '/browse/vn'
  },
  {
    id: 'releases',
    title: t('library.releases'),
    icon: 'lucide:package',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    path: '/browse/releases'
  },
  {
    id: 'producers',
    title: t('library.producers'),
    icon: 'lucide:building-2',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    path: '/browse/producers'
  },
  {
    id: 'staff',
    title: t('library.staff'),
    icon: 'lucide:users',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    path: '/browse/staff'
  },
  {
    id: 'characters',
    title: t('library.characters'),
    icon: 'lucide:user-circle',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    path: '/browse/characters'
  },
  {
    id: 'tags',
    title: t('library.tags'),
    icon: 'lucide:tags',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    path: '/browse/tags'
  },
  {
    id: 'traits',
    title: t('library.traits'),
    icon: 'lucide:fingerprint',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    path: '/browse/traits'
  }
]

function navigateTo(path) {
  router.push(path)
}
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container pb-24 space-y-6">
    <div class="flex items-center gap-3 py-3 sticky top-0 bg-white/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100">
      <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Icon icon="lucide:library" class="h-5 w-5 text-neutral-800" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">{{ t('library.title') }}</h1>
        <p class="text-xs text-neutral-500">{{ t('library.description') }}</p>
      </div>
    </div>

    <!-- 库入口卡片网格 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        v-for="item in libraryItems"
        :key="item.id"
        @click="navigateTo(item.path)"
        class="flex items-center gap-4 p-4 rounded-xl border border-neutral-100 bg-white shadow-sm transition-all hover:border-neutral-300 hover:shadow-md active:scale-[0.98] text-left group"
      >
        <div :class="['grid h-12 w-12 place-items-center rounded-lg transition-colors group-hover:scale-110', item.bgColor]">
          <Icon :icon="item.icon" :class="['h-6 w-6', item.color]" />
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-neutral-900">{{ item.title }}</h3>
          <p class="text-xs text-neutral-400 mt-0.5">查看 {{ item.title }} 列表</p>
        </div>
        <Icon icon="lucide:chevron-right" class="h-5 w-5 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
      </button>
    </div>
  </div>
  </ion-content>
  </ion-page>
</template>
