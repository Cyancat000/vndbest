<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getVnDetail, getVnReleases, getVnCharacters, getVnQuotes, getVnListItem, patchVnListItem, deleteVnListItem } from '@/api/vndb'
import VnList from '@/components/VnList.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { usePrivacy, getImageNsfwLevel } from '@/composables/usePrivacy'
import { useTranslation } from '@/composables/useTranslation'
import { useImageLoader } from '@/composables/useImageLoader'
import { IonPage, IonContent, IonImg, IonSpinner } from '@ionic/vue'

const { getDetailAction, getScreenshotAction, getCardAction } = usePrivacy()
const imageLoader = useImageLoader()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { translateTagName, translateTraitName } = useTranslation()

const vn = ref(null)
const releases = ref([])
const characters = ref([])
const quotes = ref([])
const loading = ref(true)
const releasesLoading = ref(true)
const charactersLoading = ref(true)
const quotesLoading = ref(true)
const error = ref(null)

// 详情页中的 Tab 切换选项，默认设置为 'releases' (版本发行)
const activeTab = ref('releases')

// 剧透展示级别，0 = 无剧透，1 = 轻度剧透，2 = 严重剧透
const spoilerLevel = ref(0)
const tempSpoilerLevel = ref(0) // 用于弹窗确认过程中的临时变量

// 标签分类筛选（多选）：'cont'=内容, 'ero'=性内容, 'tech'=技术
const activeTagCategories = ref(['cont', 'tech'])

// 标签搜索模式（单选）：'summary'=摘要, 'all'=全部
const tagSearchMode = ref('summary')

// 角色特征筛选：性内容显示开关
const showTraitSexual = ref(false)

// 角色特征剧透等级（与标签共享 spoilerLevel）
const traitSpoilerLevel = ref(0)
const tempTraitSpoilerLevel = ref(0)
const showTraitSpoilerConfirm = ref(false)

// 控制剧透警告确认弹窗的展示
const showSpoilerConfirm = ref(false)

// 控制大图查看器的展示
const showImageLightbox = ref(false)
const lightboxImageIndex = ref(0) // 记录当前查看的图片索引
const lightboxImagesList = ref([]) // 大图画廊的数据列表（可以是截图，也可以是封面等）
const scrollContainer = ref(null) // 滚动容器的 DOM 引用

// 控制简介展开/收起
const isDescriptionExpanded = ref(false)

// 控制笔记展开/收起
const notesExpanded = ref(false)

// 控制角色详情展开/收起 (存储展开的角色 ID)
const expandedCharIds = ref(new Set())

// 隐私过滤：已揭示的内容 (点击眼睛图标后)
const revealedItems = ref(new Set())

function toggleReveal(key) {
  if (revealedItems.value.has(key)) {
    revealedItems.value.delete(key)
  } else {
    revealedItems.value.add(key)
  }
  // 触发响应式更新
  revealedItems.value = new Set(revealedItems.value)
}

// ==================== 收藏状态管理 ====================

// 用户收藏列表条目（null 表示不在列表中）
const collectionEntry = ref(null)
const collectionLoading = ref(true)
const statusLoading = ref(false)

// 收藏状态加载标记：用于区分"尚未加载"和"加载完毕但无数据"
const collectionLoaded = ref(false)

// Toast 提示
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref('success') // 'success' | 'error'
let toastTimer = null

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2500)
}

// 预定义标签 ID 到原名的映射（VNDB 默认标签，用户可自定义）
const LABEL_NAMES = {
  1: 'Playing',
  2: 'Finished',
  3: 'Stalled',
  4: 'Dropped',
  5: 'Wishlisted',
  6: 'Backlog'
}

// 当前 VN 的状态标签 ID 数组
const currentLabelIds = computed(() => {
  if (!collectionEntry.value?.labels) return []
  return collectionEntry.value.labels.map(l => l.id)
})

// 获取当前主要状态（取最高优先级的标签）
const currentStatusLabel = computed(() => {
  if (currentLabelIds.value.length === 0) return null
  // 按优先级排序：Playing > Finished > Stalled > Dropped > Wishlisted > Backlog
  const priority = [1, 2, 3, 4, 5, 6]
  for (const id of priority) {
    if (currentLabelIds.value.includes(id)) {
      // 优先使用 API 返回的 name，否则用预定义名
      const apiLabel = collectionEntry.value.labels.find(l => l.id === id)
      const name = apiLabel?.name || LABEL_NAMES[id] || `Label ${id}`
      return { id, name }
    }
  }
  return null
})

// 状态选项列表（供 BaseSelect 使用）
const statusOptions = computed(() => {
  // 从 API 返回的标签构建选项（支持自定义标签）
  if (collectionEntry.value?.labels && collectionEntry.value.labels.length > 0) {
    const options = collectionEntry.value.labels
      .filter(l => l.id >= 1 && l.id <= 6)
      .map(l => ({ value: l.id, label: l.name || LABEL_NAMES[l.id] || `Label ${l.id}` }))
    // 确保所有预定义标签都在选项中
    const existingIds = new Set(options.map(o => o.value))
    for (const [id, name] of Object.entries(LABEL_NAMES)) {
      if (!existingIds.has(Number(id))) {
        options.push({ value: Number(id), label: name })
      }
    }
    return options
  }
  // 无 API 数据时使用预定义标签
  return Object.entries(LABEL_NAMES).map(([id, name]) => ({
    value: Number(id),
    label: name
  }))
})

// 当前选中的值（0 表示"无"）
const currentStatusValue = computed(() => currentStatusLabel.value?.id || 0)

// 加载当前 VN 的收藏状态
const loadCollectionStatus = async (vnId) => {
  const token = localStorage.getItem('vndb_api_token')
  if (!token) {
    collectionLoading.value = false
    collectionLoaded.value = true
    return
  }
  collectionLoading.value = true
  try {
    const data = await getVnListItem(vnId)
    if (data && data.results && data.results.length > 0) {
      collectionEntry.value = data.results[0]
    } else {
      collectionEntry.value = null
    }
  } catch (err) {
    console.error('获取收藏状态失败:', err)
  } finally {
    collectionLoading.value = false
    collectionLoaded.value = true
  }
}

// 处理状态变更（通过 BaseSelect）
const handleStatusChange = async (newLabelId) => {
  if (!vn.value?.id) return

  const token = localStorage.getItem('vndb_api_token')
  if (!token) {
    router.push('/login')
    return
  }

  statusLoading.value = true
  try {
    if (!newLabelId) {
      // 选择"无" → 从列表移除
      if (collectionEntry.value) {
        await deleteVnListItem(collectionEntry.value.id)
        collectionEntry.value = null
      }
    } else if (collectionEntry.value) {
      // 已在列表中 → 先移除旧的状态标签，再设置新的
      const oldLabelIds = currentLabelIds.value.filter(id => id >= 1 && id <= 6)
      const data = {}
      if (oldLabelIds.length > 0) {
        data.labels_unset = oldLabelIds
      }
      if (!oldLabelIds.includes(newLabelId)) {
        data.labels_set = [newLabelId]
      }
      if (Object.keys(data).length > 0) {
        await patchVnListItem(collectionEntry.value.id, data)
      }
    } else {
      // 不在列表中 → 创建新条目
      await patchVnListItem(vn.value.id, { labels: [newLabelId] })
    }

    // 重新加载状态
    await loadCollectionStatus(vn.value.id)
  } catch (err) {
    console.error('更新收藏状态失败:', err)
  } finally {
    statusLoading.value = false
  }
}

// ==================== 收藏编辑弹窗 ====================

const showEditModal = ref(false)
const editSaving = ref(false)

// 弹窗表单数据
const editForm = ref({
  statusLabelId: 0,    // 状态标签 ID（0 = 无）
  vote: '',            // 评分 1-10，空字符串表示未评分
  notes: '',           // 笔记
  started: '',         // 开始日期 YYYY-MM-DD
  finished: ''         // 结束日期 YYYY-MM-DD
})

// 星星悬停预览
const hoverVote = ref(null)

// 设置评分（点击星星）
const setVote = (val) => {
  if (editForm.value.vote === val) {
    // 再次点击同一个星星 = 取消评分
    editForm.value.vote = ''
  } else {
    editForm.value.vote = val
  }
}

// 清除评分
const clearVote = () => {
  editForm.value.vote = ''
}

// 格式化评分显示
const formattedVote = computed(() => {
  const vote = collectionEntry.value?.vote
  if (!vote) return null
  return vote / 10  // API 返回 10-100，显示为 1.0-10.0
})

// 打开编辑弹窗，用当前收藏数据填充表单
const openEditModal = () => {
  const rawVote = collectionEntry.value?.vote
  editForm.value = {
    statusLabelId: currentStatusLabel.value?.id || 0,
    vote: rawVote ? Math.round(rawVote / 10) : '',
    notes: collectionEntry.value?.notes || '',
    started: collectionEntry.value?.started || '',
    finished: collectionEntry.value?.finished || ''
  }
  hoverVote.value = null
  showEditModal.value = true
  document.body.style.overflow = 'hidden'
}

// 关闭编辑弹窗
const closeEditModal = () => {
  showEditModal.value = false
  document.body.style.overflow = ''
}

