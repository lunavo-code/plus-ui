<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="400px"
    append-to-body
    destroy-on-close
    :show-close="!uploading"
    :close-on-click-modal="!uploading"
    :close-on-press-escape="!uploading"
  >
    <el-upload
      v-model:file-list="files"
      :limit="1"
      accept=".xlsx,.xls"
      :disabled="uploading"
      :auto-upload="false"
      :on-exceed="handleExceed"
      drag
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
      <template #tip>
        <div class="text-center el-upload__tip">
          <div v-if="allowOverwrite">
            <el-checkbox v-model="overwrite" :disabled="uploading">更新已存在的数据</el-checkbox>
          </div>
          <span>支持 .xls、.xlsx 文件。</span>
          <el-link v-if="downloadTemplate" type="primary" underline="never" @click="downloadTemplate()">下载模板</el-link>
        </div>
      </template>
    </el-upload>
    <template #footer>
      <el-button type="primary" :loading="uploading" :disabled="!readyFile" @click="submit">确 定</el-button>
      <el-button :disabled="uploading" @click="visible = false">取 消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import type { UploadUserFile } from 'element-plus';
import modal from '@/plugins/modal';

type ImportResult = {
  success: boolean;
  message: string;
};

const props = withDefaults(defineProps<{
  title?: string;
  allowOverwrite?: boolean;
  downloadTemplate?: () => void | Promise<void>;
  upload: (file: File, options: { overwrite: boolean }) => Promise<ImportResult>;
}>(), { title: '导入数据' });
const emit = defineEmits<{ completed: [result: ImportResult] }>();

const visible = ref(false);
const uploading = ref(false);
const overwrite = ref(false);
const files = ref<UploadUserFile[]>([]);
const readyFile = computed(() => files.value.find(file => file.status === 'ready'));

function open() {
  if (visible.value || uploading.value) return;

  files.value = [];
  overwrite.value = false;
  visible.value = true;
}

async function submit() {
  const file = readyFile.value?.raw;
  if (!file || uploading.value) return;

  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    modal.msgError('请选择 .xls 或 .xlsx 文件');
    return;
  }

  uploading.value = true;
  try {
    const result = await props.upload(file, { overwrite: overwrite.value });
    files.value = [];
    if (result.success) visible.value = false;
    void ElMessageBox.alert(result.message, '导入结果', {
      customClass: 'import-result-box',
      dangerouslyUseHTMLString: false
    }).catch(() => undefined);
    emit('completed', result);
  } catch {
    modal.msgError('上传失败，请重试');
  } finally {
    uploading.value = false;
  }
}

function handleExceed() {
  modal.msgWarning('一次只能导入一个文件，请先移除已选文件');
}

defineExpose({ open });
</script>

<style scoped>
:global(.import-result-box .el-message-box__message) {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 20px 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
