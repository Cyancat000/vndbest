<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'

type Status = 'Not started' | 'In progress' | 'Done'
type Priority = 'Low' | 'Medium' | 'High'

type TodoItem = {
  id: string
  label: string
  done: boolean
}

type TagItem = {
  id: string
  label: string
  color?: string
}

const quickFind = ref('')
const isSidebarPinned = ref(true)
const isNotificationsOn = ref(false)
const showBottomSheet = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const activeTab = ref('home')

const status = ref<Status>('In progress')
const priority = ref<Priority>('Medium')
const assignee = ref('You')

const todos = ref<TodoItem[]>([
  { id: 't1', label: 'Draft page layout', done: true },
  { id: 't2', label: 'Add reusable blocks', done: false },
  { id: 't3', label: 'Polish typography', done: false },
])

const tagPalette = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6', '#ef4444']

function colorForTag(label: string) {
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0
  const index = Math.abs(hash) % tagPalette.length
  return tagPalette[index] ?? '#111827'
}

function newId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const pageTags = ref<TagItem[]>([
  { id: 'tag-ui', label: 'UI' },
  { id: 'tag-ref', label: 'Reference' },
  { id: 'tag-notion', label: 'Notion-like' },
  { id: 'tag-color', label: 'Color dot', color: colorForTag('Color dot') },
])

const newTag = ref('')

function toggleTodo(id: string) {
  const item = todos.value.find((t) => t.id === id)
  if (!item) return
  item.done = !item.done
}

function addTag() {
  const label = newTag.value.trim()
  if (!label) return
  if (pageTags.value.some((t) => t.label === label)) return
  pageTags.value = [...pageTags.value, { id: newId('tag'), label }]
  newTag.value = ''
}

function removeTag(id: string) {
  pageTags.value = pageTags.value.filter((t) => t.id !== id)
}

function triggerToast(msg: string) {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)
}

const toc = computed(
  () =>
    [
      { id: 'overview', label: 'Overview' },
      { id: 'typography', label: 'Typography' },
      { id: 'blocks', label: 'Blocks' },
      { id: 'controls', label: 'Controls' },
      { id: 'mobile', label: 'Mobile' },
      { id: 'lists', label: 'Lists' },
      { id: 'tables', label: 'Tables' },
    ] as const,
)
</script>

