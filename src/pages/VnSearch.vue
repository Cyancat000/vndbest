<script setup>
import { useI18n } from 'vue-i18n'
import SearchBase from '@/components/SearchBase.vue'
const { t } = useI18n()
</script>
<template>
  <SearchBase type="vn" :title="t('library.vn')" icon="lucide:file-text" />
</template>
