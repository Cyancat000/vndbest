<script setup>
defineOptions({ name: 'Home' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { getStats, getReleaseList, getRandomVn, getVnList, getCharacterList, getProducerList, getStaffList } from '@/api/vndb'
import { usePrivacy, getImageNsfwLevel } from '@/composables/usePrivacy'
import { useSavedSearches, SEARCH_TYPE_MAP } from '@/composables/useSavedSearches'
import { IonPage, IonContent, IonImg, IonSpinner } from '@ionic/vue'
import { useImageLoader } from '@/composables/useImageLoader'

const router = useRouter()
const { t } = useI18n()
const { getCardAction } = usePrivacy()
const { list: savedSearches, remove: removeSavedSearch } = useSavedSearches()
const imageLoader = useImageLoader()

const stats = ref(null)
const justReleased = ref([])
const upcomingReleases = ref([])
const todayBirthdays = ref([])
const tomorrowBirthdays = ref([])

const loading = ref(true)
const loadingSections = ref({
  stats: true,
  releases: true,
  random: true,
  birthday: true
})

// ============ 已保存搜索结果预览 ============
const savedSearchResults = ref({})
const savedSearchLoading = ref({})

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 从保存的搜索条件重建 API 过滤器
function buildFiltersFromSaved(item) {
  const f = item.filters || {}
  const filters = []
  let sort = 'id'
  let reverse = false

  switch (item.type) {
    case 'releases': {
      if (f.query) filters.push(['search', '=', f.query])
      if (f.selectedLang && f.selectedLang !== 'all') filters.push(['lang', '=', f.selectedLang])
      if (f.selectedPlatform && f.selectedPlatform !== 'all') filters.push(['platform', '=', f.selectedPlatform])
      if (f.selectedMinAge && f.selectedMinAge !== 'all') filters.push(['minage', '=', parseInt(f.selectedMinAge)])
      if (f.selectedPatch === 'yes') filters.push(['patch', '=', 1])
      else if (f.selectedPatch === 'no') filters.push(['patch', '!=', 1])
      if (f.selectedOfficial === 'yes') filters.push(['official', '=', 1])
      else if (f.selectedOfficial === 'no') filters.push(['official', '!=', 1])
      if (f.selectedFreeware === 'yes') filters.push(['freeware', '=', 1])
      else if (f.selectedFreeware === 'no') filters.push(['freeware', '!=', 1])
      if (f.selectedVoiced && f.selectedVoiced !== 'all') filters.push(['voiced', '=', parseInt(f.selectedVoiced)])
      if (f.selectedEngine && f.selectedEngine !== 'all') filters.push(['engine', '=', f.selectedEngine])
      if (f.selectedDateFrom) {
        const dateFrom = f.selectedDateFrom === 'today' ? getTodayStr() : f.selectedDateFrom
        filters.push(['released', '>=', dateFrom.replace(/-/g, '')])
      }
      if (f.selectedDateTo) {
        const dateTo = f.selectedDateTo === 'today' ? getTodayStr() : f.selectedDateTo
        filters.push(['released', '<=', dateTo.replace(/-/g, '')])
      }
      sort = f.sortBy || 'released'
      reverse = f.reverse !== undefined ? f.reverse : true
      break
    }
    case 'vn': {
      if (f.query) filters.push(['search', '=', f.query])
      if (f.selectedLang && f.selectedLang !== 'all') filters.push(['lang', '=', f.selectedLang])
      if (f.selectedPlatform && f.selectedPlatform !== 'all') filters.push(['platform', '=', f.selectedPlatform])
      if (f.selectedTags && f.selectedTags.length > 0) {
        if (f.selectedTags.length === 1) {
          filters.push(['tag', '=', f.selectedTags[0].id])
        } else {
          filters.push(['or', ...f.selectedTags.map(t => ['tag', '=', t.id])])
        }
      }
      if (f.selectedOrigLang && f.selectedOrigLang !== 'all') filters.push(['olang', '=', f.selectedOrigLang])
      if (f.selectedLength && f.selectedLength !== 'all') filters.push(['length', '=', parseInt(f.selectedLength)])
      if (f.selectedDevStatus && f.selectedDevStatus !== 'all') filters.push(['devstatus', '=', parseInt(f.selectedDevStatus)])
      if (f.selectedHasScreenshot === 'yes') filters.push(['has_screenshot', '=', 1])
      else if (f.selectedHasScreenshot === 'no') filters.push(['has_screenshot', '!=', 1])
      if (f.selectedRatingRange) {
        const [min, max] = f.selectedRatingRange
        if (min > 0) filters.push(['rating', '>=', min])
        if (max < 100) filters.push(['rating', '<=', max])
      }
      if (f.selectedDateFrom) {
        const dateFrom = f.selectedDateFrom === 'today' ? getTodayStr() : f.selectedDateFrom
        filters.push(['released', '>=', dateFrom.replace(/-/g, '')])
      }
      if (f.selectedDateTo) {
        const dateTo = f.selectedDateTo === 'today' ? getTodayStr() : f.selectedDateTo
        filters.push(['released', '<=', dateTo.replace(/-/g, '')])
      }
      sort = f.sortBy || (f.query ? 'searchrank' : 'rating')
      reverse = f.reverse !== undefined ? f.reverse : false
      break
    }
    case 'characters': {
      if (f.query) filters.push(['search', '=', f.query])
      if (f.selectedTraits && f.selectedTraits.length > 0) {
        if (f.selectedTraits.length === 1) {
          filters.push(['trait', '=', f.selectedTraits[0].id])
        } else {
          filters.push(['or', ...f.selectedTraits.map(t => ['trait', '=', t.id])])
        }
      }
      if (f.selectedSex && f.selectedSex !== 'all') filters.push(['sex', '=', f.selectedSex])
      if (f.selectedBloodType && f.selectedBloodType !== 'all') filters.push(['blood_type', '=', f.selectedBloodType])
      if (f.selectedRole && f.selectedRole !== 'all') filters.push(['role', '=', f.selectedRole])
      sort = f.query ? 'searchrank' : 'id'
      break
    }
    case 'producers': {
      if (f.query) filters.push(['search', '=', f.query])
      if (f.selectedLang && f.selectedLang !== 'all') filters.push(['lang', '=', f.selectedLang])
      if (f.selectedType && f.selectedType !== 'all') filters.push(['type', '=', f.selectedType])
      sort = f.query ? 'searchrank' : 'id'
      break
    }
    case 'staff': {
      if (f.query) filters.push(['search', '=', f.query])
      filters.push(['ismain', '=', 1])
      if (f.selectedLang && f.selectedLang !== 'all') filters.push(['lang', '=', f.selectedLang])
      if (f.selectedGender && f.selectedGender !== 'all') filters.push(['gender', '=', f.selectedGender])
      if (f.selectedRole && f.selectedRole !== 'all') filters.push(['role', '=', f.selectedRole])
      sort = f.query ? 'searchrank' : 'id'
      break
    }
  }

  const finalFilters = filters.length > 1 ? ['and', ...filters] : (filters[0] || [])
  return { filters: finalFilters, sort, reverse }
}

// 获取已保存搜索的结果预览
async function fetchSavedSearchResults() {
  const searches = displayedSavedSearches.value
  if (!searches.length) return

  for (const search of searches) {
    savedSearchLoading.value[search.id] = true

    try {
      const { filters: apiFilters, sort, reverse } = buildFiltersFromSaved(search)
      const params = { results: 5, sort, reverse }

      let res
      switch (search.type) {
        case 'releases':
          res = await getReleaseList(apiFilters, params)
          break
        case 'vn':
          res = await getVnList(apiFilters, params)
          break
        case 'characters':
          res = await getCharacterList(apiFilters, params)
          break
        case 'producers':
          res = await getProducerList(apiFilters, params)
          break
        case 'staff':
          res = await getStaffList(apiFilters, params)
          break
      }

      savedSearchResults.value[search.id] = res?.results || []
    } catch (err) {
      console.error(`获取搜索结果失败 [${search.name}]:`, err)
      savedSearchResults.value[search.id] = []
    } finally {
      savedSearchLoading.value[search.id] = false
    }
  }
}

// 获取结果项的显示信息
function getResultDisplay(search, item) {
  const type = search.type
  if (type === 'releases') {
    return {
      image: item.images?.[0]?.url || null,
      title: item.alttitle || item.title,
      subtitle: item.released || '',
      badges: (item.languages || []).slice(0, 2).map(l => typeof l === 'string' ? l : l.lang),
      blur: shouldBlurReleaseCover(item),
      placeholderIcon: 'lucide:package'
    }
  }
  if (type === 'vn') {
    const nsfwLevel = item?.image?.sexual?.[0] || 0
    const action = getCardAction('vn', nsfwLevel)
    return {
      image: item.image?.url || null,
      title: item.alttitle || item.title,
      subtitle: item.released || '',
      badges: (item.languages || []).slice(0, 2).map(l => typeof l === 'string' ? l : l.lang),
      blur: action === 'blur' || action === 'blur_card',
      placeholderIcon: 'lucide:gamepad-2'
    }
  }
  if (type === 'characters') {
    return {
      image: item.image?.url || null,
      title: item.name,
      subtitle: item.role || '',
      badges: [],
      blur: false,
      placeholderIcon: 'lucide:user-circle'
    }
  }
  if (type === 'producers') {
    return {
      image: null,
      title: item.name,
      subtitle: item.type || '',
      badges: (item.languages || []).slice(0, 2),
      blur: false,
      placeholderIcon: 'lucide:building-2'
    }
  }
  if (type === 'staff') {
    return {
      image: null,
      title: item.name,
      subtitle: item.langs?.[0] || '',
      badges: [],
      blur: false,
      placeholderIcon: 'lucide:users'
    }
  }
  return { image: null, title: '', subtitle: '', badges: [], blur: false, placeholderIcon: 'lucide:search' }
}

// 点击结果项跳转
function handleSavedSearchItemClick(search, item) {
  const routes = {
    releases: '/release/',
    vn: '/vn/',
    characters: '/character/',
    producers: '/producer/',
    staff: '/staff/'
  }
  const prefix = routes[search.type]
  if (prefix) {
    router.push(`${prefix}${item.id}`)
  }
}

// 计算今日和明日的 [month, day]
function getBirthdayParams(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return [d.getMonth() + 1, d.getDate()]
}

// 角色去重：按原名优先、名称次之去重
function deduplicateCharacters(chars) {
  const seen = new Map()
  for (const char of chars) {
    const key = char.original || char.name
    if (!seen.has(key)) {
      seen.set(key, char)
    }
  }
  return Array.from(seen.values())
}

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]

  // 1. 获取统计数据
  getStats().then(res => {
    stats.value = res
    loadingSections.value.stats = false
  }).catch(err => {
    console.error('获取统计数据失败:', err)
    loadingSections.value.stats = false
  })

  // 2. 获取发布信息
  // 刚刚发布: 时间倒序排行今天之前的 Release
  getReleaseList(['released', '<', today], { sort: 'released', reverse: true, results: 5 })
    .then(res => {
      justReleased.value = res.results
      loadingSections.value.releases = false
    }).catch(err => {
      console.error('获取刚刚发布失败:', err)
      loadingSections.value.releases = false
    })

  // 即将发布: 时间正序排行今天之后的 Release
  getReleaseList(['released', '>', today], { sort: 'released', reverse: false, results: 5 })
    .then(res => {
      upcomingReleases.value = res.results
    }).catch(err => {
      console.error('获取即将发布失败:', err)
    })

  // 2.5 获取今日和明日生日角色
  const [todayMonth, todayDay] = getBirthdayParams(0)
  const [tomorrowMonth, tomorrowDay] = getBirthdayParams(1)

  Promise.all([
    getCharacterList(['birthday', '=', [todayMonth, todayDay]], { sort: 'name', results: 50 }),
    getCharacterList(['birthday', '=', [tomorrowMonth, tomorrowDay]], { sort: 'name', results: 50 })
  ]).then(([todayRes, tomorrowRes]) => {
    todayBirthdays.value = deduplicateCharacters(todayRes.results || [])
    tomorrowBirthdays.value = deduplicateCharacters(tomorrowRes.results || [])
  }).catch(err => {
    console.error('获取生日角色失败:', err)
  }).finally(() => {
    loadingSections.value.birthday = false
  })

  // 3. 获取已保存搜索的结果预览
  fetchSavedSearchResults()

  loadingSections.value.random = false
  loading.value = false
})

