import api from './api';

export const employeeService = {
  getEmployees: (params = {}) => api.get('/employees', { params }),
  getEmployee: (id) => api.get(`/employees/${id}`),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),

   // NEW: Get employees with user relationships for assignment
  getEmployeesForAssignment: () => api.get('/employees', { 
    params: { 
      fields: '_id,name,email,position,department,user',
      isActive: true 
    } 
  }),

  // Team management (moved to /api/team)
  getTeamStructure: () => api.get('/team/structure'),
  assignTeamMember: (teamLeadId, memberId) => api.post(`/team/${teamLeadId}/assign/${memberId}`),
  bulkAssignTeamMembers: (teamLeadId, memberIds) => api.post('/team/bulk-assign', { teamLeadId, memberIds }),
  removeTeamMember: (teamLeadId, memberId) => api.delete(`/team/${teamLeadId}/remove/${memberId}`),
};
