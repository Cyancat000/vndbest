<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getAuthInfo } from '@/api/vndb'
import { IonPage, IonContent } from '@ionic/vue'

const router = useRouter()
const { t } = useI18n()
const token = ref(localStorage.getItem('vndb_api_token') || '')
const username = ref(localStorage.getItem('vndb_username') || '')
const userId = ref(localStorage.getItem('vndb_user_id') || '')
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

onMounted(async () => {
  // 如果有 token，尝试静默拉取/更新一下用户信息
  if (token.value && !username.value) {
    isLoading.value = true
    try {
      const info = await getAuthInfo()
      username.value = info.username
      userId.value = info.id
      localStorage.setItem('vndb_username', info.username)
      localStorage.setItem('vndb_user_id', info.id)
    } catch (e) {
      // 如果 token 失效，清除之
      logout()
    } finally {
      isLoading.value = false
    }
  }
})

async function handleLogin() {
  if (!token.value.trim()) {
    errorMsg.value = t('login.token_empty')
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const info = await getAuthInfo(token.value)
    username.value = info.username
    userId.value = info.id
    
    // 持久化登录状态
    localStorage.setItem('vndb_api_token', token.value.trim())
    localStorage.setItem('vndb_username', info.username)
    localStorage.setItem('vndb_user_id', info.id)

    successMsg.value = t('login.login_success')
    setTimeout(() => {
      router.push('/settings')
    }, 1500)
  } catch (e) {
    errorMsg.value = t('login.login_failed', { error: e.message || 'Token 无效或网络错误' })
  } finally {
    isLoading.value = false
  }
}

function logout() {
  token.value = ''
  username.value = ''
  userId.value = ''
  localStorage.removeItem('vndb_api_token')
  localStorage.removeItem('vndb_username')
  localStorage.removeItem('vndb_user_id')
  successMsg.value = t('login.logout_success')
  setTimeout(() => {
    successMsg.value = ''
  }, 2000)
}

function goBack() {
  router.push('/settings')
}
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container space-y-6">
    <!-- 头部导航 -->
    <div class="flex items-center gap-3 py-3 sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100 dark:border-neutral-800">
      <button
        @click="goBack"
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs transition active:bg-neutral-50 dark:active:bg-neutral-700"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
      </button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{{ t('login.title') }}</h1>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('login.description') }}</p>
      </div>
    </div>

    <!-- 状态面板: 未登录 -->
    <div v-if="!username" class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
      <div class="flex items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Icon icon="lucide:user" class="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ t('login.guest_title') }}</h3>
          <p class="text-xs text-neutral-400 dark:text-neutral-500">{{ t('login.guest_desc') }}</p>
        </div>
      </div>

      <div class="space-y-3 pt-2">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-neutral-500 dark:text-neutral-400">{{ t('login.token_label') }}</label>
          <input
            v-model="token"
            type="password"
            :placeholder="t('login.token_placeholder')"
            class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 dark:focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-neutral-100/10 placeholder-neutral-400 dark:placeholder-neutral-600 text-neutral-900 dark:text-neutral-100"
          />
          <div class="flex flex-col gap-1 text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
            <span class="flex items-start gap-1">
              <Icon icon="lucide:info" class="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{{ t('login.token_help_1') }}</span>
            </span>
            <span class="flex items-start gap-1">
              <Icon icon="lucide:info" class="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{{ t('login.token_help_2') }}</span>
            </span>
          </div>
        </div>

        <div v-if="errorMsg" class="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-xs text-red-600 dark:text-red-400">
          <Icon icon="lucide:x" class="h-4 w-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>

        <div v-if="successMsg" class="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-xs text-green-600 dark:text-green-400">
          <Icon icon="lucide:check" class="h-4 w-4 shrink-0" />
          <span>{{ successMsg }}</span>
        </div>

        <button
          @click="handleLogin"
          :disabled="isLoading"
          class="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 py-2.5 text-center text-sm font-medium text-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-950 dark:active:bg-neutral-300 disabled:opacity-50"
        >
          {{ isLoading ? t('login.verifying') : t('login.verify_and_login') }}
        </button>
      </div>
    </div>

    <!-- 状态面板: 已登录 -->
    <div v-else class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-6">
      <div class="flex items-center gap-4">
        <div class="grid h-14 w-14 place-items-center rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xl">
          {{ username.slice(0, 2).toUpperCase() }}
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">{{ username }}</h3>
          <div class="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
            <span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
            <span>{{ t('login.logged_in_as', { id: userId }) }}</span>
          </div>
        </div>
      </div>

      <div class="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3">
        <div v-if="successMsg" class="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-xs text-green-600 dark:text-green-400">
          <Icon icon="lucide:check" class="h-4 w-4 shrink-0" />
          <span>{{ successMsg }}</span>
        </div>

        <button
          @click="logout"
          class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-2.5 text-center text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50"
        >
          {{ t('login.logout') }}
        </button>
      </div>
    </div>
  </div>
  </ion-content>
  </ion-page>
</template>