async function handleRandomClick() {
  if (loadingSections.value.random) return
  loadingSections.value.random = true
  try {
    const maxId = stats.value?.vn || 45000
    const res = await getRandomVn({ results: 1, maxId })
    if (res.results && res.results.length > 0) {
      router.push(`/vn/${res.results[0].id}`)
    }
  } catch (err) {
    console.error('随机作品跳转失败:', err)
  } finally {
    loadingSections.value.random = false
  }
}

function handleReleaseClick(release) {
  router.push(`/release/${release.id}`)
}

// 角色生日点击跳转
function handleCharacterClick(character) {
  router.push(`/character/${character.id}`)
}

// 跳转到角色搜索页（带生日筛选）
function navigateToBirthdaySearch(month, day) {
  router.push({ path: '/browse/characters', query: { birthday: `${month},${day}` } })
}

// 隐私过滤：获取 release 封面的 NSFW 等级
function getReleaseCoverNsfwLevel(item) {
  if (!item?.images?.length) return 0
  return getImageNsfwLevel(item.images[0])
}

// 隐私过滤：判断 release 卡片是否需要模糊
function shouldBlurReleaseCover(item) {
  const action = getCardAction('release', getReleaseCoverNsfwLevel(item))
  return action === 'blur' || action === 'blur_card'
}

