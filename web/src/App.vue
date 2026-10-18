<script setup lang="ts">
import { RouterView } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
</script>

<template>
  <div class="app-shell">
    <RouterView v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
    <BottomNav />
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 80ms ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
