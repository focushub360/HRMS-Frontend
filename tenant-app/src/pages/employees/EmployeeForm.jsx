import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { employeeService, shiftService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EventIcon from '@mui/icons-material/Event';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ============================================================
// CustomSelect — matches LeaveApplication pattern exactly
// ============================================================
const CustomSelect = ({ value, onChange, options, required = false, disabled = false, placeholder = 'Select...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
        }`}
      >
        <span className="truncate text-sm">
          {selectedOption ? selectedOption.label : <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
        </span>
        <ArrowDropDownIcon
          className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ fontSize: 20 }}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer rounded-md transition-colors ${
                opt.value === value
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-100 font-medium'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// CustomDatePicker — matches LeaveApplication pattern exactly
// ============================================================
const CustomDatePicker = ({ value, onChange, max }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [viewDate, setViewDate] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toDateString = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const maxDate = max ? new Date(`${max}T00:00:00`) : null;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const formatDisplay = (d) => {
    if (!d) return 'Select date';
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSelectDay = (day) => {
    const picked = new Date(year, month, day);
    if (maxDate && picked > maxDate) return;
    onChange(toDateString(picked));
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <EventIcon className="text-gray-400 dark:text-gray-500 flex-shrink-0" style={{ fontSize: 18 }} />
          <span className="text-sm">{formatDisplay(selectedDate)}</span>
        </span>
        <ArrowDropDownIcon
          className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ fontSize: 20 }}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <ChevronLeftIcon style={{ fontSize: 20 }} />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {monthNames[month]} {year}
            </span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <ChevronRightIcon style={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Weekday header — Sunday red */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((wd, idx) => (
              <div key={wd} className={`text-center text-xs font-medium py-1 ${idx === 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const cellDate = new Date(year, month, day);
              const isSunday = cellDate.getDay() === 0;
              const isDisabled = maxDate ? cellDate > maxDate : false;
              const isSelected = selectedDate &&
                cellDate.getFullYear() === selectedDate.getFullYear() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getDate() === selectedDate.getDate();
              const isToday = cellDate.getTime() === today.getTime();

              let classes = 'text-center text-sm py-1.5 rounded-md cursor-pointer transition-colors ';
              if (isDisabled)        classes += 'text-gray-300 dark:text-gray-600 cursor-not-allowed ';
              else if (isSelected)   classes += 'bg-primary-500 text-white dark:bg-primary-600 font-semibold ';
              else if (isSunday)     classes += 'text-red-500 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900 ';
              else                   classes += 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ';
              if (isToday && !isSelected) classes += 'ring-1 ring-primary-400 ';

              return (
                <div key={day} onClick={() => !isDisabled && handleSelectDay(day)} className={classes}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// EmployeeForm
// ============================================================
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
    name: '', email: '', password: '', role: 'employee',
    department: '', position: '', salary: '', phone: '',
    dateOfBirth: '', gender: '', employmentType: 'full-time',
    workMode: 'wfo', joiningDate: '', teamLead: '', assignedShift: '',
    address: { street: '', city: '', state: '', country: '', zipCode: '' }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [teamLeads, setTeamLeads] = useState([]);

  const initialDepartments = [
    'Engineering', 'Human Resources', 'Marketing', 'Sales',
    'Finance', 'Operations', 'Customer Support', 'Design', 'Product'
  ];
  const [departments, setDepartments] = useState(() => {
    try {
      const raw = localStorage.getItem('departments');
      if (raw) return JSON.parse(raw);
    } catch { }
    return initialDepartments;
  });
  const [newDepartment, setNewDepartment] = useState('');

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const loadShifts = async () => {
    try {
      setLoadingShifts(true);
      const response = await shiftService.getAll();
      const shiftsData = Array.isArray(response) ? response : [];
      setShifts(shiftsData.filter(s => s.isActive));
    } catch (error) { console.error('Failed to load shifts:', error); }
    finally { setLoadingShifts(false); }
  };

  useEffect(() => { if (!isEdit) loadShifts(); }, [isEdit]);

  useEffect(() => {
    if (isAdmin) {
      (async () => {
        try { setTeamLeads(await employeeService.getAll()); }
        catch (error) { console.error('Failed to load team leads:', error); }
      })();
    }
  }, [isAdmin]);

  React.useEffect(() => {
    try { localStorage.setItem('departments', JSON.stringify(departments)); } catch { }
  }, [departments]);

  const toggleShowPassword = () => setShowPassword(s => !s);

  useEffect(() => { if (isEdit) loadEmployee(); }, [id]);

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const employee = await employeeService.getById(id);
      setFormData({
        ...employee,
        role: employee.user?.role || 'employee',
        password: '',
        workMode: employee.workMode || 'wfo',
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
        teamLead: employee.teamLead?._id || '',
        assignedShift: employee.assignedShift || '',
        address: {
          street: employee.address?.street || '',
          city: employee.address?.city || '',
          state: employee.address?.state || '',
          country: employee.address?.country || '',
          zipCode: employee.address?.zipCode || ''
        }
      });
      await loadShifts();
    } catch (error) {
      console.error('Failed to load employee:', error);
      setError('Failed to load employee data');
    } finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleWorkModeChange = (newMode) => setWorkModeModal({ isOpen: true, newMode });

  const confirmWorkModeChange = async () => {
    try {
      setSaving(true);
      await employeeService.update(id, { workMode: workModeModal.newMode });
      setFormData(prev => ({ ...prev, workMode: workModeModal.newMode }));
      setWorkModeModal({ isOpen: false, newMode: '' });
    } catch (error) {
      console.error('Failed to update work mode:', error);
      setError('Failed to update work mode');
    } finally { setSaving(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const submitData = { ...formData };
      if (!submitData.assignedShift) delete submitData.assignedShift;
      if (isEdit && !submitData.password) delete submitData.password;
      if (!isEdit && !submitData.joiningDate) submitData.joiningDate = new Date().toISOString().split('T')[0];
      if (isEdit) await employeeService.update(id, submitData);
      else await employeeService.create(submitData);
      navigate('/employees');
    } catch (error) {
      console.error('Failed to save employee:', error);
      setError(error.response?.data?.message || 'Failed to save employee');
    } finally { setSaving(false); }
  };

  const calculateEmploymentYears = () => {
    if (!formData.joiningDate) return 0;
    return Math.floor(Math.abs(new Date() - new Date(formData.joiningDate)) / (1000 * 60 * 60 * 24 * 365));
  };

  const getDepartmentColor = (department) => {
    const colors = {
      'Engineering':      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
      'Human Resources':  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
      'Marketing':        'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700',
      'Sales':            'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
      'Finance':          'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
      'Operations':       'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
      'Customer Support': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
      'Design':           'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
      'Product':          'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700',
    };
    return colors[department] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

  const getWorkModeColor = (workMode) => ({
    wfo:    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    wfh:    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    hybrid: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  }[workMode] || 'bg-gray-100 text-gray-800 border-gray-200');

  const getWorkModeLabel = (workMode) =>
    ({ wfo: 'Work From Office', wfh: 'Work From Home', hybrid: 'Hybrid' }[workMode] || workMode);

  const getWorkModeDescription = (workMode) => ({
    wfo:    'Employee works primarily from the office location',
    wfh:    'Employee works primarily from home or remote location',
    hybrid: 'Employee splits time between office and remote work',
  }[workMode] || '');

  // Shared classes
  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors text-sm';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  // Options for CustomSelect
  const roleOptions = [
    { value: 'employee', label: 'Employee' },
    { value: 'team-lead', label: 'Team Lead' },
    { value: 'manager', label: 'Manager' },
  ];
  const genderOptions = [
    { value: '', label: 'Select gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ];
  const departmentOptions = [
    { value: '', label: 'Select department' },
    ...departments.map(d => ({ value: d, label: d })),
  ];
  const shiftOptions = [
    { value: '', label: '-- No Shift (Use Department/Role default) --' },
    ...shifts.map(s => ({
      value: s._id,
      label: `${s.displayName} (${s.startTime} - ${s.endTime})${s.isNightShift ? ' 🌙' : ''}`,
    })),
  ];
  const teamLeadOptions = [
    { value: '', label: 'No team lead (root)' },
    ...teamLeads.map(emp => ({ value: emp._id, label: `${emp.name} (${emp.position}, ${emp.department})` })),
  ];
  const employmentTypeOptions = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' },
  ];
  const workModeOptions = [
    { value: 'wfo', label: 'Work From Office' },
    { value: 'wfh', label: 'Work From Home' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isEdit ? 'Edit Employee' : 'Add New Employee'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {isEdit ? 'Update employee information and details' : 'Create a new employee account in the system'}
            </p>
          </div>
        </div>

        {isEdit && (
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            {formData.department && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getDepartmentColor(formData.department)}`}>
                {formData.department}
              </span>
            )}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getWorkModeColor(formData.workMode)}`}>
              {getWorkModeLabel(formData.workMode)}
            </span>
            {formData.joiningDate && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
                {calculateEmploymentYears()} yr{calculateEmploymentYears() !== 1 ? 's' : ''} service
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Basic Information ─────────────────────────────────── */}
          <Card>
            <Card.Header className="border-b border-gray-200 dark:border-gray-700">
              <Card.Title className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Basic Information
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">

              <div>
                <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputCls} placeholder="Enter full name" />
              </div>

              <div>
                <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputCls} placeholder="employee@company.com" />
              </div>

              <div>
                <label className={labelCls}>
                  {isEdit ? 'New Password' : 'Password'} <span className="text-red-500">*</span>
                  {isEdit && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!isEdit}
                    className={`${inputCls} pr-10`}
                    placeholder="Enter secure password"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                {!isEdit && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters required</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputCls} placeholder="+91 00000 00000" />
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <CustomDatePicker
                    value={formData.dateOfBirth}
                    onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Gender</label>
                <CustomSelect
                  value={formData.gender}
                  onChange={(val) => setFormData(prev => ({ ...prev, gender: val }))}
                  options={genderOptions}
                  placeholder="Select gender"
                />
              </div>

            </Card.Content>
          </Card>

          {/* ── Employment Details ─────────────────────────────────── */}
          <Card>
            <Card.Header className="border-b border-gray-200 dark:border-gray-700">
              <Card.Title className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
                Employment Details
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">

              {isAdmin && (
                <div>
                  <label className={labelCls}>Role <span className="text-red-500">*</span> <span className="text-xs text-gray-400 dark:text-gray-500">(employee, team-lead, manager)</span></label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                    options={roleOptions}
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>Department <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={formData.department}
                  onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                  options={departmentOptions}
                  placeholder="Select department"
                  required
                />

                {isAdmin && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="Add new department"
                        className={`${inputCls} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = (newDepartment || '').trim();
                          if (!name) return;
                          if (departments.includes(name)) { setError('Department already exists'); return; }
                          setDepartments(prev => [name, ...prev]);
                          setNewDepartment('');
                          setError('');
                        }}
                        className="px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
                          {d}
                          <button
                            type="button"
                            onClick={() => {
                              setDepartments(prev => prev.filter(x => x !== d));
                              if (formData.department === d) setFormData(prev => ({ ...prev, department: '' }));
                            }}
                            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 ml-0.5"
                            aria-label={`Remove ${d}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                <label className={labelCls}>Position <span className="text-red-500">*</span></label>
                <input type="text" name="position" value={formData.position} onChange={handleChange} required className={inputCls} placeholder="e.g., Software Engineer" />
              </div>

              {isAdmin && (
                <div>
                  <label className={labelCls}>Assigned Shift <span className="text-xs text-gray-400 dark:text-gray-500">(Optional)</span></label>
                  <CustomSelect
                    value={formData.assignedShift}
                    onChange={(val) => setFormData(prev => ({ ...prev, assignedShift: val }))}
                    options={shiftOptions}
                    disabled={loadingShifts}
                    placeholder={loadingShifts ? 'Loading shifts...' : 'Select shift'}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    If assigned, this shift overrides department/role-based shifts.
                  </p>
                </div>
              )}

              <div>
                <label className={labelCls}>Annual Salary <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">₹</span>
                  </div>
                  <input type="number" name="salary" value={formData.salary} onChange={handleChange} required min="0" step="1" className={`${inputCls} pl-7`} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin && formData.role === 'team-lead' && (
                  <div>
                    <label className={labelCls}>Team Lead For <span className="text-xs text-gray-400 dark:text-gray-500">(optional)</span></label>
                    <CustomSelect
                      value={formData.teamLead}
                      onChange={(val) => setFormData(prev => ({ ...prev, teamLead: val }))}
                      options={teamLeadOptions}
                      placeholder="No team lead (root)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Report under a team lead</p>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Employment Type</label>
                  <CustomSelect
                    value={formData.employmentType}
                    onChange={(val) => setFormData(prev => ({ ...prev, employmentType: val }))}
                    options={employmentTypeOptions}
                  />
                </div>

                <div>
                  <label className={labelCls}>Work Mode <span className="text-red-500">*</span></label>
                  <CustomSelect
                    value={formData.workMode}
                    onChange={(val) => setFormData(prev => ({ ...prev, workMode: val }))}
                    options={workModeOptions}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Joining Date</label>
                <CustomDatePicker
                  value={formData.joiningDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, joiningDate: date }))}
                  max={new Date().toISOString().split('T')[0]}
                />
                {formData.joiningDate && (
                  <div className="flex items-center gap-2 mt-2 p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <svg className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-primary-700 dark:text-primary-300">
                      {calculateEmploymentYears()} year{calculateEmploymentYears() !== 1 ? 's' : ''} of service
                    </span>
                  </div>
                )}
              </div>

              {/* Work Mode Quick Change — edit only */}
              {isEdit && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Work Mode</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getWorkModeDescription(formData.workMode)}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getWorkModeColor(formData.workMode)}`}>
                      {getWorkModeLabel(formData.workMode)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Quick Change:</p>
                    <div className="flex gap-2">
                      {['wfo', 'wfh', 'hybrid'].map(mode =>
                        mode !== formData.workMode && (
                          <button key={mode} type="button" onClick={() => handleWorkModeChange(mode)}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 ${getWorkModeColor(mode)}`}>
                            → {getWorkModeLabel(mode)}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

            </Card.Content>
          </Card>

          {/* ── Address Information ────────────────────────────────── */}
          <Card className="lg:col-span-2">
            <Card.Header className="border-b border-gray-200 dark:border-gray-700">
              <Card.Title className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address Information
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Street Address</label>
                  <input type="text" name="address.street" value={formData.address?.street || ''} onChange={handleChange} className={inputCls} placeholder="123 Main Street, Apt 4B" />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" name="address.city" value={formData.address?.city || ''} onChange={handleChange} className={inputCls} placeholder="Chennai" />
                </div>
                <div>
                  <label className={labelCls}>State / Province</label>
                  <input type="text" name="address.state" value={formData.address?.state || ''} onChange={handleChange} className={inputCls} placeholder="Tamil Nadu" />
                </div>
                <div>
                  <label className={labelCls}>ZIP / Postal Code</label>
                  <input type="text" name="address.zipCode" value={formData.address?.zipCode || ''} onChange={handleChange} className={inputCls} placeholder="600001" />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input type="text" name="address.country" value={formData.address?.country || ''} onChange={handleChange} className={inputCls} placeholder="India" />
                </div>
              </div>
            </Card.Content>
          </Card>

        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Fields marked with <span className="text-red-500">*</span> are required
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/employees')} disabled={saving} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="w-full sm:w-auto">
              {isEdit ? (
                <><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Update Employee</>
              ) : (
                <><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Create Employee</>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Work Mode Modal */}
      <Modal isOpen={workModeModal.isOpen} onClose={() => setWorkModeModal({ isOpen: false, newMode: '' })} title="Change Work Mode" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${getWorkModeColor(formData.workMode)}`}>
              <span className="text-xs">{formData.workMode === 'wfo' ? '🏢' : formData.workMode === 'wfh' ? '🏠' : '🔀'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Current: {getWorkModeLabel(formData.workMode)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getWorkModeDescription(formData.workMode)}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${getWorkModeColor(workModeModal.newMode)}`}>
              <span className="text-xs">{workModeModal.newMode === 'wfo' ? '🏢' : workModeModal.newMode === 'wfh' ? '🏠' : '🔀'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">New: {getWorkModeLabel(workModeModal.newMode)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getWorkModeDescription(workModeModal.newMode)}</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> This change will affect attendance tracking and reporting.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setWorkModeModal({ isOpen: false, newMode: '' })} disabled={saving}>Cancel</Button>
            <Button onClick={confirmWorkModeChange} loading={saving}>Confirm Change</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeForm;