// 隐私过滤：判断 release 卡片是否隐藏
function isReleaseHidden(item) {
  const action = getCardAction('release', getReleaseCoverNsfwLevel(item))
  return action === 'hide'
}

// 过滤后的列表
const filteredJustReleased = computed(() => {
  return justReleased.value.filter(item => !isReleaseHidden(item))
})

const filteredUpcomingReleases = computed(() => {
  return upcomingReleases.value.filter(item => !isReleaseHidden(item))
})

// ============ Bottom Sheet 状态 ============
const showBottomSheet = ref(false)
const bottomSheetSearch = ref(null)

// ============ 删除确认弹窗状态 ============
const showDeleteConfirm = ref(false)
const deleteConfirmSearch = ref(null)

// 刷新单个已保存搜索的结果
async function refreshSingleSearch(search) {
  savedSearchLoading.value[search.id] = true
  try {
    const { filters: apiFilters, sort, reverse } = buildFiltersFromSaved(search)
    const params = { results: 5, sort, reverse }
    let res
    switch (search.type) {
      case 'releases':
        res = await getReleaseList(apiFilters, params)
        break
      case 'vn':
        res = await getVnList(apiFilters, params)
        break
      case 'characters':
        res = await getCharacterList(apiFilters, params)
        break
      case 'producers':
        res = await getProducerList(apiFilters, params)
        break
      case 'staff':
        res = await getStaffList(apiFilters, params)
        break
    }
    savedSearchResults.value[search.id] = res?.results || []
  } catch (err) {
    console.error(`刷新搜索结果失败 [${search.name}]:`, err)
    savedSearchResults.value[search.id] = []
  } finally {
    savedSearchLoading.value[search.id] = false
  }
}

