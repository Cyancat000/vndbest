<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getAuthInfo } from '@/api/vndb'

const router = useRouter()
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
    errorMsg.value = '请输入 API Token'
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

    successMsg.value = '登录成功！正在跳转...'
    setTimeout(() => {
      router.push('/settings')
    }, 1500)
  } catch (e) {
    errorMsg.value = `登录失败: ${e.message || 'Token 无效或网络错误'}`
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
  successMsg.value = '已退出登录'
  setTimeout(() => {
    successMsg.value = ''
  }, 2000)
}

function goBack() {
  router.push('/settings')
}
</script>

<template>
  <div class="space-y-6">
    <!-- 头部导航 -->
    <div class="flex items-center gap-3">
      <button 
        @click="goBack" 
        class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs transition active:bg-neutral-50"
      >
        <Icon icon="lucide:chevron-left" class="h-5 w-5 text-neutral-800" />
      </button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">VNDB 账户</h1>
        <p class="text-xs text-neutral-500">管理您的 VNDB API 凭证</p>
      </div>
    </div>

    <!-- 状态面板: 未登录 -->
    <div v-if="!username" class="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
      <div class="flex items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-full bg-neutral-100">
          <Icon icon="lucide:user" class="h-6 w-6 text-neutral-400" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-neutral-800">未登录账户</h3>
          <p class="text-xs text-neutral-400">目前以访客身份进行只读访问</p>
        </div>
      </div>

      <div class="space-y-3 pt-2">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-neutral-500">API 访问 Token</label>
          <input
            v-model="token"
            type="password"
            placeholder="请输入您的 VNDB API Token"
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5 placeholder-neutral-400"
          />
          <div class="flex flex-col gap-1 text-[10px] text-neutral-400 leading-normal">
            <span class="flex items-start gap-1">
              <Icon icon="lucide:info" class="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Token 获取路径：在 VNDB.org 登录后，打开 "My Profile" 里的 "Applications" 标签页即可生成。</span>
            </span>
            <span class="flex items-start gap-1">
              <Icon icon="lucide:info" class="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>请确保 Token 勾选了 <code class="bg-neutral-100 px-1 rounded">listread</code> 和 <code class="bg-neutral-100 px-1 rounded">listwrite</code> 权限以完整体验同步功能。</span>
            </span>
          </div>
        </div>

        <div v-if="errorMsg" class="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600">
          <Icon icon="lucide:x" class="h-4 w-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>

        <div v-if="successMsg" class="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-600">
          <Icon icon="lucide:check" class="h-4 w-4 shrink-0" />
          <span>{{ successMsg }}</span>
        </div>

        <button
          @click="handleLogin"
          :disabled="isLoading"
          class="w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white transition hover:bg-neutral-800 active:bg-neutral-950 disabled:opacity-50"
        >
          {{ isLoading ? '验证中...' : '验证并登录' }}
        </button>
      </div>
    </div>

    <!-- 状态面板: 已登录 -->
    <div v-else class="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-6">
      <div class="flex items-center gap-4">
        <div class="grid h-14 w-14 place-items-center rounded-full bg-neutral-900 text-white font-bold text-xl">
          {{ username.slice(0, 2).toUpperCase() }}
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-neutral-900">{{ username }}</h3>
          <div class="flex items-center gap-1.5 text-xs text-neutral-400">
            <span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
            <span>已登录 (ID: {{ userId }})</span>
          </div>
        </div>
      </div>

      <div class="border-t border-neutral-100 pt-4 space-y-3">
        <div v-if="successMsg" class="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-600">
          <Icon icon="lucide:check" class="h-4 w-4 shrink-0" />
          <span>{{ successMsg }}</span>
        </div>

        <button
          @click="logout"
          class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 text-center text-sm font-medium text-red-600 transition hover:bg-red-50 active:bg-red-100"
        >
          退出登录
        </button>
      </div>
    </div>
  </div>
</template>
