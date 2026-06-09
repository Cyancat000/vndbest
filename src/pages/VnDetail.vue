<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getVnDetail, getVnReleases, getVnCharacters, getVnQuotes } from '@/api/vndb'
import VnList from '@/components/VnList.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

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

// 控制剧透警告确认弹窗的展示
const showSpoilerConfirm = ref(false)

// 控制大图查看器的展示
const showImageLightbox = ref(false)
const lightboxImageIndex = ref(0) // 记录当前查看的图片索引
const lightboxImagesList = ref([]) // 大图画廊的数据列表（可以是截图，也可以是封面等）
const scrollContainer = ref(null) // 滚动容器的 DOM 引用

// 根据当前选择的剧透级别过滤出来的标签列表
const filteredTags = computed(() => {
  if (!vn.value || !vn.value.tags) return []
  return vn.value.tags.filter(tag => tag.spoiler <= spoilerLevel.value)
})

// 从 releases 数据中提取所有封面图
const allCovers = computed(() => {
  const list = []
  
  // 1. 主视觉封面图
  if (vn.value?.image?.url) {
    list.push({
      url: vn.value.image.url,
      dims: vn.value.image.dims,
      title: '主视觉图 (Main Visual)',
      desc: vn.value.title
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
            desc: rel.released || '发售日未知'
          })
        }
      })
    }
  })

  return list
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

// 翻译角色性别
const translateGender = (sex) => {
  if (!sex || sex.length === 0) return t('metadata.gender.unknown')
  const primarySex = sex[0]
  return t(`metadata.gender.${primarySex}`) || primarySex
}

// 翻译演职人员角色
const translateStaffRole = (role) => {
  return t(`metadata.staff_role.${role.toLowerCase()}`) || role
}

