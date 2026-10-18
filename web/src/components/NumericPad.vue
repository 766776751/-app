<script setup lang="ts">
import { computed, ref } from 'vue'
import { sanitizeNumericInput } from '@/utils/numeric'

const props = defineProps<{
  modelValue: string
  title: string
  hint?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string]; close: [] }>()

const confirmClear = ref(false)

const display = computed(() => {
  const v = props.modelValue
  return v || props.hint || '0'
})

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
        <div style="display: flex; align-items: center">
          <strong style="flex: 1">{{ title }}</strong>
          <button
            class="icon-chip"
            style="width: 36px; height: 36px; border: 0"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
        <div class="pad-display tabnum" style="user-select: none">{{ display }}</div>
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
            class="btn btn-secondary"
            style="color: var(--tertiary); background: var(--tertiary-soft); border: 0"
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
