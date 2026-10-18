<script setup lang="ts">
import { computed } from 'vue'
import { iconPath, type IconName } from '@/utils/icons'

const props = defineProps<{
  name: IconName
  size?: number
  stroke?: number
}>()

const d = computed(() => iconPath(props.name))
const box = computed(() => props.size ?? 22)
</script>

<template>
  <svg
    :width="box"
    :height="box"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="stroke ?? 1.75"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>