// 打开更多操作菜单
function openMoreActions(search) {
  bottomSheetSearch.value = search
  showBottomSheet.value = true
}

// 关闭 bottom sheet
function closeBottomSheet() {
  showBottomSheet.value = false
}

// 处理 bottom sheet 操作
async function handleBottomSheetAction(action) {
  const search = bottomSheetSearch.value
  showBottomSheet.value = false

  if (search && action === 'viewAll') {
    navigateToSavedSearch(search)
  } else if (search && action === 'delete') {
    deleteConfirmSearch.value = search
    showDeleteConfirm.value = true
  }

  bottomSheetSearch.value = null
}

// 关闭删除确认弹窗
function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  deleteConfirmSearch.value = null
}

// 确认删除
function confirmDelete() {
  const search = deleteConfirmSearch.value
  if (search) {
    removeSavedSearch(search.id)
    delete savedSearchLoading.value[search.id]
    delete savedSearchResults.value[search.id]
  }
  closeDeleteConfirm()
}

// 已保存搜索：最多显示前 5 个
const displayedSavedSearches = computed(() => {
  return savedSearches.value.slice(0, 5)
})

function navigateToSavedSearch(item) {
  const typeInfo = SEARCH_TYPE_MAP[item.type]
  if (typeInfo) {
    router.push(`${typeInfo.path}?savedId=${item.id}`)
  }
}

// 获取保存搜索的筛选条件摘要
function getFilterSummary(item) {
  const parts = []
  const f = item.filters || {}
  if (f.query) parts.push(f.query)
  if (f.selectedLang) {
    const langMap = { 'ja': '日文', 'en': '英文', 'zh-Hans': '简体中文', 'zh-Hant': '繁体中文', 'ko': '韩文' }
    parts.push(langMap[f.selectedLang] || f.selectedLang)
  }
  if (f.sortBy === 'released') parts.push('最新发布')
  if (f.reverse === false) parts.push('最早发布')
  if (f.selectedDateTo === 'today') parts.push('今天之前')
  else if (f.selectedDateTo) parts.push(f.selectedDateTo + '之前')
  if (f.selectedOfficial === 'no') parts.push('非官方')
  if (f.selectedOfficial === 'yes') parts.push('官方')
  return parts.join(' · ')
}
</script>

