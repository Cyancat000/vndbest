<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()
const username = ref(localStorage.getItem('vndb_username') || '')
const useSandbox = ref(JSON.parse(localStorage.getItem('vndb_use_sandbox') || 'false'))

onMounted(() => {
  // 每次进入页面重新获取最新的登录状态
  username.value = localStorage.getItem('vndb_username') || ''
})

function saveSettings() {
  localStorage.setItem('vndb_use_sandbox', JSON.stringify(useSandbox.value))
  alert('设置已保存！')
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Icon icon="lucide:settings" class="h-5 w-5 text-neutral-800" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">Settings</h1>
        <p class="text-xs text-neutral-500">配置 VNDBest 客户端设置</p>
      </div>
    </div>

    <!-- 账户跳转入口 (Notion-style navigation item) -->
    <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
      <h2 class="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">账户与同步</h2>
      
      <button 
        @click="goToLogin"
        class="w-full flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/50 p-3 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
      >
        <div class="flex items-center gap-3">
          <div class="grid h-10 w-10 place-items-center rounded-full bg-white border border-neutral-200">
            <Icon icon="lucide:user" class="h-5 w-5 text-neutral-600" />
          </div>
          <div>
            <div class="text-sm font-medium text-neutral-800">
              {{ username ? username : '未登录' }}
            </div>
            <div class="text-[10px] text-neutral-400">
              {{ username ? '已连接到 VNDB 账户' : '点击登录以同步您的收藏列表' }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span 
            v-if="username" 
            class="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 border border-green-100"
          >
            已连接
          </span>
          <span 
            v-else 
            class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 border border-neutral-200"
          >
            未连接
          </span>
          <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-400" />
        </div>
      </button>
    </div>

    <!-- 设置区块 (Notion Style Block) -->
    <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-4">
      <h2 class="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">系统偏好</h2>

      <div class="flex items-center justify-between py-2">
        <div class="space-y-0.5">
          <label class="text-sm font-medium text-neutral-800">使用 Sandbox 沙盒端点</label>
          <p class="text-[10px] text-neutral-400">启用后将请求测试 API，避免污染正式环境数据</p>
        </div>
        <input
          v-model="useSandbox"
          type="checkbox"
          class="h-4 w-4 rounded-sm border-neutral-300 text-neutral-900 focus:ring-neutral-900/10"
        />
      </div>

      <button
        @click="saveSettings"
        class="w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white transition hover:bg-neutral-800 active:bg-neutral-950"
      >
        保存设置
      </button>
    </div>
  </div>
</template>
