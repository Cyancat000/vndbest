import { reactive } from 'vue'

/**
 * 图片加载状态管理 composable
 *
 * 用法:
 *   const imageLoader = useImageLoader()
 *
 * 模板中:
 *   <div class="image-wrapper relative">
 *     <ion-img
 *       v-if="url"
 *       :key="`img-${key}-${imageLoader.getRetryCount(key)}`"
 *       :src="url"
 *       class="transition-opacity duration-500"
 *       :class="{ 'opacity-0': !imageLoader.isSuccess(key) }"
 *       @ionImgDidLoad="imageLoader.onLoad(key)"
 *       @ionError="imageLoader.onError(key)"
 *     />
 *     <ion-spinner v-if="url && imageLoader.isLoading(key)" name="crescent" class="absolute inset-0 m-auto" style="width:24px;height:24px" />
 *     <div v-if="url && imageLoader.isError(key)" @click="imageLoader.retry(key)" class="absolute inset-0 flex items-center justify-center cursor-pointer">
 *       <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400" />
 *     </div>
 *   </div>
 */
export function useImageLoader() {
  // 每个 key 的状态: 'loading' | 'success' | 'error'
  const states = reactive({})
  // 每个 key 的重试次数（用于强制重新渲染 ion-img）
  const retries = reactive({})

  /** 获取状态，未注册的 key 默认 'loading' */
  function getStatus(key) {
    return states[key] || 'loading'
  }

  function isLoading(key) {
    return getStatus(key) === 'loading'
  }

  function isSuccess(key) {
    return getStatus(key) === 'success'
  }

  function isError(key) {
    return getStatus(key) === 'error'
  }

  /** 图片加载成功 */
  function onLoad(key) {
    states[key] = 'success'
  }

  /** 图片加载失败 */
  function onError(key) {
    states[key] = 'error'
  }

  /** 重试加载（重置为 loading 并增加重试计数） */
  function retry(key) {
    states[key] = 'loading'
    retries[key] = (retries[key] || 0) + 1
  }

  /** 获取重试次数，用作 ion-img 的 :key 强制重新渲染 */
  function getRetryCount(key) {
    return retries[key] || 0
  }

  return {
    states,
    getStatus,
    isLoading,
    isSuccess,
    isError,
    onLoad,
    onError,
    retry,
    getRetryCount
  }
}
