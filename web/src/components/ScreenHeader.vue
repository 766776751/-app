<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  markIcon?: string
}>()
</script>

<template>
  <header class="screen-header">
    <div class="row">
      <div class="brand" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M148 96h170c14 0 26 12 26 26v268c0 8-6 12-12 8l-18-12-18 12-18-12-18 12-18-12-18 12-18-12-18 12-18-12-18 12c-6 4-12 0-12-8V122c0-14 12-26 26-26z" fill="#ffffff" stroke="#0f1f1a" stroke-width="14" stroke-linejoin="round"/>
          <path d="M180 150h110" stroke="#0d9488" stroke-width="18" stroke-linecap="round"/>
          <circle cx="356" cy="356" r="78" fill="#F0A04B" stroke="#0f1f1a" stroke-width="10"/>
          <text x="356" y="388" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="100" font-weight="700" fill="#0f1f1a">¥</text>
        </svg>
      </div>
      <div class="txt">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="trail"><slot name="trailing" /></div>
    </div>
  </header>
</template>

<style scoped>
.screen-header { margin-bottom: 14px; }
.row { display: flex; align-items: center; gap: 10px; }
.brand {
  width: 34px; height: 34px; border-radius: 12px;
  background: linear-gradient(145deg, #0f1f1a, #1a332c 55%, #0b1613);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15) inset; overflow: hidden;
}
.brand svg { width: 22px; height: 22px; }
.txt h1 { margin: 0; font-size: 20px; font-weight: 700; }
.txt p { margin: 2px 0 0; font-size: 10px; color: var(--muted); letter-spacing: 0.08em; padding-left: 44px; }
.trail { margin-left: auto; }
</style>
