import api from './api';
import { employeeService } from './employees';

export const projectService = {
  // Projects
  getProjects: (params = {}) => api.get('/projects', { params }),
  getProject: (id) => api.get(`/projects/${id}`),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  getProjectProgress: (id) => api.get(`/projects/${id}/progress`),

  // Tasks
  getTasks: (params = {}) => api.get('/tasks', { params }),
  getTask: (id) => api.get(`/tasks/${id}`),
  getTasksForBoard: (params = {}) => api.get('/tasks/board', { params }),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  updateTaskStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
  deleteTask: (id, options = {}) => api.delete(`/tasks/${id}`, { params: options }),
  // FIX: Add the missing method
  getEmployeesForAssignment: () => api.get('/employees', { 
    params: { 
      fields: '_id,name,email,position,department',
      isActive: true 
    } 
  }),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};