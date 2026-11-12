<template>
  <div class="p-2 system-user-page">
    <!-- <el-row :gutter="20" class="content-grid"> -->
      <el-col :lg="treeCollapsed ? 23 : 19" :xs="24" class="tree-content-col content-main" :class="{ 'is-tree-collapsed': treeCollapsed }">
        <CrudSearch title="搜索" :model="queryParams" :search="handleQuery" :reset="resetQuery">
          <el-form-item label="用户名称" prop="userName">
            <el-input v-model="queryParams.userName" placeholder="请输入用户名称" clearable />
          </el-form-item>
          <el-form-item label="用户昵称" prop="nickName">
            <el-input v-model="queryParams.nickName" placeholder="请输入用户昵称" clearable />
          </el-form-item>
          <el-form-item label="手机号码" prop="phoneNumber">
            <el-input v-model="queryParams.phoneNumber" placeholder="请输入手机号码" clearable />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="用户状态" clearable>
              <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="创建时间" style="width: 308px">
            <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD HH:mm:ss" type="daterange" range-separator="-"
              start-placeholder="开始日期" end-placeholder="结束日期"
              :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"></el-date-picker>
          </el-form-item>
        </CrudSearch>

        <CrudTable v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :rows="userList"
          title="用户列表" 
          :loading="loading" 
          :total="total" 
          :description="`共 ${total} 条记录，支持部门筛选、状态切换、导入导出和角色分配。`"
          :columns="columns" 
          column-storage-key="sys_user_column_visible" 
          :edit-disabled="single" 
          :remove-disabled="multiple"
          :permission="userPermissions" 
          :show-row-actions="showUserRowActions" 
          :row-actions-width="180"
          @selection-change="handleSelectionChange"
          @pagination="getList" @add="handleAdd()" 
          @edit="handleUpdate()"
          @remove="handleDelete()" 
          @refresh="getList" 
          @row-edit="handleUpdate"
          @row-remove="handleDelete">
          <template #toolbar-actions>
            <el-button v-if="canEdit" type="warning" plain icon="Unlock" :disabled="single" @click="handleUnlock()">
              解锁
            </el-button>
          </template>
          <template #more-actions>
            <el-dropdown-item icon="Download" @click="importTemplate">下载模板</el-dropdown-item>
            <el-dropdown-item v-if="checkPermi([`${permissionPrefix}:import`])" icon="Top" @click="handleImport">导入数据</el-dropdown-item>
            <el-dropdown-item v-if="checkPermi([`${permissionPrefix}:export`])" icon="Download" @click="handleExport">导出数据</el-dropdown-item>
          </template>
          <template #row-actions="{ row }">
            <el-tooltip v-if="checkPermi([`${permissionPrefix}:resetPwd`])" content="重置密码" placement="top">
              <el-button link type="primary" icon="Key" @click="handleResetPwd(row)" />
            </el-tooltip>
            <el-tooltip v-if="canEdit" content="分配角色" placement="top">
              <el-button link type="primary" icon="CircleCheck" @click="handleAuthRole(row)" />
            </el-tooltip>
          </template>
          <template #default>
            <el-table-column type="selection" width="50" align="center" />
            <el-table-column v-if="columns[0].visible" key="userId" label="用户编号" align="center" prop="userId" />
            <el-table-column v-if="columns[1].visible" key="userName" label="用户名称" align="center" :show-overflow-tooltip="true">
              <template #default="scope">
                <el-link type="primary" underline="never" @click="handleViewDetail(scope.row)">{{ scope.row.userName }}</el-link>
              </template>
            </el-table-column>
            <el-table-column v-if="columns[2].visible" key="nickName" label="用户昵称" align="center" prop="nickName" :show-overflow-tooltip="true" />
            <el-table-column v-if="columns[3].visible" key="deptName" label="部门" align="center" prop="deptName" :show-overflow-tooltip="true" />
            <el-table-column v-if="columns[4].visible" key="phoneNumber" label="手机号码" align="center" prop="phoneNumber" width="120" />
            <el-table-column v-if="columns[5].visible" key="status" label="状态" align="center">
              <template #default="scope">
                <el-switch v-model="scope.row.status" active-value="0" inactive-value="1"
                  @change="handleStatusChange(scope.row)"></el-switch>
              </template>
            </el-table-column>
            <el-table-column v-if="columns[6].visible" label="创建时间" align="center" prop="createTime" width="160">
              <template #default="scope">
                <span>{{ scope.row.createTime }}</span>
              </template>
            </el-table-column>
          </template>
        </CrudTable>
      </el-col>
    <!-- </el-row> -->

    <CrudFormDialog
      ref="userFormDialogRef"
      :rules="userFormRules"
      :submit="saveUser"
      :submit-disabled="loadingPosts"
      @saved="getList"
    >
      <template #default="{ form }">
        <el-row>
          <el-col :span="12">
            <el-form-item label="用户昵称" prop="nickName">
              <el-input v-model="form.nickName" placeholder="请输入用户昵称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="!isEditingSelf(form)">
            <el-form-item label="归属部门" prop="deptId">
              <el-tree-select v-model="form.deptId" :data="enabledDeptOptions"
                :props="{ value: 'id', label: 'label', children: 'children' } as any" value-key="id"
                placeholder="请选择归属部门" check-strictly @change="handleDeptChange(form, $event)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phoneNumber">
              <el-input v-model="form.phoneNumber" placeholder="请输入手机号码" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item v-if="form.userId == null" label="用户名称" prop="userName">
              <el-input v-model="form.userName" placeholder="请输入用户名称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="form.userId == null" label="用户密码" prop="password">
              <el-input v-model="form.password" placeholder="请输入用户密码" type="password" maxlength="20" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="用户性别">
              <el-select v-model="form.gender" placeholder="请选择">
                <el-option v-for="dict in sys_user_gender" :key="dict.value" :label="dict.label"
                  :value="dict.value"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">
                  {{ dict.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12" v-if="!isEditingSelf(form)">
            <el-form-item label="岗位">
              <el-select v-model="form.postIds" multiple placeholder="请选择" :loading="loadingPosts" :disabled="loadingPosts">
                <el-option v-for="item in postOptions" :key="item.postId" :label="item.postName" :value="item.postId"
                  :disabled="item.status == '1'"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="!isEditingSelf(form)">
            <el-form-item label="角色" prop="roleIds">
              <el-select v-model="form.roleIds" filterable multiple placeholder="请选择">
                <el-option v-for="item in roleOptions" :key="item.roleId" :label="item.roleName" :value="item.roleId"
                  :disabled="item.status == '1'"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </CrudFormDialog>

    <!-- 用户导入对话框 -->
    <el-dialog v-model="upload.open" :title="upload.title" width="400px" append-to-body>
      <el-upload ref="uploadRef" :limit="1" accept=".xlsx, .xls" :headers="upload.headers"
        :action="upload.url + '?updateSupport=' + upload.updateSupport" :disabled="upload.isUploading"
        :on-progress="handleFileUploadProgress" :on-success="handleFileSuccess" :auto-upload="false" drag>
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或
          <em>点击上传</em>
        </div>
        <template #tip>
          <div class="text-center el-upload__tip">
            <div class="el-upload__tip">
              <el-checkbox v-model="upload.updateSupport" />
              是否更新已经存在的用户数据
            </div>
            <span>仅允许导入xls、xlsx格式文件。</span>
            <el-link type="primary" underline="never" style="font-size: 12px; vertical-align: baseline"
              @click="importTemplate">
              下载模板
            </el-link>
          </div>
        </template>
      </el-upload>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitFileForm">确 定</el-button>
          <el-button @click="upload.open = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 用户详情抽屉 -->
    <user-view-drawer ref="userViewRef" />
  </div>
</template>

<script setup name="User" lang="ts">
import { to } from 'await-to-js';
import { useTemplateRef } from 'vue';
import type { FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import { getConfigKey } from '@/api/system/config';
import { DeptTreeVO, DeptVO } from '@/api/system/dept/types';
import { optionselect } from '@/api/system/post';
import type { PostVO } from '@/api/system/post/types';
import type { RoleVO } from '@/api/system/role/types';
import api from '@/api/system/user';
import type { UserForm, UserQuery, UserVO } from '@/api/system/user/types';
import TreePanel from '@/components/TreePanel/index.vue';
import { useLoading } from '@/hooks/async/useLoading';
import { useDateRangeQuery } from '@/hooks/form/useDateRangeQuery';
import { useTableSelection } from '@/hooks/table/useTableSelection';
import { useTreeCollapsed } from '@/hooks/tree/useTreeCollapsed';
import modal from '@/plugins/modal';
import { useUserStore } from '@/store/modules/user';
import { checkPermi } from '@/utils/permission';
import { useDict } from '@/utils/dict';
import { globalHeaders } from '@/utils/request';
import { download as requestDownload } from '@/utils/request';
import UserViewDrawer from './view.vue';
import CrudFormDialog from './components/CrudFormDialog.vue';
import CrudSearch from './components/CrudSearch.vue';
import CrudTable from './components/CrudTable.vue';

const router = useRouter();
const userStore = useUserStore();
const permissionPrefix = 'system:user';
const userPermissions = {
  add: 'system:user:add',
  edit: 'system:user:edit',
  remove: 'system:user:remove'
};
const canEdit = computed(() => checkPermi([userPermissions.edit]));
const { sys_normal_disable, sys_user_gender } = toRefs<any>(useDict('sys_normal_disable', 'sys_user_gender'));
const userList = ref<UserVO[]>();
const { loading, withLoading } = useLoading(true);
const total = ref(0);
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();
const { treeCollapsed } = useTreeCollapsed();
const deptOptions = ref<DeptTreeVO[]>([]);
const enabledDeptOptions = ref<DeptTreeVO[]>([]);
const initPassword = ref<string>('');
/*** 用户导入参数 */
const upload = reactive<ImportOption>({
  // 是否显示弹出层（用户导入）
  open: false,
  // 弹出层标题（用户导入）
  title: '',
  // 是否禁用上传
  isUploading: false,
  // 是否更新已经存在的用户数据
  updateSupport: 0,
  // 设置上传的请求头部
  headers: globalHeaders(),
  // 上传的地址
  url: import.meta.env.VITE_APP_BASE_API + '/system/user/importData'
});
// 列显隐信息
const columns = ref<FieldOption[]>([
  { key: 0, label: `用户编号`, visible: false, children: [] },
  { key: 1, label: `用户名称`, visible: true, children: [] },
  { key: 2, label: `用户昵称`, visible: true, children: [] },
  { key: 3, label: `部门`, visible: true, children: [] },
  { key: 4, label: `手机号码`, visible: true, children: [] },
  { key: 5, label: `状态`, visible: true, children: [] },
  { key: 6, label: `创建时间`, visible: true, children: [] }
]);

const treePanelRef = ref<InstanceType<typeof TreePanel>>();
const userFormDialogRef = useTemplateRef('userFormDialogRef');
const uploadRef = ref<ElUploadInstance>();
const userViewRef = ref<InstanceType<typeof UserViewDrawer>>();

const queryParams = ref<UserQuery>({
  pageNum: 1,
  pageSize: 10,
  userName: '',
  phoneNumber: '',
  status: '',
  deptId: '',
  roleId: ''
});
const { ids, single, multiple, handleSelectionChange } = useTableSelection<UserVO>(item => item.userId);

/** 查询用户列表 */
const getList = async () => {
  await withLoading(async () => {
    const res = await api.listUser(applyDateRange(queryParams.value));
    userList.value = res.data?.rows;
    total.value = res.data?.total;
  });
};

/** 查询部门下拉树结构 */
const getDeptTree = async () => {
  const res = await api.deptTreeSelect();
  deptOptions.value = res.data;
  enabledDeptOptions.value = filterDisabledDept(res.data);
};

/** 过滤禁用的部门，并返回独立的新树，避免污染左侧完整部门树 */
const filterDisabledDept = (deptList: DeptTreeVO[]): DeptTreeVO[] => {
  return deptList.reduce<DeptTreeVO[]>((result, dept) => {
    if (dept.disabled) {
      return result;
    }
    result.push({
      ...dept,
      children: dept.children?.length ? filterDisabledDept(dept.children) : []
    });
    return result;
  }, []);
};

/** 节点单击事件 */
const handleNodeClick = (data: DeptVO) => {
  queryParams.value.deptId = data.id;
  handleQuery();
};

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  return getList();
};

const resetQuery = () => {
  resetDateRange();
  queryParams.value.deptId = undefined;
  treePanelRef.value?.setCurrentKey(undefined);
  return handleQuery();
};

/** 删除按钮操作 */
const handleDelete = async (row?: Partial<UserVO>) => {
  const userIds = row?.userId || ids.value;
  const [err] = await to(modal.confirm('是否确认删除用户编号为"' + userIds + '"的数据项？') as any);
  if (!err) {
    await api.delUser(userIds);
    await getList();
    modal.msgSuccess('删除成功');
  }
};

/** 解锁按钮操作 */
const handleUnlock = async () => {
  const userId = ids.value[0];
  const [err] = await to(modal.confirm('是否确认解锁用户编号为"' + userId + '"的数据项?') as any);
  if (!err) {
    await api.unlockUser(userId);
    modal.msgSuccess('用户编号"' + userId + '"解锁成功');
  }
};

/** 用户状态修改  */
const handleStatusChange = async (row: Partial<UserVO>) => {
  const text = row.status === '0' ? '启用' : '停用';
  try {
    await modal.confirm('确认要"' + text + '""' + row.userName + '"用户吗?');
    await api.changeUserStatus(row.userId, row.status);
    modal.msgSuccess(text + '成功');
  } catch (err) {
    row.status = row.status === '0' ? '1' : '0';
  }
};
/** 跳转角色分配 */
const handleAuthRole = (row: Partial<UserVO>) => {
  const userId = row.userId;
  router.push('/system/user-auth/role/' + userId);
};

/** 重置密码按钮操作 */
const handleResetPwd = async (row: Partial<UserVO>) => {
  const [err, res] = await to(
    ElMessageBox.prompt('请输入"' + row.userName + '"的新密码', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      closeOnClickModal: false,
      inputPattern: /^.{5,20}$/,
      inputErrorMessage: '用户密码长度必须介于 5 和 20 之间',
      inputValidator: value => {
        if (/<|>|"|'|\||\\/.test(value)) {
          return '不能包含非法字符：< > " \' \\ |';
        }
      }
    })
  );
  if (!err && res) {
    await api.resetUserPwd(row.userId, res.value);
    modal.msgSuccess('修改成功，新密码是：' + res.value);
  }
};

const showUserRowActions = (row: UserVO) => String(row.userId) !== '1761100000000000001';

/** 详情按钮操作 */
const handleViewDetail = (row: Partial<UserVO>) => {
  userViewRef.value?.openDrawer(row.userId);
};

/** 导入按钮操作 */
const handleImport = () => {
  upload.title = '用户导入';
  upload.open = true;
};
/** 导出按钮操作 */
const handleExport = () => {
  requestDownload(
    'system/user/export',
    {
      ...queryParams.value
    },
    `user_${new Date().getTime()}.xlsx`
  );
};
/** 下载模板操作 */
const importTemplate = () => {
  requestDownload('system/user/importTemplate', {}, `user_template_${new Date().getTime()}.xlsx`);
};

/**文件上传中处理 */
const handleFileUploadProgress = () => {
  upload.isUploading = true;
};

const formatImportResultMessage = (message: unknown) => {
  return String(message ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '');
};

/** 文件上传成功处理 */
const handleFileSuccess = (response: any, file: UploadFile) => {
  upload.open = false;
  upload.isUploading = false;
  uploadRef.value?.handleRemove(file);
  ElMessageBox.alert(formatImportResultMessage(response.msg), '导入结果', {
    customClass: 'import-result-box'
  });
  getList();
};

/** 提交上传文件 */
function submitFileForm() {
  uploadRef.value?.submit();
}

const initFormData: UserForm = {
  userId: undefined,
  deptId: undefined,
  userName: '',
  nickName: undefined,
  password: '',
  phoneNumber: undefined,
  email: undefined,
  gender: undefined,
  status: '0',
  remark: '',
  postIds: [],
  roleIds: []
};
const userFormRules: FormRules<UserForm> = {
  userName: [
    { required: true, message: '用户名称不能为空', trigger: 'blur' },
    {
      min: 2,
      max: 20,
      message: '用户名称长度必须介于 2 和 20 之间',
      trigger: 'blur'
    }
  ],
  nickName: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }],
  password: [
    { required: true, message: '用户密码不能为空', trigger: 'blur' },
    {
      min: 5,
      max: 20,
      message: '用户密码长度必须介于 5 和 20 之间',
      trigger: 'blur'
    },
    {
      pattern: /^[^<>"'|\\]+$/,
      message: '不能包含非法字符：< > " \' \\ |',
      trigger: 'blur'
    }
  ],
  email: [
    {
      type: 'email',
      message: '请输入正确的邮箱地址',
      trigger: ['blur', 'change']
    }
  ],
  phoneNumber: [
    {
      pattern: /^1[3456789][0-9]\d{8}$/,
      message: '请输入正确的手机号码',
      trigger: 'blur'
    }
  ],
  roleIds: [{ required: true, message: '用户角色不能为空', trigger: 'blur' }]
};
const postOptions = ref<PostVO[]>([]);
const roleOptions = ref<RoleVO[]>([]);
const loadingPosts = ref(false);
let postRequest = 0;
let postsDeptId: UserForm['deptId'];

