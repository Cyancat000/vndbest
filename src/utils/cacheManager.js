/**
 * 轻量级两级缓存管理器（内存缓存 + IndexedDB 持久化缓存）
 * 适用于 Web 端与 Capacitor Native App 端 (Android / iOS)
 */

const DB_NAME = 'vndbest_cache_db'
const DB_VERSION = 1
const STORE_NAME = 'api_cache'

// 默认过期时间配置 (毫秒)
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,          // 5 分钟 (列表、搜索结果等高频变动数据)
  MEDIUM: 60 * 60 * 1000,        // 1 小时
  LONG: 24 * 60 * 60 * 1000,     // 1 天 (作品详情、角色详情、Staff、Release 等元数据持久化缓存)
}

/**
 * 内存缓存实现 (LRU + TTL)
 */
class MemoryCache {
  constructor(maxSize = 250) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null

    // 检查过期
    if (entry.expireAt && Date.now() > entry.expireAt) {
      this.cache.delete(key)
      return null
    }

    // 刷新 LRU 位置
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data
  }

  set(key, data, ttl) {
    if (this.cache.size >= this.maxSize) {
      // 淘汰最久未使用的项 (第一个 key)
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const expireAt = ttl ? Date.now() + ttl : null
    this.cache.set(key, {
      data,
      expireAt,
      createdAt: Date.now(),
    })
  }

  delete(key) {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

/**
 * IndexedDB 异步封装
 */
class IdbStorage {
  constructor(dbName = DB_NAME, storeName = STORE_NAME) {
    this.dbName = dbName
    this.storeName = storeName
    this.dbPromise = null
  }

  _isAvailable() {
    return typeof window !== 'undefined' && 'indexedDB' in window
  }

  _getDb() {
    if (!this._isAvailable()) {
      return Promise.resolve(null)
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = window.indexedDB.open(this.dbName, DB_VERSION)

          request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(this.storeName)) {
              const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
              store.createIndex('expireAt', 'expireAt', { unique: false })
            }
          }

          request.onsuccess = (event) => {
            const db = event.target.result
            // 处理异常断开
            db.onversionchange = () => {
              db.close()
              this.dbPromise = null
            }
            resolve(db)
          }

          request.onerror = (err) => {
            console.warn('[CacheManager] IndexedDB open error, falling back to memory only:', err)
            this.dbPromise = null
            resolve(null)
          }
        } catch (err) {
          console.warn('[CacheManager] IndexedDB init failed:', err)
          this.dbPromise = null
          resolve(null)
        }
      })
    }

    return this.dbPromise
  }

  async get(key) {
    const db = await this._getDb()
    if (!db) return null

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          const record = request.result
          if (!record) {
            resolve(null)
            return
          }

          // 检查过期时间
          if (record.expireAt && Date.now() > record.expireAt) {
            // 异步清除过期记录
            this.delete(key).catch(() => {})
            resolve(null)
            return
          }

          resolve(record.data)
        }

        request.onerror = () => resolve(null)
      } catch (err) {
        console.warn('[CacheManager] idb get error:', err)
        resolve(null)
      }
    })
  }

  async set(key, data, ttl) {
    const db = await this._getDb()
    if (!db) return false

    const expireAt = ttl ? Date.now() + ttl : null
    const record = {
      key,
      data,
      expireAt,
      updatedAt: Date.now(),
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.put(record)

        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
      } catch (err) {
        console.warn('[CacheManager] idb set error:', err)
        resolve(false)
      }
    })
  }

  async delete(key) {
    const db = await this._getDb()
    if (!db) return false

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.delete(key)

        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
      } catch (err) {
        resolve(false)
      }
    })
  }

  async clear() {
    const db = await this._getDb()
    if (!db) return false

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.clear()

        request.onsuccess = () => resolve(true)
        request.onerror = () => resolve(false)
      } catch (err) {
        resolve(false)
      }
    })
  }

  async count() {
    const db = await this._getDb()
    if (!db) return 0

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.count()

        request.onsuccess = () => resolve(request.result || 0)
        request.onerror = () => resolve(0)
      } catch (err) {
        resolve(0)
      }
    })
  }

  /**
   * 清理所有已过期的记录
   */
  async cleanExpired() {
    const db = await this._getDb()
    if (!db) return 0

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const index = store.index('expireAt')
        const now = Date.now()
        const range = IDBKeyRange.upperBound(now)
        const request = index.openCursor(range)

        let deletedCount = 0
        request.onsuccess = (event) => {
          const cursor = event.target.result
          if (cursor) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          } else {
            resolve(deletedCount)
          }
        }

        request.onerror = () => resolve(0)
      } catch (_) {
        resolve(0)
      }
    })
  }
}

/**
 * 缓存管理器 (两级缓存 + In-flight 请求合并)
 */
class CacheManager {
  constructor() {
    this.memory = new MemoryCache(300)
    this.idb = new IdbStorage()
    this.inFlightRequests = new Map()

    // 初始化时低优先级后台清理一次过期条目
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.idb.cleanExpired().catch(() => {})
      })
    } else {
      setTimeout(() => {
        this.idb.cleanExpired().catch(() => {})
      }, 5000)
    }
  }

  /**
   * 获取缓存数据
   * 1. 优先查内存缓存 (0ms)
   * 2. 内存未命中且启用了持久化，查 IndexedDB
   * 3. IndexedDB 命中则回写内存缓存
   */
  async get(key, options = {}) {
    const { persistent = true } = options

    // 1. 查内存
    const memData = this.memory.get(key)
    if (memData !== null && memData !== undefined) {
      return memData
    }

    // 2. 查 IndexedDB
    if (persistent) {
      const idbData = await this.idb.get(key)
      if (idbData !== null && idbData !== undefined) {
        // 回写到内存缓存（使用默认短 TTL 以节省内存并保持快速二次访问）
        this.memory.set(key, idbData, CACHE_TTL.SHORT)
        return idbData
      }
    }

    return null
  }

  /**
   * 写入缓存数据
   */
  async set(key, data, options = {}) {
    const {
      ttl = CACHE_TTL.SHORT,
      persistent = false,
    } = options

    // 写入内存
    this.memory.set(key, data, ttl)

    // 写入 IndexedDB
    if (persistent) {
      await this.idb.set(key, data, ttl)
    }
  }

  /**
   * 删除指定缓存
   */
  async delete(key) {
    this.memory.delete(key)
    await this.idb.delete(key)
  }

  /**
   * 清除所有缓存数据
   */
  async clear() {
    this.memory.clear()
    this.inFlightRequests.clear()
    await this.idb.clear()
  }

  /**
   * 获取缓存状态及预估存储大小
   */
  async getStorageInfo() {
    let usageBytes = 0
    let totalBytes = 0
    let idbCount = 0

    try {
      idbCount = await this.idb.count()
    } catch (_) {}

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        usageBytes = estimate.usage || 0
        totalBytes = estimate.quota || 0
      } catch (e) {
        console.warn('[CacheManager] storage.estimate error:', e)
      }
    }

    return {
      memoryCount: this.memory.size(),
      idbCount,
      usageBytes,
      totalBytes,
      formattedUsage: formatBytes(usageBytes),
    }
  }
}

/**
 * 字节格式化工具函数
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const cacheManager = new CacheManager()
export default cacheManager
