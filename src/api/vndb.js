/**
 * VNDB API v2 (Kana) 客户端封装
 * 接口文档请参考 `docs/vndb-api-kana.md`
 */

const BASE_URL = 'https://api.vndb.org/kana'
const SANDBOX_URL = 'https://beta.vndb.org/api/kana'

/**
 * 获取当前的 API Endpoint
 */
function getEndpoint() {
  const useSandbox = JSON.parse(localStorage.getItem('vndb_use_sandbox') || 'false')
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

/**
 * 通用请求发送函数
 */
async function request(path, options = {}) {
  const url = `${getEndpoint()}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`
    try {
      const errData = await response.json()
      if (errData && errData.message) {
        errorMsg = errData.message
      }
    } catch (_) {}
    throw new Error(errorMsg)
  }

  // 某些接口如 DELETE 或 PATCH 可能返回空，需要安全解析 JSON
  const text = await response.text()
  return text ? JSON.parse(text) : {}
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
export async function searchVn(query) {
  // 根据文档，使用 POST /vn 并且使用 filters 对标题等进行过滤
  return request('/vn', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['search', '=', query],
      fields: 'id, title, alttitle, image.url, released, olang, description, relations.title, relations.relation_official',
      results: 10
    })
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
      fields: 'id, title, alttitle, image.url, image.dims, image.sexual, image.violence, released, olang, description, relations.id, relations.title, relations.relation, relations.relation_official, languages, platforms, developers.name, rating, votecount, length, length_minutes, tags.name, tags.rating, tags.spoiler, staff.role, staff.name, staff.original, va.note, va.staff.name, va.staff.original, va.character.name, va.character.original, va.character.image.url, screenshots.url, screenshots.dims, screenshots.thumbnail, screenshots.thumbnail_dims',
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
      fields: 'id, title, alttitle, released, languages.lang, platforms, official, patch, freeware, notes, uncensored, minage, images.url, images.dims, images.type, images.languages',
      sort: 'released',
      results: 50
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
      fields: 'id, name, original, description, image.url, image.dims, image.sexual, image.violence, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns.role, vns.spoiler',
      results: 100
    })
  })
}

/**
 * 3.3 获取特定 Visual Novel 的摘录列表
 * POST /quote
 */
export async function getVnQuotes(vnId) {
  return request('/quote', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['vn', '=', ['id', '=', vnId]],
      fields: 'id, quote, score, character.name, character.original',
      sort: 'score',
      reverse: true,
      results: 50
    })
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
