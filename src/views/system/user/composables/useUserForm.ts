import { onMounted, ref } from 'vue';
import type { FormRules } from 'element-plus';
import { getConfigKey } from '@/api/system/config';
import { optionselect } from '@/api/system/post';
import type { PostVO } from '@/api/system/post/types';
import type { RoleVO } from '@/api/system/role/types';
import api from '@/api/system/user';
import type { UserForm, UserVO } from '@/api/system/user/types';
import modal from '@/plugins/modal';
import { useUserStore } from '@/store/modules/user';

export function useUserForm() {
  const userStore = useUserStore();
  const initPassword = ref('');
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

  onMounted(async () => {
    const response = await getConfigKey('sys.user.initPassword');
    initPassword.value = response.data;
  });

  return { userFormRules, postOptions, roleOptions, loadingPosts, isEditingSelf, loadUserForm, handleDeptChange, saveUser };
}
