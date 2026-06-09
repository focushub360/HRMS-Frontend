import api from './api';

export const tenantDirectoryService = {
  list: async () => {
    const response = await api.get('/super-admin/tenants/public');
    return response.data;
  },
};
