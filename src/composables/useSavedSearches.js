/**
 * 已保存搜索 Composable
 * 使用 localStorage 持久化用户的搜索筛选条件
 */

import { ref, computed } from 'vue'
import { SEARCH_TYPE_ICONS } from '@/icons/icon-names'

const STORAGE_KEY = 'vndb_saved_searches'

/**
 * 搜索类型 → 路由路径映射
 */
export const SEARCH_TYPE_MAP = {
  vn: { path: '/browse/vn', label: 'VN 搜索', icon: SEARCH_TYPE_ICONS.vn },
  releases: { path: '/browse/releases', label: '版本搜索', icon: SEARCH_TYPE_ICONS.releases },
  producers: { path: '/browse/producers', label: '制作商搜索', icon: SEARCH_TYPE_ICONS.producers },
  staff: { path: '/browse/staff', label: '制作人员搜索', icon: SEARCH_TYPE_ICONS.staff },
  characters: { path: '/browse/characters', label: '角色搜索', icon: SEARCH_TYPE_ICONS.characters },
  tags: { path: '/browse/tags', label: '标签搜索', icon: SEARCH_TYPE_ICONS.tags },
  traits: { path: '/browse/traits', label: '特征搜索', icon: SEARCH_TYPE_ICONS.traits }
}

/**
 * 默认保存的搜索项
 */
const DEFAULT_SAVED_SEARCHES = [
  {
    id: 'default_latest_chinese',
    name: '最新汉化',
    type: 'releases',
    filters: {
      selectedLang: 'zh-Hans',
      sortBy: 'released',
      reverse: true,
      selectedOfficial: 'no',
      selectedDateTo: 'today'
    },
    createdAt: new Date().toISOString()
  }
]

/**
 * 从 localStorage 读取保存的搜索列表
 */
function loadFromStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(data)) return data
  } catch {}
  return null
}

/**
 * 将搜索列表写入 localStorage
 */
function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// 响应式状态（全局单例）
const savedSearches = ref(loadFromStorage() || [...DEFAULT_SAVED_SEARCHES])

export function useSavedSearches() {
  /**
   * 获取所有已保存的搜索
   */
  const list = computed(() => savedSearches.value)

  /**
   * 获取指定类型的搜索列表
   * @param {string} type - 搜索类型 (vn, releases, producers, staff, characters, tags, traits)
   */
  function getByType(type) {
    return savedSearches.value.filter(item => item.type === type)
  }

  /**
   * 根据 ID 获取单个保存的搜索
   * @param {string} id
   */
  function getById(id) {
    return savedSearches.value.find(item => item.id === id) || null
  }

  /**
   * 添加保存的搜索
   * @param {{ name: string, type: string, filters: Object }} item
   * @returns {Object} 新创建的保存项
   */
  function add(item) {
    const newItem = {
      id: generateId(),
      name: item.name.slice(0, 8), // 最多8个字
      type: item.type,
      filters: { ...item.filters },
      createdAt: new Date().toISOString()
    }
    savedSearches.value.push(newItem)
    saveToStorage(savedSearches.value)
    return newItem
  }

  /**
   * 更新保存的搜索
   * @param {string} id
   * @param {{ name?: string, filters?: Object }} updates
   * @returns {Object|null} 更新后的项，未找到则返回 null
   */
  function update(id, updates) {
    const index = savedSearches.value.findIndex(item => item.id === id)
    if (index === -1) return null
    const item = savedSearches.value[index]
    if (updates.name !== undefined) item.name = updates.name.slice(0, 8)
    if (updates.filters !== undefined) item.filters = { ...updates.filters }
    saveToStorage(savedSearches.value)
    return item
  }

  /**
   * 删除保存的搜索
   * @param {string} id
   * @returns {boolean} 是否删除成功
   */
  function remove(id) {
    const index = savedSearches.value.findIndex(item => item.id === id)
    if (index === -1) return false
    savedSearches.value.splice(index, 1)
    saveToStorage(savedSearches.value)
    return true
  }

  /**
   * 检查名称是否已存在（排除指定 ID）
   * @param {string} name
   * @param {string} [excludeId] - 排除的 ID（用于编辑时重名检查）
   * @returns {boolean}
   */
  function isNameExists(name, excludeId = null) {
    return savedSearches.value.some(
      item => item.name === name && item.id !== excludeId
    )
  }

  /**
   * 重置为默认值
   */
  function resetToDefaults() {
    savedSearches.value = [...DEFAULT_SAVED_SEARCHES]
    saveToStorage(savedSearches.value)
  }

  return {
    list,
    getByType,
    getById,
    add,
    update,
    remove,
    isNameExists,
    resetToDefaults
  }
}
