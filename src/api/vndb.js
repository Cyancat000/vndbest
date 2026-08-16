/**
 * VNDB API v2 (Kana) 客户端封装
 * 接口文档请参考 `docs/vndb-api-kana.md`
 */
 
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { cacheManager, CACHE_TTL } from '@/utils/cacheManager'

const BASE_URL = 'https://api.vndb.org/kana'
const SANDBOX_URL = 'https://beta.vndb.org/api/kana'

// 开发环境使用 Vite 代理路径，避免 CORS 问题（PATCH/DELETE 方法）
const DEV_PROXY = '/api/vndb'
const DEV_SANDBOX_PROXY = '/api/vndb-sandbox'

/**
 * 获取当前的 API Endpoint
 * 开发环境通过 Vite proxy 转发请求，生产环境（Capacitor）直接访问
 */
function getEndpoint() {
  const useSandbox = JSON.parse(localStorage.getItem('vndb_use_sandbox') || 'false')
  const isDev = import.meta.env.DEV
  if (isDev) {
    return useSandbox ? DEV_SANDBOX_PROXY : DEV_PROXY
  }
  return useSandbox ? SANDBOX_URL : BASE_URL
}

/**
 * 获取请求头配置，包含 Auth Token 如果有的话
 */
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  }
  const token = localStorage.getItem('vndb_api_token')
  if (token && token.trim()) {
    headers['Authorization'] = `Token ${token.trim()}`
  }
  return headers
}

function normalizeCapacitorResponseBody(data) {
  if (data == null || data === '') return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (_) {
      return data
    }
  }
  return data
}

/**
 * 判断请求是否应该进行持久化缓存或内存缓存，并返回缓存策略
 */
function getCachePolicy(path, method, body, customCacheOptions = {}) {
  // 如果显式禁用缓存
  if (customCacheOptions.cache === false) {
    return null
  }

  // 非 GET / POST 请求不缓存（例如 PATCH, DELETE 等变更类操作）
  if (method !== 'GET' && method !== 'POST') {
    return null
  }

  // 私人数据和认证类接口不进行持久化只读缓存（安全与隔离）
  if (path.startsWith('/ulist') || path.startsWith('/authinfo')) {
    return null
  }

  // 1. 详情类接口与元数据：写入 IndexedDB 持久化 + 1天 TTL (CACHE_TTL.LONG)
  // 识别规则：
  // - POST /vn 或 /release 或 /character 或 /producer 或 /staff 且 filters 包含 ['id', '=', '...']
  // - 或者特定静态元数据 /tag, /trait
  let isDetail = false
  let isStaticMeta = false

  let parsedBody = null
  if (typeof body === 'string') {
    try {
      parsedBody = JSON.parse(body)
    } catch (_) {}
  } else if (body && typeof body === 'object') {
    parsedBody = body
  }

  if (parsedBody && Array.isArray(parsedBody.filters)) {
    const f = parsedBody.filters
    // 形式如 ['id', '=', 'v17']
    if (f.length === 3 && f[0] === 'id' && f[1] === '=') {
      isDetail = true
    }
  }

  // 如果请求路径是 /tag 或 /trait 并且是查列表/搜索，作为长效元数据
  if (path === '/tag' || path === '/trait') {
    isStaticMeta = true
  }

  // 允许外部通过 customCacheOptions 显式覆盖
  const persistent = customCacheOptions.persistent !== undefined
    ? customCacheOptions.persistent
    : (isDetail || isStaticMeta)

  const ttl = customCacheOptions.ttl !== undefined
    ? customCacheOptions.ttl
    : (persistent ? CACHE_TTL.LONG : CACHE_TTL.SHORT)

  return {
    persistent,
    ttl,
    forceReload: Boolean(customCacheOptions.forceReload)
  }
}

/**
 * 生成规范化的缓存键
 */
function generateCacheKey(path, method, body) {
  let bodyStr = ''
  if (typeof body === 'string') {
    try {
      // 规范化 JSON key 顺序以最大化命中率
      const obj = JSON.parse(body)
      bodyStr = JSON.stringify(obj)
    } catch (_) {
      bodyStr = body
    }
  } else if (body && typeof body === 'object') {
    bodyStr = JSON.stringify(body)
  }
  return `${method}:${path}:${bodyStr}`
}

/**
 * 通用请求发送函数
 */
