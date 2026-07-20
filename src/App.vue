<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useTheme } from '@/composables/useTheme'
import { useBackground } from '@/composables/useBackground'
import { useToast } from '@/composables/useToast'

useTheme()
const { hasCustomBackground, backgroundLayerStyle } = useBackground()
const { toastVisible, toastMessage, toastType } = useToast()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const tabs = computed(() => [
  { name: t('nav.home'), path: '/', icon: 'lucide:home' },
  { name: t('nav.library'), path: '/library', icon: 'lucide:search' },
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
  <ion-app class="font-sans antialiased">
    <!-- 全局自定义背景：始终 object-cover，可调透明度 + 高斯模糊 -->
    <div
      v-if="hasCustomBackground"
      class="app-custom-bg"
      aria-hidden="true"
    >
      <div class="app-custom-bg__image" :style="backgroundLayerStyle" />
    </div>

    <ion-router-outlet :animated="true" />

    <!-- 全局 Toast 提示（复制成功等） -->
    <Teleport to="body">
      <Transition name="app-toast">
        <div
          v-if="toastVisible"
          class="app-toast-box fixed top-12 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium pointer-events-none"
          :class="toastType === 'success'
            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'"
        >
          <Icon
            :icon="toastType === 'success' ? 'lucide:check-circle' : 'lucide:x-circle'"
            class="h-4 w-4 flex-shrink-0"
          />
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>

    <!-- 移动端优先的 Notion-Style 底部 TabBar；底部必须用 env(safe-area-inset-bottom) 避开手势条/Home Indicator -->
    <nav
      v-if="showTabBar"
      class="app-tab-bar fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md"
    >
      <div class="mx-auto max-w-2xl flex h-14 items-center justify-around px-2">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          @click="navigate(tab.path)"
          class="flex flex-col items-center justify-center gap-1 w-16 h-full transition relative group"
          :class="activePath === tab.path ? 'text-neutral-950 dark:text-neutral-50 font-medium' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'"
        >
          <Icon :icon="tab.icon" class="h-5 w-5" />
          <span class="text-[10px] leading-none">{{ tab.name }}</span>

          <!-- 激活指示小条 -->
          <span
            v-if="activePath === tab.path"
            class="absolute bottom-1 w-5 h-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100"
          ></span>
        </button>
      </div>
    </nav>
  </ion-app>
</template>

<style>
/* TabBar 底部安全区：避开 iOS Home Indicator / Android 手势导航条 */
.app-tab-bar {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.app-toast-box {
  left: 50%;
  transform: translateX(-50%);
}

.app-toast-enter-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.app-toast-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}
.app-toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
.app-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
