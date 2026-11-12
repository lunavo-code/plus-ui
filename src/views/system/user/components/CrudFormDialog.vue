<template>
  <el-dialog
    v-model="dialog.visible"
    :title="dialog.title"
    :width="width"
    append-to-body
    destroy-on-close
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
  >
    <el-form v-if="form" ref="formRef" :model="form" :rules="rules" :disabled="saving" :label-width="labelWidth">
      <slot :form="form" />
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" :loading="saving" :disabled="submitDisabled" @click="submitForm">确 定</el-button>
        <el-button :disabled="saving" @click="closeDialog">取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" generic="Form extends object">
import type { FormInstance, FormRules } from 'element-plus';
import { useLoading } from '@/hooks/async/useLoading';
import { useDialogState } from '@/hooks/dialog/useDialogState';

const props = withDefaults(
  defineProps<{
    rules?: FormRules<Form>;
    width?: string | number;
    labelWidth?: string | number;
    submitDisabled?: boolean;
    submit: (form: Form) => Promise<void>;
  }>(),
  { width: '600px', labelWidth: '80px' }
);
const emit = defineEmits<{ saved: [] }>();
defineSlots<{ default(props: { form: Form }): unknown }>();

const { dialog, openDialog, closeDialog } = useDialogState();
const { loading: opening, withLoading: withOpening } = useLoading();
const { loading: saving, withLoading: withSaving } = useLoading();
const formRef = ref<FormInstance>();
const form = shallowRef<Form>();

async function open(title: string, load: () => Promise<Form>) {
  if (opening.value || saving.value || dialog.visible) return;

  await withOpening(async () => {
    form.value = reactive(await load()) as Form;
    openDialog(title);
  });
}

async function submitForm() {
  const currentForm = form.value;
  const formInstance = formRef.value;
  if (!currentForm || !formInstance || saving.value || props.submitDisabled) return;

  await withSaving(async () => {
    const valid = await formInstance.validate().catch(() => false);
    if (!valid || props.submitDisabled) return;

    await props.submit(currentForm);
    closeDialog();
    emit('saved');
  });
}

defineExpose({ open });
</script>
