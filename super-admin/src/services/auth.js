import api from './api';

export const authService = {
  login: async (email, password) => {
    try {
      // console.log('Super Admin login attempt:', email);
      // Use a slightly longer timeout for login; retry once on timeout
      const config = { timeout: 30000 };
      try {
        const response = await api.post('/super-admin/login', { email, password }, config);
        // console.log('Super Admin login successful');
        return response.data;
      } catch (err) {
        // If timeout, retry once
        const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
        if (isTimeout) {
          console.warn('Super Admin login timed out, retrying once...');
          const retryResp = await api.post('/super-admin/login', { email, password }, config);
          // console.log('Super Admin login successful on retry');
          return retryResp.data;
        }
        // If there's no response object, it's likely a network/CORS error
        if (!err.response) {
          console.error('Super Admin login network/CORS error:', err);
          // Provide a clearer message for the UI
          const friendly = new Error('Network Error: Unable to reach backend. Confirm backend is running and CORS/API_BASE_URL are configured correctly.');
          // Attach original error for debugging
          friendly.originalError = err;
          throw friendly;
        }
        throw err;
      }
    } catch (error) {
      // Better logging for network vs application errors
      if (error && error.originalError) {
        console.error('Super Admin login error (friendly):', error.message, '\nOriginal:', error.originalError);
      } else {
        console.error('Super Admin login error:', error.response?.data || error.message || error);
      }
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/super-admin/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/super-admin/me');
      return response.data;
    } catch (error) {
      console.error('Get me error:', error);
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/super-admin/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },
};

export const tenantService = {
  getAll: async (page = 1, limit = 10, search = '', status = '', plan = '') => {
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (status) params.status = status;
      if (plan) params.plan = plan;

      const response = await api.get('/super-admin/tenants', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Get tenants error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/super-admin/tenants/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get tenant by ID error:', error);
      throw error;
    }
  },

  create: async (tenantData) => {
    try {
      const response = await api.post('/super-admin/tenants', tenantData);
      return response.data;
    } catch (error) {
      console.error('Create tenant error:', error);
      throw error;
    }
  },

  update: async (id, tenantData) => {
    try {
      const response = await api.put(`/super-admin/tenants/${id}`, tenantData);
      return response.data;
    } catch (error) {
      console.error('Update tenant error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/super-admin/tenants/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete tenant error:', error);
      throw error;
    }
  },

  createAdmin: async (tenantId, adminData) => {
    try {
      const response = await api.post(`/super-admin/tenants/${tenantId}/admins`, adminData);
      return response.data;
    } catch (error) {
      console.error('Create admin error:', error);
      throw error;
    }
  },

  getAdmins: async (tenantId) => {
    try {
      const response = await api.get(`/super-admin/tenants/${tenantId}/admins`);
      return response.data;
    } catch (error) {
      console.error('Get tenant admins error:', error);
      throw error;
    }
  },

  updateAdminAttendancePermission: async (tenantId, adminId, canEditAttendanceTime) => {
    try {
      const response = await api.put(
        `/super-admin/tenants/${tenantId}/admins/${adminId}/attendance-time-permission`,
        { canEditAttendanceTime }
      );
      return response.data;
    } catch (error) {
      console.error('Update admin attendance permission error:', error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const response = await api.get('/super-admin/stats/tenants');
      return response.data;
    } catch (error) {
      console.error('Get tenant stats error:', error);
      throw error;
    }
  }
};

const getSelectedTenantId = (tenantId) => {
  const value = tenantId || localStorage.getItem('selectedTenantId') || localStorage.getItem('tenantId');
  if (!value || value === 'null' || value === 'undefined') {
    return undefined;
  }
  return value;
};

export const locationService = {
  getAll: async (tenantId) => {
    try {
      const selectedTenantId = getSelectedTenantId(tenantId);
      const response = await api.get('/super-admin/locations', { params: { tenantId: selectedTenantId } });
      return response.data.data || [];
    } catch (error) {
      console.error('Get locations error:', error);
      throw error;
    }
  },

  getById: async (id, tenantId) => {
    try {
      const selectedTenantId = getSelectedTenantId(tenantId);
      const response = await api.get(`/super-admin/locations/${id}`, { params: { tenantId: selectedTenantId } });
      return response.data.data;
    } catch (error) {
      console.error('Get location by ID error:', error);
      throw error;
    }
  },

  create: async (locationData, tenantId) => {
    try {
      const selectedTenantId = getSelectedTenantId(tenantId);
      const response = await api.post('/super-admin/locations', { ...locationData, tenantId: selectedTenantId });
      return response.data.data;
    } catch (error) {
      console.error('Create location error:', error);
      throw error;
    }
  },

  update: async (id, locationData, tenantId) => {
    try {
      const selectedTenantId = getSelectedTenantId(tenantId);
      const response = await api.put(`/super-admin/locations/${id}`, { ...locationData, tenantId: selectedTenantId });
      return response.data.data;
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  },

  delete: async (id, tenantId) => {
    try {
      const selectedTenantId = getSelectedTenantId(tenantId);
      const response = await api.delete(`/super-admin/locations/${id}`, { params: { tenantId: selectedTenantId } });
      return response.data;
    } catch (error) {
      console.error('Delete location error:', error);
      throw error;
    }
  }
};