// 翻译角色类型关系
const translateCharRole = (role) => {
  return t(`metadata.role.${role.toLowerCase()}`) || role
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
      
      // 并发异步加载其余所有子选项卡数据，加快响应时间
      loadReleases(id)
      loadCharacters(id)
      loadQuotes(id)
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

watch(
  () => route.params.id,
  (newId) => {
    if (newId && route.name === 'VnDetail') {
      loadVnDetail(newId)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-4 pb-8">
    <!-- 头部导航 -->
    <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
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
          <img 
            v-if="vn.image?.url" 
            :src="vn.image.url" 
            :alt="vn.title" 
            class="h-full w-full object-cover"
          />
          <div v-else class="h-full w-full flex items-center justify-center bg-neutral-100">
            <Icon icon="lucide:image" class="h-10 w-10 text-neutral-300" />
          </div>
        </div>

        <!-- 基本属性信息 -->
        <div class="flex-1 space-y-3 w-full">
          <div>
            <h1 class="text-lg font-bold tracking-tight text-neutral-900 leading-snug">{{ vn.title }}</h1>
            <p v-if="vn.alttitle" class="text-xs text-neutral-400 font-medium mt-0.5">{{ vn.alttitle }}</p>
          </div>

          <div class="grid grid-cols-[80px_1fr] items-center gap-y-1.5 text-xs text-neutral-600">
            <span class="text-neutral-400">{{ t('vn.id') }}</span>
            <span class="font-mono text-neutral-800">{{ vn.id }}</span>

            <span class="text-neutral-400">{{ t('vn.developer') }}</span>
            <span class="text-neutral-800 truncate">
              {{ vn.developers?.map(d => d.name).join(', ') || t('metadata.gender.unknown') }}
            </span>

            <span class="text-neutral-400">{{ t('vn.released') }}</span>
            <span class="text-neutral-800">{{ vn.released || t('metadata.gender.unknown') }}</span>

            <span class="text-neutral-400">{{ t('vn.olang') }}</span>
            <span class="uppercase text-neutral-800">{{ vn.olang || t('metadata.gender.unknown') }}</span>

            <span class="text-neutral-400">{{ t('vn.languages') }}</span>
            <span class="text-neutral-800 truncate">
              {{ vn.languages?.join(', ').toUpperCase() || t('metadata.gender.unknown') }}
            </span>

            <span class="text-neutral-400">{{ t('vn.platforms') }}</span>
            <span class="text-neutral-800 truncate">
              {{ vn.platforms?.join(', ').toUpperCase() || t('metadata.gender.unknown') }}
            </span>

            <span class="text-neutral-400">{{ t('vn.length') }}</span>
            <span class="text-neutral-800">{{ formatLength(vn) }}</span>
            
            <template v-if="vn.rating">
              <span class="text-neutral-400">{{ t('vn.rating') }}</span>
              <span class="text-neutral-800 font-semibold flex items-center gap-1">
                <Icon icon="lucide:star" class="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                {{ vn.rating }} ({{ t('vn.votes', { count: vn.votecount }) }})
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- 2. 简介 (固定在选项卡上方) -->
      <div class="space-y-1.5" v-if="vn.description">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.description') }}</h3>
        <div 
          class="rounded-lg border-l-3 border-neutral-300 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap bbcode-container"
          v-html="parseBBCode(vn.description)"
        ></div>
      </div>

      <!-- 3. 相关作品 (固定在选项卡上方) -->
      <div class="space-y-1.5" v-if="vn.relations && vn.relations.length > 0">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{{ t('vn.relations') }}</h3>
        <VnList
          :items="vn.relations"
          :show-sort="false"
          force-layout="compact"
        />
      </div>

      <!-- 选项卡导航 (Notion Tab Style) -->
      <div class="border-b border-neutral-200 pt-2">
        <nav class="flex space-x-5 -mb-px overflow-x-auto" aria-label="Tabs">
          <button
            v-for="tab in [
              { id: 'releases', name: t('vn.tabs.releases') },
              { id: 'characters', name: t('vn.tabs.characters') },
              { id: 'staff', name: t('vn.tabs.staff') },
              { id: 'tags', name: t('vn.tabs.tags') },
              { id: 'covers', name: t('vn.tabs.covers') },
              { id: 'screenshots', name: t('vn.tabs.screenshots') },
              { id: 'reviews', name: t('vn.tabs.reviews') },
              { id: 'quotes', name: t('vn.tabs.quotes') },
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
          <div v-if="releasesLoading" class="text-center py-6 text-xs text-neutral-400 animate-pulse">
            {{ t('vn.releases.loading') }}
          </div>
          <div v-else-if="releases.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.releases.empty') }}
          </div>
          <div v-else class="space-y-3">
            <div 
              v-for="rel in releases" 
              :key="rel.id" 
              class="p-3 rounded-lg border border-neutral-200 bg-white hover:shadow-xs transition space-y-2"
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
                <div>{{ t('vn.releases.lang') }}: <span class="text-neutral-700 uppercase">{{ rel.languages?.map(l => l.lang).join(', ') || t('metadata.gender.unknown') }}</span></div>
                <div>{{ t('vn.releases.platform') }}: <span class="text-neutral-700 uppercase">{{ rel.platforms?.join(', ') || t('metadata.gender.unknown') }}</span></div>
                <div v-if="rel.minage">{{ t('vn.releases.age') }}: <span class="text-red-500 font-semibold">{{ rel.minage }}+</span></div>
              </div>
              
              <div v-if="rel.notes" class="text-[10px] text-neutral-400 bg-neutral-50 p-1.5 rounded whitespace-pre-wrap leading-normal" v-html="parseBBCode(rel.notes)"></div>
            </div>
          </div>
        </div>

        <!-- 2. 封面画册 Tab (从各种 Release 汇总正面、背面、数字大图) -->
        <div v-else-if="activeTab === 'covers'" class="space-y-3">
          <div v-if="releasesLoading" class="text-center py-6 text-xs text-neutral-400 animate-pulse">
            {{ t('vn.covers.loading') }}
          </div>
          <div v-else-if="allCovers.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.covers.empty') }}
          </div>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div 
              v-for="(cover, idx) in allCovers" 
              :key="idx"
              @click="openLightbox(idx, allCovers)"
              class="p-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition cursor-pointer flex flex-col justify-between items-center text-center space-y-2"
            >
              <div class="h-40 w-full overflow-hidden rounded border border-neutral-200 bg-white flex items-center justify-center">
                <img :src="cover.url" class="max-h-full max-w-full object-contain" loading="lazy" />
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
          <div v-if="charactersLoading" class="text-center py-6 text-xs text-neutral-400 animate-pulse">
            {{ t('vn.characters.loading') }}
          </div>
          <div v-else-if="characters.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.characters.empty') }}
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div 
              v-for="char in characters" 
              :key="char.id"
              class="p-3 rounded-xl border border-neutral-200 bg-white flex items-start gap-3 shadow-xs hover:border-neutral-300 transition"
            >
              <!-- 角色立绘头像 -->
              <div class="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 bg-neutral-50">
                <img 
                  v-if="char.image?.url" 
                  :src="char.image.url" 
                  class="w-full h-full object-cover object-top" 
                  loading="lazy" 
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <Icon icon="lucide:user" class="h-6 w-6 text-neutral-300" />
                </div>
              </div>

              <!-- 角色档案属性展示 -->
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex justify-between items-baseline gap-2">
                  <h4 class="font-bold text-xs text-neutral-900 truncate">
                    {{ char.name }}
                    <span v-if="char.original" class="text-[10px] text-neutral-400 font-normal">({{ char.original }})</span>
                  </h4>
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

                <!-- 各种身体三围与信息 (只渲染已知值) -->
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
                <p v-if="char.description" class="text-[10px] leading-relaxed text-neutral-500 line-clamp-2 pt-1 border-t border-neutral-100" v-html="parseBBCode(char.description)"></p>
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
                class="flex justify-between items-center p-2 rounded-lg border border-neutral-100 bg-white"
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
                <div class="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100">
                  <img 
                    v-if="actor.character?.image?.url" 
                    :src="actor.character.image.url" 
                    class="h-full w-full object-cover object-top"
                  />
                  <div v-else class="h-full w-full flex items-center justify-center">
                    <Icon icon="lucide:user" class="h-5 w-5 text-neutral-300" />
                  </div>
                </div>
                
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-semibold text-neutral-800 truncate">
                    {{ actor.character?.name }}
                    <span v-if="actor.character?.original" class="text-[10px] text-neutral-400 font-normal">({{ actor.character.original }})</span>
                  </div>
                  <div class="text-[10px] text-neutral-500 mt-0.5 truncate">
                    CV: <span class="font-medium text-neutral-700">{{ actor.staff?.name }}</span>
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
          <!-- 剧透等级过滤面板 -->
          <div class="flex flex-col gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
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
          </div>

          <div v-if="filteredTags.length === 0" class="text-xs text-neutral-400 py-6 text-center">
            {{ t('vn.tags.empty') }}
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <div 
              v-for="tag in filteredTags" 
              :key="tag.id" 
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border"
              :class="[
                tag.spoiler === 2 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : tag.spoiler === 1 
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200'
              ]"
              :title="`评分: ${tag.rating.toFixed(1)} / 剧透: ${tag.spoiler}`"
            >
              <span>{{ tag.name }}</span>
              <span class="text-[9px] opacity-60 font-mono">
                {{ tag.rating.toFixed(1) }}
              </span>
              <span v-if="tag.spoiler > 0" class="text-[8px] bg-amber-200 text-amber-900 px-1 rounded-sm">
                SPOILER
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
              <img 
                :src="scr.thumbnail || scr.url" 
                class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <!-- 7. 精选摘录 Tab (Quotes) -->
        <div v-else-if="activeTab === 'quotes'" class="space-y-3">
          <div v-if="quotesLoading" class="text-center py-6 text-xs text-neutral-400 animate-pulse">
            {{ t('vn.quotes.loading') }}
          </div>
          <div v-else-if="quotes.length === 0" class="text-center py-6 text-xs text-neutral-400">
            {{ t('vn.quotes.empty') }}
          </div>
          <div v-else class="space-y-3">
            <div 
              v-for="q in quotes" 
              :key="q.id"
              class="p-4 rounded-xl border border-neutral-200 bg-neutral-50 relative space-y-2"
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

                <span class="flex items-center gap-1">
                  {{ t('vn.quotes.score') }}: <strong class="text-neutral-700">{{ q.score }}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 8. 评论 Tab -->
        <div v-else-if="activeTab === 'reviews'" class="space-y-3">
          <div class="p-6 rounded-xl border border-dashed border-neutral-200 text-center space-y-2">
            <Icon icon="lucide:file-text" class="h-8 w-8 text-neutral-300 mx-auto" />
            <h4 class="text-xs font-semibold text-neutral-800">{{ t('vn.tabs.reviews') }}</h4>
            <p class="text-[10px] text-neutral-400 max-w-xs mx-auto">
              VNDB API 目前仅提供 has_review 等布尔过滤状态指示，暂未开放直接通过 API 拉取详细评论列表的接口。
            </p>
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
            class="flex-shrink-0 w-full h-full flex flex-col items-center justify-center snap-center p-6 space-y-2"
          >
            <img 
              :src="img.url" 
              class="max-w-full max-h-[72vh] object-contain rounded-lg border border-neutral-800 shadow-2xl pointer-events-none" 
            />
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
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
