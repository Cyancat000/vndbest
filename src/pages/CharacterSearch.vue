<script setup>
import { useI18n } from 'vue-i18n'
import SearchBase from '@/components/SearchBase.vue'
const { t } = useI18n()
</script>
<template>
  <SearchBase type="characters" :title="t('library.characters')" icon="lucide:user-circle" />
</template>
