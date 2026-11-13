<template>
  <el-card shadow="hover" class="table-panel">
    <template v-if="showToolbar" #header>
      <div class="toolbar-shell">
        <div v-if="title || description" class="table-heading">
          <h3 v-if="title">{{ title }}</h3>
          <p v-if="description">{{ description }}</p>
        </div>
        <div class="toolbar-actions">
          <el-button v-if="canAdd" type="primary" plain icon="Plus" @click="emit('add')">
            新增
          </el-button>
          <el-button v-if="canEdit" type="success" plain :disabled="editDisabled" icon="Edit"
            @click="emit('edit')">
            修改
          </el-button>
          <el-button v-if="canRemove" type="danger" plain :disabled="removeDisabled" icon="Delete"
            @click="emit('remove')">
            删除
          </el-button>
          <slot name="toolbar-actions" />
          <el-dropdown v-if="$slots['more-actions']" class="mt-[1px]">
            <el-button plain type="info">
              更多
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <slot name="more-actions" />
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <RightToolbar
            :columns="columns"
            :search="false"
            :storage-key="columnStorageKey"
            @query-table="emit('refresh')"
          />
        </div>
      </div>
    </template>

    <el-table v-loading="loading" border class="data-table" :data="rows" @selection-change="emit('selection-change', $event)">
      <slot></slot>
      <el-table-column v-if="canEdit || canRemove || $slots['row-actions']" label="操作" fixed="right" :width="rowActionsWidth" class-name="small-padding fixed-width">
        <template #default="{ row }">
          <template v-if="!showRowActions || showRowActions(row as Row)">
            <el-tooltip v-if="canEdit" content="修改" placement="top">
              <el-button link type="primary" icon="Edit" @click="emit('row-edit', row as Row)"></el-button>
            </el-tooltip>
            <el-tooltip v-if="canRemove" content="删除" placement="top">
              <el-button link type="primary" icon="Delete" @click="emit('row-remove', row as Row)"></el-button>
            </el-tooltip>

            <slot name="row-actions" :row="row as Row" />
          </template>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      v-show="total > 0"
      v-model:page="page"
      v-model:limit="limit"
      :total="total"
      @pagination="emit('pagination', $event)"
    />
  </el-card>
</template>

<script setup lang="ts" generic="Row extends object">
import { computed } from 'vue';
import Pagination from '@/components/Pagination/index.vue';
import RightToolbar from '@/components/RightToolbar/index.vue';
import { checkPermi } from '@/utils/permission';

type CrudAction = 'add' | 'edit' | 'remove';

const props = withDefaults(
  defineProps<{
    rows?: Row[];
    loading: boolean;
    total: number;
    showToolbar?: boolean;
    showRowActions?: (row: Row) => boolean;
    title?: string;
    description?: string;
    columns?: FieldOption[];
    columnStorageKey?: string;
    permission?: string | Partial<Record<CrudAction, string>>;
    rowActionsWidth?: number;
    editDisabled?: boolean;
    removeDisabled?: boolean;
  }>(),
  { showToolbar: true, editDisabled: true, removeDisabled: true, rowActionsWidth: 120 }
);

function hasActionPermission(action: CrudAction) {
  const permission = typeof props.permission === 'string' ? props.permission : props.permission?.[action];
  return !!permission && checkPermi([permission]);
}

const canAdd = computed(() => hasActionPermission('add'));
const canEdit = computed(() => hasActionPermission('edit'));
const canRemove = computed(() => hasActionPermission('remove'));

defineSlots<{
  default(): unknown;
  'toolbar-actions'(): unknown;
  'more-actions'(): unknown;
  'row-actions'(props: { row: Row }): unknown;
}>();

const page = defineModel<number>('page', { required: true });
const limit = defineModel<number>('limit', { required: true });

const emit = defineEmits<{
  'selection-change': [rows: Row[]];
  pagination: [pagination: { page: number; limit: number }];
  add: [];
  edit: [];
  remove: [];
  refresh: [];
  'row-edit': [row: Row];
  'row-remove': [row: Row];
}>();
</script>

<style lang="scss" scoped>
@use '@/assets/styles/components/page-shell' as pageShell;

@include pageShell.action-link-buttons;
@include pageShell.toolbar-responsive;
</style>
