import api from './api';

export const authService = {
  login: async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login successful');
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get me error:', error);
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  changeEmployeePassword: async (userId, newPassword) => {
    try {
      const response = await api.put(`/auth/change-employee-password/${userId}`, {
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Change employee password error:', error);
      throw error;
    }
  },

  resetEmployeePassword: async (userId) => {
    try {
      const response = await api.post(`/auth/reset-employee-password/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Reset employee password error:', error);
      throw error;
    }
  },
};

export const employeeService = {
  getAll: async () => {
    try {
      const response = await api.get('/employees');
      return response.data;
    } catch (error) {
      console.error('Get employees error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get employee by ID error:', error);
      throw error;
    }
  },

  getWithUser: async (id) => {
    try {
      const response = await api.get(`/employees/${id}?populate=user`);
      return response.data;
    } catch (error) {
      console.error('Get employee with user error:', error);
      throw error;
    }
  },

  create: async (employeeData) => {
    try {
      // Clean the data before sending
      const cleanData = cleanEmployeeData(employeeData);
      console.log('Creating employee with data:', cleanData);
      
      const response = await api.post('/employees', cleanData);
      console.log('Employee created successfully');
      return response.data;
    } catch (error) {
      console.error('Create employee error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  update: async (id, employeeData) => {
    try {
      // Clean the data before sending
      const cleanData = cleanEmployeeData(employeeData);
      console.log('Updating employee:', id, 'with data:', cleanData);
      
      const response = await api.put(`/employees/${id}`, cleanData);
      console.log('Employee updated successfully');
      return response.data;
    } catch (error) {
      console.error('Update employee error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  updateProfile: async (employeeData) => {
    try {
      const cleanData = cleanEmployeeData(employeeData);
      console.log('Updating profile with data:', cleanData);
      
      const response = await api.put('/employees/profile/me', cleanData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      console.log('Deleting employee with ID:', id);
      const response = await api.delete(`/employees/${id}`);
      console.log('✅ Delete response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Delete error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Helper function to clean employee data before sending
const cleanEmployeeData = (data) => {
  if (!data) return {};
  
  const cleaned = { ...data };
  
  // Remove any undefined, null, or empty string values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
      delete cleaned[key];
    }
  });
  
  // Ensure numbers are properly formatted
  if (cleaned.salary) {
    cleaned.salary = parseFloat(cleaned.salary);
  }
  
  // Clean address object
  if (cleaned.address && typeof cleaned.address === 'object') {
    const address = { ...cleaned.address };
    Object.keys(address).forEach(key => {
      if (address[key] === undefined || address[key] === null || address[key] === '') {
        delete address[key];
      }
    });
    cleaned.address = Object.keys(address).length > 0 ? address : undefined;
  }
  
  // Remove empty password
  if (cleaned.password === '') {
    delete cleaned.password;
  }
  
  return cleaned;
};

export const attendanceService = {
  checkIn: async () => {
    try {
      const response = await api.post('/attendance/checkin');
      return response.data;
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  },

  checkOut: async () => {
    try {
      const response = await api.post('/attendance/checkout');
      return response.data;
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
    }
  },

  getMyAttendance: async (month, year) => {
    try {
      const response = await api.get('/attendance/my-attendance', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      console.error('Get my attendance error:', error);
      throw error;
    }
  },

  getAllAttendance: async (month, year, employeeId) => {
    try {
      const response = await api.get('/attendance', {
        params: { month, year, employeeId },
      });
      return response.data;
    } catch (error) {
      console.error('Get all attendance error:', error);
      throw error;
    }
  },

  getAttendanceSummary: async (month, year) => {
    try {
      const response = await api.get('/attendance/summary', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      console.error('Get attendance summary error:', error);
      throw error;
    }
  },
};

export const leaveService = {
  apply: async (leaveData) => {
    try {
      const response = await api.post('/leaves', leaveData);
      return response.data;
    } catch (error) {
      console.error('Apply leave error:', error);
      throw error;
    }
  },

  getMyLeaves: async () => {
    try {
      const response = await api.get('/leaves/my-leaves');
      return response.data;
    } catch (error) {
      console.error('Get my leaves error:', error);
      throw error;
    }
  },

  getAllLeaves: async (status) => {
    try {
      const response = await api.get('/leaves', {
        params: { status },
      });
      return response.data;
    } catch (error) {
      console.error('Get all leaves error:', error);
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.put(`/leaves/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update leave status error:', error);
      throw error;
    }
  },
};

export const payrollService = {
  getMyPayroll: async () => {
    try {
      const response = await api.get('/payroll/my-payroll');
      return response.data;
    } catch (error) {
      console.error('Get my payroll error:', error);
      throw error;
    }
  },

  getAllPayroll: async (month, year) => {
    try {
      const response = await api.get('/payroll', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      console.error('Get all payroll error:', error);
      throw error;
    }
  },

  generate: async (payrollData) => {
    try {
      const response = await api.post('/payroll/generate', payrollData);
      return response.data;
    } catch (error) {
      console.error('Generate payroll error:', error);
      throw error;
    }
  },

  updateStatus: async (id, statusData) => {
    try {
      const response = await api.put(`/payroll/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      console.error('Update payroll status error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/payroll/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get payroll by ID error:', error);
      throw error;
    }
  },
};

export const dashboardService = {
  getAdminDashboard: async () => {
    try {
      const response = await api.get('/dashboard/admin');
      return response.data;
    } catch (error) {
      console.error('Get admin dashboard error:', error);
      throw error;
    }
  },

  getEmployeeDashboard: async () => {
    try {
      const response = await api.get('/dashboard/employee');
      return response.data;
    } catch (error) {
      console.error('Get employee dashboard error:', error);
      throw error;
    }
  },
};

export const companyService = {
  getCompanyInfo: async () => {
    try {
      const response = await api.get('/company');
      return response.data;
    } catch (error) {
      console.warn('Get company info protected endpoint failed, falling back to public:', error?.response?.status || error.message);
      if (error.response && (error.response.status === 404 || error.response.status === 401 || error.response.status === 400)) {
        try {
          const pub = await api.get('/company/public');
          return pub.data;
        } catch (pubErr) {
          console.error('Get public company info error:', pubErr);
          throw pubErr;
        }
      }
      throw error;
    }
  },

  updateCompanyInfo: async (companyData) => {
    try {
      const response = await api.put('/company', companyData);
      return response.data;
    } catch (error) {
      console.error('Update company info error:', error);
      throw error;
    }
  },

  uploadLogo: async (logoData) => {
    try {
      const response = await api.post('/company/logo', { logo: logoData });
      return response.data;
    } catch (error) {
      console.error('Upload logo error:', error);
      throw error;
    }
  },

  getPublicCompanyInfo: async () => {
    try {
      const response = await api.get('/company/public');
      return response.data;
    } catch (error) {
      console.error('Get public company info error:', error);
      throw error;
    }
  },
};

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing API connection...');
    const response = await api.get('/health');
    console.log('✅ API connection successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ API connection failed:', error);
    throw error;
  }
};

export const permissionService = {
  apply: async (permissionData) => {
    try {
      const response = await api.post('/permissions', permissionData);
      return response.data;
    } catch (error) {
      console.error('Apply permission error:', error);
      throw error;
    }
  },

  getMyPermissions: async (month, year, status) => {
    try {
      const response = await api.get('/permissions/my-permissions', {
        params: { month, year, status },
      });
      return response.data;
    } catch (error) {
      console.error('Get my permissions error:', error);
      throw error;
    }
  },

  getAllPermissions: async (status, month, year, employeeId) => {
    try {
      const response = await api.get('/permissions', {
        params: { status, month, year, employeeId },
      });
      return response.data;
    } catch (error) {
      console.error('Get all permissions error:', error);
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.put(`/permissions/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update permission status error:', error);
      throw error;
    }
  },

  getStats: async () => {
    try {
      const response = await api.get('/permissions/stats');
      return response.data;
    } catch (error) {
      console.error('Get permission stats error:', error);
      throw error;
    }
  },
};