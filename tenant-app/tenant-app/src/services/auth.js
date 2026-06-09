import api from './api';

export const authService = {
  login: async (email, password, tenantSubdomain) => {
    try {
      // console.log('Attempting login for:', email, 'in tenant:', tenantSubdomain);
      
      // Add tenant subdomain header for login
      // Include a lightweight header to tell the shared API interceptor
      // not to perform a hard redirect for this request. The interceptor
      // will honor this and allow the login flow to surface a user-facing
      // error message instead of navigating away.
      const response = await api.post('/auth/login', { 
        email, 
        password 
      }, {
        headers: {
          'X-Tenant-Subdomain': tenantSubdomain,
          'X-Skip-Auth-Redirect': '1'
        }
      });
      
      // console.log('Login successful for tenant:', tenantSubdomain);
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
  getAll: async (includeInactive = false, includeLegacy = false, tenantOverride = null) => {
    try {
      const params = {};
      if (includeInactive) params.includeInactive = true;
      if (includeLegacy) params.includeLegacy = true;
      if (tenantOverride) params.tenant = tenantOverride;

      const response = await api.get('/employees', { params });
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
      // console.log('Creating employee with data:', cleanData);
      
      const response = await api.post('/employees', cleanData);
      // console.log('Employee created successfully');
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
      // console.log('Updating employee:', id, 'with data:', cleanData);
      
      const response = await api.put(`/employees/${id}`, cleanData);
      // console.log('Employee updated successfully');
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
      // console.log('Updating profile with data:', cleanData);
      
      const response = await api.put('/employees/profile/me', cleanData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      // console.log('Deleting employee with ID:', id);
      const response = await api.delete(`/employees/${id}`);
      // console.log('✅ Delete response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Delete error:', error.response?.data || error.message);
      throw error;
    }
  },
  setMobileAccess: async (id, mobileAllowed) => {
    try {
      const response = await api.put(`/employees/${id}/mobile-allow`, { mobileAllowed });
      return response.data;
    } catch (error) {
      console.error('Set mobile access error:', error);
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
  
  // Ensure numbers are properly formatted (salary may contain commas or currency)
  if (cleaned.salary !== undefined) {
    // Normalize to string and strip non-numeric characters except dot and minus
    const raw = String(cleaned.salary).replace(/[^0-9.-]+/g, '');
    if (raw === '' || raw === '.' || raw === '-' || raw === '-.' ) {
      delete cleaned.salary;
    } else {
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        delete cleaned.salary;
      } else {
        cleaned.salary = num;
      }
    }
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

// Tenant service for company selection
export const tenantService = {
  getTenantBySubdomain: async (subdomain) => {
    try {
      const response = await api.get(`/tenants/public/${subdomain}`);
      return response.data;
    } catch (error) {
      console.error('Get tenant by subdomain error:', error);
      throw error;
    }
  },

  getAvailableTenants: async () => {
    try {
      const response = await api.get('/tenants/public');
      return response.data;
    } catch (error) {
      console.error('Get available tenants error:', error);
      throw error;
    }
  }
};

export const attendanceService = {
  checkIn: async (payload) => {
    try {
      const response = await api.post('/attendance/checkin', payload);
      return response.data;
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  },

  checkOut: async (payload) => {
    try {
      const response = await api.post('/attendance/checkout', payload);
      return response.data;
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
    }
  },

  getStatus: async () => {
    try {
      const response = await api.get('/attendance/status');
      return response.data;
    } catch (error) {
      console.error('Get attendance status error:', error);
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
   getTodayPendingShifts: async () => {
    try {
      const response = await api.get('/attendance/today-shifts');
      return response.data;
    } catch (error) {
      console.error('Get today shifts error:', error);
      throw error;
    }
  },
  
  // ✅ NEW: Check in for specific shift
  checkInForShift: async (shiftId, payload) => {
    try {
      const response = await api.post('/attendance/checkin', { shiftId, ...payload });
      return response.data;
    } catch (error) {
      console.error('Check-in for shift error:', error);
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

  getAllLeaves: async (status, month, year, employeeId) => {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (month) params.append('month', month);
      if (year) params.append('year', year);
      if (employeeId && employeeId !== 'all') params.append('employeeId', employeeId);

      const response = await api.get(`/leaves?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Get all leaves error:', error);
      throw error;
    }
  },

  // Team-lead specific: get pending leaves for their team
  getTeamPendingLeaves: async (status = 'pending') => {
    try {
      const response = await api.get('/leaves/team-pending', {
        params: { status },
      });
      return response.data;
    } catch (error) {
      console.error('Get team pending leaves error:', error);
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

  // Lead global status update (replaces team-status for leads)
  updateLeadStatus: async (id, status) => {
    try {
      const response = await api.put(`/leaves/${id}/lead-status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update lead leave status error:', error);
      throw error;
    }
  },

  // Lead global pending leaves (all employees)
  getLeadPendingLeaves: async (status = 'pending') => {
    try {
      const response = await api.get('/leaves/lead-pending', { params: { status } });
      return response.data;
    } catch (error) {
      console.error('Get lead pending leaves error:', error);
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
      // Try protected company endpoint first (returns tenant-specific when authenticated)
      const response = await api.get('/company');
      return response.data;
    } catch (error) {
      console.warn('Get company info protected endpoint failed, falling back to public:', error?.response?.status || error.message);
      // If protected endpoint fails due to tenant not found or unauthenticated, try public info
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
    // console.log('Testing API connection...');
    const response = await api.get('/health');
    // console.log('✅ API connection successful:', response.data);
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

  getAllPermissions: async (status, month, year, employeeId, leadApproved) => {
    try {
      const params = { status, month, year, employeeId };
      if (leadApproved !== undefined) {
        params.leadApproved = leadApproved;
      }
      const response = await api.get('/permissions', { params });
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

  // Lead global permissions (all employees)
  getLeadPendingPermissions: async (status = 'pending') => {
    try {
      const response = await api.get('/permissions/lead-pending', { params: { status } });
      return response.data;
    } catch (error) {
      console.error('Get lead pending permissions error:', error);
      throw error;
    }
  },

  // Lead global status update
  updateLeadStatus: async (id, status) => {
    try {
      const response = await api.put(`/permissions/${id}/lead-status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update lead permission status error:', error);
      throw error;
    }
  },
};

export const analyticsService = {
  getDashboard: async () => {
    try {
      const response = await api.get('/dashboard/analytics');
      return response.data;
    } catch (error) {
      console.error('Get analytics dashboard error:', error);
      throw error;
    }
  }
};

export const shiftService = {
  getAll: async () => {
    try {
      const response = await api.get('/shifts');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get shifts error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/shifts/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get shift error:', error);
      throw error;
    }
  },

  create: async (shiftData) => {
    try {
      const response = await api.post('/shifts', shiftData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Create shift error:', error);
      throw error;
    }
  },

  update: async (id, shiftData) => {
    try {
      const response = await api.put(`/shifts/${id}`, shiftData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Update shift error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/shifts/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Delete shift error:', error);
      throw error;
    }
  },

  assignToDepartments: async (shiftId, departments) => {
    try {
      const response = await api.post(`/shifts/${shiftId}/assign/departments`, { departments });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Assign shift to departments error:', error);
      throw error;
    }
  },

  assignToRoles: async (shiftId, roles) => {
    try {
      const response = await api.post(`/shifts/${shiftId}/assign/roles`, { roles });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Assign shift to roles error:', error);
      throw error;
    }
  },

  assignToEmployees: async (shiftId, employees) => {
    try {
      console.log("Payload:", { employeeIds: employees });
      const response = await api.post(`/shifts/${shiftId}/assign/employees`, { employeeIds: employees });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Assign shift to employees error:', error);
      throw error;
    }
  },

  getMyShift: async () => {
    try {
      const response = await api.get('/shifts/my-shift');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get my shift error:', error);
      throw error;
    }
  },

  getSummary: async () => {
    try {
      const response = await api.get('/shifts/summary');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get shift summary error:', error);
      throw error;
    }
  },

  getTodayShifts: async () => {
    try {
      const response = await api.get('/shifts/today');
      return response.data;
    } catch (error) {
      console.error('Get today shifts error:', error);
      throw error;
    }
  },

  getTodayShifts: async () => {
    try {
      const response = await api.get('/shifts/today');
      return response.data;
    } catch (error) {
      console.error('Get today shifts error:', error);
      throw error;
    }
  }
};


export const departmentSettingService = {
  getAll: async () => {
    try {
      const response = await api.get('/department-settings');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get department settings error:', error);
      throw error;
    }
  },

  getRequired: async () => {
    try {
      const response = await api.get('/department-settings/required');
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Get required departments error:', error);
      throw error;
    }
  },

  update: async (departmentName, data) => {
    try {
      const response = await api.put(`/department-settings/${encodeURIComponent(departmentName)}`, data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Update department setting error:', error);
      throw error;
    }
  }
};

export const locationService = {
  // ── Employee read-only (used in check-in/out dropdown) ──────────────────────
  getAll: async () => {
    try {
      const response = await api.get('/locations');
      return response.data.data || [];
    } catch (error) {
      console.error('Get locations error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/locations/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Get location by ID error:', error);
      throw error;
    }
  },

  // ── Tenant-admin CRUD (admin role only) ─────────────────────────────────────
  adminGetAll: async () => {
    try {
      const response = await api.get('/tenant-admin/locations');
      return response.data.data || [];
    } catch (error) {
      console.error('Admin get locations error:', error);
      throw error;
    }
  },

  adminCreate: async (data) => {
    try {
      const response = await api.post('/tenant-admin/locations', data);
      return response.data.data;
    } catch (error) {
      console.error('Admin create location error:', error);
      throw error;
    }
  },

  adminUpdate: async (id, data) => {
    try {
      const response = await api.put(`/tenant-admin/locations/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Admin update location error:', error);
      throw error;
    }
  },

  adminDelete: async (id) => {
    try {
      const response = await api.delete(`/tenant-admin/locations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Admin delete location error:', error);
      throw error;
    }
  },
};
