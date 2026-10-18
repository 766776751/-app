<script setup lang="ts">
import { computed, ref } from 'vue'
import { sanitizeNumericInput } from '@/utils/numeric'

const props = defineProps<{
  modelValue: string
  title: string
  /** 父级累加中：+ 按钮高亮 */
  plusActive?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [string]; close: [] }>()

const confirmClear = ref(false)

/** 默认空值，不显示 0，避免用户先清空一次 */
const display = computed(() => props.modelValue || '')

function press(d: string) {
  confirmClear.value = false
  emit('update:modelValue', sanitizeNumericInput(props.modelValue + d))
}

function backspace() {
  confirmClear.value = false
  if (props.modelValue) emit('update:modelValue', props.modelValue.slice(0, -1))
}

function clearAll() {
  if (props.modelValue && !confirmClear.value) {
    confirmClear.value = true
    return
  }
  confirmClear.value = false
  emit('update:modelValue', '')
}

function plus() {
  window.dispatchEvent(new CustomEvent('numeric-pad-plus'))
}
</script>

<template>
  <Teleport to="body">
    <div class="pad-backdrop" @click.self="emit('close')">
      <div class="pad-sheet" style="user-select: none; -webkit-user-select: none">
        <div class="pad-handle" />
        <div style="display: flex; align-items: center">
          <strong style="flex: 1; font-size: 14px">{{ title }}</strong>
          <button
            class="icon-chip"
            style="width: 32px; height: 32px; border: 0"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
        <div class="pad-display tabnum" :class="{ empty: !display }" style="user-select: none">
          <span v-if="!display" class="pad-placeholder">输入数字</span>
          <template v-else>{{ display }}</template>
        </div>
        <div class="pad-grid">
          <button
            v-for="k in ['1','2','3','4','5','6','7','8','9','.','0','⌫']"
            :key="k"
            class="pad-key"
            :class="{ soft: k === '⌫' || k === '.' }"
            @click="k === '⌫' ? backspace() : press(k)"
          >
            {{ k }}
          </button>
        </div>
        <div class="pad-actions">
          <button
            class="btn btn-secondary"
            :style="confirmClear ? 'color: var(--error); border-color: var(--error-border)' : ''"
            @click="clearAll"
          >
            {{ confirmClear ? '确认清空？' : '清空' }}
          </button>
          <button
            class="btn btn-secondary pad-plus"
            :class="{ active: plusActive }"
            @click="plus"
          >
            +
          </button>
          <button class="btn btn-primary" @click="emit('close')">完成</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pad-backdrop {
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.pad-sheet {
  max-height: 58dvh;
  overflow: auto;
  padding-bottom: calc(12px + var(--safe-bottom));
}
.pad-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--stroke-strong);
  margin: 0 auto 8px;
}
.pad-display.empty {
  border-color: var(--stroke-strong);
  color: var(--muted);
}
.pad-placeholder {
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font);
  opacity: 0.7;
}
.pad-plus.active {
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}
</style>
