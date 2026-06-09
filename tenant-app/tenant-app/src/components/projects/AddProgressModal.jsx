import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { progressService } from '../../services/progress';
import { projectService } from '../../services/projects';
import { useAuth } from '../../context/AuthContext';

// Material-UI Icons
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';

const AddProgressModal = ({ isOpen, onClose, task: initialTask, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState(initialTask || '');
  const [formData, setFormData] = useState({
    progress: 0,
    note: ''
  });
  const [existingUpdate, setExistingUpdate] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      if (initialTask) {
        setSelectedTask(initialTask._id);
        setSelectedProject(initialTask.project?._id || '');
        loadTasks(initialTask.project?._id || '');
      }
    }
  }, [isOpen, initialTask]);

  // When selectedTask changes (or modal opens), check if the current user has today's update
  useEffect(() => {
    let mounted = true;
    const checkTodayUpdate = async () => {
      if (!selectedTask) {
        setExistingUpdate(null);
        const td = tasks.find(t => t._id === selectedTask);
        setFormData({ progress: td?.progress || 0, note: '' });
        return;
      }

      setLoading(true);
      try {
        const res = await progressService.getTaskProgress(selectedTask);
        const updates = res.data?.data || res.data || [];

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const found = updates.find(u => {
          const uid = u.userId?._id || u.userId;
          const d = u.date ? new Date(u.date) : null;
          return uid && String(uid) === String(user?._id) && d && d >= todayStart && d < tomorrow;
        });

        if (mounted) {
          if (found) {
            setExistingUpdate(found);
            setFormData({ progress: found.progress || 0, note: found.note || '' });
          } else {
            setExistingUpdate(null);
            const td = tasks.find(t => t._id === selectedTask);
            setFormData({ progress: td?.progress || 0, note: '' });
          }
        }
      } catch (err) {
        console.error('Failed to fetch task progress:', err);
        if (mounted) setExistingUpdate(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (isOpen) checkTodayUpdate();
    return () => { mounted = false; };
  }, [selectedTask, isOpen, user, tasks]);

  const loadProjects = async () => {
    try {
      const response = await projectService.getProjects();
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTasks = async (projectId) => {
    setLoading(true);
    try {
      const response = await progressService.getTasksForProgress(projectId);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    setSelectedTask('');
    if (projectId) {
      loadTasks(projectId);
    } else {
      setTasks([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      await progressService.addProgressUpdate(selectedTask, formData);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to update progress:', error);
      alert(error.response?.data?.message || 'Failed to update progress');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ progress: 0, note: '' });
    setSelectedTask('');
    setSelectedProject('');
  };

  const getSelectedTaskDetails = () => {
    return tasks.find(task => task._id === selectedTask);
  };

  const taskDetails = getSelectedTaskDetails();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUpIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Update Task Progress</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Track your daily work and progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="">Choose a project</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Task
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              required
              disabled={!selectedProject || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:disabled:bg-gray-700"
            >
              <option value="">Choose a task</option>
              {tasks.map(task => (
                <option key={task._id} value={task._id}>
                  {task.title} {task.progress > 0 && `(${task.progress}%)`}
                </option>
              ))}
            </select>
            {loading && (
              <div className="mt-2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>

          {/* Selected Task Info */}
          {taskDetails && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-center space-x-3">
                <AssignmentIcon className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{taskDetails.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{taskDetails.project?.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Progress</div>
                  <div className="text-lg font-bold text-blue-600">{taskDetails.progress}%</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{taskDetails.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${taskDetails.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Progress: <span className="font-bold text-blue-600">{formData.progress}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progress Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Today's Work Update
              <span className="text-gray-500 font-normal ml-1">(What did you complete today?)</span>
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              required
              rows={4}
              placeholder="Describe what you worked on today, any challenges faced, and what you plan to work on next..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!selectedTask || !formData.note.trim()}
              className="bg-blue-600 hover:bg-blue-700 border-0"
            >
              <TrendingUpIcon className="w-4 h-4 mr-2" />
                {existingUpdate ? "Edit Today's Update" : 'Update Progress'}
            </Button>
          </div>
        </form>
      </div>

      {/* Custom Slider Styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </Modal>
  );
};

export default AddProgressModal;
