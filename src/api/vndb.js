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
      fields: 'id, title, alttitle, image.url, released, olang, description, relations.title, relations.relation_official',
    })
  })
}