<template>
  <div class="min-h-[calc(100svh-3.5rem-3rem)] bg-white text-neutral-900">
    <article class="mx-auto w-full max-w-3xl px-4 py-6">
      <header>
        <div class="h-32 sm:h-40 rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-100 to-white" role="img" aria-label="Page cover"></div>

        <div class="mt-6 flex items-end justify-between gap-4">
          <div class="min-w-0">
            <nav class="flex flex-wrap items-center gap-1 text-xs text-neutral-500" aria-label="Breadcrumb">
              <a class="underline decoration-neutral-900/25 underline-offset-4 hover:decoration-neutral-900/50" href="#overview">
                Workspace
              </a>
              <Icon icon="lucide:chevron-right" class="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              <a class="underline decoration-neutral-900/25 underline-offset-4 hover:decoration-neutral-900/50" href="#overview">
                Style Guide
              </a>
              <Icon icon="lucide:chevron-right" class="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              <span class="text-neutral-700">Notion Style</span>
            </nav>

            <div class="mt-2 flex min-w-0 items-center gap-3">
              <div class="grid h-10 w-10 sm:h-11 sm:w-11 flex-none place-items-center rounded-xl border border-neutral-200 bg-white" aria-hidden="true">
                <Icon icon="lucide:file-text" class="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h1 class="m-0 truncate text-[28px] sm:text-[40px] font-bold leading-[1.15] tracking-[-0.02em]">Notion Style</h1>
            </div>
          </div>

          <!-- Mobile: compact action menu -->
          <button
            class="inline-flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 sm:hidden"
            type="button"
            @click="triggerToast('Actions menu opened')"
          >
            <Icon icon="lucide:more-horizontal" class="h-4 w-4 text-neutral-600" aria-hidden="true" />
          </button>

          <!-- Desktop: full action buttons -->
          <div class="hidden sm:flex items-center gap-2">
            <button
              class="inline-flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
              type="button"
              @click="triggerToast('Shared!')"
            >
              <Icon icon="lucide:share-2" class="h-4 w-4 text-neutral-600" aria-hidden="true" />
              Share
            </button>
            <button
              class="inline-flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
              type="button"
              @click="triggerToast('Duplicated!')"
            >
              <Icon icon="lucide:copy" class="h-4 w-4 text-neutral-600" aria-hidden="true" />
              Duplicate
            </button>
          </div>
        </div>

        <!-- Properties panel -->
        <dl class="mt-4 grid gap-2 rounded-xl border border-neutral-200 bg-white p-3">
          <div class="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-3">
            <dt class="text-xs text-neutral-500">Owner</dt>
            <dd class="m-0">
              <select
                v-model="assignee"
                class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                aria-label="Owner"
              >
                <option>You</option>
                <option>Design</option>
                <option>Engineering</option>
              </select>
            </dd>
          </div>
          <div class="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-3">
            <dt class="text-xs text-neutral-500">Status</dt>
            <dd class="m-0">
              <select
                v-model="status"
                class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                aria-label="Status"
              >
                <option value="Not started">Not started</option>
                <option value="In progress">In progress</option>
                <option value="Done">Done</option>
              </select>
            </dd>
          </div>
          <div class="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-3">
            <dt class="text-xs text-neutral-500">Priority</dt>
            <dd class="m-0">
              <select
                v-model="priority"
                class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                aria-label="Priority"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </dd>
          </div>
          <div class="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] items-start gap-2 sm:gap-3">
            <dt class="text-xs text-neutral-500 pt-2">Tags</dt>
            <dd class="m-0 flex flex-wrap items-center gap-2">
              <span
                v-for="tag in pageTags"
                :key="tag.id"
                class="inline-flex max-w-[240px] items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1 pl-3 pr-1 text-xs text-neutral-900"
              >
                <span
                  v-if="tag.color"
                  class="h-2 w-2 flex-none rounded-full shadow-[0_0_0_1px_rgba(17,24,39,0.1)]"
                  :style="{ backgroundColor: tag.color }"
                  aria-hidden="true"
                ></span>
                <span class="truncate">{{ tag.label }}</span>
                <button
                  class="grid h-[18px] w-[18px] place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  type="button"
                  :aria-label="`Remove ${tag.label}`"
                  @click="removeTag(tag.id)"
                >
                  <Icon icon="lucide:x" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>

              <form class="flex items-center gap-2" @submit.prevent="addTag">
                <input
                  v-model="newTag"
                  class="w-36 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                  type="text"
                  placeholder="Add tag"
                />
                <button
                  class="inline-flex h-8 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
                  type="submit"
                >
                  <Icon icon="lucide:plus" class="h-4 w-4 text-neutral-600" aria-hidden="true" />
                  Add
                </button>
              </form>
            </dd>
          </div>
        </dl>
      </header>

      <!-- Mobile TOC chips (horizontal scroll) -->
      <nav class="mt-6 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:hidden" aria-label="On this page">
        <a
          v-for="item in toc"
          :key="item.id"
          class="flex-none rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
          :href="`#${item.id}`"
        >
          {{ item.label }}
        </a>
      </nav>

      <div class="mt-6 grid gap-8 sm:mt-10 sm:gap-10">
        <main class="min-w-0">
          <div class="grid gap-7">
            <section id="overview" class="scroll-mt-24" aria-labelledby="overview-title">
              <h2 id="overview-title" class="mb-3 text-xl font-bold leading-snug">Overview</h2>
              <p class="text-sm leading-7">
                这个页面用于高可读的 UI 参考：以黑白灰为主，覆盖常见文本块、表单控件、列表、表格等。
              </p>

              <div class="mt-4 grid grid-cols-[28px_1fr] items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3" role="note" aria-label="Callout">
                <div class="grid h-7 w-7 place-items-center rounded-lg border border-neutral-200 bg-white" aria-hidden="true">
                  <Icon icon="lucide:info" class="h-4 w-4" />
                </div>
                <div class="min-w-0 space-y-2">
                  <p class="text-sm leading-7">建议使用浏览器开发者工具观察 hover、边框、间距与字体权重的变化。</p>
                  <p class="text-sm leading-7 text-neutral-500">示例数据仅用于演示交互。</p>
                </div>
              </div>
            </section>

            <section id="typography" class="scroll-mt-24" aria-labelledby="typography-title">
              <h2 id="typography-title" class="mb-3 text-xl font-bold leading-snug">Typography</h2>

              <div class="grid gap-4">
                <h3 class="m-0 text-[30px] font-bold leading-tight">Heading 1</h3>
                <h4 class="m-0 text-xl font-bold leading-snug">Heading 2</h4>
                <h5 class="m-0 text-base font-bold leading-snug">Heading 3</h5>
                <p class="text-sm leading-7">
                  常规段落。包含
                  <a class="underline decoration-neutral-900/25 underline-offset-4 hover:decoration-neutral-900/50" href="#typography">链接</a>
                  、 <strong class="font-semibold">强调</strong> 、 <em class="italic">斜体</em> 、以及
                  <code class="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">inline code</code>。
                </p>
                <blockquote class="border-l-4 border-neutral-200 pl-3 text-sm leading-7 text-neutral-900">
                  Notion 风格更重视信息层级和留白。
                </blockquote>
              </div>
            </section>

            <section id="blocks" class="scroll-mt-24" aria-labelledby="blocks-title">
              <h2 id="blocks-title" class="mb-3 text-xl font-bold leading-snug">Blocks</h2>

              <div class="grid gap-4">
                <details class="rounded-xl border border-neutral-200 bg-white">
                  <summary class="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    Toggle block
                  </summary>
                  <div class="px-3 pb-3">
                    <p class="text-sm leading-7">
                      使用原生 <code class="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">details</code> /
                      <code class="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">summary</code>，语义化且可访问。
                    </p>
                  </div>
                </details>

                <div class="h-px bg-neutral-200" role="separator" aria-label="Divider"></div>

                <figure class="m-0">
                  <div class="h-40 rounded-xl border border-dashed border-neutral-200 bg-neutral-50" role="img" aria-label="Image placeholder"></div>
                  <figcaption class="mt-2 text-xs text-neutral-500">Image caption</figcaption>
                </figure>

                <pre class="m-0 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-6" aria-label="Code block"><code>export function mergeClassNames(...values) {
  return values.filter(Boolean).join(' ')
}</code></pre>

                <a
                  class="grid grid-cols-[1fr_96px] items-stretch gap-3 rounded-xl border border-neutral-200 bg-white p-3 no-underline hover:bg-neutral-50 sm:grid-cols-[1fr_120px]"
                  href="https://www.notion.so/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <div class="min-w-0">
                    <div class="text-sm font-semibold">Notion</div>
                    <div class="mt-1 text-xs text-neutral-500">The connected workspace.</div>
                    <div class="mt-2 text-xs text-neutral-400">notion.so</div>
                  </div>
                  <div class="rounded-lg border border-neutral-200 bg-gradient-to-br from-neutral-100 to-white" aria-hidden="true"></div>
                </a>

                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div class="rounded-xl border border-neutral-200 bg-white p-3 active:bg-neutral-50">
                    <div class="mb-2 h-24 rounded-lg bg-neutral-100 sm:h-28" role="img" aria-label="Card image"></div>
                    <div class="truncate text-sm font-semibold">Card Title</div>
                    <div class="mt-1 text-xs text-neutral-500">Card description text</div>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-white p-3 active:bg-neutral-50">
                    <div class="mb-2 h-24 rounded-lg bg-neutral-100 sm:h-28" role="img" aria-label="Card image"></div>
                    <div class="truncate text-sm font-semibold">Another Card</div>
                    <div class="mt-1 text-xs text-neutral-500">More details here</div>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-white p-3 active:bg-neutral-50">
                    <div class="mb-2 h-24 rounded-lg bg-neutral-100 sm:h-28" role="img" aria-label="Card image"></div>
                    <div class="truncate text-sm font-semibold">Third Card</div>
                    <div class="mt-1 text-xs text-neutral-500">Additional info</div>
                  </div>
                  <div class="rounded-xl border border-neutral-200 bg-white p-3 active:bg-neutral-50">
                    <div class="mb-2 h-24 rounded-lg bg-neutral-100 sm:h-28" role="img" aria-label="Card image"></div>
                    <div class="truncate text-sm font-semibold">Fourth Card</div>
                    <div class="mt-1 text-xs text-neutral-500">Extra content</div>
                  </div>
                </div>
              </div>
            </section>

            <section id="mobile" class="scroll-mt-24" aria-labelledby="mobile-title">
              <h2 id="mobile-title" class="mb-3 text-xl font-bold leading-snug">Mobile Components</h2>

              <div class="grid gap-4">
                <!-- Toast notification demo -->
                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="toast-title">
                  <h3 id="toast-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Toast / Snackbar</h3>
                  <p class="text-xs text-neutral-500 mb-2">点击按钮触发底部通知提示</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="h-8 rounded-lg border border-neutral-900 bg-neutral-900 px-3 text-[13px] leading-none text-white hover:bg-neutral-800 active:bg-neutral-700"
                      type="button"
                      @click="triggerToast('操作成功！')"
                    >
                      Show Toast
                    </button>
                    <button
                      class="h-8 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
                      type="button"
                      @click="showBottomSheet = true"
                    >
                      Open Bottom Sheet
                    </button>
                  </div>
                </section>

                <!-- Pull-to-refresh indicator -->
                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="ptr-title">
                  <h3 id="ptr-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Pull-to-Refresh</h3>
                  <div class="flex items-center gap-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4">
                    <Icon icon="lucide:refresh-cw" class="h-5 w-5 text-neutral-400 animate-spin" aria-hidden="true" />
                    <span class="text-sm text-neutral-500">下拉刷新指示器样式</span>
                  </div>
                </section>

                <!-- Swipeable list item -->
                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="swipe-title">
                  <h3 id="swipe-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Swipeable List Item</h3>
                  <div class="space-y-2">
                    <div class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                      <div class="grid h-10 w-10 flex-none place-items-center rounded-full bg-neutral-100">
                        <Icon icon="lucide:user" class="h-5 w-5 text-neutral-500" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">Swipe left for actions</div>
                        <div class="text-xs text-neutral-500">拖拽左侧显示操作按钮</div>
                      </div>
                      <Icon icon="lucide:chevron-left" class="h-4 w-4 text-neutral-300" />
                    </div>
                    <div class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                      <div class="grid h-10 w-10 flex-none place-items-center rounded-full bg-neutral-100">
                        <Icon icon="lucide:bell" class="h-5 w-5 text-neutral-500" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">Swipe right to pin</div>
                        <div class="text-xs text-neutral-500">拖拽右侧固定项目</div>
                      </div>
                      <Icon icon="lucide:chevron-right" class="h-4 w-4 text-neutral-300" />
                    </div>
                  </div>
                </section>

                <!-- Mobile bottom navigation demo -->
                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="bottomnav-title">
                  <h3 id="bottomnav-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Bottom Navigation</h3>
                  <div class="rounded-lg border border-neutral-200 bg-white">
                    <nav class="flex items-center justify-around py-2" aria-label="Bottom navigation demo">
                      <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-neutral-900" type="button">
                        <Icon icon="lucide:home" class="h-5 w-5" />
                        <span class="text-[10px] font-medium">Home</span>
                      </button>
                      <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-neutral-400" type="button">
                        <Icon icon="lucide:search" class="h-5 w-5" />
                        <span class="text-[10px] font-medium">Search</span>
                      </button>
                      <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-neutral-400" type="button">
                        <Icon icon="lucide:plus-square" class="h-5 w-5" />
                        <span class="text-[10px] font-medium">Create</span>
                      </button>
                      <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-neutral-400" type="button">
                        <Icon icon="lucide:bell" class="h-5 w-5" />
                        <span class="text-[10px] font-medium">Alerts</span>
                      </button>
                      <button class="flex flex-col items-center gap-0.5 px-3 py-1 text-neutral-400" type="button">
                        <Icon icon="lucide:user" class="h-5 w-5" />
                        <span class="text-[10px] font-medium">Profile</span>
                      </button>
                    </nav>
                  </div>
                </section>
              </div>
            </section>

            <section id="controls" class="scroll-mt-24" aria-labelledby="controls-title">
              <h2 id="controls-title" class="mb-3 text-xl font-bold leading-snug">Controls</h2>

              <div class="grid gap-4 sm:grid-cols-2">
                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="buttons-title">
                  <h3 id="buttons-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Buttons</h3>
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="h-8 rounded-lg border border-neutral-900 bg-neutral-900 px-3 text-[13px] leading-none text-white hover:bg-neutral-800 active:bg-neutral-900"
                      type="button"
                    >
                      Primary
                    </button>
                    <button
                      class="h-8 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
                      type="button"
                    >
                      Default
                    </button>
                    <button
                      class="h-8 rounded-lg border border-transparent bg-transparent px-3 text-[13px] leading-none text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200"
                      type="button"
                    >
                      Ghost
                    </button>
                    <button
                      class="h-8 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] leading-none text-neutral-400 disabled:cursor-not-allowed"
                      type="button"
                      disabled
                    >
                      Disabled
                    </button>
                  </div>
                </section>

                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="fields-title">
                  <h3 id="fields-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Inputs</h3>
                  <div class="grid gap-3">
                    <label class="grid gap-1">
                      <span class="text-xs text-neutral-500">Quick find</span>
                      <div class="relative">
                        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">
                          <Icon icon="lucide:search" class="h-4 w-4" />
                        </span>
                        <input
                          v-model="quickFind"
                          class="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                          type="text"
                          placeholder="Search"
                        />
                      </div>
                    </label>
                    <label class="grid gap-1">
                      <span class="text-xs text-neutral-500">Notes</span>
                      <textarea
                        class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                        rows="3"
                        placeholder="Write something"
                      ></textarea>
                    </label>
                  </div>
                </section>

                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="toggles-title">
                  <h3 id="toggles-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Toggles</h3>
                  <div class="grid gap-3">
                    <label class="inline-flex items-center gap-3 text-sm">
                      <input v-model="isSidebarPinned" class="peer sr-only" type="checkbox" />
                      <span
                        class="relative box-border h-[22px] w-[38px] rounded-full border border-neutral-200 bg-neutral-200 transition-colors peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:[&>span]:translate-x-[16px]"
                        aria-hidden="true"
                      >
                        <span class="absolute left-[1px] top-1/2 box-border h-[18px] w-[18px] -translate-y-1/2 translate-x-0 rounded-full border border-neutral-200 bg-white transition-transform"></span>
                      </span>
                      <span class="inline-flex items-center gap-2">
                        <Icon icon="lucide:pin" class="h-4 w-4 text-neutral-500" aria-hidden="true" />
                        Pin sidebar
                      </span>
                    </label>
                    <label class="inline-flex items-center gap-3 text-sm">
                      <input v-model="isNotificationsOn" class="peer sr-only" type="checkbox" />
                      <span
                        class="relative box-border h-[22px] w-[38px] rounded-full border border-neutral-200 bg-neutral-200 transition-colors peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:[&>span]:translate-x-[16px]"
                        aria-hidden="true"
                      >
                        <span class="absolute left-[1px] top-1/2 box-border h-[18px] w-[18px] -translate-y-1/2 translate-x-0 rounded-full border border-neutral-200 bg-white transition-transform"></span>
                      </span>
                      <span class="inline-flex items-center gap-2">
                        <Icon icon="lucide:bell" class="h-4 w-4 text-neutral-500" aria-hidden="true" />
                        Notifications
                      </span>
                    </label>
                  </div>
                </section>
              </div>
            </section>

            <section id="lists" class="scroll-mt-24" aria-labelledby="lists-title">
              <h2 id="lists-title" class="mb-3 text-xl font-bold leading-snug">Lists</h2>

              <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="todo-title">
                <h3 id="todo-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">To-do list</h3>
                <ul class="grid gap-2" role="list">
                  <li v-for="t in todos" :key="t.id">
                    <label class="inline-flex items-center gap-3 text-sm leading-6">
                      <input :checked="t.done" class="peer sr-only" type="checkbox" @change="toggleTodo(t.id)" />
                      <span
                        class="relative grid h-4 w-4 place-items-center rounded border border-neutral-300 bg-white peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:[&>svg]:opacity-100"
                        aria-hidden="true"
                      >
                        <Icon icon="lucide:check" class="h-3 w-3 text-white opacity-0 transition-opacity" aria-hidden="true" />
                      </span>
                      <span :class="t.done ? 'line-through text-neutral-500' : ''">{{ t.label }}</span>
                    </label>
                  </li>
                </ul>
              </section>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="bullets-title">
                  <h3 id="bullets-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Bulleted</h3>
                  <ul class="list-disc space-y-2 pl-5 text-sm leading-7">
                    <li>Readable spacing</li>
                    <li>Subtle borders</li>
                    <li>Black, White, Gray palette</li>
                  </ul>
                </section>

                <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="numbers-title">
                  <h3 id="numbers-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Numbered</h3>
                  <ol class="list-decimal space-y-2 pl-5 text-sm leading-7">
                    <li>Structure</li>
                    <li>Blocks</li>
                    <li>Components</li>
                  </ol>
                </section>
              </div>
            </section>

            <section id="tables" class="scroll-mt-24" aria-labelledby="tables-title">
              <h2 id="tables-title" class="mb-3 text-xl font-bold leading-snug">Tables</h2>

              <section class="rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="simple-table-title">
                <h3 id="simple-table-title" class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Simple table</h3>
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[400px] border-separate border-spacing-0 text-[13px]">
                    <thead class="text-left">
                      <tr>
                        <th scope="col" class="border-b border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-500">Component</th>
                        <th scope="col" class="border-b border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-500">Purpose</th>
                        <th scope="col" class="border-b border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-500">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Callout</td>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Highlight important info</td>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Mostly neutral colors</td>
                      </tr>
                      <tr>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Toggle</td>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Progressive disclosure</td>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Native details and summary</td>
                      </tr>
                      <tr>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Table</td>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Data preview</td>
                        <td class="border-b border-neutral-200 px-3 py-2 align-top">Sticky feel with borders</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="mt-4 rounded-xl border border-neutral-200 bg-white p-3" aria-labelledby="database-title">
                <div class="flex items-baseline justify-between gap-3">
                  <h3 id="database-title" class="text-xs font-bold uppercase tracking-wide text-neutral-500">Database-like row</h3>
                  <span class="text-xs sm:text-sm text-neutral-500">Inline property controls</span>
                </div>

                <div
                  class="mt-2 grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[1.3fr_1fr_1fr] sm:items-start"
                  role="group"
                  aria-label="Row"
                >
                  <div class="grid gap-1.5">
                    <div class="text-xs text-neutral-500">Name</div>
                    <div class="font-medium">Notion UI Kit</div>
                  </div>
                  <div class="grid gap-1.5">
                    <div class="text-xs text-neutral-500">Status</div>
                    <select v-model="status" class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10">
                      <option value="Not started">Not started</option>
                      <option value="In progress">In progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div class="grid gap-1.5">
                    <div class="text-xs text-neutral-500">Priority</div>
                    <select v-model="priority" class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>
    </article>

    <!-- FAB (Floating Action Button) -->
    <button
      class="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 grid h-14 w-14 place-items-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 active:bg-neutral-700 transition-colors"
      type="button"
      aria-label="Create new"
      @click="triggerToast('New item created!')"
    >
      <Icon icon="lucide:plus" class="h-6 w-6" />
    </button>

    <!-- Bottom Tab Bar (mobile only) -->
    <nav class="fixed bottom-0 inset-x-0 z-50 border-t border-neutral-200 bg-white sm:hidden" aria-label="Main navigation">
      <div class="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          :class="activeTab === 'home' ? 'text-neutral-900' : 'text-neutral-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1"
          type="button"
          @click="activeTab = 'home'"
        >
          <Icon icon="lucide:home" class="h-5 w-5" />
          <span class="text-[10px] font-medium">Home</span>
        </button>
        <button
          :class="activeTab === 'search' ? 'text-neutral-900' : 'text-neutral-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1"
          type="button"
          @click="activeTab = 'search'"
        >
          <Icon icon="lucide:search" class="h-5 w-5" />
          <span class="text-[10px] font-medium">Search</span>
        </button>
        <button
          :class="activeTab === 'create' ? 'text-neutral-900' : 'text-neutral-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1"
          type="button"
          @click="activeTab = 'create'"
        >
          <Icon icon="lucide:plus-square" class="h-5 w-5" />
          <span class="text-[10px] font-medium">Create</span>
        </button>
        <button
          :class="activeTab === 'alerts' ? 'text-neutral-900' : 'text-neutral-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1"
          type="button"
          @click="activeTab = 'alerts'"
        >
          <Icon icon="lucide:bell" class="h-5 w-5" />
          <span class="text-[10px] font-medium">Alerts</span>
        </button>
        <button
          :class="activeTab === 'profile' ? 'text-neutral-900' : 'text-neutral-400'"
          class="flex flex-col items-center gap-0.5 px-3 py-1"
          type="button"
          @click="activeTab = 'profile'"
        >
          <Icon icon="lucide:user" class="h-5 w-5" />
          <span class="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </nav>

    <!-- Bottom Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showBottomSheet"
          class="fixed inset-0 z-50 bg-black/40 sm:hidden"
          @click="showBottomSheet = false"
        ></div>
      </Transition>
      <Transition name="slide-up">
        <div
          v-if="showBottomSheet"
          class="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:hidden"
        >
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300" aria-hidden="true"></div>
          <h3 class="text-base font-bold mb-3">Bottom Sheet</h3>
          <div class="grid gap-2">
            <button class="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-neutral-50 active:bg-neutral-100" type="button" @click="showBottomSheet = false; triggerToast('Camera opened')">
              <Icon icon="lucide:camera" class="h-5 w-5 text-neutral-500" />
              Take Photo
            </button>
            <button class="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-neutral-50 active:bg-neutral-100" type="button" @click="showBottomSheet = false; triggerToast('Gallery opened')">
              <Icon icon="lucide:image" class="h-5 w-5 text-neutral-500" />
              Choose from Gallery
            </button>
            <button class="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-neutral-50 active:bg-neutral-100" type="button" @click="showBottomSheet = false; triggerToast('File picker opened')">
              <Icon icon="lucide:file" class="h-5 w-5 text-neutral-500" />
              Upload File
            </button>
          </div>
          <button
            class="mt-4 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 text-sm font-medium text-neutral-700 active:bg-neutral-100"
            type="button"
            @click="showBottomSheet = false"
          >
            Cancel
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast / Snackbar -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="showToast"
          class="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 sm:bottom-8 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg whitespace-nowrap"
        >
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>

    <!-- Bottom padding for mobile tab bar -->
    <div class="h-16 sm:hidden" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
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

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 16px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}
</style>