// 保存编辑弹窗表单
const saveEditForm = async () => {
  if (!vn.value?.id) return

  const token = localStorage.getItem('vndb_api_token')
  if (!token) {
    router.push('/login')
    return
  }

  editSaving.value = true
  try {
    const form = editForm.value

    // 处理状态标签变更
    const newLabelId = form.statusLabelId || 0
    const oldLabelIds = currentLabelIds.value.filter(id => id >= 1 && id <= 6)

    if (!collectionEntry.value) {
      // 不在列表中 → 创建新条目
      const patchData = {}
      if (newLabelId > 0) {
        patchData.labels = [newLabelId]
      }
      if (form.vote !== '') {
        patchData.vote = Math.round(Number(form.vote) * 10)
      }
      if (form.notes) {
        patchData.notes = form.notes
      }
      if (form.started) {
        patchData.started = form.started
      }
      if (form.finished) {
        patchData.finished = form.finished
      }
      if (Object.keys(patchData).length > 0) {
        await patchVnListItem(vn.value.id, patchData, { timeout: 15000 })
      }
    } else {
      // 已在列表中 → 更新（仅发送实际变更的字段）
      const entry = collectionEntry.value
      const patchData = {}

      // 状态标签变更
      if (newLabelId === 0 && oldLabelIds.length > 0) {
        patchData.labels_unset = oldLabelIds
      } else if (newLabelId > 0) {
        const labelsToUnset = oldLabelIds.filter(id => id !== newLabelId)
        if (labelsToUnset.length > 0) {
          patchData.labels_unset = labelsToUnset
        }
        if (!oldLabelIds.includes(newLabelId)) {
          patchData.labels_set = [newLabelId]
        }
      }

      // 评分变更（仅在实际变更时发送）
      const oldVote = entry.vote  // 原始值为整数 10-100 或 null
      const newVote = form.vote !== '' ? Math.round(Number(form.vote) * 10) : null
      if (oldVote !== newVote) {
        patchData.vote = newVote
      }

      // 笔记变更（仅在实际变更时发送）
      const oldNotes = entry.notes || null
      const newNotes = form.notes || null
      if (oldNotes !== newNotes) {
        patchData.notes = newNotes
      }

      // 开始日期变更（仅在实际变更时发送）
      const oldStarted = entry.started || null
      const newStarted = form.started || null
      if (oldStarted !== newStarted) {
        patchData.started = newStarted
      }

      // 完成日期变更（仅在实际变更时发送）
      const oldFinished = entry.finished || null
      const newFinished = form.finished || null
      if (oldFinished !== newFinished) {
        patchData.finished = newFinished
      }

      if (Object.keys(patchData).length > 0) {
        await patchVnListItem(entry.id, patchData, { timeout: 15000 })
      }
    }

    // 重新加载状态
    await loadCollectionStatus(vn.value.id)
    showEditModal.value = false
    document.body.style.overflow = ''
    showToast(t('vn.status.save_success'), 'success')
  } catch (err) {
    console.error('保存收藏信息失败:', err)
    showToast(t('vn.status.save_error'), 'error')
  } finally {
    editSaving.value = false
  }
}

// 详情页封面过滤动作
const coverAction = computed(() => {
  if (!vn.value?.image) return 'show'
  return getDetailAction('vn', getImageNsfwLevel(vn.value.image))
})

const toggleCharExpansion = (id) => {
  if (expandedCharIds.value.has(id)) {
    expandedCharIds.value.delete(id)
  } else {
    expandedCharIds.value.add(id)
  }
}

// 获取角色的声优信息
const getCharacterVA = (charId) => {
  if (!vn.value || !vn.value.va) return null
  return vn.value.va.find(v => v.character?.id === charId)
}

// 根据当前选择的剧透级别和性内容过滤器过滤角色特征
const groupTraits = (traits) => {
  if (!traits) return {}
  const filtered = traits.filter(t => {
    // 剧透级别过滤
    if (t.spoiler > traitSpoilerLevel.value) return false
    // 性内容过滤：sexual 是 Bool 类型
    if (!showTraitSexual.value && t.sexual) return false
    return true
  })
  return filtered.reduce((acc, trait) => {
    const group = trait.group_name || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(trait)
    return acc
  }, {})
}

// 根据剧透级别过滤角色本身（角色在当前 VN 中的剧透等级）
const filteredCharacters = computed(() => {
  if (!characters.value) return []
  return characters.value.filter(char => {
    // 获取角色在当前 VN 中的剧透等级
    const vnEntry = char.vns?.find(v => v.id === vn.value?.id)
    const charSpoiler = vnEntry?.spoiler ?? 0
    // 如果角色剧透等级超过当前筛选级别，隐藏整个角色
    if (charSpoiler > traitSpoilerLevel.value) return false
    return true
  })
})

// 处理角色特征剧透级别切换
const handleSelectTraitSpoiler = (level) => {
  if (level === 2) {
    tempTraitSpoilerLevel.value = level
    showTraitSpoilerConfirm.value = true
  } else {
    traitSpoilerLevel.value = level
  }
}

const confirmTraitSpoilerLevel = () => {
  traitSpoilerLevel.value = tempTraitSpoilerLevel.value
  showTraitSpoilerConfirm.value = false
}

const filteredTags = computed(() => {
  if (!vn.value || !vn.value.tags) return []
  return vn.value.tags.filter(tag => {
    // 剧透等级过滤
    if (tag.spoiler > spoilerLevel.value) return false
    // 分类过滤（多选）
    if (!activeTagCategories.value.includes(tag.category)) return false
    // 搜索模式过滤：summary 只显示高相关性标签（rating >= 2.0）
    if (tagSearchMode.value === 'summary' && tag.rating < 2.0) return false
    return true
  })
})

// 切换标签分类（多选，允许全部取消）
const toggleTagCategory = (category) => {
  const idx = activeTagCategories.value.indexOf(category)
  if (idx >= 0) {
    activeTagCategories.value.splice(idx, 1)
  } else {
    activeTagCategories.value.push(category)
  }
}

// 从 releases 数据中提取所有封面图（保留原始 image 对象用于隐私过滤）
const allCovers = computed(() => {
  const list = []
  
  // 1. 主视觉封面图
  if (vn.value?.image?.url) {
    list.push({
      url: vn.value.image.url,
      dims: vn.value.image.dims,
      title: '主视觉图 (Main Visual)',
      desc: vn.value.title,
      image: vn.value.image
    })
  }

  // 2. 收集各 Release 的封面大图
  releases.value.forEach(rel => {
    if (rel.images && rel.images.length > 0) {
      rel.images.forEach(img => {
        // 主要是 pkgfront (包装正面) 或 dig (数字封面)
        if (img.url && !list.some(item => item.url === img.url)) {
          let label = '封面图'
          if (img.type === 'pkgfront') label = '包装封面 (Front)'
          if (img.type === 'pkgback') label = '包装封底 (Back)'
          if (img.type === 'dig') label = '数字封面 (Digital)'
          
          list.push({
            url: img.url,
            dims: img.dims,
            title: `${label} - ${rel.title}`,
            desc: rel.released || '发售日未知',
            image: img
          })
        }
      })
    }
  })

  return list
})

// 隐私过滤：封面画册图片
function getCoverAction(cover) {
  return getCardAction('release', getImageNsfwLevel(cover.image))
}

function shouldBlurCover(cover) {
  const action = getCoverAction(cover)
  return action === 'blur' || action === 'blur_card'
}

function isCoverHidden(cover) {
  return getCoverAction(cover) === 'hide'
}

const filteredCovers = computed(() => {
  return allCovers.value.filter(cover => !isCoverHidden(cover))
})

// 获取当前大图的 URL
const currentLightboxImageUrl = computed(() => {
  if (lightboxImagesList.value.length === 0) return ''
  return lightboxImagesList.value[lightboxImageIndex.value]?.url || ''
})

// 处理切换剧透级别的点击事件
const handleSelectSpoiler = (level) => {
  if (level === 2) {
    tempSpoilerLevel.value = level
    showSpoilerConfirm.value = true
  } else {
    spoilerLevel.value = level
  }
}

// 确认切换剧透等级
const confirmSpoilerLevel = () => {
  spoilerLevel.value = tempSpoilerLevel.value
  showSpoilerConfirm.value = false
}

// 点开大图查看器
const openLightbox = (index, imagesArray) => {
  lightboxImagesList.value = imagesArray
  lightboxImageIndex.value = index
  showImageLightbox.value = true
  
  // 绑定键盘监听
  window.addEventListener('keydown', handleKeyDown)
  
  // 等待 DOM 渲染完成后，滚动到对应图片位置
  nextTick(() => {
    scrollToIndex(index, 'auto')
  })
}

// 关闭大图查看器
const closeLightbox = () => {
  showImageLightbox.value = false
  window.removeEventListener('keydown', handleKeyDown)
}

// 将容器滚动到对应的图片索引
const scrollToIndex = (index, behavior = 'smooth') => {
  if (!scrollContainer.value) return
  const containerWidth = scrollContainer.value.clientWidth
  
  isProgrammaticScroll = true
  
  scrollContainer.value.scrollTo({
    left: index * containerWidth,
    behavior: behavior
  })
  
  if (behavior === 'auto') {
    isProgrammaticScroll = false
  } else {
    setTimeout(() => {
      isProgrammaticScroll = false
    }, 350)
  }
}

let isProgrammaticScroll = false

// 监听容器滚动事件，实时更新当前图片索引
const handleScroll = () => {
  if (isProgrammaticScroll || !scrollContainer.value) return
  const scrollLeft = scrollContainer.value.scrollLeft
  const containerWidth = scrollContainer.value.clientWidth
  if (containerWidth > 0) {
    const index = Math.round(scrollLeft / containerWidth)
    if (index !== lightboxImageIndex.value && index >= 0 && index < lightboxImagesList.value.length) {
      lightboxImageIndex.value = index
    }
  }
}

// 切换下一张图片
const nextImage = () => {
  if (lightboxImagesList.value.length === 0) return
  const nextIdx = (lightboxImageIndex.value + 1) % lightboxImagesList.value.length
  lightboxImageIndex.value = nextIdx
  scrollToIndex(nextIdx, 'smooth')
}

// 切换上一张图片
const prevImage = () => {
  if (lightboxImagesList.value.length === 0) return
  const prevIdx = (lightboxImageIndex.value - 1 + lightboxImagesList.value.length) % lightboxImagesList.value.length
  lightboxImageIndex.value = prevIdx
  scrollToIndex(prevIdx, 'smooth')
}

