import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { projectService } from '../../services/projects';
import AddProgressModal from '../../components/projects/AddProgressModal';

// Material-UI Icons
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import FlagIcon from '@mui/icons-material/Flag';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Task Actions Dropdown Component
const TaskActionsDropdown = ({ task, isAdmin, onEdit, onDelete, onView, isOpen, position }) => {
  if (!isOpen) return null;

  return (
 <div 
      className="absolute right-0 top-6 z-50 rounded-lg shadow-lg border border-gray-200 py-2 min-w-10 backdrop-blur-sm bg-white/95 dark:bg-gray-800 dark:border-gray-700"
      style={position}
    >
      {/* View Details Button - For both admin and employee */}
      <button
        onClick={() => onView(task)}
  className="flex items-center justify-center w-full px-2 py-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-all duration-150 rounded-md mx-1 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
        title="View Details"
      >
        <VisibilityIcon className="w-4 h-4" />
      </button>
      
      {/* Edit & Delete - Admin only */}
      {isAdmin && (
        <>
          <button
            onClick={() => onEdit(task)}
            className="flex items-center justify-center w-full px-2 py-2 text-gray-500 hover:bg-gray-50 hover:text-green-600 transition-all duration-150 rounded-md mx-1 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-green-400"
            title="Edit Task"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(task)}
            className="flex items-center justify-center w-full px-2 py-2 text-gray-500 hover:bg-gray-50 hover:text-red-600 transition-all duration-150 rounded-md mx-1 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400"
            title="Delete Task"
          >
            <DeleteIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

const TaskCard = ({ task, isAdmin, onEdit, onDelete, onView }) => {
  const [showActions, setShowActions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({});

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-orange-500',
      low: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-400';
  };

  const getDaysUntilDue = (deadline) => {
    const today = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900 dark:border-red-700' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900 dark:border-orange-700' };
    if (diffDays <= 3) return { text: `${diffDays}d left`, color: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900 dark:border-yellow-700' };
    return { text: `${diffDays}d left`, color: 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700' };
  };

  const dueInfo = getDaysUntilDue(task.deadline);

  const handleDragStart = (e) => {
    // store values under both custom and standard types for cross-browser compatibility
    try {
      e.dataTransfer.setData('taskId', task._id);
      e.dataTransfer.setData('currentStatus', task.status);
      e.dataTransfer.setData('text/plain', task._id);
      e.dataTransfer.setData('text/status', task.status);
    } catch (err) {
      // some browsers may restrict setData; ignore errors
      console.warn('drag start dataTransfer.setData failed', err);
    }
  };

  const handleActionsClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.height + 4,
      right: 0
    });
    setShowActions(!showActions);
  };

  const handleAction = (action) => {
    setShowActions(false);
    action(task);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowActions(false);
    };

    if (showActions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActions]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white rounded-lg border border-gray-200 p-3 mb-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing group relative dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
    >
      {/* Priority & Project */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
          <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-300">
            {task.priority}
          </span>
        </div>
        
        {/* 3-dot Menu Button */}
        <div className="relative">
          <button
            onClick={handleActionsClick}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Task Actions"
          >
            <MoreVertIcon className="w-4 h-4" />
          </button>

          {/* Actions Dropdown */}
          <TaskActionsDropdown
            task={task}
            isAdmin={isAdmin}
            onEdit={() => handleAction(onEdit)}
            onDelete={() => handleAction(onDelete)}
            onView={() => handleAction(onView)}
            isOpen={showActions}
            position={dropdownPosition}
          />
        </div>
      </div>

      {/* Task Title */}
      <h4 className="font-semibold text-gray-900 mb-2 text-sm leading-tight line-clamp-2 dark:text-gray-100">
        {task.title}
      </h4>

      {/* Project Badge */}
      {task.project && (
        <div className="mb-2">
          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded dark:text-gray-300 dark:bg-gray-700">
            {task.project.name}
          </span>
        </div>
      )}

      {/* Progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
          <span>Progress</span>
          <span className="font-semibold text-sm text-blue-600">{task.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${task.progress || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Assignee & Due Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center dark:bg-blue-900">
            <PersonIcon className="w-3 h-3 text-blue-600" />
          </div>
          <span className="text-xs text-gray-700 dark:text-gray-200">
            {task.assignedTo?.name?.split(' ')[0] || 'Unassigned'}
          </span>
        </div>
        
        <span className={`text-xs px-2 py-1 rounded border ${dueInfo.color} dark:border-gray-600 dark:bg-opacity-10 dark:text-gray-200`}>
          {dueInfo.text}
        </span>
      </div>
    </div>
  );
};

const TaskDetailsModal = ({ task, isOpen, onClose, isAdmin, onEdit, onProgressUpdated }) => {
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  if (!task) return null;

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 border-gray-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      review: 'bg-orange-100 text-orange-800 border-orange-200',
      done: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[status] || colors.todo;
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 dark:bg-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Task Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors dark:text-gray-300 dark:hover:text-gray-100"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Task Content */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Title</label>
            <p className="text-gray-900 font-medium dark:text-gray-100">{task.title}</p>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Description</label>
              <p className="text-gray-600 text-sm leading-relaxed dark:text-gray-300">{task.description}</p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Priority</label>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)} dark:border-gray-600`}>
                {task.priority}
              </span>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Status</label>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)} dark:border-gray-600`}>
                {task.status.replace('-', ' ')}
              </span>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Assigned To</label>
              <p className="text-sm text-gray-900 dark:text-gray-100">{task.assignedTo?.name || 'Unassigned'}</p>
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Project</label>
              <p className="text-sm text-gray-900 dark:text-gray-100">{task.project?.name || 'No Project'}</p>
            </div>

            {/* Deadline */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Deadline</label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {new Date(task.deadline).toLocaleDateString()} 
                <span className="text-gray-500 ml-2 dark:text-gray-400">
                  ({new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              </p>
            </div>
          </div>

          {/* Time Tracking */}
          {(task.estimatedHours || task.actualHours) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Tracking</label>
              <div className="flex items-center space-x-4 text-sm">
                {task.estimatedHours && (
                  <span className="text-gray-600">
                    Estimated: <strong>{task.estimatedHours}h</strong>
                  </span>
                )}
                {task.actualHours && (
                  <span className="text-gray-600">
                    Actual: <strong>{task.actualHours}h</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => setProgressModalOpen(true)}
            variant="outline"
            className="mr-auto"
          >
            <TrendingUpIcon className="w-4 h-4 mr-2" />
            Add Progress
          </Button>
          {isAdmin && (
            <Button
              onClick={() => {
                onEdit(task);
                onClose();
              }}
              variant="outline"
            >
              <EditIcon className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
          )}
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>

    {/* Progress Modal */}
    <AddProgressModal
      isOpen={progressModalOpen}
      onClose={() => setProgressModalOpen(false)}
      task={task}
      onSuccess={() => {
        setProgressModalOpen(false);
        if (onProgressUpdated) onProgressUpdated();
      }}
    />
    </>
  );
};

const KanbanColumn = ({ title, status, tasks, onTaskDrop, isAdmin, onEdit, onDelete, onView }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    // read taskId/status from either custom or standard types (better browser support)
    const taskId = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('text/plain');
    const currentStatus = e.dataTransfer.getData('currentStatus') || e.dataTransfer.getData('text/status');

    if (!taskId) return;
    if (currentStatus !== status) {
      onTaskDrop(taskId, status);
    }
  };

  const getColumnIcon = (status) => {
    const icons = {
      todo: <AssignmentIcon className="w-4 h-4" />,
      'in-progress': <ScheduleIcon className="w-4 h-4" />,
      review: <FlagIcon className="w-4 h-4" />,
      done: <CheckCircleIcon className="w-4 h-4" />
    };
    return icons[status];
  };

  const getColumnColor = (status) => {
    const colors = {
      todo: 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
      'in-progress': 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900',
      review: 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900',
      done: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900'
    };
    return colors[status] || colors.todo;
  };

  return (
    <div className="w-full sm:w-64 flex-shrink-0">
      <div className={`
        rounded-lg border-2 ${getColumnColor(status)} p-4 h-full
        transition-all duration-200 ${isDragOver ? 'scale-105 shadow-lg bg-white dark:bg-gray-700' : ''} dark:border-gray-700 dark:bg-gray-800
      `}>
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-white rounded shadow-sm dark:bg-gray-700 dark:text-gray-100">
                {getColumnIcon(status)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm dark:text-gray-100">{title}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tasks.length} tasks</span>
              </div>
          </div>
        </div>

        {/* Tasks Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="min-h-32 space-y-2 max-h-96 overflow-y-auto"
        >
          {tasks.map(task => (
            <TaskCard 
              key={task._id} 
              task={task}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
          
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
const TaskBoard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadTasks = useCallback(async () => {
    try {
      const params = selectedProject ? { project: selectedProject } : {};
      const response = await projectService.getTasksForBoard(params);
      setTasks(response.data.data || {});
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks({});
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await projectService.getProjects();
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    if (isAdmin) loadProjects();
  }, [loadTasks, loadProjects, isAdmin]);

  // Client-side search filtering across task fields
  const filteredTasks = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return tasks || {};

    const matches = (task) => {
      if (!task) return false;
      if (task.title && task.title.toLowerCase().includes(term)) return true;
      if (task.description && task.description.toLowerCase().includes(term)) return true;
      if (task.project && task.project.name && task.project.name.toLowerCase().includes(term)) return true;
      if (task.assignedTo && task.assignedTo.name && task.assignedTo.name.toLowerCase().includes(term)) return true;
      return false;
    };

    const out = {};
    Object.keys(tasks || {}).forEach(status => {
      out[status] = (tasks[status] || []).filter(matches);
    });
    return out;
  }, [tasks, searchTerm]);

  

  const handleTaskDrop = async (taskId, newStatus) => {
    try {
      await projectService.updateTaskStatus(taskId, newStatus);
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleEditTask = (task) => {
    // Navigate to edit task page
    navigate(`/tasks/edit/${task._id}`)
  };

  // Open confirmation modal (do not delete immediately)
  const handleDeleteTask = (task) => {
    setDeleteCandidate(task);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await projectService.deleteTask(deleteCandidate._id, { hard: true });
      setShowDeleteConfirm(false);
      setDeleteCandidate(null);
      await loadTasks(); // Reload tasks after deletion
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteCandidate(null);
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const getBoardStats = () => {
    const allTasks = Object.values(filteredTasks).flat();
    return {
      total: allTasks.length,
      completed: filteredTasks.done?.length || 0,
      inProgress: filteredTasks['in-progress']?.length || 0,
      overdue: allTasks.filter(task => new Date(task.deadline) < new Date()).length
    };
  };

  const stats = getBoardStats();

  const columns = [
    { title: 'To Do', status: 'todo', tasks: filteredTasks.todo || [] },
    { title: 'In Progress', status: 'in-progress', tasks: filteredTasks['in-progress'] || [] },
    { title: 'Review', status: 'review', tasks: filteredTasks.review || [] },
    { title: 'Done', status: 'done', tasks: filteredTasks.done || [] }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isAdmin ? 'Task Board' : 'My Tasks'}
              </h1>
              <p className="text-gray-600 mt-1 dark:text-gray-300">
                {isAdmin ? 'Manage all project tasks' : 'Track your assigned tasks'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm text-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Done</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm text-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Late</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Project Filter - Admin only */}
              {isAdmin && (
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-40 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}

              {/* New Task Button - Admin only */}
              {isAdmin && (
                <Button
                  as={Link}
                  to="/tasks/create"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <AddIcon className="w-4 h-4 mr-1" />
                  New Task
                </Button>
              )}
            </div>
          </Card>
        </div>

     
        {/* Kanban Board */}
        <div className="mt-3 sm:mt-0 sm:overflow-x-auto pb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:min-w-max">
            {columns.map(column => (
              <KanbanColumn
                key={column.status}
                title={column.title}
                status={column.status}
                tasks={column.tasks}
                onTaskDrop={handleTaskDrop}
                isAdmin={isAdmin}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onView={handleViewTask}
              />
            ))}
          </div>
        </div>

        {/* Empty State */}
        {stats.total === 0 && (
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AssignmentIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isAdmin ? 'No tasks yet' : 'No tasks assigned'}
            </h3>
            <p className="text-gray-500 mb-6">
              {isAdmin 
                ? 'Create your first task to get started'
                : 'Tasks will appear here when assigned to you'
              }
            </p>
            {isAdmin && (
              <Button as={Link} to="/tasks/create">
                <AddIcon className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
          </Card>
        )}

        {/* Task Details Modal */}
        <TaskDetailsModal
          task={selectedTask}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          isAdmin={isAdmin}
          onEdit={handleEditTask}
          onProgressUpdated={loadTasks}
        />

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteConfirm} onClose={cancelDelete} size="sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to permanently delete the task "{deleteCandidate?.title}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default TaskBoard;