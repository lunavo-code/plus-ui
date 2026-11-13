import { HttpStatus } from '@/enums/RespEnum';
import { download as requestDownload, globalHeaders } from '@/utils/request';

const userImportAction = import.meta.env.VITE_APP_BASE_API + '/system/user/importData';

export function useUserImport() {
  async function uploadUsers(file: File, { overwrite }: { overwrite: boolean }) {
    const payload = new FormData();
    payload.append('file', file);
    const params = new URLSearchParams({ updateSupport: String(overwrite) });
    const response = await fetch(`${userImportAction}?${params}`, {
      method: 'POST',
      headers: globalHeaders(),
      body: payload
    });
    if (!response.ok) throw new Error(`Import request failed (${response.status})`);

    const data: { code?: number; msg?: string } | null = await response.json();
    const success = data?.code === HttpStatus.SUCCESS;
    const message = (data?.msg || (success ? '导入成功' : '导入未成功，请检查文件后重试'))
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/<[^>]+>/g, '');
    return { success, message };
  }

  /** 下载模板操作 */
  const importTemplate = () => {
    requestDownload('system/user/importTemplate', {}, `user_template_${new Date().getTime()}.xlsx`);
  };

  return { uploadUsers, importTemplate };
}