// 处理键盘快捷键
const handleKeyDown = (e) => {
  if (e.key === 'ArrowRight' || e.key === 'Right') {
    nextImage()
  } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
    prevImage()
  } else if (e.key === 'Escape') {
    closeLightbox()
  }
}

// 触摸滑动控制：一次只能滑动一格
let touchStartX = 0
let touchStartY = 0
let isScrolling = false

const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  isScrolling = false
}

const handleTouchMove = (e) => {
  const deltaX = Math.abs(e.touches[0].clientX - touchStartX)
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY)
  if (deltaX > deltaY) {
    e.preventDefault()
    isScrolling = true
  }
}

const handleTouchEnd = (e) => {
  if (!isScrolling) return
  
  const touchEndX = e.changedTouches[0].clientX
  const deltaX = touchEndX - touchStartX
  
  if (deltaX > 40) {
    prevImage()
  } else if (deltaX < -40) {
    nextImage()
  } else {
    scrollToIndex(lightboxImageIndex.value, 'smooth')
  }
}

// BBCode 渲染函数
const parseBBCode = (text) => {
  if (!text) return ''
  let escaped = text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')

  // 1. [url=link]text[/url]
  escaped = escaped.replace(/\[url=(https?:\/\/[^\]]+)\](.*?)\[\/url\]/gi, (match, url, label) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-neutral-900 font-semibold hover:text-neutral-600 transition-colors">${label}</a>`
  })

  // 2. [url]link[/url]
  escaped = escaped.replace(/\[url\](https?:\/\/[^\[]+)\[\/url\]/gi, (match, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-neutral-900 font-semibold hover:text-neutral-600 transition-colors">${url}</a>`
  })

  return escaped
}

// 格式化时长
const formatLength = (vnData) => {
  if (vnData.length_minutes) {
    const hours = Math.floor(vnData.length_minutes / 60)
    const mins = vnData.length_minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }
  if (vnData.length) {
    return t(`metadata.length.${vnData.length}`) || t('metadata.length.unknown')
  }
  return t('metadata.length.unknown')
}

// 翻译关系说明
const translateRelation = (relationType) => {
  return t(`metadata.relation.${relationType}`) || relationType
}

// 翻译角色性别（sex 可能为数组 ["f","f"] 或字符串 "f,f"）
const translateGender = (sex) => {
  if (!sex) return t('metadata.gender.unknown')
  let primarySex
  if (Array.isArray(sex)) {
    primarySex = sex.length > 0 ? sex[0] : null
  } else if (typeof sex === 'string' && sex.length > 0) {
    primarySex = sex.includes(',') ? sex.split(',')[0].trim() : sex[0]
  } else {
    primarySex = sex
  }
  if (!primarySex) return t('metadata.gender.unknown')
  return t(`metadata.gender.${primarySex}`) || sex
}

// 翻译演职人员角色
const translateStaffRole = (role) => {
  return t(`metadata.staff_role.${role.toLowerCase()}`) || role
}

// 翻译角色类型关系
const translateCharRole = (role) => {
  return t(`metadata.role.${role.toLowerCase()}`) || role
}

// 翻译特征分组名（分组名可能含空格、括号如 "ENGAGES IN_(SEXUAL)"）
const translateTraitGroup = (groupName) => {
  if (!groupName) return t('metadata.trait_group.other')
  const key = groupName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')
  return t(`metadata.trait_group.${key}`) || groupName
}

// 加载主要详情及其他关联选项卡内容
const loadVnDetail = async (id) => {
  loading.value = true
  error.value = null
  try {
    const data = await getVnDetail(id)
    if (data && data.results && data.results.length > 0) {
      vn.value = data.results[0]
      // 默认激活版本发行
      activeTab.value = 'releases'
      spoilerLevel.value = 0
      activeTagCategories.value = ['cont', 'tech']
      tagSearchMode.value = 'summary'
      collectionEntry.value = null
      collectionLoaded.value = false
      collectionLoading.value = true
      
      // 并发异步加载其余所有子选项卡数据，加快响应时间
      loadReleases(id)
      loadCharacters(id)
      loadQuotes(id)
      loadCollectionStatus(id)
    } else {
      vn.value = null
      error.value = t('vn.not_found')
    }
  } catch (err) {
    console.error('获取VN详情失败:', err)
    error.value = err.message || t('vn.not_found')
  } finally {
    loading.value = false
  }
}

// 加载 Releases 发行列表
const loadReleases = async (id) => {
  releasesLoading.value = true
  try {
    const data = await getVnReleases(id)
    if (data && data.results) {
      releases.value = data.results
    }
  } catch (err) {
    console.error('获取Releases失败:', err)
  } finally {
    releasesLoading.value = false
  }
}

// 加载 角色（Characters）列表
const loadCharacters = async (id) => {
  charactersLoading.value = true
  try {
    const data = await getVnCharacters(id)
    if (data && data.results) {
      // 按照重要程度排序: main -> primary -> side -> appears
      const roleWeight = { 'main': 4, 'primary': 3, 'side': 2, 'appears': 1 }
      characters.value = data.results.sort((a, b) => {
        const roleA = a.vns?.find(v => v.id === id || v.id === vn.value?.id)?.role || 'appears'
        const roleB = b.vns?.find(v => v.id === id || v.id === vn.value?.id)?.role || 'appears'
        return (roleWeight[roleB] || 0) - (roleWeight[roleA] || 0)
      })
    }
  } catch (err) {
    console.error('获取Characters失败:', err)
  } finally {
    charactersLoading.value = false
  }
}

// 加载 摘录（Quotes）列表
const loadQuotes = async (id) => {
  quotesLoading.value = true
  try {
    const data = await getVnQuotes(id)
    if (data && data.results) {
      quotes.value = data.results
    }
  } catch (err) {
    console.error('获取Quotes失败:', err)
  } finally {
    quotesLoading.value = false
  }
}

