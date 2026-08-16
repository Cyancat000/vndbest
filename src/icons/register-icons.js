import { addIcon } from '@iconify/vue'
import { APP_ICON_NAMES, PLATFORM_ICON_NAMES } from './icon-names'

import search from '@iconify-icons/lucide/search'
import searchX from '@iconify-icons/lucide/search-x'
import x from '@iconify-icons/lucide/x'
import check from '@iconify-icons/lucide/check'
import checkCircle from '@iconify-icons/lucide/check-circle'
import xCircle from '@iconify-icons/lucide/x-circle'
import chevronLeft from '@iconify-icons/lucide/chevron-left'
import chevronRight from '@iconify-icons/lucide/chevron-right'
import chevronUp from '@iconify-icons/lucide/chevron-up'
import chevronDown from '@iconify-icons/lucide/chevron-down'
import chevronsUp from '@iconify-icons/lucide/chevrons-up'
import chevronsDown from '@iconify-icons/lucide/chevrons-down'
import plus from '@iconify-icons/lucide/plus'
import bookmark from '@iconify-icons/lucide/bookmark'
import externalLink from '@iconify-icons/lucide/external-link'
import refreshCw from '@iconify-icons/lucide/refresh-cw'
import settings from '@iconify-icons/lucide/settings'
import info from '@iconify-icons/lucide/info'
import ellipsis from '@iconify-icons/lucide/circle-ellipsis'
import copy from '@iconify-icons/lucide/copy'
import download from '@iconify-icons/lucide/download'
import filter from '@iconify-icons/lucide/filter'
import layers from '@iconify-icons/lucide/layers'
import menu from '@iconify-icons/lucide/menu'
import layoutGrid from '@iconify-icons/lucide/layout-grid'
import list from '@iconify-icons/lucide/list'
import file from '@iconify-icons/lucide/file'
import fileText from '@iconify-icons/lucide/file-text'
import link from '@iconify-icons/lucide/link'
import image from '@iconify-icons/lucide/image'
import imagePlus from '@iconify-icons/lucide/image-plus'
import trash2 from '@iconify-icons/lucide/trash-2'
import eye from '@iconify-icons/lucide/eye'
import eyeOff from '@iconify-icons/lucide/eye-off'
import star from '@iconify-icons/lucide/star'
import quote from '@iconify-icons/lucide/quote'
import loader from '@iconify-icons/lucide/loader'
import loader2 from '@iconify-icons/lucide/loader-2'
import loaderCircle from '@iconify-icons/lucide/loader-2'
import tags from '@iconify-icons/lucide/tags'
import scanSearch from '@iconify-icons/lucide/scan-search'
import fingerprint from '@iconify-icons/lucide/fingerprint'
import packageIcon from '@iconify-icons/lucide/package'
import building2 from '@iconify-icons/lucide/building-2'
import users from '@iconify-icons/lucide/users'
import user from '@iconify-icons/lucide/user'
import userCircle from '@iconify-icons/lucide/user-circle'
import userX from '@iconify-icons/lucide/user-x'
import home from '@iconify-icons/lucide/home'
import library from '@iconify-icons/lucide/library'
import gamepad2 from '@iconify-icons/lucide/gamepad-2'
import dices from '@iconify-icons/lucide/dices'
import shield from '@iconify-icons/lucide/shield'
import shieldAlert from '@iconify-icons/lucide/shield-alert'
import palette from '@iconify-icons/lucide/palette'
import monitor from '@iconify-icons/lucide/monitor'
import sun from '@iconify-icons/lucide/sun'
import moon from '@iconify-icons/lucide/moon'
import languages from '@iconify-icons/lucide/languages'
import pencil from '@iconify-icons/lucide/pencil'
import stickyNote from '@iconify-icons/lucide/sticky-note'
import badge from '@iconify-icons/lucide/badge'
import badgeCheck from '@iconify-icons/lucide/badge-check'
import calendar from '@iconify-icons/lucide/calendar'
import circleDot from '@iconify-icons/lucide/circle-dot'
import calendarCheck from '@iconify-icons/lucide/calendar-check'
import calendarDays from '@iconify-icons/lucide/calendar-days'
import clock from '@iconify-icons/lucide/clock'
import flag from '@iconify-icons/lucide/flag'
import bookOpen from '@iconify-icons/lucide/book-open'
import circleDollarSign from '@iconify-icons/lucide/circle-dollar-sign'
import fileDiff from '@iconify-icons/lucide/file-diff'
import cog from '@iconify-icons/lucide/cog'
import mic from '@iconify-icons/lucide/mic'
import slidersHorizontal from '@iconify-icons/lucide/sliders-horizontal'
import arrowDownNarrowWide from '@iconify-icons/lucide/arrow-down-narrow-wide'
import sortAsc from '@iconify-icons/lucide/sort-asc'
import sortDesc from '@iconify-icons/lucide/sort-desc'
import cake from '@iconify-icons/lucide/cake'
import ruler from '@iconify-icons/lucide/ruler'
import weight from '@iconify-icons/lucide/weight'
import circle from '@iconify-icons/lucide/circle'
import heart from '@iconify-icons/lucide/heart'
import droplets from '@iconify-icons/lucide/droplets'
import database from '@iconify-icons/lucide/database'
import hardDrive from '@iconify-icons/lucide/hard-drive'

