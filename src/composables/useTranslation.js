/**
 * 翻译查找工具
 * 提供 VN 标签和角色特征的名称翻译，未收录时回退显示原文。
 */
import vnTags from '@/i18n/locales/vn-tags.json'
import charTraits from '@/i18n/locales/char-traits.json'
import { useI18n } from 'vue-i18n'

// 去掉非翻译字段（以 _ 开头的元数据字段）
const vnTagsMap = Object.fromEntries(
  Object.entries(vnTags).filter(([k]) => !k.startsWith('_'))
)
const charTraitsMap = Object.fromEntries(
  Object.entries(charTraits).filter(([k]) => !k.startsWith('_'))
)

// 构建反向映射：中文 → 英文原文
const vnTagsReverseMap = Object.fromEntries(
  Object.entries(vnTagsMap).map(([en, zh]) => [zh, en])
)
const charTraitsReverseMap = Object.fromEntries(
  Object.entries(charTraitsMap).map(([en, zh]) => [zh, en])
)

export function useTranslation() {
  const { locale } = useI18n()

  /**
   * 翻译 VN 标签名
   * @param {string} name - VNDB API 返回的英文标签名
   * @returns {string} 翻译后的名称，未收录则返回原文
   */
  function translateTagName(name) {
    if (!name) return ''
    if (locale.value === 'zh') {
      return vnTagsMap[name] || name
    }
    return name
  }

  /**
   * 翻译角色特征名
   * @param {string} name - VNDB API 返回的英文特征名
   * @returns {string} 翻译后的名称，未收录则返回原文
   */
  function translateTraitName(name) {
    if (!name) return ''
    if (locale.value === 'zh') {
      return charTraitsMap[name] || name
    }
    return name
  }

  /**
   * 根据中文翻译查找英文原文（仅在 zh locale 下生效）
   * @param {string} zhName - 中文翻译名称
   * @returns {string} 英文原文，未找到则返回原始输入
   */
  function reverseLookupTagName(zhName) {
    if (!zhName) return ''
    if (locale.value === 'zh') {
      return vnTagsReverseMap[zhName] || zhName
    }
    return zhName
  }

  /**
   * 根据中文翻译查找英文原文（仅在 zh locale 下生效）
   * @param {string} zhName - 中文翻译名称
   * @returns {string} 英文原文，未找到则返回原始输入
   */
  function reverseLookupTraitName(zhName) {
    if (!zhName) return ''
    if (locale.value === 'zh') {
      return charTraitsReverseMap[zhName] || zhName
    }
    return zhName
  }

  /**
   * 在 i18n 翻译表中模糊搜索中文名（支持部分匹配）
   * @param {string} keyword - 中文搜索关键词
   * @returns {Array<{en: string, zh: string}>} 匹配结果列表
   */
  function searchTagsByZh(keyword) {
    if (!keyword || locale.value !== 'zh') return []
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    const results = []
    for (const [en, zh] of Object.entries(vnTagsMap)) {
      if (zh.toLowerCase().includes(kw)) {
        results.push({ en, zh })
      }
    }
    return results
  }

  /**
   * 在 i18n 翻译表中模糊搜索中文名（支持部分匹配）
   * @param {string} keyword - 中文搜索关键词
   * @returns {Array<{en: string, zh: string}>} 匹配结果列表
   */
  function searchTraitsByZh(keyword) {
    if (!keyword || locale.value !== 'zh') return []
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    const results = []
    for (const [en, zh] of Object.entries(charTraitsMap)) {
      if (zh.toLowerCase().includes(kw)) {
        results.push({ en, zh })
      }
    }
    return results
  }

  return { translateTagName, translateTraitName, reverseLookupTagName, reverseLookupTraitName, searchTagsByZh, searchTraitsByZh }
}
