import api from './api';

export const progressService = {
  // Add progress update to task
  addProgressUpdate: (taskId, data) => 
    api.post(`/tasks/${taskId}/progress`, data),

  // Get task progress updates
  getTaskProgress: (taskId) => 
    api.get(`/tasks/${taskId}/progress`),

  // Get today's updates by current user
  getTodayUpdates: () => 
    api.get('/tasks/my-updates/today'),

  // Get tasks for progress tracking
  getTasksForProgress: (projectId = '') => 
    api.get('/tasks', { params: { project: projectId } }),
  
  // Admin: list progress updates across tasks
  listProgress: (params) =>
    api.get('/tasks/progress', { params }),
};