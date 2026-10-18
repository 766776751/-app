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
          <path d="M148 96h170c14 0 26 12 26 26v268c0 8-6 12-12 8l-18-12-18 12-18-12-18 12-18-12-18 12-18-12-18 12-18-12-18 12c-6 4-12 0-12-8V122c0-14 12-26 26-26z" fill="#F4FCFF" stroke="#0A1628" stroke-width="14" stroke-linejoin="round"/>
          <path d="M180 150h110" stroke="#38F0FF" stroke-width="18" stroke-linecap="round"/>
          <circle cx="356" cy="356" r="78" fill="#F0A04B" stroke="#0A1628" stroke-width="10"/>
          <text x="356" y="388" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="100" font-weight="700" fill="#0A1628">¥</text>
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
  background: linear-gradient(145deg, #0b1220, #0d1b2a 55%, #070c14);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 18px rgba(56, 240, 255, 0.25); overflow: hidden;
}
.brand svg { width: 22px; height: 22px; }
.txt h1 { margin: 0; font-size: 20px; font-weight: 700; }
.txt p { margin: 2px 0 0; font-size: 10px; color: var(--muted); letter-spacing: 0.08em; padding-left: 44px; }
.trail { margin-left: auto; }
</style>
