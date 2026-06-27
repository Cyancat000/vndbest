/**
 * 隐私与内容过滤 Composable
 * 读取 localStorage 中的隐私设置，提供过滤判断函数
 * 一律使用图标占位效果（无高斯模糊）
 */

/**
 * 获取图片的 NSFW 等级
 * @param {Object} image - 包含 sexual 字段的图片对象
 * @returns {number} 0=安全, 1=性暗示, 2=露骨
 */
export function getImageNsfwLevel(image) {
  if (!image || typeof image.sexual !== 'number') return 0
  if (image.sexual >= 2) return 2
  if (image.sexual >= 1) return 1
  return 0
}

export function usePrivacy() {
  const defaultCardListSettings = {
    sexual_vn: 1,
    sexual_release: 1,
    nsfw_cover_vn: 1,
    nsfw_cover_release: 1
  }

  const defaultDetailSettings = {
    sexual_vn: 1,
    sexual_release: 1,
    nsfw_cover_vn: 1,
    nsfw_cover_release: 1
  }

  const defaultScreenshotSettings = {
    sexual_screenshot: 1,
    nsfw_screenshot: 1
  }

  const parseJson = (key, defaults) => {
    try {
      return {
        ...defaults,
        ...(JSON.parse(localStorage.getItem(key)) || {})
      }
    } catch {
      return { ...defaults }
    }
  }

  const getCardListSettings = () => parseJson('vndb_privacy_card_list', defaultCardListSettings)
  const getDetailSettings = () => parseJson('vndb_privacy_detail', defaultDetailSettings)
  const getScreenshotSettings = () => parseJson('vndb_privacy_screenshots', defaultScreenshotSettings)

  /**
   * 获取卡片列表的过滤动作
   * @param {'vn'|'release'} type
   * @param {number} nsfwLevel - 0, 1, 2
   * @returns {'show'|'blur'|'blur_card'|'hide'}
   */
  function getCardAction(type, nsfwLevel) {
    if (nsfwLevel === 0) return 'show'
    const cl = getCardListSettings()
    const actionMap = ['show', 'blur', 'blur_card', 'hide']
    if (nsfwLevel >= 2) {
      const v = cl[`nsfw_cover_${type}`] || 0
      if (v > 0) return actionMap[v] || 'show'
    }
    return actionMap[cl[`sexual_${type}`] || 0] || 'show'
  }

  /**
   * 获取详情页封面的过滤动作
   * @param {'vn'|'release'} type
   * @param {number} nsfwLevel
   * @returns {'show'|'hide'}
   */
  function getDetailAction(type, nsfwLevel) {
    if (nsfwLevel === 0) return 'show'
    const dp = getDetailSettings()
    if (nsfwLevel >= 2) {
      const v = dp[`nsfw_cover_${type}`] || 0
      if (v > 0) return v >= 1 ? 'hide' : 'show'
    }
    return (dp[`sexual_${type}`] || 0) >= 1 ? 'hide' : 'show'
  }

  /**
   * 获取截图的过滤动作
   * 缩略图始终可点击打开大图，大图中根据设置决定是否模糊
   * @param {number} nsfwLevel
   * @returns {'show'|'blur'|'hide'}
   *   - show: 缩略图正常，大图正常
   *   - blur: 缩略图正常，大图模糊+眼睛图标
   *   - hide: 缩略图显示占位图标，不打开大图
   */
  function getScreenshotAction(nsfwLevel) {
    if (nsfwLevel === 0) return 'show'
    const sc = getScreenshotSettings()
    if (nsfwLevel >= 2) {
      const v = sc.nsfw_screenshot || 0
      if (v === 1) return 'blur'
      if (v === 2) return 'hide'
    }
    const v = sc.sexual_screenshot || 0
    if (v === 1) return 'blur'
    if (v === 2) return 'hide'
    return 'show'
  }

  return { getCardAction, getDetailAction, getScreenshotAction }
}
