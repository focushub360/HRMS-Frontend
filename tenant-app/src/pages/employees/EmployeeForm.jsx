import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { employeeService, shiftService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workModeModal, setWorkModeModal] = useState({ isOpen: false, newMode: '' });
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    position: '',
    salary: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    employmentType: 'full-time',
    workMode: 'wfo',
    joiningDate: '',
    teamLead: '',
    assignedShift: '',  // NEW: Shift assignment field
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [teamLeads, setTeamLeads] = useState([]);

  // Departments state (admin can add/delete)
  const initialDepartments = [
    'Engineering',
    'Human Resources',
    'Marketing',
    'Sales',
    'Finance',
    'Operations',
    'Customer Support',
    'Design',
    'Product'
  ];
  const [departments, setDepartments] = useState(() => {
    try {
      const raw = localStorage.getItem('departments');
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to read departments from localStorage', err);
    }
    return initialDepartments;
  });
  const [newDepartment, setNewDepartment] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Load shifts for dropdown
  const loadShifts = async () => {
    try {
      setLoadingShifts(true);
      const response = await shiftService.getAll();
      const shiftsData = Array.isArray(response) ? response : [];
      setShifts(shiftsData.filter(s => s.isActive));
    } catch (error) {
      console.error('Failed to load shifts:', error);
    } finally {
      setLoadingShifts(false);
    }
  };

  // Load shifts when component mounts for create mode
  useEffect(() => {
    if (!isEdit) {
      loadShifts();
    }
  }, [isEdit]);

  // Persist departments to localStorage so admin changes survive reloads
  // Load team leads for dropdown (admin only)
  useEffect(() => {
    if (isAdmin) {
      const fetchTeamLeads = async () => {
        try {
          const employees = await employeeService.getAll();
          setTeamLeads(employees);
        } catch (error) {
          console.error('Failed to load team leads:', error);
        }
      };
      fetchTeamLeads();
    }
  }, [isAdmin]);

  React.useEffect(() => {
    try {
      localStorage.setItem('departments', JSON.stringify(departments));
    } catch (err) {
      console.warn('Failed to persist departments to localStorage', err);
    }
  }, [departments]);

  const toggleShowPassword = () => setShowPassword(s => !s);

  useEffect(() => {
    if (isEdit) {
      loadEmployee();
    }
  }, [id]);

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const employee = await employeeService.getById(id);
      const userRole = employee.user?.role || 'employee';
      setFormData({
        ...employee,
        role: userRole,
        password: '',
        workMode: employee.workMode || 'wfo',
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
        teamLead: employee.teamLead?._id || '',
        assignedShift: employee.assignedShift || '',  // NEW: Load assigned shift
        address: {
          street: employee.address?.street || '',
          city: employee.address?.city || '',
          state: employee.address?.state || '',
          country: employee.address?.country || '',
          zipCode: employee.address?.zipCode || ''
        }
      });
      
      // Load shifts for edit mode too
      await loadShifts();
    } catch (error) {
      console.error('Failed to load employee:', error);
      setError('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleWorkModeChange = (newMode) => {
    setWorkModeModal({ isOpen: true, newMode });
  };

  const confirmWorkModeChange = async () => {
    try {
      setSaving(true);
      await employeeService.update(id, { workMode: workModeModal.newMode });
      
      setFormData(prev => ({
        ...prev,
        workMode: workModeModal.newMode
      }));
      
      setWorkModeModal({ isOpen: false, newMode: '' });
    } catch (error) {
      console.error('Failed to update work mode:', error);
      setError('Failed to update work mode');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const submitData = { ...formData };
      
      // Remove empty assignedShift
      if (!submitData.assignedShift) {
        delete submitData.assignedShift;
      }
      
      if (isEdit && !submitData.password) {
        delete submitData.password;
      }

      if (!isEdit && !submitData.joiningDate) {
        submitData.joiningDate = new Date().toISOString().split('T')[0];
      }

      if (isEdit) {
        const res = await employeeService.update(id, submitData);
        console.debug('EmployeeForm.handleSubmit - update response:', res);
      } else {
        const res = await employeeService.create(submitData);
        console.debug('EmployeeForm.handleSubmit - create response:', res);
      }
      
      navigate('/employees');
    } catch (error) {
      console.error('Failed to save employee:', error);
      setError(error.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const calculateEmploymentYears = () => {
    if (!formData.joiningDate) return 0;
    
    const joiningDate = new Date(formData.joiningDate);
    const today = new Date();
    const diffTime = Math.abs(today - joiningDate);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    return diffYears;
  };

  const getDepartmentColor = (department) => {
    const colors = {
      'Engineering': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      'Human Resources': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      'Marketing': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700',
      'Sales': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      'Finance': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      'Operations': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
      'Customer Support': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
      'Design': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700',
      'Product': 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900 dark:text-lime-200 dark:border-lime-700'
    };
    return colors[department] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getWorkModeColor = (workMode) => {
    const colors = {
      'wfo': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      'wfh': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      'hybrid': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700'
    };
    return colors[workMode] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getWorkModeLabel = (workMode) => {
    const labels = {
      'wfo': 'Work From Office',
      'wfh': 'Work From Home',
      'hybrid': 'Hybrid'
    };
    return labels[workMode] || workMode;
  };

  const getWorkModeDescription = (workMode) => {
    const descriptions = {
      'wfo': 'Employee works primarily from the office location',
      'wfh': 'Employee works primarily from home or remote location',
      'hybrid': 'Employee splits time between office and remote work'
    };
    return descriptions[workMode] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Employees
          </button>
          <div className="border-l border-gray-300 h-6"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Employee' : 'Add New Employee'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update employee information and details' : 'Create a new employee account in the system'}
            </p>
          </div>
        </div>
        
        {/* Quick Stats for Edit Mode */}
        {isEdit && (
          <div className="hidden lg:flex items-center space-x-3">
            {formData.department && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDepartmentColor(formData.department)}`}>
                {formData.department}
              </span>
            )}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getWorkModeColor(formData.workMode)}`}>
              {getWorkModeLabel(formData.workMode)}
            </span>
            {formData.joiningDate && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                {calculateEmploymentYears()} year{calculateEmploymentYears() !== 1 ? 's' : ''} service
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information - Same as before */}
          <Card>
            <Card.Header className="border-b border-gray-200 pb-4">
              <Card.Title className="flex items-center text-lg font-semibold text-gray-900">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Basic Information
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="employee@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEdit ? 'New Password' : 'Password'} <span className="text-red-500">*</span>
                  {isEdit && <span className="text-xs text-gray-500 ml-1">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!isEdit}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 pr-10"
                    placeholder="Enter secure password"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.02.156-2.01.45-2.93" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 104.24 4.24" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {!isEdit && (
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 6 characters required
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 dark:text-gray-200 dark:bg-gray-800"
                >
                  <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Select gender</option>
                  <option value="male" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Male</option>
                  <option value="female" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Female</option>
                  <option value="other" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Other</option>
                  <option value="prefer-not-to-say" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Prefer not to say</option>
                </select>
              </div>
            </Card.Content>
          </Card>

          {/* Employment Details */}
          <Card>
            <Card.Header className="border-b border-gray-200 pb-4">
              <Card.Title className="flex items-center text-lg font-semibold text-gray-900">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
                Employment Details
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4 pt-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span> (employee, team-lead, manager)
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  >
                    <option value="employee">Employee</option>
                    <option value="team-lead">Team Lead</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 dark:text-gray-200 dark:bg-gray-800"
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{dept}</option>
                  ))}
                </select>
                {isAdmin && (
                  <div className="mt-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="Add new department"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = (newDepartment || '').trim();
                          if (!name) return;
                          if (departments.includes(name)) {
                            setError('Department already exists');
                            return;
                          }
                          setDepartments(prev => [name, ...prev]);
                          setNewDepartment('');
                          setError('');
                        }}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >Add</button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {departments.map(d => (
                        <span key={d} className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-800">
                          <span className="mr-2">{d}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDepartments(prev => prev.filter(x => x !== d));
                              if (formData.department === d) {
                                setFormData(prev => ({ ...prev, department: '' }));
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-0.5"
                            aria-label={`Remove ${d}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="e.g., Software Engineer, Marketing Manager"
                />
              </div>

              {/* NEW: Shift Assignment Field */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Shift (Optional)
                  </label>
                  <select
                    name="assignedShift"
                    value={formData.assignedShift}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 dark:text-gray-200 dark:bg-gray-800"
                    disabled={loadingShifts}
                  >
                    <option value="">-- No Shift (Use Department/Role default) --</option>
                    {shifts.map(shift => (
                      <option key={shift._id} value={shift._id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        {shift.displayName} ({shift.startTime} - {shift.endTime})
                        {shift.isNightShift && ' 🌙'}
                      </option>
                    ))}
                  </select>
                  {loadingShifts && (
                    <p className="text-xs text-gray-500 mt-1">Loading shifts...</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    If assigned, this shift overrides department and role-based shifts. 
                    Leave empty to use automatic shift detection.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Salary <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    required
                    min="0"
                    step="1"
                    className="block w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin && formData.role === 'team-lead' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Lead For (optional)
                    </label>
                    <select
                      name="teamLead"
                      value={formData.teamLead}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    >
                      <option value="">No team lead (root)</option>
                      {teamLeads.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} ({emp.position}, {emp.department})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Assign this team member to report under a team lead
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 dark:text-gray-200 dark:bg-gray-800"
                  >
                    <option value="full-time" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Full Time</option>
                    <option value="part-time" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Part Time</option>
                    <option value="contract" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Contract</option>
                    <option value="intern" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Intern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="workMode"
                    value={formData.workMode}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 dark:text-gray-200 dark:bg-gray-800"
                  >
                    <option value="wfo" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Work From Office</option>
                    <option value="wfh" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Work From Home</option>
                    <option value="hybrid" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Hybrid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                />
                {formData.joiningDate && (
                  <div className="flex items-center mt-2 p-2 bg-primary-50 rounded-lg">
                    <svg className="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-primary-700">
                      {calculateEmploymentYears()} year{calculateEmploymentYears() !== 1 ? 's' : ''} of service
                    </span>
                  </div>
                )}
              </div>

              {/* Work Mode Quick Change Section */}
              {isEdit && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Current Work Mode</p>
                      <p className="text-xs text-gray-500">{getWorkModeDescription(formData.workMode)}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getWorkModeColor(formData.workMode)}`}>
                      {getWorkModeLabel(formData.workMode)}
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Quick Change:</p>
                    <div className="flex space-x-2">
                      {['wfo', 'wfh', 'hybrid'].map((mode) => (
                        mode !== formData.workMode && (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => handleWorkModeChange(mode)}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors duration-200 ${
                              getWorkModeColor(mode)
                            } hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                          >
                            Switch to {getWorkModeLabel(mode)}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Address Information */}
          <Card className="lg:col-span-2">
            <Card.Header className="border-b border-gray-200 pb-4">
              <Card.Title className="flex items-center text-lg font-semibold text-gray-900">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address Information
              </Card.Title>
            </Card.Header>
            <Card.Content className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address?.street || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address?.city || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State / Province
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address?.state || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP / Postal Code
                  </label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address?.zipCode || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="10001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address?.country || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="United States"
                  />
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Fields marked with <span className="text-red-500">*</span> are required
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/employees')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="min-w-32"
            >
              {isEdit ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Employee
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Employee
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Work Mode Change Confirmation Modal */}
      <Modal
        isOpen={workModeModal.isOpen}
        onClose={() => setWorkModeModal({ isOpen: false, newMode: '' })}
        title="Change Work Mode"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getWorkModeColor(formData.workMode)}`}>
              <span className="text-xs font-bold">
                {formData.workMode === 'wfo' ? '🏢' : formData.workMode === 'wfh' ? '🏠' : '🔀'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Current: {getWorkModeLabel(formData.workMode)}</p>
              <p className="text-xs text-gray-500">{getWorkModeDescription(formData.workMode)}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getWorkModeColor(workModeModal.newMode)}`}>
              <span className="text-xs font-bold">
                {workModeModal.newMode === 'wfo' ? '🏢' : workModeModal.newMode === 'wfh' ? '🏠' : '🔀'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New: {getWorkModeLabel(workModeModal.newMode)}</p>
              <p className="text-xs text-gray-500">{getWorkModeDescription(workModeModal.newMode)}</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> This change will affect attendance tracking and reporting for this employee.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setWorkModeModal({ isOpen: false, newMode: '' })}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmWorkModeChange}
              loading={saving}
              className="min-w-24"
            >
              Confirm Change
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeForm;