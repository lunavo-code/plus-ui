<template>
  <div class="search-wrap">
    <el-card shadow="hover" class="search-panel" :class="{ 'is-collapsed': !expanded }">
      <template #header>
        <h3 class="search-title">
          <button
            type="button"
            class="panel-heading search-panel-toggle"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
          >
            {{ title }}
          </button>
        </h3>
      </template>

      <el-form ref="formRef" :model="model" inline class="query-form" @submit.prevent="search()">
        <slot />
        <el-form-item>
          <el-button type="primary" icon="Search" native-type="submit">搜索</el-button>
          <el-button icon="Refresh" native-type="button" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FormInstance, FormProps } from 'element-plus';

const props = withDefaults(
  defineProps<{
    title?: string;
    model?: FormProps['model'];
    search: () => void | Promise<void>;
    reset?: () => void | Promise<void>;
  }>(),
  { title: '筛选条件' }
);

const expanded = ref(true);
const formRef = ref<FormInstance>();

function handleReset() {
  if (props.model) formRef.value?.resetFields();
  return props.reset?.();
}
</script>

<style scoped>
.search-title {
  margin: 0;
  font-size: 15px;
}

.search-title button {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
}

.search-panel.is-collapsed .query-form {
  visibility: hidden;
}
</style>
