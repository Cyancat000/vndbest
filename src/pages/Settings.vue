<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const apiToken = ref(localStorage.getItem('vndb_api_token') || '')
const useSandbox = ref(JSON.parse(localStorage.getItem('vndb_use_sandbox') || 'false'))

function saveSettings() {
  localStorage.setItem('vndb_api_token', apiToken.value)
  localStorage.setItem('vndb_use_sandbox', JSON.stringify(useSandbox.value))
  alert('设置已保存！')
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

    <!-- 设置区块 (Notion Style Block) -->
    <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-4">
      <h2 class="text-sm font-semibold text-neutral-800 border-b border-neutral-100 pb-2">API 认证配置</h2>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-neutral-500">API 访问 Token</label>
        <input
          v-model="apiToken"
          type="password"
          placeholder="请输入你的 VNDB API Token (可选)"
          class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/5 placeholder-neutral-400"
        />
        <p class="text-[10px] text-neutral-400">留空则以访客身份访问只读 API</p>
      </div>

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
