import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { projectService } from '../../services/projects';
import { employeeService } from '../../services/employees';

// Material-UI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';

const ProjectForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    assignedEmployees: [],
    status: 'active'
  });

  useEffect(() => {
    if (isEdit) {
      loadProject();
    }
    loadEmployees();
  }, [id]);

  useEffect(() => {
    // Filter employees based on search term
    if (searchTerm) {
      const filtered = employees.filter(employee =>
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchTerm, employees]);

  const loadProject = async () => {
    setLoading(true);
    try {
      console.log('Loading project for edit:', id);
      // Fetch project from API
      const response = await projectService.getProject(id);
      const project = response.data?.data;
      if (project) {
        setFormData({
          name: project.name || '',
          description: project.description || '',
          startDate: project.startDate ? project.startDate.split('T')[0] : '',
          endDate: project.endDate ? project.endDate.split('T')[0] : '',
          // assignedEmployees may be populated objects or ids
          assignedEmployees: Array.isArray(project.assignedEmployees)
            ? project.assignedEmployees.map(e => (e?._id) || e)
            : [],
          status: project.status || 'active'
        });
      }
      
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      console.log('Loading employees...');
      // Prefer fetching from API
      const res = await employeeService.getEmployees();
      // Backend may return either an array (res.data) or a wrapped { success, data } object
      console.log('Employees API response:', res && res.data);
      const employeeData = Array.isArray(res.data) ? res.data : res.data?.data;
      if (Array.isArray(employeeData)) {
        setEmployees(employeeData);
        setFilteredEmployees(employeeData);
      } else {
        // Fallback to empty arrays
        setEmployees([]);
        setFilteredEmployees([]);
      }
      
    } catch (error) {
      console.error('Failed to load employees:', error);
      // Ensure we always have arrays
      setEmployees([]);
      setFilteredEmployees([]);
    }
  };

  // No mock functions - use real API via projectService

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form (make dates optional)
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    // Only validate date order if both dates are provided
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        alert('End date must be after start date');
        return;
      }
    }

    setSaving(true);

    try {
      const projectData = {
        ...formData,
        assignedEmployees: formData.assignedEmployees
      };

      console.log('Saving project data:', projectData);

      if (isEdit) {
        await projectService.updateProject(id, projectData);
        alert('Project updated successfully');
      } else {
        await projectService.createProject(projectData);
        alert('Project created successfully');
      }
      navigate('/projects');
    } catch (error) {
      console.error('Failed to save project:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeToggle = (employeeId) => {
    setFormData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.includes(employeeId)
        ? prev.assignedEmployees.filter(id => id !== employeeId)
        : [...prev.assignedEmployees, employeeId]
    }));
  };

  const getSelectedEmployeesCount = () => {
    return formData.assignedEmployees.length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading project data...</span>
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
            onClick={() => navigate('/projects')}
            className="cursor-pointer"
          >
            <ArrowBackIcon className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isEdit ? 'Edit Project' : 'Create New Project'}
            </h1>
            <p className="text-gray-600 mt-2 dark:text-gray-300">
              {isEdit ? 'Update project details and team assignments' : 'Set up a new project and assign team members'}
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
                  Project Details
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6 space-y-6">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Enter project name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Describe the project goals and objectives..."
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date 
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date 
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  Project Status
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6">
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="active" className="dark:bg-gray-800 dark:text-gray-100">Active</option>
                  <option value="on-hold" className="dark:bg-gray-800 dark:text-gray-100">On Hold</option>
                  <option value="completed" className="dark:bg-gray-800 dark:text-gray-100">Completed</option>
                </select>
              </Card.Content>
            </Card>

            {/* Team Assignment */}
            <Card>
              <Card.Header className="border-b border-gray-200 pb-4">
                <Card.Title className="text-lg font-semibold text-gray-900">
                  Assign Team Members ({getSelectedEmployeesCount()} selected)
                </Card.Title>
              </Card.Header>
              <Card.Content className="pt-6">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 dark:text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Employees List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Array.isArray(filteredEmployees) && filteredEmployees.length > 0 ? (
                    filteredEmployees.map(employee => (
                      <div 
                        key={employee._id} 
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          formData.assignedEmployees.includes(employee._id)
                            ? 'bg-primary-50 border-primary-200 shadow-sm dark:bg-primary-900 dark:border-primary-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleEmployeeToggle(employee._id)}
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedEmployees.includes(employee._id)}
                          onChange={() => handleEmployeeToggle(employee._id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white font-medium text-sm">
                              {employee.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
                              {employee.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate dark:text-gray-300">
                              {employee.position}
                            </p>
                            <p className="text-xs text-gray-400 truncate dark:text-gray-400">
                              {employee.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <PersonIcon className="w-12 h-12 text-gray-300 dark:text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        {searchTerm ? 'No employees found' : 'No employees available'}
                      </p>
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* Info Notice */}
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-800">
              <Card.Content className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-blue-800">
                    <span className="text-blue-600 text-sm dark:text-blue-200">ℹ️</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Connected to backend
                    </p>
                    <p className="text-xs text-blue-600 mt-1 dark:text-blue-100">
                      Employee and project data are loaded from the server.
                    </p>
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
                    disabled={saving}
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {isEdit ? 'Update Project' : 'Create Project'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/projects')}
                    className="w-full justify-center"
                    disabled={saving}
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

export default ProjectForm;