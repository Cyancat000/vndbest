import { ref, computed } from 'vue'

export const APP_VERSION = '1.0.3'
const IGNORED_UPDATE_VERSION_KEY = 'vndb_ignored_update_version'

const updateState = ref('idle') // 'idle' | 'checking' | 'available' | 'up-to-date' | 'error'
const latestVersion = ref('')
const latestReleaseUrl = ref('')
const latestReleaseDate = ref('')
const latestReleaseBody = ref('')
const latestDownloadUrl = ref('')

function parseVersion(v) {
  if (!v) return { major: 0, minor: 0, patch: 0, pre: '' }
  const clean = v.replace(/^v/i, '')
  const [main, pre] = clean.split('-')
  const segments = main.split('.').map(Number)
  return {
    major: segments[0] || 0,
    minor: segments[1] || 0,
    patch: segments[2] || 0,
    pre: pre || ''
  }
}

export function isNewer(a, b) {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  if (va.major !== vb.major) return va.major > vb.major
  if (va.minor !== vb.minor) return va.minor > vb.minor
  if (va.patch !== vb.patch) return va.patch > vb.patch
  if (va.pre && !vb.pre) return false
  if (!va.pre && vb.pre) return true
  return false
}

export function useAppUpdate() {
  const ignoredVersion = ref(localStorage.getItem(IGNORED_UPDATE_VERSION_KEY) || '')

  function setIgnoredVersion(version) {
    if (version) {
      localStorage.setItem(IGNORED_UPDATE_VERSION_KEY, version)
      ignoredVersion.value = version
    } else {
      localStorage.removeItem(IGNORED_UPDATE_VERSION_KEY)
      ignoredVersion.value = ''
    }
  }

  const isIgnored = computed(() => {
    return latestVersion.value && ignoredVersion.value === latestVersion.value
  })

  async function checkForUpdate() {
    updateState.value = 'checking'
    try {
      const res = await fetch('https://api.github.com/repos/Cyancat000/vndbest/releases/latest')
      if (res.status === 404) {
        updateState.value = 'up-to-date'
        return { hasUpdate: false }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      latestVersion.value = data.tag_name || ''
      latestReleaseUrl.value = data.html_url || ''
      latestReleaseDate.value = data.published_at ? new Date(data.published_at).toLocaleDateString() : ''
      latestReleaseBody.value = data.body || ''

      // 提取 apk 下载地址（如果有）
      const apkAsset = Array.isArray(data.assets) ? data.assets.find(a => a.name?.endsWith('.apk')) : null
      latestDownloadUrl.value = apkAsset ? apkAsset.browser_download_url : data.html_url

      const hasUpdate = isNewer(data.tag_name, APP_VERSION)
      updateState.value = hasUpdate ? 'available' : 'up-to-date'
      return {
        hasUpdate,
        version: data.tag_name,
        body: data.body,
        releaseUrl: data.html_url,
        downloadUrl: latestDownloadUrl.value,
        releaseDate: latestReleaseDate.value
      }
    } catch (e) {
      console.error('检查更新失败:', e)
      updateState.value = 'error'
      return { hasUpdate: false, error: e }
    }
  }

  return {
    appVersion: APP_VERSION,
    updateState,
    latestVersion,
    latestReleaseUrl,
    latestReleaseDate,
    latestReleaseBody,
    latestDownloadUrl,
    ignoredVersion,
    isIgnored,
    setIgnoredVersion,
    checkForUpdate
  }
}