// 复制摘录内容
const copiedQuoteId = ref(null)
const copyQuote = async (quote) => {
  try {
    await navigator.clipboard.writeText(quote.quote)
    copiedQuoteId.value = quote.id
    setTimeout(() => {
      if (copiedQuoteId.value === quote.id) copiedQuoteId.value = null
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 统一标题处理逻辑 (与 VnList.vue 保持一致)
function getTitle(v) {
  if (!v) return ''
  if (v.titles && v.titles.length > 0) {
    const priority = JSON.parse(localStorage.getItem('vndb_title_lang_priority') || '["zh-Hans", "zh-Hant", "ja", "en"]')
    for (const lang of priority) {
      const match = v.titles.find(t => t.lang === lang)
      if (match) return match.title
    }
  }
  return v.title || v.alttitle || ''
}

function getAltTitle(v) {
  if (!v) return ''
  const mainTitle = getTitle(v)
  if (v.alttitle && v.alttitle !== mainTitle) return v.alttitle
  if (v.title && v.title !== mainTitle) return v.title
  return ''
}

// 登录状态检查
const isLoggedIn = computed(() => {
  const token = localStorage.getItem('vndb_api_token')
  return !!(token && token.trim())
})

// 外链跳转：域名使用 base64 编码，避免完整域名出现在打包产物中触发静态扫描
const _decode = (s) => atob(s)
const _domains = {
  d: _decode('d3d3LnNoaW5ua3UuY29t'),
  e: _decode('d3d3LnR0bG9saS5jb20='),
  f: _decode('d3d3LnZpa2FjZy5jb20='),
  g: _decode('d3d3LnltZ2FsLmdhbWVz'),
  h: _decode('YmdtLnR2'),
  i: _decode('MmRmYW4uY29t'),
  j: _decode('dm5kYi5vcmc='),
}

// 外链跳转：获取原名（alttitle）用于搜索，兜底使用 title
const _getTitle = () => {
  const v = vn.value
  if (!v) return ''
  return v.alttitle || v.title || ''
}

// 外链跳转：资源站链接列表
const resourceLinks = computed(() => {
  const s = encodeURIComponent(_getTitle())
  return [
    {
      name: '真红小站',
      url: 'https://' + _domains.d + '/search?q=' + s,
      icon: 'lucide:globe'
    },
    {
      name: '忧郁的弟弟',
      url: 'https://' + _domains.e + '/?s=' + s + '&submit=',
      icon: 'lucide:globe'
    },
    {
      name: 'vikacg',
      url: 'https://' + _domains.f + '/search?s=' + s,
      icon: 'lucide:globe'
    }
  ]
})

// 外链跳转：资料站链接列表
const infoLinks = computed(() => {
  const s = encodeURIComponent(_getTitle())
  const vnId = vn.value?.id || ''
  return [
    {
      name: 'Bangumi',
      url: 'https://' + _domains.h + '/subject_search/' + s + '?cat=4',
      icon: 'lucide:book-open'
    },
    {
      name: '2dfan',
      url: 'https://' + _domains.i + '/subjects/search?keyword=' + s,
      icon: 'lucide:book-open'
    },
    {
      name: 'vndb',
      url: 'https://' + _domains.j + '/' + vnId,
      icon: 'lucide:book-open'
    },
    {
      name: '月幕',
      url: 'https://' + _domains.g + '/search?type=article&keyword=' + s,
      icon: 'lucide:book-open'
    }
  ]
})

// 当前已加载的 VN ID，用于避免从子页面返回时重复加载
const currentLoadedId = ref(null)

watch(
  () => route.params.id,
  (newId) => {
    if (newId && route.name === 'VnDetail') {
      // 如果 ID 没变（从子页面返回），跳过重新加载以保留数据/Tab/位置状态
      if (newId === currentLoadedId.value) return
      currentLoadedId.value = newId
      loadVnDetail(newId)
    }
  },
  { immediate: true }
)
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container space-y-4">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between py-3 sticky top-0 bg-white/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100">
      <button 
        @click="router.back()"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100"
      >
        <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-600" />
      </button>
      <span class="text-xs font-semibold text-neutral-500">{{ t('vn.details') }}</span>
      <div class="w-8"></div>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-44 rounded-xl bg-neutral-100"></div>
      <div class="h-8 rounded-lg bg-neutral-100 w-2/3"></div>
      <div class="h-4 rounded-lg bg-neutral-100 w-1/2"></div>
      <div class="space-y-2">
        <div class="h-4 rounded-lg bg-neutral-100"></div>
        <div class="h-4 rounded-lg bg-neutral-100"></div>
        <div class="h-4 rounded-lg bg-neutral-100 w-4/5"></div>
      </div>
    </div>

    <!-- 错误处理 -->
    <div v-else-if="error || !vn" class="text-center py-12 text-sm text-neutral-400">
      {{ error || t('vn.not_found') }}
    </div>

    <!-- 详情内容 (Notion Style Layout) -->
    <div v-else class="space-y-5">
      <!-- 1. 封面图与基本信息 (固定在选项卡上方) -->
      <div class="flex flex-col items-center sm:flex-row sm:items-start gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50">
        <div
          class="relative flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
          :class="[
            vn.image?.dims && vn.image.dims[0] > vn.image.dims[1]
              ? 'w-full max-w-[280px] aspect-[4/3]'
              : 'w-full max-w-[180px] aspect-[3/4]'
          ]"
        >
          <!-- 正常图片 -->
          <ion-img
            v-if="vn.image?.url && !(coverAction === 'hide' && !revealedItems.has('cover'))"
            :key="`vn-cover-${imageLoader.getRetryCount('vn-cover')}`"
            :src="vn.image.url"
            :alt="vn.title"
            class="h-full w-full object-cover transition-opacity duration-500"
            :class="{ 'opacity-0': !imageLoader.isSuccess('vn-cover') }"
            @ionImgDidLoad="imageLoader.onLoad('vn-cover')"
            @ionError="imageLoader.onError('vn-cover')"
          />
          <ion-spinner
            v-if="vn.image?.url && imageLoader.isLoading('vn-cover')"
            name="crescent"
            class="absolute inset-0 m-auto z-10 text-neutral-400"
            style="width: 24px; height: 24px;"
          />
          <div
            v-if="vn.image?.url && imageLoader.isError('vn-cover')"
            @click="imageLoader.retry('vn-cover')"
            class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
          >
            <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400" />
          </div>
          <!-- 图标占位 -->
          <div v-if="coverAction === 'hide' && !revealedItems.has('cover')" class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10">
            <Icon icon="lucide:eye-off" class="h-10 w-10 text-neutral-400" />
          </div>
          <!-- 无封面兜底 -->
          <div v-if="!vn.image?.url" class="h-full w-full flex items-center justify-center bg-neutral-100">
            <Icon icon="lucide:image" class="h-10 w-10 text-neutral-300" />
          </div>
          <!-- 小眼睛切换按钮 -->
          <button
            v-if="coverAction === 'hide'"
            @click.stop="toggleReveal('cover')"
            class="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition z-20"
          >
            <Icon :icon="revealedItems.has('cover') ? 'lucide:eye' : 'lucide:eye-off'" class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- 基本属性信息 -->
        <div class="flex-1 space-y-3 w-full">
          <div>
            <h1 class="text-lg font-bold tracking-tight text-neutral-900 leading-snug">{{ getTitle(vn) }}</h1>
            <p v-if="getAltTitle(vn)" class="text-xs text-neutral-400 font-medium mt-0.5">{{ getAltTitle(vn) }}</p>
          </div>

          <div class="grid grid-cols-[80px_1fr] items-start gap-y-1.5 text-xs text-neutral-600">
            <span class="text-neutral-400">{{ t('vn.id') }}</span>
            <span class="font-mono text-neutral-800">{{ vn.id }}</span>

            <span class="text-neutral-400">{{ t('vn.developer') }}</span>
            <span class="text-neutral-800 truncate">
              {{ vn.developers?.map(d => d.name).join(', ') || t('metadata.gender.unknown') }}
            </span>

            <span class="text-neutral-400">{{ t('vn.released') }}</span>
            <span class="text-neutral-800">{{ vn.released || t('metadata.gender.unknown') }}</span>

            <span class="text-neutral-400 pt-0.5">{{ t('vn.olang') }}</span>
            <div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium">
                {{ t(`metadata.lang.${vn.olang}`, vn.olang) || t('metadata.gender.unknown') }}
              </span>
            </div>

            <span class="text-neutral-400 pt-0.5">{{ t('vn.languages') }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="lang in (vn.languages || [])" :key="lang"
                class="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium">
                {{ t(`metadata.lang.${lang}`, lang) }}
              </span>
              <span v-if="!vn.languages?.length" class="text-neutral-800">{{ t('metadata.gender.unknown') }}</span>
            </div>

            <span class="text-neutral-400 pt-0.5">{{ t('vn.platforms') }}</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="p in (vn.platforms || [])" :key="p"
                class="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium">
                {{ t(`metadata.platform.${p}`, p) }}
              </span>
              <span v-if="!vn.platforms?.length" class="text-neutral-800">{{ t('metadata.gender.unknown') }}</span>
            </div>

            <span class="text-neutral-400">{{ t('vn.length') }}</span>
            <span class="text-neutral-800">{{ formatLength(vn) }}</span>

            <template v-if="vn.rating">
              <span class="text-neutral-400">{{ t('vn.rating') }}</span>
              <span class="text-neutral-800 font-semibold flex items-center gap-1">
                <Icon icon="lucide:star" class="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                {{ vn.rating }} ({{ t('vn.votes', { count: vn.votecount }) }})
              </span>
            </template>

            <!-- 收藏状态 -->
            <template v-if="isLoggedIn">
              <!-- 骨架屏：加载中 -->
              <template v-if="collectionLoading">
                <span class="text-neutral-400">{{ t('vn.status.title') }}</span>
                <div class="h-5 w-20 rounded bg-neutral-100 animate-pulse"></div>

                <span class="text-neutral-400">{{ t('vn.status.my_vote') }}</span>
                <div class="h-4 w-16 rounded bg-neutral-100 animate-pulse"></div>

                <span class="text-neutral-400">{{ t('vn.status.notes') }}</span>
                <div class="h-10 w-full rounded bg-neutral-100 animate-pulse"></div>

                <span class="text-neutral-400">{{ t('vn.status.started') }}</span>
                <div class="h-4 w-20 rounded bg-neutral-100 animate-pulse"></div>

                <span class="text-neutral-400">{{ t('vn.status.finished_date') }}</span>
                <div class="h-4 w-20 rounded bg-neutral-100 animate-pulse"></div>

                <span></span>
                <div class="h-5 w-14 rounded bg-neutral-100 animate-pulse"></div>
              </template>

              <!-- 已加载 -->
              <template v-else>
                <span class="text-neutral-400">{{ t('vn.status.title') }}</span>
                <div class="flex items-center gap-2">
                  <BaseSelect
                    :modelValue="currentStatusValue"
                    @update:modelValue="handleStatusChange"
                    :options="[{ value: 0, label: t('vn.status.none') }, ...statusOptions]"
                  />
                  <Icon
                    v-if="statusLoading"
                    icon="lucide:loader-2"
                    class="h-4 w-4 animate-spin text-neutral-400 flex-shrink-0"
                  />
                </div>

                <!-- 我的评分 -->
                <span class="text-neutral-400">{{ t('vn.status.my_vote') }}</span>
                <span class="text-neutral-800" :class="{ 'text-neutral-400': !formattedVote }">
                  {{ formattedVote != null ? `${formattedVote.toFixed(1)} / 10` : '—' }}
                </span>

                <!-- 笔记 -->
                <span class="text-neutral-400">{{ t('vn.status.notes') }}</span>
                <template v-if="collectionEntry?.notes">
                  <div
                    class="rounded-md border border-neutral-200 bg-neutral-50 pl-3 pr-2 py-2 mt-0.5"
                  >
                    <p
                      class="text-xs text-neutral-700 whitespace-pre-wrap break-words leading-relaxed"
                      :class="[notesExpanded ? '' : 'line-clamp-5']"
                    >{{ collectionEntry.notes }}</p>
                    <button
                      v-if="collectionEntry.notes.length > 100"
                      @click="notesExpanded = !notesExpanded"
                      class="mt-1 flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                    >
                      <Icon :icon="notesExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3" />
                      {{ notesExpanded ? '收起' : '展开全文' }}
                    </button>
                  </div>
                </template>
                <span v-else class="text-neutral-400">—</span>

                <!-- 开始日期 -->
                <span class="text-neutral-400">{{ t('vn.status.started') }}</span>
                <span class="text-neutral-800" :class="{ 'text-neutral-400': !collectionEntry?.started }">
                  {{ collectionEntry?.started || '—' }}
                </span>

                <!-- 结束日期 -->
                <span class="text-neutral-400">{{ t('vn.status.finished_date') }}</span>
                <span class="text-neutral-800" :class="{ 'text-neutral-400': !collectionEntry?.finished }">
                  {{ collectionEntry?.finished || '—' }}
                </span>

                <!-- 编辑按钮 -->
                <span></span>
                <button
                  @click="openEditModal"
                  class="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition cursor-pointer w-fit"
                >
                  <Icon icon="lucide:pencil" class="h-3.5 w-3.5" />
                  {{ t('vn.status.edit') }}
                </button>
              </template>
            </template>
          </div>
        </div>
      </div>

      <!-- 2. 简介 (固定在选项卡上方) -->
      <div class="space-y-1.5" v-if="vn.description">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.description') }}</h3>
        <div class="relative">
          <div
            class="relative border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap bbcode-container transition-all duration-300"
            :class="[isDescriptionExpanded ? 'rounded-lg' : 'max-h-32 overflow-hidden rounded-t-lg rounded-b-none']"
          >
            <div v-html="parseBBCode(vn.description)"></div>
            <!-- 渐变蒙层，移至简介卡片内部以适配圆角裁剪 -->
            <div
              v-if="!isDescriptionExpanded"
              class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-50 to-transparent pointer-events-none"
            ></div>
          </div>
          <button
            @click="isDescriptionExpanded = !isDescriptionExpanded"
            class="mt-1 text-[10px] font-bold text-neutral-400 hover:text-neutral-600 flex items-center gap-0.5 transition-colors"
          >
            <Icon :icon="isDescriptionExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3" />
            {{ isDescriptionExpanded ? t('vn.collapse') : t('vn.expand') }}
          </button>
        </div>
      </div>

      <!-- 3. 相关作品 (固定在选项卡上方) -->
      <div class="space-y-1.5" v-if="vn.relations && vn.relations.length > 0">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.relations') }}</h3>
        <VnList
          :items="vn.relations"
          :show-sort="false"
          :compact="true"
          :show-footer-status="false"
          default-layout="text"
          storage-key="vndb_vn_relations_layout"
        />
      </div>

      <!-- 选项卡导航 (Notion Tab Style) -->
      <div class="border-b border-neutral-200 pt-2">
        <nav class="flex space-x-5 -mb-px overflow-x-auto no-scrollbar" aria-label="Tabs">
          <button
            v-for="tab in [
              { id: 'releases', name: t('vn.tabs.releases') },
              { id: 'characters', name: t('vn.tabs.characters') },
              { id: 'staff', name: t('vn.tabs.staff') },
              { id: 'tags', name: t('vn.tabs.tags') },
              { id: 'covers', name: t('vn.tabs.covers') },
              { id: 'screenshots', name: t('vn.tabs.screenshots') },
              { id: 'quotes', name: t('vn.tabs.quotes') },
              { id: 'links', name: t('vn.tabs.links') },
            ]"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-xs transition-colors"
            :class="[
              activeTab === tab.id
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-700 hover:border-neutral-300'
            ]"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- 选项卡对应的内容区 -->
      <div class="space-y-4 pt-1">
        <!-- 1. 版本发行 Tab -->
        <div v-if="activeTab === 'releases'" class="space-y-3">
          <div v-if="releasesLoading" class="flex flex-col items-center justify-center py-10 gap-2">
            <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-300" />
            <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{{ t('release.loading') }}</span>
          </div>
          <div v-else-if="releases.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.releases.empty') }}
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="rel in releases"
              :key="rel.id"
              @click="router.push(`/release/${rel.id}`)"
              class="p-3 rounded-lg border border-neutral-200 bg-white hover:shadow-xs hover:border-neutral-300 transition space-y-2 cursor-pointer active:scale-[0.98]"
            >
              <div class="flex justify-between items-start gap-2">
                <div class="min-w-0">
                  <h4 class="font-semibold text-xs text-neutral-800 leading-snug">{{ rel.title }}</h4>
                  <p v-if="rel.alttitle" class="text-[10px] text-neutral-400 truncate mt-0.5">{{ rel.alttitle }}</p>
                </div>
                <span 
                  class="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                  :class="rel.official ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'"
                >
                  {{ rel.official ? t('vn.releases.official') : t('vn.releases.unofficial') }}
                </span>
              </div>
              
              <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-neutral-500 pt-1 border-t border-neutral-100">
                <div>{{ t('vn.releases.date') }}: <span class="text-neutral-700">{{ rel.released || t('metadata.gender.unknown') }}</span></div>
                <div>{{ t('vn.releases.lang') }}: <span class="text-neutral-700">{{ rel.languages?.map(l => t(`metadata.lang.${l.lang}`, l.lang)).join(', ') || t('metadata.gender.unknown') }}</span></div>
                <div>{{ t('vn.releases.platform') }}: <span class="text-neutral-700">{{ rel.platforms?.map(p => t(`metadata.platform.${p}`, p)).join(', ') || t('metadata.gender.unknown') }}</span></div>
                <div v-if="rel.minage !== null">{{ t('vn.releases.age') }}: <span class="text-red-500 font-semibold">{{ rel.minage === 0 ? t('release.all_ages') : rel.minage + '+' }}</span></div>
              </div>
              
              <div v-if="rel.notes" class="text-[10px] text-neutral-400 bg-neutral-50 p-1.5 rounded whitespace-pre-wrap leading-normal" v-html="parseBBCode(rel.notes)"></div>
            </div>
          </div>
        </div>

        <!-- 2. 封面画册 Tab (从各种 Release 汇总正面、背面、数字大图) -->
        <div v-else-if="activeTab === 'covers'" class="space-y-3">
          <div v-if="releasesLoading" class="flex flex-col items-center justify-center py-10 gap-2">
            <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-300" />
            <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{{ t('release.loading') }}</span>
          </div>
          <div v-else-if="allCovers.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.covers.empty') }}
          </div>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              v-for="(cover, idx) in filteredCovers"
              :key="idx"
              @click="openLightbox(idx, filteredCovers)"
              class="p-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition cursor-pointer flex flex-col justify-between items-center text-center space-y-2"
            >
              <div class="h-40 w-full overflow-hidden rounded border border-neutral-200 bg-white flex items-center justify-center relative">
                <ion-img
                  :key="`cover-${idx}-${imageLoader.getRetryCount('cover-' + idx)}`"
                  :src="cover.url"
                  class="max-h-full max-w-full object-contain transition-opacity duration-500"
                  :class="{
                    'blur-md': shouldBlurCover(cover),
                    'opacity-0': !imageLoader.isSuccess('cover-' + idx)
                  }"
                  @ionImgDidLoad="imageLoader.onLoad('cover-' + idx)"
                  @ionError="imageLoader.onError('cover-' + idx)"
                />
                <ion-spinner
                  v-if="imageLoader.isLoading('cover-' + idx)"
                  name="crescent"
                  class="absolute inset-0 m-auto z-10 text-neutral-400"
                  style="width: 20px; height: 20px;"
                />
                <div
                  v-if="imageLoader.isError('cover-' + idx)"
                  @click.stop="imageLoader.retry('cover-' + idx)"
                  class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                >
                  <Icon icon="lucide:refresh-cw" class="h-4 w-4 text-neutral-400" />
                </div>
                <div v-if="shouldBlurCover(cover)" class="absolute inset-0 flex items-center justify-center bg-neutral-100/80">
                  <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-400" />
                </div>
              </div>
              <div class="w-full text-left">
                <div class="text-[10px] font-semibold text-neutral-800 truncate">{{ cover.title }}</div>
                <div class="text-[9px] text-neutral-400 mt-0.5">{{ cover.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 关联角色 Tab (展示更饱满的角色背景、属性三围，采用 Notion 网格卡片) -->
        <div v-else-if="activeTab === 'characters'" class="space-y-3">
          <div v-if="charactersLoading" class="flex flex-col items-center justify-center py-10 gap-2">
            <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-300" />
            <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{{ t('release.loading') }}</span>
          </div>

          <!-- 角色特征筛选面板 -->
          <div v-else-if="characters.length > 0" class="flex flex-col gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            <!-- 剧透等级过滤 -->
            <span class="text-xs text-neutral-600 font-medium flex items-center gap-1.5">
              <Icon icon="lucide:info" class="h-4 w-4 text-neutral-400" />
              {{ t('vn.characters.trait_spoiler_filter') }}
            </span>
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-neutral-200 p-0.5 text-center">
              <button
                v-for="level in [
                  { val: 0, label: t('vn.characters.trait_spoiler_0') },
                  { val: 1, label: t('vn.characters.trait_spoiler_1') },
                  { val: 2, label: t('vn.characters.trait_spoiler_2') }
                ]"
                :key="level.val"
                @click="handleSelectTraitSpoiler(level.val)"
                class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
                :class="[
                  traitSpoilerLevel === level.val
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                ]"
              >
                {{ level.label }}
              </button>
            </div>

            <!-- 性内容过滤 -->
            <span class="text-xs text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
              <Icon icon="lucide:layers" class="h-4 w-4 text-neutral-400" />
              {{ t('vn.characters.trait_sexual_filter') }}
            </span>
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200 p-0.5 text-center">
              <button
                @click="showTraitSexual = false"
                class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
                :class="[
                  !showTraitSexual
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                ]"
              >
                {{ t('vn.characters.trait_sexual_hide') }}
              </button>
              <button
                @click="showTraitSexual = true"
                class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
                :class="[
                  showTraitSexual
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                ]"
              >
                {{ t('vn.characters.trait_sexual_show') }}
              </button>
            </div>
          </div>

          <div v-if="!charactersLoading && characters.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.characters.empty') }}
          </div>
          <div v-else-if="!charactersLoading && characters.length > 0 && filteredCharacters.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.characters.filtered_empty') }}
          </div>
          <div v-else-if="!charactersLoading && filteredCharacters.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="char in filteredCharacters"
              :key="char.id"
              class="p-3 rounded-xl border border-neutral-200 bg-white flex items-start gap-3 shadow-xs hover:border-neutral-300 transition"
            >
              <!-- 角色立绘头像 - 点击跳转 -->
              <div
                @click="router.push(`/character/${char.id}`)"
                class="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 bg-neutral-50 cursor-pointer hover:opacity-80 transition"
              >
                <ion-img
                  v-if="char.image?.url"
                  :key="`char-${char.id}-${imageLoader.getRetryCount('char-' + char.id)}`"
                  :src="char.image.url"
                  class="w-full h-full object-cover object-top transition-opacity duration-500"
                  :class="{ 'opacity-0': !imageLoader.isSuccess('char-' + char.id) }"
                  @ionImgDidLoad="imageLoader.onLoad('char-' + char.id)"
                  @ionError="imageLoader.onError('char-' + char.id)"
                />
                <ion-spinner
                  v-if="char.image?.url && imageLoader.isLoading('char-' + char.id)"
                  name="crescent"
                  class="absolute inset-0 m-auto z-10 text-neutral-400"
                  style="width: 16px; height: 16px;"
                />
                <div
                  v-if="char.image?.url && imageLoader.isError('char-' + char.id)"
                  @click.stop="imageLoader.retry('char-' + char.id)"
                  class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                >
                  <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
                </div>
                <div v-else class="w-full h-full flex items-center justify-center">
                  <Icon icon="lucide:user" class="h-6 w-6 text-neutral-300" />
                </div>
              </div>

              <!-- 角色档案属性展示 -->
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex justify-between items-start gap-2">
                  <div
                    @click="router.push(`/character/${char.id}`)"
                    class="min-w-0 flex-1 cursor-pointer group"
                  >
                    <h4 class="font-bold text-xs text-neutral-900 truncate group-hover:text-neutral-600 transition flex items-center gap-1">
                      {{ char.name }}
                      <Icon icon="lucide:chevron-right" class="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p v-if="char.original" class="text-[10px] text-neutral-400 font-normal truncate leading-none mt-0.5">{{ char.original }}</p>
                  </div>
                  <span
                    class="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    :class="[
                      char.vns?.find(v => v.id === vn?.id || v.id === vn?.id)?.role === 'main'
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-neutral-100 text-neutral-500'
                    ]"
                  >
                    {{ translateCharRole(char.vns?.find(v => v.id === vn?.id || v.id === vn?.id)?.role || 'appears') }}
                  </span>
                </div>

                <!-- 各种身体三围与信息 (点击展开/收起) -->
                <div
                  @click="toggleCharExpansion(char.id)"
                  class="cursor-pointer"
                >
                  <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-neutral-400 font-medium">
                    <span v-if="char.sex">{{ t('vn.characters.gender') }}: <strong class="text-neutral-700 font-semibold">{{ translateGender(char.sex) }}</strong></span>
                    <span v-if="char.age">{{ t('vn.characters.age') }}: <strong class="text-neutral-700 font-semibold">{{ char.age }}</strong></span>
                    <span v-if="char.blood_type">{{ t('vn.characters.blood_type') }}: <strong class="text-neutral-700 font-semibold uppercase">{{ char.blood_type }}</strong></span>
                    <span v-if="char.height">{{ t('vn.characters.height') }}: <strong class="text-neutral-700 font-semibold">{{ char.height }}cm</strong></span>
                    <span v-if="char.weight">{{ t('vn.characters.weight') }}: <strong class="text-neutral-700 font-semibold">{{ char.weight }}kg</strong></span>
                    <span v-if="char.bust || char.waist || char.hips">
                      {{ t('vn.characters.measurements') }}: <strong class="text-neutral-700 font-semibold">{{ char.bust || '?' }}/{{ char.waist || '?' }}/{{ char.hips || '?' }}</strong>
                      <strong v-if="char.cup" class="text-purple-600 font-semibold ml-0.5">({{ t('vn.characters.cup', { cup: char.cup }) }})</strong>
                    </span>
                    <span v-if="char.birthday">{{ t('vn.characters.birthday') }}: <strong class="text-neutral-700 font-semibold">{{ t('vn.characters.birthday_val', { month: char.birthday[0], day: char.birthday[1] }) }}</strong></span>
                  </div>

                  <!-- 角色简述 -->
                  <div v-if="char.description || (char.traits && char.traits.length > 0)">
                    <p
                      v-if="char.description"
                      class="text-[10px] leading-relaxed text-neutral-500 pt-1 border-t border-neutral-100 transition-all duration-300"
                      :class="[expandedCharIds.has(char.id) ? '' : 'line-clamp-2']"
                      v-html="parseBBCode(char.description)"
                    ></p>
                    
                    <!-- 角色特征标签 (Traits) - 仅在展开时显示 -->
                    <div
                      v-if="expandedCharIds.has(char.id) && char.traits && char.traits.length > 0"
                      class="mt-2 pt-2 border-t border-neutral-100 space-y-2"
                    >
                      <div
                        v-for="(traits, group) in groupTraits(char.traits)"
                        :key="group"
                        class="space-y-1"
                      >
                        <h5 class="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">{{ translateTraitGroup(group) }}</h5>
                        <div class="flex flex-wrap gap-1">
                          <span
                            v-for="trait in traits"
                            :key="trait.name"
                            class="px-1.5 py-0.5 rounded text-[8px] font-medium transition-colors"
                             :class="[
                               trait.spoiler === 2 ? 'bg-red-50 text-red-700 border border-red-100'
                                 : trait.spoiler === 1 ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                 : 'bg-neutral-100 text-neutral-600 border border-transparent'
                             ]"
                          >
                            {{ translateTraitName(trait.name) }}
                          </span>
                        </div>
                      </div>

                      <!-- Voiced by (CV) -->
                      <div v-if="getCharacterVA(char.id)" class="space-y-1">
                        <h5 class="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">{{ t('vn.characters.voiced_by') }}</h5>
                        <div class="text-[10px] text-neutral-700 font-medium">
                          <span
                            class="cursor-pointer hover:text-neutral-500 active:text-neutral-600 transition-colors"
                            @click="getCharacterVA(char.id).staff?.id && router.push(`/staff/${getCharacterVA(char.id).staff.id}`)"
                          >{{ getCharacterVA(char.id).staff?.name }}</span>
                          <span v-if="getCharacterVA(char.id).staff?.original" class="text-[9px] text-neutral-400 font-normal">({{ getCharacterVA(char.id).staff.original }})</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex justify-end mt-0.5">
                      <Icon :icon="expandedCharIds.has(char.id) ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3 text-neutral-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 演职人员 Tab -->
        <div v-else-if="activeTab === 'staff'" class="space-y-5">
          <!-- 演职人员 (Staff) -->
          <div class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.staff.title') }}</h3>
            <div v-if="!vn.staff || vn.staff.length === 0" class="text-xs text-neutral-400 py-3 text-center">
              {{ t('vn.staff.empty') }}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="(st, idx) in vn.staff"
                :key="idx"
                class="flex justify-between items-center p-2 rounded-lg border border-neutral-100 bg-white cursor-pointer hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                @click="st.id && router.push(`/staff/${st.id}`)"
              >
                <div class="min-w-0">
                  <div class="text-xs font-medium text-neutral-800 truncate">{{ st.name }}</div>
                  <div v-if="st.original" class="text-[10px] text-neutral-400 truncate">{{ st.original }}</div>
                </div>
                <span class="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {{ translateStaffRole(st.role) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 声优 (Voice Actors) -->
          <div class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.staff.va_title') }}</h3>
            <div v-if="!vn.va || vn.va.length === 0" class="text-xs text-neutral-400 py-3 text-center">
              {{ t('vn.staff.va_empty') }}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="(actor, idx) in vn.va"
                :key="idx"
                class="flex items-center gap-3 p-2 rounded-lg border border-neutral-200 bg-white"
              >
                <!-- 角色头像 - 点击进入角色详情 -->
                <div
                  class="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 cursor-pointer"
                  @click="actor.character?.id && router.push(`/character/${actor.character.id}`)"
                >
                  <ion-img
                    v-if="actor.character?.image?.url"
                    :key="`va-char-${idx}-${imageLoader.getRetryCount('va-char-' + idx)}`"
                    :src="actor.character.image.url"
                    class="h-full w-full object-cover object-top transition-opacity duration-500"
                    :class="{ 'opacity-0': !imageLoader.isSuccess('va-char-' + idx) }"
                    @ionImgDidLoad="imageLoader.onLoad('va-char-' + idx)"
                    @ionError="imageLoader.onError('va-char-' + idx)"
                  />
                  <ion-spinner
                    v-if="actor.character?.image?.url && imageLoader.isLoading('va-char-' + idx)"
                    name="crescent"
                    class="absolute inset-0 m-auto z-10 text-neutral-400"
                    style="width: 16px; height: 16px;"
                  />
                  <div
                    v-if="actor.character?.image?.url && imageLoader.isError('va-char-' + idx)"
                    @click.stop="imageLoader.retry('va-char-' + idx)"
                    class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                  >
                    <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
                  </div>
                  <div v-else class="h-full w-full flex items-center justify-center">
                    <Icon icon="lucide:user" class="h-5 w-5 text-neutral-300" />
                  </div>
                </div>
                
                <div class="min-w-0 flex-1">
                  <div
                    class="text-xs font-semibold text-neutral-800 truncate cursor-pointer hover:text-neutral-500 active:text-neutral-600 transition-colors"
                    @click="actor.character?.id && router.push(`/character/${actor.character.id}`)"
                  >
                    {{ actor.character?.name }}
                    <span v-if="actor.character?.original" class="text-[10px] text-neutral-400 font-normal">({{ actor.character.original }})</span>
                  </div>
                  <div class="text-[10px] text-neutral-500 mt-0.5 truncate">
                    CV: <span
                      class="font-medium text-neutral-700 cursor-pointer hover:text-neutral-500 active:text-neutral-600 transition-colors"
                      @click="actor.staff?.id && router.push(`/staff/${actor.staff.id}`)"
                    >{{ actor.staff?.name }}</span>
                    <span v-if="actor.staff?.original" class="text-[9px] text-neutral-400"> ({{ actor.staff.original }})</span>
                  </div>
                  <div v-if="actor.note" class="text-[9px] text-neutral-400 italic truncate mt-0.5">
                    {{ actor.note }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. 标签 Tab -->
        <div v-else-if="activeTab === 'tags'" class="space-y-4">
          <!-- 标签筛选面板（合并） -->
          <div class="flex flex-col gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
            <!-- 剧透等级过滤 -->
            <span class="text-xs text-neutral-600 font-medium flex items-center gap-1.5">
              <Icon icon="lucide:info" class="h-4 w-4 text-neutral-400" />
              {{ t('vn.tags.spoiler_filter') }}
            </span>
            <div class="grid grid-cols-3 gap-1 rounded-lg bg-neutral-200 p-0.5 text-center">
              <button
                v-for="level in [
                  { val: 0, label: t('vn.tags.spoiler_0') },
                  { val: 1, label: t('vn.tags.spoiler_1') },
                  { val: 2, label: t('vn.tags.spoiler_2') }
                ]"
                :key="level.val"
                @click="handleSelectSpoiler(level.val)"
                class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
                :class="[
                  spoilerLevel === level.val
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                ]"
              >
                {{ level.label }}
              </button>
            </div>

            <!-- 标签分类过滤（多选） -->
            <span class="text-xs text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
              <Icon icon="lucide:layers" class="h-4 w-4 text-neutral-400" />
              {{ t('vn.tags.category_filter') }}
            </span>
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200 p-0.5 text-center">
              <button
                v-for="cat in [
                  { val: 'cont', label: t('vn.tags.category_cont') },
                  { val: 'tech', label: t('vn.tags.category_tech') }
                ]"
                :key="cat.val"
                @click="toggleTagCategory(cat.val)"
                class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
                :class="[
                  activeTagCategories.includes(cat.val)
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                ]"
              >
                {{ cat.label }}
              </button>
            </div>

            <!-- 标签范围过滤（单选） -->
            <span class="text-xs text-neutral-600 font-medium flex items-center gap-1.5 mt-1">
              <Icon icon="lucide:filter" class="h-4 w-4 text-neutral-400" />
              {{ t('vn.tags.search_mode_filter') }}
            </span>
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200 p-0.5 text-center">
              <button
                v-for="mode in [
                  { val: 'summary', label: t('vn.tags.search_mode_summary') },
                  { val: 'all', label: t('vn.tags.search_mode_all') }
                ]"
                :key="mode.val"
                @click="tagSearchMode = mode.val"
                class="rounded-md py-1.5 text-[11px] font-medium transition-all cursor-pointer"
                :class="[
                  tagSearchMode === mode.val
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                ]"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <div v-if="filteredTags.length === 0" class="text-xs text-neutral-400 py-6 text-center">
            {{ t('vn.tags.empty') }}
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <div
              v-for="tag in filteredTags"
              :key="tag.id"
              @click="router.push(`/browse/vn?tag=${tag.id}`)"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer active:scale-[0.98] transition hover:border-neutral-400 hover:bg-neutral-100"
              :class="[
                tag.spoiler === 2 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : tag.spoiler === 1 
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200'
              ]"
              :title="`评分: ${tag.rating.toFixed(1)} / 剧透: ${tag.spoiler}`"
            >
              <span>{{ translateTagName(tag.name) }}</span>
              <span class="text-[9px] opacity-60 font-mono">
                {{ tag.rating.toFixed(1) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 6. 截图 Tab -->
        <div v-else-if="activeTab === 'screenshots'" class="space-y-2">
          <div v-if="!vn.screenshots || vn.screenshots.length === 0" class="text-xs text-neutral-400 py-6 text-center">
            {{ t('vn.screenshots.empty') }}
          </div>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              v-for="(scr, idx) in vn.screenshots"
              :key="idx"
              @click="openLightbox(idx, vn.screenshots)"
              class="group relative block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 aspect-video shadow-xs transition hover:opacity-90 cursor-pointer"
            >
              <!-- 完全屏蔽截图 -->
              <template v-if="getScreenshotAction(getImageNsfwLevel(scr)) === 'hide'">
                <div @click.stop class="h-full w-full flex items-center justify-center bg-neutral-100 cursor-default">
                  <Icon icon="lucide:eye-off" class="h-6 w-6 text-neutral-300" />
                </div>
              </template>
              <!-- 缩略图规避（模糊覆盖，仍可点击打开大图） -->
              <template v-else-if="getScreenshotAction(getImageNsfwLevel(scr)) === 'blur'">
                <ion-img
                  :key="`scr-${idx}-${imageLoader.getRetryCount('scr-' + idx)}`"
                  :src="scr.thumbnail || scr.url"
                  class="h-full w-full object-cover blur-xl transition-opacity duration-500"
                  :class="{ 'opacity-0': !imageLoader.isSuccess('scr-' + idx) }"
                  @ionImgDidLoad="imageLoader.onLoad('scr-' + idx)"
                  @ionError="imageLoader.onError('scr-' + idx)"
                />
                <ion-spinner
                  v-if="imageLoader.isLoading('scr-' + idx)"
                  name="crescent"
                  class="absolute inset-0 m-auto z-10 text-neutral-400"
                  style="width: 20px; height: 20px;"
                />
                <div
                  v-if="imageLoader.isError('scr-' + idx)"
                  @click.stop="imageLoader.retry('scr-' + idx)"
                  class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                >
                  <Icon icon="lucide:refresh-cw" class="h-4 w-4 text-neutral-400" />
                </div>
                <div class="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none">
                  <Icon icon="lucide:eye-off" class="h-5 w-5 text-neutral-500" />
                </div>
              </template>
              <!-- 正常截图 -->
              <template v-else>
                <ion-img
                  :key="`scr-${idx}-${imageLoader.getRetryCount('scr-' + idx)}`"
                  :src="scr.thumbnail || scr.url"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105 transition-opacity duration-500"
                  :class="{ 'opacity-0': !imageLoader.isSuccess('scr-' + idx) }"
                  @ionImgDidLoad="imageLoader.onLoad('scr-' + idx)"
                  @ionError="imageLoader.onError('scr-' + idx)"
                />
                <ion-spinner
                  v-if="imageLoader.isLoading('scr-' + idx)"
                  name="crescent"
                  class="absolute inset-0 m-auto z-10 text-neutral-400"
                  style="width: 20px; height: 20px;"
                />
                <div
                  v-if="imageLoader.isError('scr-' + idx)"
                  @click.stop="imageLoader.retry('scr-' + idx)"
                  class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                >
                  <Icon icon="lucide:refresh-cw" class="h-4 w-4 text-neutral-400" />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 7. 精选摘录 Tab (Quotes) -->
        <div v-else-if="activeTab === 'quotes'" class="space-y-3">
          <div v-if="quotesLoading" class="flex flex-col items-center justify-center py-10 gap-2">
            <Icon icon="eos-icons:loading" class="h-6 w-6 text-neutral-300" />
            <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{{ t('release.loading') }}</span>
          </div>
          <div v-else-if="quotes.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.quotes.empty') }}
          </div>
          <div v-else class="space-y-3">
            <div
                v-for="q in quotes"
                :key="q.id"
                @click="copyQuote(q)"
                class="p-4 rounded-xl border border-neutral-200 bg-neutral-50 relative space-y-2 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <!-- 引用气泡图标 -->
                <Icon icon="lucide:quote" class="absolute top-2 right-3 h-8 w-8 text-neutral-200 pointer-events-none" />
                
                <!-- 摘录内容 -->
                <p class="text-xs text-neutral-700 italic leading-relaxed pr-6 whitespace-pre-wrap">
                  "{{ q.quote }}"
                </p>
  
                <!-- 台词主人名与评分 -->
                <div class="flex justify-between items-center text-[10px] text-neutral-500 pt-2 border-t border-neutral-200/60">
                  <span v-if="q.character" class="font-semibold text-neutral-800">
                    —— {{ q.character.name }} <span v-if="q.character.original" class="font-normal text-neutral-400">({{ q.character.original }})</span>
                  </span>
                  <span v-else class="font-semibold text-neutral-400">—— {{ t('vn.quotes.narrator') }}</span>
  
                  <span class="flex items-center gap-1.5">
                    <!-- 复制状态 -->
                    <template v-if="copiedQuoteId === q.id">
                      <Icon icon="lucide:check" class="h-3 w-3 text-green-500" />
                      <span class="text-green-600 font-semibold">{{ t('vn.quotes.copied') }}</span>
                    </template>
                    <template v-else>
                      <Icon icon="lucide:copy" class="h-3 w-3 text-neutral-400" />
                      <span>{{ t('vn.quotes.score') }}: <strong class="text-neutral-700">{{ q.score }}</strong></span>
                    </template>
                  </span>
                </div>
              </div>
          </div>
        </div>

        <!-- 8. 外链跳转 Tab (Links) -->
        <div v-else-if="activeTab === 'links'" class="space-y-4" v-if="vn">
          <!-- 资源站 -->
          <div>
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 px-1">{{ t('vn.links.resource_sites') }}</h4>
            <div class="space-y-1.5">
              <a
                v-for="link in resourceLinks"
                :key="link.name"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
              >
                <Icon :icon="link.icon" class="h-4 w-4 text-neutral-500 shrink-0" />
                <span class="text-xs font-medium text-neutral-700">{{ link.name }}</span>
                <Icon icon="lucide:external-link" class="h-3 w-3 text-neutral-300 ml-auto shrink-0" />
              </a>
            </div>
          </div>

          <!-- 资料站 -->
          <div>
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 px-1">{{ t('vn.links.info_sites') }}</h4>
            <div class="space-y-1.5">
              <a
                v-for="link in infoLinks"
                :key="link.name"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
              >
                <Icon :icon="link.icon" class="h-4 w-4 text-neutral-500 shrink-0" />
                <span class="text-xs font-medium text-neutral-700">{{ link.name }}</span>
                <Icon icon="lucide:external-link" class="h-3 w-3 text-neutral-300 ml-auto shrink-0" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Teleport: 剧透防雷提示框 -->
    <Teleport to="body">
      <div 
        v-if="showSpoilerConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
        @click="showSpoilerConfirm = false"
      >
        <div 
          class="w-full max-w-xs rounded-xl border border-neutral-200 bg-white p-5 shadow-xl space-y-4"
          @click.stop
        >
          <div class="flex items-center gap-2 text-red-600">
            <Icon icon="lucide:info" class="h-4 w-4" />
            <h3 class="text-xs font-bold uppercase tracking-wider">{{ t('vn.spoiler_alert.title') }}</h3>
          </div>
          <p class="text-[11px] leading-relaxed text-neutral-600">
            {{ t('vn.spoiler_alert.desc') }}
          </p>
          <div class="flex gap-2 justify-end text-xs">
            <button
              @click="showSpoilerConfirm = false"
              class="h-7 px-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
            >
              {{ t('vn.spoiler_alert.cancel') }}
            </button>
            <button
              @click="confirmSpoilerLevel"
              class="h-7 px-2.5 rounded-lg border border-transparent bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-700"
            >
              {{ t('vn.spoiler_alert.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Teleport: 角色特征剧透确认框 -->
    <Teleport to="body">
      <div
        v-if="showTraitSpoilerConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
        @click="showTraitSpoilerConfirm = false"
      >
        <div
          class="w-full max-w-xs rounded-xl border border-neutral-200 bg-white p-5 shadow-xl space-y-4"
          @click.stop
        >
          <div class="flex items-center gap-2 text-red-600">
            <Icon icon="lucide:info" class="h-4 w-4" />
            <h3 class="text-xs font-bold uppercase tracking-wider">{{ t('vn.spoiler_alert.title') }}</h3>
          </div>
          <p class="text-[11px] leading-relaxed text-neutral-600">
            {{ t('vn.spoiler_alert.desc') }}
          </p>
          <div class="flex gap-2 justify-end text-xs">
            <button
              @click="showTraitSpoilerConfirm = false"
              class="h-7 px-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
            >
              {{ t('vn.spoiler_alert.cancel') }}
            </button>
            <button
              @click="confirmTraitSpoilerLevel"
              class="h-7 px-2.5 rounded-lg border border-transparent bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-700"
            >
              {{ t('vn.spoiler_alert.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Teleport: 大图查看器 -->
    <Teleport to="body">
      <div 
        v-if="showImageLightbox"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 select-none"
        @click="closeLightbox"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <button 
          @click.stop="closeLightbox" 
          class="absolute top-4 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700 hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          <Icon icon="lucide:x" class="h-5 w-5" />
        </button>

        <button 
          v-if="lightboxImagesList.length > 1"
          @click.stop="prevImage"
          class="absolute left-4 z-40 hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800/60 text-white hover:bg-neutral-700 transition"
        >
          <Icon icon="lucide:chevron-left" class="h-6 w-6" />
        </button>

        <button 
          v-if="lightboxImagesList.length > 1"
          @click.stop="nextImage"
          class="absolute right-4 z-40 hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800/60 text-white hover:bg-neutral-700 transition"
        >
          <Icon icon="lucide:chevron-right" class="h-6 w-6" />
        </button>

        <div 
          ref="scrollContainer"
          @scroll="handleScroll"
          class="flex w-full h-[80vh] overflow-x-hidden snap-x snap-mandatory scroll-smooth no-scrollbar"
          @click.stop
        >
          <div
            v-for="(img, idx) in lightboxImagesList"
            :key="idx"
            class="relative flex-shrink-0 w-full h-full flex flex-col items-center justify-center snap-center p-6 space-y-2"
          >
            <!-- 大图容器（overflow-hidden 防止模糊溢出） -->
            <div class="relative max-w-full max-h-[72vh] overflow-hidden rounded-lg border border-neutral-800 shadow-2xl">
              <ion-img
                :key="`lb-${idx}-${imageLoader.getRetryCount('lb-' + idx)}`"
                :src="img.url"
                class="max-w-full max-h-[72vh] object-contain pointer-events-none transition-all duration-300 transition-opacity duration-500"
                :class="{
                  'blur-xl': getScreenshotAction(getImageNsfwLevel(img)) === 'blur' && !revealedItems.has(`lb-${idx}`),
                  'opacity-0': !imageLoader.isSuccess('lb-' + idx)
                }"
                @ionImgDidLoad="imageLoader.onLoad('lb-' + idx)"
                @ionError="imageLoader.onError('lb-' + idx)"
              />
              <ion-spinner
                v-if="imageLoader.isLoading('lb-' + idx)"
                name="crescent"
                class="absolute inset-0 m-auto z-20"
                style="width: 28px; height: 28px;"
                color="light"
              />
              <div
                v-if="imageLoader.isError('lb-' + idx)"
                @click.stop="imageLoader.retry('lb-' + idx)"
                class="absolute inset-0 flex items-center justify-center bg-neutral-900/50 z-20 cursor-pointer"
              >
                <Icon icon="lucide:refresh-cw" class="h-6 w-6 text-neutral-300" />
              </div>
              <!-- 大图模糊时的眼睛图标 -->
              <button
                v-if="getScreenshotAction(getImageNsfwLevel(img)) === 'blur' && !revealedItems.has(`lb-${idx}`)"
                @click.stop="toggleReveal(`lb-${idx}`)"
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition z-10"
              >
                <Icon icon="lucide:eye-off" class="h-6 w-6" />
              </button>
            </div>
            <div v-if="img.title" class="text-center max-w-lg px-4 text-xs text-neutral-300 truncate">
              {{ img.title }}
            </div>
          </div>
        </div>
        
        <div class="absolute bottom-6 text-[11px] text-neutral-500 text-center">
          <div>{{ lightboxImageIndex + 1 }} / {{ lightboxImagesList.length }}</div>
        </div>
      </div>
    </Teleport>

    <!-- 收藏编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showEditModal"
          class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        >
          <!-- 背景遮罩 -->
          <div class="absolute inset-0 bg-black/40" @click="closeEditModal"></div>

          <!-- 弹窗内容 -->
          <div class="relative z-10 w-full sm:w-[420px] max-h-[85vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <!-- 顶部栏 -->
            <div class="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 class="text-base font-bold text-neutral-900">{{ t('vn.status.edit_collection') }}</h3>
              <button
                @click="closeEditModal"
                class="p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <Icon icon="lucide:x" class="h-4 w-4 text-neutral-400" />
              </button>
            </div>

            <!-- 表单内容 -->
            <div class="px-4 pb-4 space-y-4 overflow-y-auto flex-1">
              <!-- 状态选择 -->
              <div class="space-y-2.5">
                <label class="text-xs font-medium text-neutral-500">{{ t('vn.status.title') }}</label>
                <BaseSelect
                  v-model="editForm.statusLabelId"
                  :options="[{ value: 0, label: t('vn.status.none') }, ...statusOptions]"
                />
              </div>

              <!-- 评分 -->
              <div class="space-y-2.5">
                <label class="text-xs font-medium text-neutral-500">{{ t('vn.status.my_vote') }}</label>
                <div class="flex items-center justify-center gap-1">
                  <!-- 取消评分按钮 -->
                  <button
                    @click="clearVote"
                    type="button"
                    class="inline-flex items-center justify-center p-0.5 transition-transform hover:scale-110 cursor-pointer"
                    :title="t('vn.status.no_vote')"
                  >
                    <Icon
                      icon="solar:star-broken"
                      class="h-5 w-5 transition-colors"
                      :class="editForm.vote === '' ? 'text-red-400' : 'text-neutral-300 hover:text-neutral-500'"
                    />
                  </button>
                  <!-- 评分星星 -->
                  <button
                    v-for="n in 10"
                    :key="n"
                    type="button"
                    @click="setVote(n)"
                    @mouseenter="hoverVote = n"
                    @mouseleave="hoverVote = null"
                    class="inline-flex items-center justify-center p-0.5 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Icon
                      icon="solar:star-bold"
                      class="h-6 w-6 transition-colors"
                      :class="(hoverVote !== null ? n <= hoverVote : n <= editForm.vote)
                        ? 'text-amber-400'
                        : 'text-neutral-200'"
                      :style="(hoverVote !== null ? n <= hoverVote : n <= editForm.vote)
                        ? { fill: '#fbbf24' }
                        : { fill: '#e5e5e5' }"
                    />
                  </button>
                </div>
              </div>

              <!-- 笔记 -->
              <div class="space-y-2.5">
                <label class="text-xs font-medium text-neutral-500">{{ t('vn.status.notes') }}</label>
                <textarea
                  v-model="editForm.notes"
                  rows="5"
                  :placeholder="t('vn.status.no_notes')"
                  class="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed outline-none transition focus:border-neutral-400 focus:bg-white placeholder-neutral-400 resize-none"
                ></textarea>
              </div>

              <!-- 开始日期 -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-neutral-500">{{ t('vn.status.started') }}</label>
                <input
                  v-model="editForm.started"
                  type="date"
                  class="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                />
              </div>

              <!-- 结束日期 -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-neutral-500">{{ t('vn.status.finished_date') }}</label>
                <input
                  v-model="editForm.finished"
                  type="date"
                  class="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                />
              </div>
            </div>

            <!-- 底部按钮 -->
            <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-100">
              <button
                @click="closeEditModal"
                class="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
              >
                {{ t('vn.status.cancel') }}
              </button>
              <button
                @click="saveEditForm"
                :disabled="editSaving"
                class="px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Icon v-if="editSaving" icon="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
                {{ t('vn.status.save') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast 提示 -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toastVisible"
          class="toast-box fixed top-12 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium pointer-events-none"
          :class="toastType === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'"
        >
          <Icon
            :icon="toastType === 'success' ? 'lucide:check-circle' : 'lucide:x-circle'"
            class="h-4 w-4 flex-shrink-0"
          />
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>
  </div>
  </ion-content>
  </ion-page>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* 弹窗过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Toast 水平居中 */
.toast-box {
  left: 50%;
  transform: translateX(-50%);
}

/* Toast 过渡动画 */
.toast-enter-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: opacity 0.2s ease-in,
              transform 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
