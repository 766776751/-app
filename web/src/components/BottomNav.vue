<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { IconName } from '@/utils/icons'

const items: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '首页', icon: 'home' },
  { to: '/trip/add', label: '行程', icon: 'car' },
  { to: '/expense', label: '报销', icon: 'wallet' },
  { to: '/settings', label: '设置', icon: 'settings' },
]
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to">
      <span class="nav-ico">
        <AppIcon :name="item.icon" :size="22" />
      </span>
      <span class="nav-label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
