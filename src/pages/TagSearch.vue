<script setup>
import { useI18n } from 'vue-i18n'
import SearchBase from '@/components/SearchBase.vue'
const { t } = useI18n()
</script>
<template>
  <SearchBase type="tags" :title="t('library.tags')" icon="lucide:tags" />
</template>
