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
export async function getVnList(filters = [], params = {}) {
  const payload = {
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail}, released, olang, rating',
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
    fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,thumbnail}, released, olang, rating',
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
      fields: 'id, title, alttitle, titles{lang,title,latin}, image{url,dims,sexual,violence,thumbnail,thumbnail_dims}, released, olang, description, relations{id,title,alttitle,relation,relation_official,image{url,dims,thumbnail},rating,released,olang}, languages, platforms, developers{name}, rating, votecount, length, length_minutes, tags{id,name,rating,spoiler}, staff{role,name,original}, va{note,staff{name,original},character{id,name,original,image{url}}}, screenshots{url,dims,thumbnail,thumbnail_dims}',
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
      fields: 'id, title, alttitle, released, languages{lang}, platforms, official, patch, freeware, notes, uncensored, minage, images{url,dims,type,languages}',
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
    fields: 'id, title, alttitle, released, languages{lang}, platforms, official, patch, freeware, notes, uncensored, minage, images{url,dims,type,languages}',
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
 * 3.2 获取特定 Visual Novel 的角色列表
 * POST /character
 */
export async function getVnCharacters(vnId) {
  return request('/character', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['vn', '=', ['id', '=', vnId]],
      fields: 'id, name, original, description, image{url,dims,sexual,violence}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns{role,spoiler}, traits{name,spoiler,group_name}',
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
 * 3.4 获取特定角色的详细信息
 * POST /character
 */
export async function getCharacterDetail(id) {
  return request('/character', {
    method: 'POST',
    body: JSON.stringify({
      filters: ['id', '=', id],
      fields: 'id, name, original, description, image{url,dims,sexual,violence}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday, vns{id,role,spoiler,title,alttitle,image{url,dims,thumbnail},rating,released,olang}, traits{id,name,spoiler,group_name}',
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
    fields: 'id, name, original, description, image{url,dims}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday',
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
    fields: 'id, name, original, description, image{url,dims}, sex, blood_type, height, weight, bust, waist, hips, cup, age, birthday',
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
