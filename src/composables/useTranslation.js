/**
 * 翻译查找工具
 * 提供 VN 标签和角色特征的名称翻译，未收录时回退显示原文。
 */
import vnTags from '@/i18n/locales/vn-tags.json'
import charTraits from '@/i18n/locales/char-traits.json'
import { useI18n } from 'vue-i18n'

// 去掉 _comment 字段
const vnTagsMap = Object.fromEntries(
  Object.entries(vnTags).filter(([k]) => k !== '_comment')
)
const charTraitsMap = Object.fromEntries(
  Object.entries(charTraits).filter(([k]) => k !== '_comment')
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

  return { translateTagName, translateTraitName }
}
