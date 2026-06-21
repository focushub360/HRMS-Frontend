import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { projectService } from '../../services/projects';
import { employeeService } from '../../services/employees';

// Material-UI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: searchParams.get('project') || '',
    assignedTo: '',
    priority: 'medium',
    status: searchParams.get('status') || 'todo',
    deadline: '',
    estimatedHours: '',
    actualHours: ''
  });

  useEffect(() => {
    if (isEdit) {
      loadTask();
    }
    loadProjects();
    loadEmployees();
  }, [id]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const response = await projectService.getTask(id);
      const task = response?.data?.data ?? response?.data;
      if (task) {
        setFormData(prev => ({
          ...prev,
          title: task.title || '',
          description: task.description || '',
          project: task.project?._id || task.project || prev.project,
          assignedTo: task.assignedTo?._id || task.assignedTo || prev.assignedTo,
          priority: task.priority || prev.priority,
          status: task.status || prev.status,
          deadline: task.deadline ? task.deadline.split('T')[0] : prev.deadline,
          estimatedHours: task.estimatedHours ?? prev.estimatedHours,
          actualHours: task.actualHours ?? prev.actualHours
        }));
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectService.getProjects();
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      // prefer a lightweight employee list for assignment
      const response = await employeeService.getEmployeesForAssignment();
      // API responses in this codebase sometimes return { data: [...] } or { data: { data: [...] } }
      const payload = response?.data?.data ?? response?.data ?? [];
      setEmployees(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        await projectService.updateTask(id, formData);
      } else {
        await projectService.createTask(formData);
      }
      navigate('/projects/board');
    } catch (error) {
      console.error('Failed to save task:', error);
      alert(error.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Determine which employees should be shown in the assign dropdown.
  // If a project is selected, prefer showing only employees assigned to that project.
  const availableEmployees = React.useMemo(() => {
    if (formData.project) {
      const proj = projects.find(p => String(p._id) === String(formData.project));
      if (proj?.assignedEmployees && proj.assignedEmployees.length > 0) {
        const assignedIds = proj.assignedEmployees.map(a => String(a._id ?? a));
        return employees.filter(e => assignedIds.includes(String(e._id)));
      }
    }
    return employees;
  }, [employees, projects, formData.project]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/projects/board')}
            className="cursor-pointer"
          >
            <ArrowBackIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Task' : 'Create New Task'}
              </h1>
              <p className="text-gray-600 mt-2 dark:text-gray-300">
                {isEdit ? 'Update task details and assignment' : 'Create a new task and assign it to a team member'}
              </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  Task Details
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6 space-y-6">
                {/* Task Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter task title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe the task requirements and objectives..."
                  />
                </div>

                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project *
                  </label>
                  <select
                    required
                    value={formData.project}
                    onChange={(e) => handleChange('project', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignment */}
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  Assignment
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To *
                  </label>
                  <select
                    required
                    value={formData.assignedTo}
                    onChange={(e) => handleChange('assignedTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="">Select an employee</option>
                    {availableEmployees.map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} - {employee.position}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </Card.Content>
            </Card>

            {/* Timeline */}
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4 dark:border-gray-700">
                <Card.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Timeline
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => handleChange('deadline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Est. Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedHours}
                      onChange={(e) => handleChange('estimatedHours', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.actualHours}
                      onChange={(e) => handleChange('actualHours', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Actions */}
            <Card>
              <Card.Content className="p-4">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    loading={saving}
                    className="w-full justify-center"
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {isEdit ? 'Update Task' : 'Create Task'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/projects/board')}
                    className="w-full justify-center"
                  >
                    Cancel
                  </Button>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;