export async function request(path, options = {}) {
  const url = `${getEndpoint()}${path}`
  const { timeout, cache: cacheOption, forceReload, ...fetchOptions } = options

  const method = fetchOptions.method || 'GET'
  const requestBody = typeof fetchOptions.body === 'string' ? fetchOptions.body : null

  // 缓存策略判定
  const cachePolicy = getCachePolicy(path, method, requestBody, {
    ...(typeof cacheOption === 'object' ? cacheOption : {}),
    cache: cacheOption !== false,
    forceReload: forceReload || options.forceReload || (typeof cacheOption === 'object' && cacheOption?.forceReload),
    persistent: typeof cacheOption === 'object' ? cacheOption.persistent : undefined,
    ttl: typeof cacheOption === 'object' ? cacheOption.ttl : undefined,
  })

  const cacheKey = cachePolicy ? generateCacheKey(path, method, requestBody) : null

  // 1. 如果没有强制刷新且启用了缓存策略，尝试读取缓存
  if (cachePolicy && !cachePolicy.forceReload && cacheKey) {
    try {
      const cached = await cacheManager.get(cacheKey, { persistent: cachePolicy.persistent })
      if (cached !== null && cached !== undefined) {
        return cached
      }
    } catch (e) {
      console.warn('[VNDB API Cache] Read error:', e)
    }
  }

  // 2. 处理并发相同的 In-Flight 请求（防击穿）
  if (cacheKey && cacheManager.inFlightRequests.has(cacheKey)) {
    return cacheManager.inFlightRequests.get(cacheKey)
  }

  const executeRequest = async () => {
    let signal
    let timer
    if (timeout) {
      const controller = new AbortController()
      signal = controller.signal
      timer = setTimeout(() => controller.abort(), timeout)
    }

    const headers = {
      ...getHeaders(),
      ...fetchOptions.headers,
    }
    const isNative = Capacitor.isNativePlatform()

    try {
      let result = null

      if (isNative) {
        const nativeResponse = await CapacitorHttp.request({
          url,
          method,
          headers,
          data: requestBody ? JSON.parse(requestBody) : undefined,
          connectTimeout: timeout,
          readTimeout: timeout,
        })

        const normalizedData = normalizeCapacitorResponseBody(nativeResponse?.data)
        if (nativeResponse.status < 200 || nativeResponse.status >= 300) {
          const responseText = typeof nativeResponse?.data === 'string'
            ? nativeResponse.data
            : JSON.stringify(nativeResponse?.data ?? '')
          const errorMsg = normalizedData?.message || responseText || `HTTP error! status: ${nativeResponse.status}`
          const error = new Error(errorMsg)
          error.name = 'VndbRequestError'
          error.status = nativeResponse.status
          error.statusText = ''
          error.url = url
          error.method = method
          error.requestBody = requestBody
          error.responseBody = responseText
          error.responseData = normalizedData
          throw error
        }

        if (normalizedData && typeof normalizedData === 'object' && !Array.isArray(normalizedData)) {
          result = { ...normalizedData, _status: nativeResponse.status }
        } else {
          result = { data: normalizedData, _status: nativeResponse.status }
        }
      } else {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          ...(signal ? { signal } : {}),
        })

        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`
          let errData = null
          let responseText = ''

          try {
            responseText = await response.text()
            errData = responseText ? JSON.parse(responseText) : null
            if (errData?.message) {
              errorMsg = errData.message
            } else if (responseText) {
              errorMsg = responseText
            }
          } catch (_) {}

          const error = new Error(errorMsg)
          error.name = 'VndbRequestError'
          error.status = response.status
          error.statusText = response.statusText
          error.url = url
          error.method = method
          error.requestBody = requestBody
          error.responseBody = responseText
          error.responseData = errData
          throw error
        }

        const text = await response.text()
        const data = text ? JSON.parse(text) : {}
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          result = { ...data, _status: response.status }
        } else {
          result = { data, _status: response.status }
        }
      }

      // 3. 请求成功，写入两级缓存
      if (cachePolicy && cacheKey && result) {
        cacheManager.set(cacheKey, result, {
          ttl: cachePolicy.ttl,
          persistent: cachePolicy.persistent,
        }).catch((err) => {
          console.warn('[VNDB API Cache] Set error:', err)
        })
      }

      return result
    } catch (err) {
      const isTimeoutError = err.name === 'AbortError' || err?.message?.toLowerCase?.().includes('timeout')
      if (isTimeoutError) {
        const timeoutError = new Error('请求超时，请检查网络后重试')
        timeoutError.name = 'VndbTimeoutError'
        timeoutError.url = url
        timeoutError.method = method
        timeoutError.requestBody = requestBody
        throw timeoutError
      }

      if (!err.url) err.url = url
      if (!err.method) err.method = method
      if (err.requestBody === undefined) err.requestBody = requestBody
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  if (cacheKey) {
    const promise = executeRequest().finally(() => {
      cacheManager.inFlightRequests.delete(cacheKey)
    })
    cacheManager.inFlightRequests.set(cacheKey, promise)
    return promise
  }

  return executeRequest()
}

/**
 * 1. 获取系统统计信息
 * GET /stats
 */
export async function getStats() {
  return request('/stats')
}

/**
 * 2. 搜索 Visual Novels
 * POST /vn
 */
export async function searchVn(query, params = {}) {
  const payload = {
    filters: ['search', '=', query],
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail,sexual}, released, olang, rating',
    results: 20,
    ...params
  }
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 2.1 获取最新的 Visual Novels
 * POST /vn
 */
export async function getLatestVn(params = {}) {
  const payload = {
    filters: ['released', '>=', '2020-01-01'],
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail,sexual}, released, olang, rating',
    sort: 'released',
    reverse: true,
    results: 10,
    ...params
  }
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 2.2 通用 VN 列表查询 (根据 filters)
 * POST /vn
 */
export async function getVnList(filters = [], params = {}) {
  const payload = {
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail,sexual}, released, olang, rating',
    results: 20,
    ...params
  }
  if (filters && Array.isArray(filters) && filters.length > 0) {
    payload.filters = filters
  }
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 2.3 获取随机 Visual Novels
 * POST /vn
 */
export async function getRandomVn(params = {}) {
  // 使用 ID 范围来模拟随机，避免 offset 限制导致的 400 错误
  // VNDB 的 VN ID 大约到 v50000+，我们随机生成一个 ID
  const maxId = params.maxId || 45000
  const randomId = Math.floor(Math.random() * maxId) + 1
  const payload = {
    filters: ['id', '>=', `v${randomId}`],
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail,sexual}, released, olang, rating',
    sort: 'id',
    results: 1,
    ...params
  }
  // 移除自定义参数
  delete payload.maxId
  delete payload.maxOffset
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 3. 获取特定 Visual Novel 的详细信息
 * POST /vn
 */
export async function getVnDetail(id) {
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['id', '=', id],
      fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,dims,sexual,violence,thumbnail,thumbnail_dims}, released, olang, description, relations{id,title,alttitle,relation,relation_official,image{url,dims,thumbnail,sexual},rating,released,olang}, languages, platforms, developers{id,name}, rating, votecount, length, length_minutes, tags{id,name,rating,spoiler,category,searchable}, staff{id,role,name,original}, va{note,staff{id,name,original},character{id,name,original,image{url,sexual}}}, screenshots{url,dims,thumbnail,thumbnail_dims,sexual}',
    })
  })
}

/**
 * 3.1 获取特定 Visual Novel 的 Releases 列表 (包含封面 fields: images)
 * POST /release
 */
export async function getVnReleases(vnId) {
  return request('/release', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['vn', '=', ['id', '=', vnId]],
      fields: 'id, title, alttitle, released, languages{lang}, platforms, official, patch, freeware, notes, uncensored, minage, images{url,dims,type,languages,sexual}',
      sort: 'released',
      results: 50
    })
  })
}

/**
 * 3.1.1 通用 Release 列表查询
 * POST /release
 */
export async function getReleaseList(filters = [], params = {}) {
  const payload = {
    fields: 'id, title, alttitle, released, languages{lang}, platforms, official, patch, freeware, notes, uncensored, minage, images{url,dims,type,languages,sexual}',
    results: 20,
    ...params
  }
  if (filters && Array.isArray(filters) && filters.length > 0) {
    payload.filters = filters
  }
  return request('/release', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 3.1.2 获取特定 Release 的详细信息
 * POST /release
 */
export async function getReleaseDetail(id) {
  return request('/release', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['id', '=', id],
      fields: 'id, title, alttitle, released, languages{lang,title,latin,main}, platforms, official, patch, freeware, notes, uncensored, minage, gtin, catalog, resolution, voiced, engine, media{medium,qty}, images{url,dims,type,languages,sexual}, vns{id,title,alttitle,titles{lang,title,latin},image{url,thumbnail,sexual},released,olang,rating}, producers{id,name,original,developer,publisher}',
    })
  })
}

/**
 * 3.2 获取特定 Visual Novel 的角色列表
 * POST /character
 */
export async function getVnCharacters(vnId) {
  return request('/character', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['vn', '=', ['id', '=', vnId]],
      fields: 'id, name, original, description, image{url,dims,sexual,violence}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns{id,role,spoiler}, traits{name,spoiler,sexual,group_name}',
      results: 100
    })
  })
}

/**
 * 3.3 获取特定 Visual Novel 的 摘录列表
 * POST /quote
 */
export async function getVnQuotes(vnId) {
  return request('/quote', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['vn', '=', ['id', '=', vnId]],
      fields: 'id, quote, score, character{name,original}',
      sort: 'score',
      reverse: true,
      results: 50
    })
  })
}

/**
 * 3.3b 获取角色台词摘录 (Character Quotes)
 * POST /quote
 */
export async function getCharacterQuotes(characterId) {
  return request('/quote', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['character', '=', ['id', '=', characterId]],
      fields: 'id, quote, score, vn{id,title}, character{id,name,original}',
      sort: 'score',
      reverse: true,
      results: 100
    })
  })
}

/**
 * 3.4 获取特定角色的详细信息
 * POST /character
 */
export async function getCharacterDetail(id) {
  return request('/character', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['id', '=', id],
      fields: 'id, name, original, description, image{url,dims,sexual,violence}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns{id,role,spoiler,title,alttitle,image{url,dims,thumbnail,sexual},rating,released,olang}, traits{id,name,spoiler,sexual,group_name}',
    })
  })
}

/**
 * 3.5 搜索 Characters
 * POST /character
 */
export async function searchCharacters(query, params = {}) {
  const payload = {
    filters: ['search', '=', query],
    fields: 'id, name, original, description, image{url,dims,sexual}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday',
    results: 20,
    ...params
  }
  return request('/character', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 3.6 通用 Character 列表查询
 * POST /character
 */
export async function getCharacterList(filters = [], params = {}) {
  const payload = {
    fields: 'id, name, original, description, image{url,dims,sexual}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday',
    results: 20,
    ...params
  }
  if (filters && Array.isArray(filters) && filters.length > 0) {
    payload.filters = filters
  }
  return request('/character', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 4. 获取授权信息 / 验证 Token
 * GET /authinfo
 */
export async function getAuthInfo(customToken = null) {
  const headers = {}
  if (customToken) {
    headers['Authorization'] = `Token ${customToken.trim()}`
  }
  return request('/authinfo', {
    method: 'GET',
    headers
  })
}

/**
 * 5. 获取用户收藏列表
 * POST /ulist
 */
export async function getUserList(params = {}) {
  const userId = localStorage.getItem('vndb_user_id')
  const payload = {
    ...params
  }
  // 如果没有指定 user，则默认传当前已登录的 userId
  if (!payload.user && userId) {
    payload.user = userId
  }
  if (payload.fields) {
    // 确保包含需要的字段
    if (!payload.fields.includes('vn.titles')) {
      payload.fields += ', vn.titles{lang,title,latin}'
    }
  } else {
    payload.fields = 'id, added, voted, lastmod, vote, started, finished, notes, labels{id,label}, vn{id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail,sexual}, released, olang, rating}'
  }
  return request('/ulist', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 6. 获取用户收藏标签列表
 * GET /ulist_labels
 */
export async function getUserListLabels(userId = null) {
  const currentUserId = userId || localStorage.getItem('vndb_user_id')
  let path = '/ulist_labels'
  if (currentUserId) {
    path += `?user=${currentUserId}`
  }
  return request(path, {
    method: 'GET'
  })
}

/**
 * 7. 搜索 Producers (会社)
 * POST /producer
 */
export async function searchProducers(query, params = {}) {
  const payload = {
    filters: ['search', '=', query],
    fields: 'id, name, original, aliases, lang, type, description',
    results: 20,
    ...params
  }
  return request('/producer', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 7.1 获取特定 Producer 的详细信息
 * POST /producer
 */
export async function getProducerDetail(id) {
  return request('/producer', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['id', '=', id],
      fields: 'id, name, original, aliases, lang, type, description, extlinks{url,label,name}',
    })
  })
}

/**
 * 7.2 通用 Producer 列表查询
 * POST /producer
 */
export async function getProducerList(filters = [], params = {}) {
  const payload = {
    fields: 'id, name, original, aliases, lang, type, description',
    results: 20,
    ...params
  }
  if (filters && Array.isArray(filters) && filters.length > 0) {
    payload.filters = filters
  }
  return request('/producer', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 8. 搜索 Staff (人物)
 * POST /staff
 */
export async function searchStaff(query, params = {}) {
  const payload = {
    filters: ['and', ['search', '=', query], ['ismain', '=', 1]],
    fields: 'id, name, original, lang, description, ismain',
    results: 20,
    ...params
  }
  return request('/staff', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 8.1 获取特定 Staff 的详细信息
 * POST /staff
 */
export async function getStaffDetail(id) {
  return request('/staff', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['id', '=', id],
      fields: 'id, name, original, lang, description, ismain, aliases{name,latin,ismain}, extlinks{url,label,name}',
    })
  })
}

/**
 * 8.2 通用 Staff 列表查询
 * POST /staff
 */
export async function getStaffList(filters = [], params = {}) {
  // 确保包含 ismain 过滤以避免重复人物，除非显式提供 filters
  const finalFilters = (filters && Array.isArray(filters) && filters.length > 0) ? filters : ['ismain', '=', 1]
  const payload = {
    filters: finalFilters,
    fields: 'id, name, original, lang, description, ismain',
    results: 20,
    ...params
  }
  return request('/staff', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 8.3 通用 VN 列表查询 (根据 Staff 过滤)
 */
export async function getVnListByStaff(staffId, params = {}) {
  const payload = {
    filters: ['staff', '=', ['id', '=', staffId]],
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail,sexual}, released, olang, rating',
    results: 20,
    ...params
  }
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 9. 搜索 Tags
 * POST /tag
 */
export async function searchTags(query, params = {}) {
  const payload = {
    filters: ['search', '=', query],
    fields: 'id, name, description, category, vn_count',
    results: 20,
    ...params
  }
  return request('/tag', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 9.1 通用 Tag 列表查询
 * POST /tag
 */
export async function getTagList(filters = [], params = {}) {
  const payload = {
    fields: 'id, name, description, category, vn_count',
    results: 20,
    ...params
  }
  if (filters && Array.isArray(filters) && filters.length > 0) {
    payload.filters = filters
  }
  return request('/tag', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 10. 搜索 Traits
 * POST /trait
 */
export async function searchTraits(query, params = {}) {
  const payload = {
    filters: ['search', '=', query],
    fields: 'id, name, description, group_id, group_name, char_count',
    results: 20,
    ...params
  }
  return request('/trait', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 10.1 通用 Trait 列表查询
 * POST /trait
 */
export async function getTraitList(filters = [], params = {}) {
  const payload = {
    fields: 'id, name, description, group_id, group_name, char_count',
    results: 20,
    ...params
  }
  if (filters && Array.isArray(filters) && filters.length > 0) {
    payload.filters = filters
  }
  return request('/trait', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/**
 * 11. 获取用户收藏列表中某个 VN 的条目
 * POST /ulist
 */
export async function getVnListItem(vnId) {
  const userId = localStorage.getItem('vndb_user_id')
  if (!userId) return null
  return request('/ulist', {
    method: 'POST',
    body: JSON.stringify({
      user: userId,
      fields: 'id, vote, added, lastmod, started, finished, notes, labels{id,label}',
      filters: ['id', '=', vnId],
      results: 1
    })
  })
}

/**
 * 12. 更新/添加用户收藏列表中的 VN 条目
 * PATCH /ulist/<id>
 */
export async function patchVnListItem(vnId, data, options = {}) {
  return request(`/ulist/${vnId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    ...options
  })
}

/**
 * 13. 删除用户收藏列表中的 VN 条目
 * DELETE /ulist/<id>
 */
export async function deleteVnListItem(vnId) {
  return request(`/ulist/${vnId}`, {
    method: 'DELETE'
  })
}
