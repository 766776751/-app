<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useDestinationStore } from '@/stores/destination'

const store = useDestinationStore()
const name = ref('')
const distance = ref('')
const purpose = ref('')
const search = ref('')
const toast = ref('')

onMounted(() => store.load())

async function save() {
  const dist = Number(distance.value)
  if (!name.value.trim() || Number.isNaN(dist) || dist < 0) {
    toast.value = '请填写名称与有效距离'
    return
  }
  await store.add({ name: name.value, distance: dist, purpose: purpose.value })
  toast.value = '已保存'
  name.value = ''
  distance.value = ''
  purpose.value = ''
}

async function remove(id?: number) {
  if (id == null) return
  if (!confirm('删除该目的地？')) return
  await store.remove(id)
  toast.value = '已删除'
}

function filtered() {
  const kw = search.value.trim()
  if (!kw) return store.list
  return store.list.filter((d) => d.name.includes(kw) || d.purpose.includes(kw))
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="常用目的地" subtitle="添加行程时可快速联想 · 最多 50 条" mark="地" />

    <section class="glass-card">
      <h2 class="section-title">添加目的地</h2>
      <div class="field">
        <label>名称</label>
        <input v-model="name" class="field-box" placeholder="如：客户现场 / 公司" />
      </div>
      <div class="btn-row">
        <div class="field" style="flex: 1; margin: 0">
          <label>距离 (km)</label>
          <input v-model="distance" type="number" step="0.1" class="field-box" />
        </div>
        <div class="field" style="flex: 1; margin: 0">
          <label>常用事由</label>
          <input v-model="purpose" class="field-box" placeholder="拜访/开会" />
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" style="flex: 1" @click="save">添加</button>
      </div>
      <div v-if="toast" class="toast" style="position: static; transform: none; margin-top: 8px">{{ toast }}</div>
    </section>

    <section class="glass-card">
      <h2 class="section-title">目的地列表</h2>
      <div class="field">
        <label>搜索</label>
        <input v-model="search" class="field-box" placeholder="搜索目的地" />
      </div>
      <div v-if="!filtered().length" class="empty">
        <div class="icon-chip">地</div>
        <h3>暂无常用目的地</h3>
        <p style="color: var(--muted); font-size: 13px">先在上方添加，之后行程页可快速填充</p>
      </div>
      <div v-for="d in filtered()" :key="d.id" class="list-item">
        <div class="icon-chip">地</div>
        <div class="l">
          <b>{{ d.name }}</b>
          <small>{{ d.distance }} km · {{ d.purpose || '—' }} · 用过 {{ d.usageCount }} 次</small>
        </div>
        <div class="r">
          <button
            class="btn btn-secondary"
            style="min-height: 32px; font-size: 12px; padding: 0 10px"
            @click="remove(d.id)"
          >
            删除
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
