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
export async function request(path, options = {}) {
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
export async function searchVn(query, params = {}) {
  const payload = {
    filters: ['search', '=', query],
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail}, released, olang, rating',
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
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail}, released, olang, rating',
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
export async function getVnList(filters, params = {}) {
  const payload = {
    filters,
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail}, released, olang, rating',
    results: 20,
    ...params
  }
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
      fields: 'id, title, alttitle, titles{lang,title,latin}, image.url, image.dims, image.sexual, image.violence, released, olang, description, relations.id, relations.title, relations.alttitle, relations.titles{lang,title,latin}, relations.relation, relations.relation_official, relations.image.url, relations.image.dims, relations.rating, relations.released, relations.olang, languages, platforms, developers.name, rating, votecount, length, length_minutes, tags.name, tags.rating, tags.spoiler, staff.role, staff.name, staff.original, va.note, va.staff.name, va.staff.original, va.character.id, va.character.name, va.character.original, va.character.image.url, screenshots.url, screenshots.dims, screenshots.thumbnail, screenshots.thumbnail_dims',
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
      fields: 'id, name, original, description, image.url, image.dims, image.sexual, image.violence, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns.role, vns.spoiler, traits.name, traits.spoiler, traits.group_name',
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
      fields: 'id, quote, score, character.name, character.original',
      sort: 'score',
      reverse: true,
      results: 50
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
      fields: 'id, name, original, description, image.url, image.dims, image.sexual, image.violence, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns.role, vns.spoiler, vns.id, vns.title, vns.alttitle, vns.titles{lang,title,latin}, vns.image.url, vns.image.dims, vns.rating, vns.released, vns.olang, traits.name, traits.spoiler, traits.group_name',
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
  if (payload.fields) {
    // 确保包含需要的字段
    if (!payload.fields.includes('vn.titles')) {
      payload.fields += ', vn.titles{lang,title,latin}'
    }
  } else {
    payload.fields = 'id, added, voted, lastmod, vote, started, finished, notes, labels{id,label}, vn{id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail}, released, olang, rating}'
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