import eosLoading from '@iconify-icons/eos-icons/loading'

import siWindows from '@iconify-icons/simple-icons/windows'
import siApple from '@iconify-icons/simple-icons/apple'
import siLinux from '@iconify-icons/simple-icons/linux'
import siAndroid from '@iconify-icons/simple-icons/android'
import siNintendo from '@iconify-icons/simple-icons/nintendo'
import siPlaystation from '@iconify-icons/simple-icons/playstation'
import siSega from '@iconify-icons/simple-icons/sega'
import siXbox from '@iconify-icons/simple-icons/xbox'
import siGoogleChrome from '@iconify-icons/simple-icons/googlechrome'

const ICON_DATA = {
  [APP_ICON_NAMES.common.search]: search,
  [APP_ICON_NAMES.common.searchX]: searchX,
  [APP_ICON_NAMES.common.x]: x,
  [APP_ICON_NAMES.common.check]: check,
  [APP_ICON_NAMES.common.checkCircle]: checkCircle,
  [APP_ICON_NAMES.common.xCircle]: xCircle,
  [APP_ICON_NAMES.common.chevronLeft]: chevronLeft,
  [APP_ICON_NAMES.common.chevronRight]: chevronRight,
  [APP_ICON_NAMES.common.chevronUp]: chevronUp,
  [APP_ICON_NAMES.common.chevronDown]: chevronDown,
  [APP_ICON_NAMES.common.chevronsUp]: chevronsUp,
  [APP_ICON_NAMES.common.chevronsDown]: chevronsDown,
  [APP_ICON_NAMES.common.plus]: plus,
  [APP_ICON_NAMES.common.bookmark]: bookmark,
  [APP_ICON_NAMES.common.externalLink]: externalLink,
  [APP_ICON_NAMES.common.refresh]: refreshCw,
  [APP_ICON_NAMES.common.settings]: settings,
  [APP_ICON_NAMES.common.info]: info,
  [APP_ICON_NAMES.common.ellipsis]: ellipsis,
  [APP_ICON_NAMES.common.copy]: copy,
  [APP_ICON_NAMES.common.download]: download,
  [APP_ICON_NAMES.common.filter]: filter,
  [APP_ICON_NAMES.common.layers]: layers,
  [APP_ICON_NAMES.common.menu]: menu,
  [APP_ICON_NAMES.common.layoutGrid]: layoutGrid,
  [APP_ICON_NAMES.common.list]: list,
  [APP_ICON_NAMES.common.file]: file,
  [APP_ICON_NAMES.common.fileText]: fileText,
  [APP_ICON_NAMES.common.link]: link,
  [APP_ICON_NAMES.common.image]: image,
  [APP_ICON_NAMES.common.imagePlus]: imagePlus,
  [APP_ICON_NAMES.common.trash2]: trash2,
  [APP_ICON_NAMES.common.eye]: eye,
  [APP_ICON_NAMES.common.eyeOff]: eyeOff,
  [APP_ICON_NAMES.common.star]: star,
  [APP_ICON_NAMES.common.quote]: quote,
  [APP_ICON_NAMES.common.loader]: loader,
  [APP_ICON_NAMES.common.loader2]: loader2,
  [APP_ICON_NAMES.common.loaderCircle]: loaderCircle,
  [APP_ICON_NAMES.common.tags]: tags,
  [APP_ICON_NAMES.common.scanSearch]: scanSearch,
  [APP_ICON_NAMES.common.fingerprint]: fingerprint,
  [APP_ICON_NAMES.common.package]: packageIcon,
  [APP_ICON_NAMES.common.building2]: building2,
  [APP_ICON_NAMES.common.users]: users,
  [APP_ICON_NAMES.common.user]: user,
  [APP_ICON_NAMES.common.userCircle]: userCircle,
  [APP_ICON_NAMES.common.userX]: userX,
  [APP_ICON_NAMES.common.home]: home,
  [APP_ICON_NAMES.common.library]: library,
  [APP_ICON_NAMES.common.gamepad2]: gamepad2,
  [APP_ICON_NAMES.common.dices]: dices,
  [APP_ICON_NAMES.common.shield]: shield,
  [APP_ICON_NAMES.common.shieldAlert]: shieldAlert,
  [APP_ICON_NAMES.common.palette]: palette,
  [APP_ICON_NAMES.common.monitor]: monitor,
  [APP_ICON_NAMES.common.sun]: sun,
  [APP_ICON_NAMES.common.moon]: moon,
  [APP_ICON_NAMES.common.languages]: languages,
  [APP_ICON_NAMES.common.pencil]: pencil,
  [APP_ICON_NAMES.common.stickyNote]: stickyNote,
  [APP_ICON_NAMES.common.badge]: badge,
  [APP_ICON_NAMES.common.badgeCheck]: badgeCheck,
  [APP_ICON_NAMES.common.calendar]: calendar,
  [APP_ICON_NAMES.common.calendarCheck]: calendarCheck,
  [APP_ICON_NAMES.common.calendarDays]: calendarDays,
  [APP_ICON_NAMES.common.clock]: clock,
  [APP_ICON_NAMES.common.flag]: flag,
  [APP_ICON_NAMES.common.bookOpen]: bookOpen,
  [APP_ICON_NAMES.common.circleDollarSign]: circleDollarSign,
  [APP_ICON_NAMES.common.fileDiff]: fileDiff,
  [APP_ICON_NAMES.common.cog]: cog,
  [APP_ICON_NAMES.common.mic]: mic,
  [APP_ICON_NAMES.common.slidersHorizontal]: slidersHorizontal,
  [APP_ICON_NAMES.common.arrowDownNarrowWide]: arrowDownNarrowWide,
  [APP_ICON_NAMES.common.sortAsc]: sortAsc,
  [APP_ICON_NAMES.common.sortDesc]: sortDesc,
  [APP_ICON_NAMES.common.cake]: cake,
  [APP_ICON_NAMES.common.ruler]: ruler,
  [APP_ICON_NAMES.common.weight]: weight,
  [APP_ICON_NAMES.common.circle]: circle,
  [APP_ICON_NAMES.common.heart]: heart,
  [APP_ICON_NAMES.common.droplets]: droplets,
  [APP_ICON_NAMES.common.venus]: circle,
  [APP_ICON_NAMES.common.mars]: circleDot,
  [APP_ICON_NAMES.common.venusMars]: badge,
  [APP_ICON_NAMES.common.database]: database,
  [APP_ICON_NAMES.common.hardDrive]: hardDrive,
  [APP_ICON_NAMES.loaders.eosLoading]: eosLoading,
  [APP_ICON_NAMES.solar.starBroken]: star,
  [APP_ICON_NAMES.solar.starBold]: star,
  'simple-icons:windows': siWindows,
  'simple-icons:apple': siApple,
  'simple-icons:linux': siLinux,
  'simple-icons:android': siAndroid,
  'simple-icons:playstation': siPlaystation,
  'simple-icons:nintendo': siNintendo,
  'simple-icons:sega': siSega,
  'simple-icons:xbox': siXbox,
  'simple-icons:googlechrome': siGoogleChrome
}

let registered = false

export function registerAppIcons() {
  if (registered) return
  Object.entries(ICON_DATA).forEach(([name, data]) => addIcon(name, data))
  Object.values(PLATFORM_ICON_NAMES).forEach((name) => {
    if (!ICON_DATA[name]) {
      throw new Error(`Missing registered platform icon: ${name}`)
    }
  })
  registered = true
}
