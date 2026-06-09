<script setup>
import { useI18n } from 'vue-i18n'
import SearchBase from '@/components/SearchBase.vue'
const { t } = useI18n()
</script>
<template>
  <SearchBase type="staff" :title="t('library.staff')" icon="lucide:users" />
</template>
