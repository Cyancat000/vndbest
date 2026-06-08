# Project Rules - vndbest

## 项目概述

vndbest 是一个基于 Vue 3 + Vite + Capacitor 的跨端应用项目，支持 Android 和 iOS 平台。

---

## docs 文件位置定义

| 路径 | 说明 |
|------|------|
| `docs/` | 项目文档根目录 |
| `docs/vndb-api-kana.md` | VNDB API 假名相关文档 |
| `docs/style/` | UI 样式参考目录 |
| `docs/style/NotionStyle.vue` | Notion 风格 UI 参考模板（移动端优先） |

---

## 技术栈

- **框架**: Vue 3 (`^3.5.34`)
- **构建工具**: Vite (`^8.0.12`)
- **跨端方案**: Capacitor (`^8.4.0`)
- **样式方案**: Tailwind CSS v4 (`^4.3.0`) + `@tailwindcss/vite`
- **图标库**: `@iconify/vue` (`^5.0.1`) + `@iconify-json/lucide` (`^1.2.111`)

---

## 图标使用规范

项目统一使用 **Iconify** 作为图标方案，优先使用 **Lucide** 图标集。

### 使用方式

```vue
<script setup>
import { Icon } from '@iconify/vue'
</script>

<template>
  <!-- 基本用法 -->
  <Icon icon="lucide:home" class="h-5 w-5" />

  <!-- 带颜色 -->
  <Icon icon="lucide:bell" class="h-4 w-4 text-neutral-500" />
</template>
```

### 图标命名规则

- 格式: `lucide:{icon-name}`
- 常用图标: `lucide:home`, `lucide:search`, `lucide:plus`, `lucide:user`, `lucide:bell`, `lucide:settings`, `lucide:check`, `lucide:x`, `lucide:chevron-left`, `lucide:chevron-right`, `lucide:more-horizontal`, `lucide:share-2`, `lucide:copy`, `lucide:file-text`, `lucide:info`, `lucide:pin`, `lucide:refresh-cw`, `lucide:camera`, `lucide:image`, `lucide:file`, `lucide:plus-square`
- 如需其他图标集，可在 Iconify 图标库 (https://icon-sets.iconify.design/) 搜索

---

## 样式规范

- 使用 Tailwind CSS v4 原子类进行样式编写
- 移动端优先 (mobile-first) 设计
- 路径别名 `@` 指向 `src/` 目录
- 主色调: 黑白灰中性色 (`neutral-*`)
- 圆角: `rounded-xl` (卡片), `rounded-lg` (按钮/输入框), `rounded-full` (标签/头像)

---

## 文件结构约定

```
src/                  # 源代码目录
  App.vue             # 根组件
  main.js             # 入口文件
  style.css           # 全局样式（含 Tailwind 导入）
docs/                 # 项目文档
  *.md                # Markdown 文档
  style/              # UI 样式参考
    NotionStyle.vue   # Notion 风格组件参考模板
.roo/                 # Roo 配置
  rules/              # 项目规则
    rules.md          # 本文件
```
