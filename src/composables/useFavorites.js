/**
 * 本地收藏管理 Composable
 * 使用 localStorage 持久化存储用户的本地收藏（作品/版本/人物/角色/会社）
 */

import { ref, computed } from 'vue'

const STORAGE_KEY = 'vndb_local_favorites'

/**
 * 从 localStorage 读取收藏列表
 * @returns {Array}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    console.error('Failed to load favorites from localStorage:', err)
  }
  return []
}

/**
 * 将收藏列表保存到 localStorage
 * @param {Array} list
 */
function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save favorites to localStorage:', err)
  }
}

// 全局单例响应式状态
const favorites = ref(loadFromStorage())

export function useFavorites() {
  /** 所有收藏列表 */
  const list = computed(() => favorites.value)

  /**
   * 检查指定 ID 是否已收藏
   * @param {string} id
   * @returns {boolean}
   */
  function isFavorite(id) {
    if (!id) return false
    return favorites.value.some(item => item.id === id)
  }

  /**
   * 添加到本地收藏
   * @param {{ id: string, type: 'vn'|'release'|'character'|'staff'|'producer', title: string, subtitle?: string, image?: string, extra?: Object }} item
   * @returns {boolean} 是否添加成功
   */
  function addFavorite(item) {
    if (!item || !item.id || !item.type) return false
    const existingIndex = favorites.value.findIndex(f => f.id === item.id)
    const favoriteItem = {
      id: item.id,
      type: item.type,
      title: item.title || '',
      subtitle: item.subtitle || '',
      image: item.image || '',
      extra: item.extra || {},
      createdAt: item.createdAt || new Date().toISOString()
    }

    if (existingIndex >= 0) {
      favorites.value[existingIndex] = favoriteItem
    } else {
      favorites.value.unshift(favoriteItem)
    }

    saveToStorage(favorites.value)
    return true
  }

  /**
   * 移除指定 ID 的收藏
   * @param {string} id
   * @returns {boolean} 是否移除成功
   */
  function removeFavorite(id) {
    if (!id) return false
    const index = favorites.value.findIndex(item => item.id === id)
    if (index === -1) return false
    favorites.value.splice(index, 1)
    saveToStorage(favorites.value)
    return true
  }

  /**
   * 切换收藏状态
   * @param {{ id: string, type: string, title: string, subtitle?: string, image?: string, extra?: Object }} item
   * @returns {boolean} 切换后的收藏状态（true 为已收藏，false 为已取消）
   */
  function toggleFavorite(item) {
    if (!item || !item.id) return false
    if (isFavorite(item.id)) {
      removeFavorite(item.id)
      return false
    } else {
      addFavorite(item)
      return true
    }
  }

  /**
   * 按类型筛选收藏
   * @param {string} type - 'vn' | 'release' | 'character' | 'staff' | 'producer'
   */
  function getByType(type) {
    if (!type || type === 'all') return favorites.value
    return favorites.value.filter(item => item.type === type)
  }

  /**
   * 获取各类型收藏的数量统计
   */
  const counts = computed(() => {
    const res = {
      all: favorites.value.length,
      vn: 0,
      release: 0,
      character: 0,
      staff: 0,
      producer: 0
    }
    for (const item of favorites.value) {
      if (res[item.type] !== undefined) {
        res[item.type]++
      }
    }
    return res
  })

  /**
   * 清空收藏（可指定类型或全部）
   * @param {string} [type] - 不传或传 'all' 则清空全部
   */
  function clearFavorites(type = 'all') {
    if (!type || type === 'all') {
      favorites.value = []
    } else {
      favorites.value = favorites.value.filter(item => item.type !== type)
    }
    saveToStorage(favorites.value)
  }

  return {
    favorites: list,
    counts,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getByType,
    clearFavorites
  }
}