function isEditingSelf(form: UserForm) {
  return form.userId != null && form.userId == userStore.userId;
}

async function loadUserForm(userId?: UserVO['userId']): Promise<UserForm> {
  const { data } = await api.getUser(userId);
  postRequest++;
  loadingPosts.value = false;
  const form: UserForm = { ...initFormData, postIds: [], roleIds: [] };
  postOptions.value = data.posts;
  roleOptions.value = data.roles;

  if (userId == null) {
    form.password = initPassword.value;
  } else {
    Object.assign(form, data.user, { postIds: data.postIds, roleIds: data.roleIds, password: '' });
    roleOptions.value = Array.from(
      new Map([...data.roles, ...(data.user.roles ?? [])].map(role => [role.roleId, role])).values()
    );
  }

  postsDeptId = form.deptId;
  return form;
}

async function handleDeptChange(form: UserForm, deptId: number | string) {
  const request = ++postRequest;
  loadingPosts.value = true;
  try {
    const { data } = await optionselect(deptId);
    if (request === postRequest) {
      postOptions.value = data;
      form.postIds = [];
      postsDeptId = form.deptId;
    }
  } catch (error) {
    if (request === postRequest) form.deptId = postsDeptId;
    throw error;
  } finally {
    if (request === postRequest) loadingPosts.value = false;
  }
}

async function saveUser(form: UserForm) {
  if (form.userId == null) {
    await api.addUser(form);
  } else {
    const payload = isEditingSelf(form) ? { ...form, deptId: null, postIds: null, roleIds: null } : form;
    await api.updateUser(payload);
  }
  modal.msgSuccess('操作成功');
}

const handleAdd = () => userFormDialogRef.value?.open('新增用户', () => loadUserForm());

const handleUpdate = (row?: Pick<UserVO, 'userId'>) => {
  const userId = row?.userId ?? ids.value[0];
  if (userId != null) return userFormDialogRef.value?.open('修改用户', () => loadUserForm(userId));
};

onMounted(() => {
  getDeptTree(); // 初始化部门数据
  getList(); // 初始化列表数据
  getConfigKey('sys.user.initPassword').then(response => {
    initPassword.value = response.data;
  });
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/components/page-shell' as pageShell;

@include pageShell.tree-table-crud-page;

:global(.import-result-box .el-message-box__message) {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 20px 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