<template>
  <ion-page>
  <ion-content>
  <div class="page-container pb-24 space-y-6">
    <div class="flex items-center gap-3 py-3 sticky top-0 bg-white/80 backdrop-blur-md z-30 -mx-4 px-4 border-b border-neutral-100">
      <div class="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Icon icon="lucide:home" class="h-5 w-5 text-neutral-800" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">{{ t('home.title') }}</h1>
        <p class="text-xs text-neutral-500">{{ t('home.subtitle') }}</p>
      </div>
    </div>

    <!-- 统计区块 (Notion Style Block) -->
    <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 class="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
        <Icon icon="lucide:info" class="h-4 w-4 text-neutral-500" />
        {{ t('home.stats_title') }}
      </h2>
      
      <div v-if="loadingSections.stats" class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="animate-pulse rounded-lg bg-neutral-100 p-3 h-16"></div>
      </div>
      
      <div v-else-if="stats" class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.vn') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.vn?.toLocaleString() || '0' }}</div>
        </div>
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.releases') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.releases?.toLocaleString() || '0' }}</div>
        </div>
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.producers') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.producers?.toLocaleString() || '0' }}</div>
        </div>
        <div class="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div class="text-xs text-neutral-500">{{ t('home.staff') }}</div>
          <div class="text-lg font-bold text-neutral-950 mt-0.5">{{ stats.staff?.toLocaleString() || '0' }}</div>
        </div>
      </div>
    </div>

    <!-- 角色生日板块 -->
    <div v-if="todayBirthdays.length > 0 || tomorrowBirthdays.length > 0 || loadingSections.birthday" class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 class="text-sm font-semibold text-neutral-800 flex items-center gap-2">
        <Icon icon="lucide:cake" class="h-4 w-4 text-pink-500" />
        {{ t('home.birthday') }}
      </h2>
      <p class="text-[11px] text-neutral-400 mt-1 mb-3">ヾ(✿ﾟ▽ﾟ)ノ {{ t('home.birthday_greeting') }}</p>

      <div v-if="loadingSections.birthday" class="space-y-3">
        <div class="text-xs font-medium text-neutral-500">{{ t('home.birthday_today') }}</div>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <div v-for="i in 4" :key="i" class="animate-pulse shrink-0 w-16 text-center">
            <div class="w-12 h-12 mx-auto rounded-xl bg-neutral-100 mb-1"></div>
            <div class="h-2.5 w-10 mx-auto rounded bg-neutral-100"></div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- 今日生日 -->
        <div class="mb-3">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-medium text-neutral-500 flex items-center gap-1.5">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-pink-400"></span>
              {{ t('home.birthday_today') }}
              <span class="text-neutral-400 font-normal">({{ todayBirthdays.length }})</span>
            </div>
            <button
              v-if="todayBirthdays.length > 0"
              @click="navigateToBirthdaySearch(...getBirthdayParams(0))"
              class="text-[10px] text-neutral-400 hover:text-neutral-600 transition"
            >
              {{ t('home.view_all') }}
            </button>
          </div>

          <div v-if="todayBirthdays.length === 0" class="text-[11px] text-neutral-400 py-1">
            {{ t('home.no_birthday') }}
          </div>
          <div v-else class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <div
              v-for="char in todayBirthdays.slice(0, 10)"
              :key="char.id"
              @click="handleCharacterClick(char)"
              class="shrink-0 w-16 text-center cursor-pointer group"
            >
              <div class="w-12 h-12 mx-auto rounded-xl bg-neutral-100 overflow-hidden border-2 border-pink-200 mb-1 relative">
                <ion-img
                  v-if="char.image?.url"
                  :key="`bt-${char.id}-${imageLoader.getRetryCount('bt-' + char.id)}`"
                  :src="char.image.url"
                  class="h-full w-full object-cover transition-opacity duration-500"
                  :class="{ 'opacity-0': !imageLoader.isSuccess('bt-' + char.id) }"
                  @ionImgDidLoad="imageLoader.onLoad('bt-' + char.id)"
                  @ionError="imageLoader.onError('bt-' + char.id)"
                />
                <ion-spinner
                  v-if="char.image?.url && imageLoader.isLoading('bt-' + char.id)"
                  name="crescent"
                  class="absolute inset-0 m-auto z-10 text-neutral-400"
                  style="width: 14px; height: 14px;"
                />
                <div
                  v-if="char.image?.url && imageLoader.isError('bt-' + char.id)"
                  @click.stop="imageLoader.retry('bt-' + char.id)"
                  class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                >
                  <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
                </div>
                <div v-if="!char.image?.url" class="absolute inset-0 flex items-center justify-center bg-neutral-100">
                  <Icon icon="lucide:user" class="h-5 w-5 text-neutral-300" />
                </div>
              </div>
              <div class="text-[10px] font-medium text-neutral-700 truncate group-hover:text-neutral-950">{{ char.original || char.name }}</div>
              <div v-if="char.birthday" class="text-[9px] text-neutral-400">{{ char.birthday[0] }}月{{ char.birthday[1] }}日</div>
            </div>
          </div>
        </div>

        <!-- 明日生日 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-medium text-neutral-500 flex items-center gap-1.5">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              {{ t('home.birthday_tomorrow') }}
              <span class="text-neutral-400 font-normal">({{ tomorrowBirthdays.length }})</span>
            </div>
            <button
              v-if="tomorrowBirthdays.length > 0"
              @click="navigateToBirthdaySearch(...getBirthdayParams(1))"
              class="text-[10px] text-neutral-400 hover:text-neutral-600 transition"
            >
              {{ t('home.view_all') }}
            </button>
          </div>

          <div v-if="tomorrowBirthdays.length === 0" class="text-[11px] text-neutral-400 py-1">
            {{ t('home.no_birthday') }}
          </div>
          <div v-else class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <div
              v-for="char in tomorrowBirthdays.slice(0, 10)"
              :key="char.id"
              @click="handleCharacterClick(char)"
              class="shrink-0 w-16 text-center cursor-pointer group"
            >
              <div class="w-12 h-12 mx-auto rounded-xl bg-neutral-100 overflow-hidden border-2 border-blue-200 mb-1 relative">
                <ion-img
                  v-if="char.image?.url"
                  :key="`btt-${char.id}-${imageLoader.getRetryCount('btt-' + char.id)}`"
                  :src="char.image.url"
                  class="h-full w-full object-cover transition-opacity duration-500"
                  :class="{ 'opacity-0': !imageLoader.isSuccess('btt-' + char.id) }"
                  @ionImgDidLoad="imageLoader.onLoad('btt-' + char.id)"
                  @ionError="imageLoader.onError('btt-' + char.id)"
                />
                <ion-spinner
                  v-if="char.image?.url && imageLoader.isLoading('btt-' + char.id)"
                  name="crescent"
                  class="absolute inset-0 m-auto z-10 text-neutral-400"
                  style="width: 14px; height: 14px;"
                />
                <div
                  v-if="char.image?.url && imageLoader.isError('btt-' + char.id)"
                  @click.stop="imageLoader.retry('btt-' + char.id)"
                  class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
                >
                  <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
                </div>
                <div v-if="!char.image?.url" class="absolute inset-0 flex items-center justify-center bg-neutral-100">
                  <Icon icon="lucide:user" class="h-5 w-5 text-neutral-300" />
                </div>
              </div>
              <div class="text-[10px] font-medium text-neutral-700 truncate group-hover:text-neutral-950">{{ char.original || char.name }}</div>
              <div v-if="char.birthday" class="text-[9px] text-neutral-400">{{ char.birthday[0] }}月{{ char.birthday[1] }}日</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 刚刚发布 & 即将发布 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 刚刚发布 -->
      <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Icon icon="lucide:calendar-check" class="h-4 w-4 text-emerald-500" />
            {{ t('home.just_released') }}
          </h2>
          <button @click="router.push('/search/release')" class="text-[10px] text-neutral-400 hover:text-neutral-600 transition">
            {{ t('home.view_all') }}
          </button>
        </div>
        
        <div v-if="loadingSections.releases" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse h-12 rounded-lg bg-neutral-50"></div>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in filteredJustReleased"
            :key="item.id"
            @click="handleReleaseClick(item)"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer group"
          >
            <div class="h-10 w-8 rounded bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/50 relative">
              <ion-img
                v-if="item.images?.[0]?.url"
                :key="`jr-${item.id}-${imageLoader.getRetryCount(`jr-${item.id}`)}`"
                :src="item.images[0].url"
                class="h-full w-full object-cover transition-opacity duration-500"
                :class="{ 'blur-md': shouldBlurReleaseCover(item), 'opacity-0': !imageLoader.isSuccess(`jr-${item.id}`) }"
                @ionImgDidLoad="imageLoader.onLoad(`jr-${item.id}`)"
                @ionError="imageLoader.onError(`jr-${item.id}`)"
              />
              <ion-spinner
                v-if="item.images?.[0]?.url && imageLoader.isLoading(`jr-${item.id}`)"
                name="crescent"
                class="absolute inset-0 m-auto z-10 text-neutral-400"
                style="width: 16px; height: 16px;"
              />
              <div
                v-if="item.images?.[0]?.url && imageLoader.isError(`jr-${item.id}`)"
                @click="imageLoader.retry(`jr-${item.id}`)"
                class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
              >
                <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
              </div>
              <div v-if="!item.images?.[0]?.url || shouldBlurReleaseCover(item)" class="absolute inset-0 flex items-center justify-center bg-neutral-100 pointer-events-none">
                <Icon :icon="shouldBlurReleaseCover(item) ? 'lucide:eye-off' : 'lucide:package'" class="h-4 w-4" :class="shouldBlurReleaseCover(item) ? 'text-neutral-400' : 'text-neutral-300'" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-neutral-800 truncate group-hover:text-neutral-950">{{ item.alttitle || item.title }}</div>
              <div class="flex items-center gap-2">
                <div class="text-[10px] text-neutral-400">{{ item.released }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="lang in item.languages" :key="lang.lang" class="text-[8px] px-1 rounded bg-neutral-100 text-neutral-500 whitespace-nowrap">
                    {{ t(`settings.lang_names.${lang.lang}`, lang.lang) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 即将发布 -->
      <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Icon icon="lucide:calendar-days" class="h-4 w-4 text-blue-500" />
            {{ t('home.upcoming_releases') }}
          </h2>
        </div>
        
        <div v-if="loadingSections.releases" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse h-12 rounded-lg bg-neutral-50"></div>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in filteredUpcomingReleases"
            :key="item.id"
            @click="handleReleaseClick(item)"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer group"
          >
            <div class="h-10 w-8 rounded bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/50 relative">
              <ion-img
                v-if="item.images?.[0]?.url"
                :key="`ur-${item.id}-${imageLoader.getRetryCount(`ur-${item.id}`)}`"
                :src="item.images[0].url"
                class="h-full w-full object-cover transition-opacity duration-500"
                :class="{ 'blur-md': shouldBlurReleaseCover(item), 'opacity-0': !imageLoader.isSuccess(`ur-${item.id}`) }"
                @ionImgDidLoad="imageLoader.onLoad(`ur-${item.id}`)"
                @ionError="imageLoader.onError(`ur-${item.id}`)"
              />
              <ion-spinner
                v-if="item.images?.[0]?.url && imageLoader.isLoading(`ur-${item.id}`)"
                name="crescent"
                class="absolute inset-0 m-auto z-10 text-neutral-400"
                style="width: 16px; height: 16px;"
              />
              <div
                v-if="item.images?.[0]?.url && imageLoader.isError(`ur-${item.id}`)"
                @click="imageLoader.retry(`ur-${item.id}`)"
                class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
              >
                <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
              </div>
              <div v-if="!item.images?.[0]?.url || shouldBlurReleaseCover(item)" class="absolute inset-0 flex items-center justify-center bg-neutral-100 pointer-events-none">
                <Icon :icon="shouldBlurReleaseCover(item) ? 'lucide:eye-off' : 'lucide:package'" class="h-4 w-4" :class="shouldBlurReleaseCover(item) ? 'text-neutral-400' : 'text-neutral-300'" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-neutral-800 truncate group-hover:text-neutral-950">{{ item.alttitle || item.title }}</div>
              <div class="flex items-center gap-2">
                <div class="text-[10px] text-neutral-400">{{ item.released }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="lang in item.languages" :key="lang.lang" class="text-[8px] px-1 rounded bg-neutral-100 text-neutral-500 whitespace-nowrap">
                    {{ t(`settings.lang_names.${lang.lang}`, lang.lang) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 随机作品 (Button Style) -->
    <button
      @click="handleRandomClick"
      :disabled="loadingSections.random"
      class="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:bg-neutral-50 active:bg-neutral-100 shadow-xs w-full cursor-pointer disabled:opacity-50"
    >
      <div class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-lg bg-purple-50 text-purple-600">
          <Icon :icon="loadingSections.random ? 'eos-icons:loading' : 'lucide:dices'" class="h-5 w-5" />
        </div>
        <div>
          <span class="text-sm font-semibold text-neutral-800 block">{{ t('home.random_vn') }}</span>
          <span class="text-[10px] text-neutral-400">试试手气，随机跳转到一个作品页面</span>
        </div>
      </div>
      <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-400" />
    </button>

    <!-- 已保存的搜索结果预览 -->
    <template v-for="search in displayedSavedSearches" :key="search.id">
      <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Icon :icon="SEARCH_TYPE_MAP[search.type]?.icon || 'lucide:search'" class="h-4 w-4 text-amber-500" />
            {{ search.name }}
            <span class="text-[8px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-normal">
              {{ SEARCH_TYPE_MAP[search.type]?.label || search.type }}
            </span>
          </h2>
          <div class="flex items-center gap-1">
            <button
              @click.stop="refreshSingleSearch(search)"
              class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition"
              :class="{ 'animate-spin': savedSearchLoading[search.id] }"
            >
              <Icon icon="lucide:refresh-cw" class="h-3.5 w-3.5" />
            </button>
            <button
              @click.stop="openMoreActions(search)"
              class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition"
            >
              <Icon icon="lucide:ellipsis" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- 加载骨架 -->
        <div v-if="savedSearchLoading[search.id]" class="space-y-2">
          <div v-for="i in 3" :key="i" class="animate-pulse h-12 rounded-lg bg-neutral-50"></div>
        </div>

        <!-- 无结果 -->
        <div v-else-if="!savedSearchResults[search.id]?.length" class="text-xs text-neutral-400 py-2">
          {{ t('home.no_results') }}
        </div>

        <!-- 结果列表 -->
        <div v-else class="space-y-2">
          <div
            v-for="item in savedSearchResults[search.id]"
            :key="item.id"
            @click="handleSavedSearchItemClick(search, item)"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition cursor-pointer group"
          >
            <div class="h-10 w-8 rounded bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/50 relative">
              <ion-img
                v-if="getResultDisplay(search, item).image"
                :key="`sv-${search.id}-${item.id}-${imageLoader.getRetryCount(`sv-${search.id}-${item.id}`)}`"
                :src="getResultDisplay(search, item).image"
                class="h-full w-full object-cover transition-opacity duration-500"
                :class="{ 'blur-md': getResultDisplay(search, item).blur, 'opacity-0': !imageLoader.isSuccess(`sv-${search.id}-${item.id}`) }"
                @ionImgDidLoad="imageLoader.onLoad(`sv-${search.id}-${item.id}`)"
                @ionError="imageLoader.onError(`sv-${search.id}-${item.id}`)"
              />
              <ion-spinner
                v-if="getResultDisplay(search, item).image && imageLoader.isLoading(`sv-${search.id}-${item.id}`)"
                name="crescent"
                class="absolute inset-0 m-auto z-10 text-neutral-400"
                style="width: 16px; height: 16px;"
              />
              <div
                v-if="getResultDisplay(search, item).image && imageLoader.isError(`sv-${search.id}-${item.id}`)"
                @click="imageLoader.retry(`sv-${search.id}-${item.id}`)"
                class="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10 cursor-pointer"
              >
                <Icon icon="lucide:refresh-cw" class="h-3 w-3 text-neutral-400" />
              </div>
              <div
                v-if="!getResultDisplay(search, item).image || getResultDisplay(search, item).blur"
                class="absolute inset-0 flex items-center justify-center bg-neutral-100 pointer-events-none"
              >
                <Icon
                  :icon="getResultDisplay(search, item).blur ? 'lucide:eye-off' : getResultDisplay(search, item).placeholderIcon"
                  class="h-4 w-4"
                  :class="getResultDisplay(search, item).blur ? 'text-neutral-400' : 'text-neutral-300'"
                />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-neutral-800 truncate group-hover:text-neutral-950">
                {{ getResultDisplay(search, item).title }}
              </div>
              <div class="flex items-center gap-2">
                <div v-if="getResultDisplay(search, item).subtitle" class="text-[10px] text-neutral-400">
                  {{ getResultDisplay(search, item).subtitle }}
                </div>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="badge in getResultDisplay(search, item).badges"
                    :key="badge"
                    class="text-[8px] px-1 rounded bg-neutral-100 text-neutral-500 whitespace-nowrap"
                  >
                    {{ t(`settings.lang_names.${badge}`, badge) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Notion 风格 Bottom Sheet -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showBottomSheet"
        class="fixed inset-0 z-50 bg-black/40"
        @click="closeBottomSheet"
      ></div>
    </Transition>
    <Transition name="slide-up">
      <div
        v-if="showBottomSheet"
        class="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300" aria-hidden="true"></div>
        <div class="grid gap-2">
          <button
            class="flex items-center gap-3 rounded-xl p-3 text-sm text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
            type="button"
            @click="handleBottomSheetAction('viewAll')"
          >
            <Icon icon="lucide:external-link" class="h-5 w-5 text-neutral-500" />
            {{ t('home.view_all') }}
          </button>
          <button
            class="flex items-center gap-3 rounded-xl p-3 text-sm text-red-500 hover:bg-red-50 active:bg-red-100"
            type="button"
            @click="handleBottomSheetAction('delete')"
          >
            <Icon icon="lucide:trash-2" class="h-5 w-5" />
            {{ t('home.delete') }}
          </button>
        </div>
        <button
          class="mt-4 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 text-sm font-medium text-neutral-700 active:bg-neutral-100"
          type="button"
          @click="closeBottomSheet"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
    </Transition>
  </Teleport>

  <!-- Notion 风格删除确认弹窗 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-[60] bg-black/40"
        @click="closeDeleteConfirm"
      ></div>
    </Transition>
    <Transition name="scale">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-[60] flex items-center justify-center p-6"
      >
        <div
          class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          @click.stop
        >
          <h3 class="text-base font-semibold text-neutral-900">
            {{ t('home.delete_confirm_title') }}
          </h3>
          <p class="mt-2 text-sm text-neutral-500">
            {{ t('home.delete_confirm_message', { name: deleteConfirmSearch?.name }) }}
          </p>
          <div class="mt-6 flex gap-3">
            <button
              class="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 text-sm font-medium text-neutral-700 active:bg-neutral-100"
              type="button"
              @click="closeDeleteConfirm"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white active:bg-red-600"
              type="button"
              @click="confirmDelete"
            >
              {{ t('home.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  </ion-content>
  </ion-page>
</template>

<style scoped>
/* Bottom Sheet 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* 弹窗缩放过渡动画 */
.scale-enter-active,
.scale-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
