<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const tabs = computed(() => [
  { name: t('nav.home'), path: '/', icon: 'lucide:home' },
  { name: t('nav.search'), path: '/search', icon: 'lucide:search' },
  { name: t('nav.list'), path: '/list', icon: 'lucide:file-text' },
  { name: t('nav.settings'), path: '/settings', icon: 'lucide:settings' }
])

const showTabBar = computed(() => route.meta.showTabBar !== false)
const activePath = computed(() => route.path)

function navigate(path) {
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen bg-white text-neutral-900 flex flex-col font-sans antialiased">
    <!-- 主体内容区域 (Notion style container) -->
    <main class="flex-1 mx-auto w-full max-w-2xl px-4 pt-6 pb-24">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 移动端优先的 Notion-Style 底部 TabBar -->
    <nav 
      v-if="showTabBar"
      class="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/80 backdrop-blur-md pb-[safe-area-inset-bottom]"
    >
      <div class="mx-auto max-w-2xl flex h-14 items-center justify-around px-2">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          @click="navigate(tab.path)"
          class="flex flex-col items-center justify-center gap-1 w-16 h-full transition relative group"
          :class="activePath === tab.path ? 'text-neutral-950 font-medium' : 'text-neutral-400 hover:text-neutral-600'"
        >
          <Icon :icon="tab.icon" class="h-5 w-5" />
          <span class="text-[10px] leading-none">{{ tab.name }}</span>
          
          <!-- 激活指示小条 -->
          <span 
            v-if="activePath === tab.path" 
            class="absolute bottom-1 w-5 h-0.5 rounded-full bg-neutral-900"
          ></span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
