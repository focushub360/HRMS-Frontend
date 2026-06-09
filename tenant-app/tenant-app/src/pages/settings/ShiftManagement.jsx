/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { shiftService, employeeService } from '../../services/auth';
import { showSuccess, showError } from '../../utils/toast';

// Material-UI Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import DepartmentShiftSettings from './DepartmentShiftSettings';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, shift: null, mode: 'create' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, shift: null });
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shift: null, tab: 'departments' });
  const [viewEmployeesModal, setViewEmployeesModal] = useState({ isOpen: false, shift: null, employees: [], loading: false });
  const [removeModal, setRemoveModal] = useState({ isOpen: false, shift: null, type: '', items: [], selectedItems: [], employeeDetails: [] });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('shifts');
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriod: 15,
    lateMarkingAfter: 15,
    halfDayMarkingAfter: 120,
    assignedDepartments: [],
    assignedRoles: [],
    assignedEmployees: [],
    isActive: true
  });

  // Store all employees for reference
  const [allEmployeesMap, setAllEmployeesMap] = useState({});

  useEffect(() => {
    loadShifts();
    loadAllEmployees();
  }, []);

  const loadAllEmployees = async () => {
    try {
      const employeesRes = await employeeService.getAll();
      const employeesArray = Array.isArray(employeesRes) ? employeesRes : [];
      setEmployees(employeesArray);
      
      const employeesMap = {};
      employeesArray.forEach(emp => {
        employeesMap[emp._id] = emp;
      });
      setAllEmployeesMap(employeesMap);
      
      const uniqueDepartments = [...new Set(employeesArray.map(emp => emp.department).filter(Boolean))];
      const uniqueRoles = [...new Set(employeesArray.map(emp => emp.position).filter(Boolean))];
      setDepartments(uniqueDepartments);
      setRoles(uniqueRoles);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
      setAllEmployeesMap({});
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await shiftService.getAll();
      const data = response?.data || response;
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      showError('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedEmployees = async (shift) => {
    try {
      setViewEmployeesModal({ isOpen: true, shift, employees: [], loading: true });
      
      const allEmployeesArray = employees.length > 0 ? employees : await employeeService.getAll();
      const employeesArray = Array.isArray(allEmployeesArray) ? allEmployeesArray : [];
      
      // Get directly assigned employees
      const directAssignedEmployees = employeesArray.filter(emp => 
        shift.assignedEmployees?.includes(emp._id)
      );
      
      setViewEmployeesModal({ 
        isOpen: true, 
        shift, 
        employees: directAssignedEmployees,
        loading: false 
      });
    } catch (error) {
      console.error('Failed to load assigned employees:', error);
      showError('Failed to load assigned employees');
      setViewEmployeesModal({ isOpen: false, shift: null, employees: [], loading: false });
    }
  };

  // Remove employee directly from view modal
  const handleRemoveEmployeeFromShift = async (employeeId, employeeName) => {
    try {
      const shift = viewEmployeesModal.shift;
      const remainingEmployees = shift.assignedEmployees.filter(id => id !== employeeId);
      
      await shiftService.update(shift._id, { assignedEmployees: remainingEmployees });
      showSuccess(`Removed ${employeeName} from shift`);
      
      // Refresh the employees list in the modal
      const updatedEmployees = viewEmployeesModal.employees.filter(emp => emp._id !== employeeId);
      setViewEmployeesModal(prev => ({
        ...prev,
        employees: updatedEmployees
      }));
      
      // Also refresh the main shifts list
      loadShifts();
    } catch (error) {
      console.error('Failed to remove employee:', error);
      showError(error.response?.data?.message || 'Failed to remove employee');
    }
  };

  const handleRemoveShiftAssignment = async (shift, type, itemName) => {
    try {
      const fieldName = type === 'department' ? 'assignedDepartments' : 'assignedRoles';
      const remainingItems = (shift[fieldName] || []).filter(item => item !== itemName);

      await shiftService.update(shift._id, { [fieldName]: remainingItems });
      showSuccess(`Removed ${shift.displayName} from ${itemName}`);
      loadShifts();
    } catch (error) {
      console.error(`Failed to remove ${type} shift assignment:`, error);
      showError(error.response?.data?.message || `Failed to remove ${type} shift assignment`);
    }
  };
  const [timingError, setTimingError] = useState(null);

const handleCreateShift = async () => {
  // Clear previous error
  setTimingError(null);
  
  // Validate required fields BEFORE sending
  if (!formData.name) {
    showError('Please select a shift type (Morning, Evening, Night, etc.)');
    return;
  }
  if (!formData.displayName || formData.displayName.trim() === '') {
    showError('Please enter a display name (e.g., Morning Shift)');
    return;
  }
  if (!formData.startTime) {
    showError('Please select start time');
    return;
  }
  if (!formData.endTime) {
    showError('Please select end time');
    return;
  }

  // Prepare clean data
  const shiftData = {
    name: formData.name.trim().toLowerCase(),
    displayName: formData.displayName.trim(),
    startTime: formData.startTime,
    endTime: formData.endTime,
    gracePeriod: parseInt(formData.gracePeriod) || 15,
    lateMarkingAfter: parseInt(formData.lateMarkingAfter) || 15,
    halfDayMarkingAfter: parseInt(formData.halfDayMarkingAfter) || 120,
    assignedDepartments: formData.assignedDepartments || [],
    assignedRoles: formData.assignedRoles || [],
    assignedEmployees: formData.assignedEmployees || [],
    isActive: true
  };

  console.log('📤 Sending shift data:', shiftData);

  try {
    const response = await shiftService.create(shiftData);
    console.log('✅ Shift created:', response);
    showSuccess('Shift created successfully');
    setModal({ isOpen: false, shift: null, mode: 'create' });
    setTimingError(null);
    loadShifts();
    resetForm();
  } catch (error) {
    console.error('❌ Create shift error:', error);
    
    // Check if it's a time conflict error
    if (error.response?.data?.conflict) {
      const conflict = error.response.data.conflict;
      setTimingError({
        message: error.response.data.message,
        shiftName: conflict.shiftName,
        startTime: conflict.startTime,
        endTime: conflict.endTime
      });
      // Also show toast notification
      showError(error.response.data.message);
    } else {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create shift';
      showError(errorMessage);
    }
  }
};
// Fix the time conflict check function
const checkTimeConflict = async (startTime, endTime) => {
  if (!startTime || !endTime) return;
  
  try {
    const allShifts = await shiftService.getAll();
    const shifts = Array.isArray(allShifts) ? allShifts : (allShifts?.data || []);
    
    const convertToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const newStart = convertToMinutes(startTime);
    let newEnd = convertToMinutes(endTime);
    
    // Handle overnight shifts
    let newEndAdjusted = newEnd;
    if (newEnd < newStart) {
      newEndAdjusted = newEnd + (24 * 60);
    }
    
    const conflictingShift = shifts.find(shift => {
      // Skip checking against itself when editing
      if (modal.mode === 'edit' && shift._id === modal.shift?._id) return false;
      
      const existingStart = convertToMinutes(shift.startTime);
      let existingEnd = convertToMinutes(shift.endTime);
      
      // Handle overnight shifts for existing shift
      let existingEndAdjusted = existingEnd;
      if (existingEnd < existingStart) {
        existingEndAdjusted = existingEnd + (24 * 60);
      }
      
      // Check for overlap - FIXED LOGIC
      // Two time ranges overlap if:
      // New start is before existing end AND new end is after existing start
      const overlap = (newStart < existingEndAdjusted && newEndAdjusted > existingStart);
      
      return overlap;
    });
    
    if (conflictingShift) {
      setTimingError({
        message: `Time conflict! Shift "${conflictingShift.displayName}" already exists from ${conflictingShift.startTime} to ${conflictingShift.endTime}. Please choose a different time slot.`,
        shiftName: conflictingShift.displayName,
        startTime: conflictingShift.startTime,
        endTime: conflictingShift.endTime
      });
    } else {
      setTimingError(null);
    }
  } catch (error) {
    console.error('Error checking time conflict:', error);
  }
};

const handleUpdateShift = async () => {
  // Validate timing
  const startMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]);
  let endMinutes = parseInt(formData.endTime.split(':')[0]) * 60 + parseInt(formData.endTime.split(':')[1]);
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  if (endMinutes <= startMinutes) {
    showError('End time must be after start time');
    return;
  }

  try {
    const response = await shiftService.update(modal.shift._id, formData);
    console.log('✅ Shift updated:', response);
    showSuccess('Shift updated successfully');
    setModal({ isOpen: false, shift: null, mode: 'create' });
    loadShifts();
    resetForm();
  } catch (error) {
    console.error('Failed to update shift:', error);
    
    // Check if it's a time conflict error
    if (error.response?.data?.conflict) {
      const conflict = error.response.data.conflict;
      showError(
        `⚠️ Time Conflict!\n\nShift "${conflict.shiftName}" already exists from ${conflict.startTime} to ${conflict.endTime}.\n\nPlease choose a different time slot.`,
        { duration: 5000 }
      );
    } else {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update shift';
      showError(errorMessage);
    }
  }
};

  // HARD DELETE - Permanent removal
  const handleDeleteShift = async () => {
    try {
      await shiftService.delete(deleteModal.shift._id);
      showSuccess('Shift deleted permanently');
      setDeleteModal({ isOpen: false, shift: null });
      loadShifts();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete shift';
      showError(errorMessage);
    }
  };

  const handleAssign = async () => {
    try {
      if (assignmentModal.tab === 'departments' && selectedItems.length > 0) {
        await shiftService.assignToDepartments(assignmentModal.shift._id, selectedItems);
        showSuccess(`Shift assigned to ${selectedItems.length} departments`);
      } else if (assignmentModal.tab === 'roles' && selectedItems.length > 0) {
        await shiftService.assignToRoles(assignmentModal.shift._id, selectedItems);
        showSuccess(`Shift assigned to ${selectedItems.length} roles`);
      } else if (assignmentModal.tab === 'employees' && selectedItems.length > 0) {
        await shiftService.assignToEmployees(assignmentModal.shift._id, selectedItems);
        showSuccess(`Shift assigned to ${selectedItems.length} employees`);
      }
      setAssignmentModal({ isOpen: false, shift: null, tab: 'departments' });
      setSelectedItems([]);
      loadShifts();
    } catch (error) {
      console.error('Failed to assign shift:', error);
      showError(error.response?.data?.message || 'Failed to assign shift');
    }
  };

  const openEditModal = (shift) => {
    setFormData({
      name: shift.name,
      displayName: shift.displayName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod,
      lateMarkingAfter: shift.lateMarkingAfter,
      halfDayMarkingAfter: shift.halfDayMarkingAfter,
      assignedDepartments: shift.assignedDepartments || [],
      assignedRoles: shift.assignedRoles || [],
      assignedEmployees: shift.assignedEmployees || [],
      isActive: shift.isActive
    });
    setModal({ isOpen: true, shift, mode: 'edit' });
  };

  const openAssignmentModal = async (shift) => {
    setAssignmentModal({ isOpen: true, shift, tab: 'departments' });
    setSelectedItems([]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
      lateMarkingAfter: 15,
      halfDayMarkingAfter: 120,
      assignedDepartments: [],
      assignedRoles: [],
      assignedEmployees: [],
      isActive: true
    });
  };

  const getShiftIcon = (name) => {
    switch (name) {
      case 'morning':
        return <WbSunnyIcon className="w-6 h-6 text-yellow-500" />;
      case 'afternoon':
        return <WbSunnyIcon className="w-6 h-6 text-orange-500" />;
      case 'night':
        return <NightsStayIcon className="w-6 h-6 text-indigo-500" />;
      default:
        return <ScheduleIcon className="w-6 h-6 text-primary-500" />;
    }
  };
  const formatDuration = (hours) => {
  if (!hours && hours !== 0) return '--:--';
  
  // Convert to number if it's a string
  const totalHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  // Check if it's a valid number
  if (isNaN(totalHours)) return '--:--';
  
  // Calculate hours and minutes
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);
  
  // Format as "Xh Ym" or just "Xh" if minutes is 0
  if (mins === 0) {
    return `${hrs}h`;
  }
  return `${hrs}h ${mins}m`;
};

  const formatTime = (time) => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

  const shiftOverview = useMemo(() => {
    const activeShifts = shifts.filter(shift => shift.isActive !== false);
    const activeEmployees = employees.filter(emp => emp.isActive !== false);
    const employeeShiftMap = new Map();

    const addEmployeeShift = (employee, shift, source) => {
      if (!employee?._id || !shift?._id) return;
      if (!employeeShiftMap.has(employee._id)) {
        employeeShiftMap.set(employee._id, {
          employee,
          shiftsById: new Map()
        });
      }

      const employeeShift = employeeShiftMap.get(employee._id);
      const shiftId = shift._id.toString();
      const current = employeeShift.shiftsById.get(shiftId);
      const sourceLabels = {
        department: 'Department',
        role: 'Role',
        employee: 'Employee'
      };

      employeeShift.shiftsById.set(shiftId, {
        shift,
        sources: current
          ? Array.from(new Set([...current.sources, sourceLabels[source]]))
          : [sourceLabels[source]]
      });
    };

    activeShifts.forEach(shift => {
      const assignedDepartments = shift.assignedDepartments || [];
      const assignedRoles = shift.assignedRoles || [];
      const assignedEmployees = (shift.assignedEmployees || []).map(id => id?.toString?.() || id);

      activeEmployees.forEach(employee => {
        if (assignedDepartments.includes(employee.department)) {
          addEmployeeShift(employee, shift, 'department');
        }

        if (assignedRoles.includes(employee.position)) {
          addEmployeeShift(employee, shift, 'role');
        }

        if (assignedEmployees.includes(employee._id?.toString?.() || employee._id)) {
          addEmployeeShift(employee, shift, 'employee');
        }
      });
    });

    const departmentAssignments = departments.map(department => ({
      name: department,
      shifts: activeShifts.filter(shift => (shift.assignedDepartments || []).includes(department))
    })).filter(item => item.shifts.length > 0);

    const roleAssignments = roles.map(role => ({
      name: role,
      shifts: activeShifts.filter(shift => (shift.assignedRoles || []).includes(role))
    })).filter(item => item.shifts.length > 0);

    const employeeAssignments = activeEmployees.map(employee => {
      const assignedShifts = activeShifts.filter(shift => {
        const assignedEmployees = (shift.assignedEmployees || []).map(id => id?.toString?.() || id);
        return assignedEmployees.includes(employee._id?.toString?.() || employee._id);
      });

      return {
        employee,
        shifts: assignedShifts
      };
    }).filter(item => item.shifts.length > 0);

    const multiShiftEmployees = Array.from(employeeShiftMap.values())
      .map(item => ({
        employee: item.employee,
        shifts: Array.from(item.shiftsById.values())
          .sort((a, b) => (a.shift.startTime || '').localeCompare(b.shift.startTime || ''))
      }))
      .filter(item => item.shifts.length > 1)
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

    return {
      departmentAssignments,
      roleAssignments,
      employeeAssignments,
      multiShiftEmployees,
      activeShiftCount: activeShifts.length
    };
  }, [departments, employees, roles, shifts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shift Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage shifts and department shift requirements
          </p>
        </div>
        {activeTab === 'shifts' && (
          <Button onClick={() => setModal({ isOpen: true, shift: null, mode: 'create' })}>
            <AddIcon className="w-4 h-4 mr-2" />
            Create Shift
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'shifts'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <ScheduleIcon className="w-4 h-4 inline mr-2" />
          Shifts
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <AssignmentIcon className="w-4 h-4 inline mr-2" />
          Shift Overview
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'departments'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <BusinessIcon className="w-4 h-4 inline mr-2" />
          Department Settings
        </button>
      </div>

      {/* Shifts Grid */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <Card key={shift._id} className="hover:shadow-lg transition-shadow">
              <Card.Content className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      {getShiftIcon(shift.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {shift.displayName}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize">{shift.name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    shift.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {shift.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">Timing:</span>
    <span className="font-medium text-gray-900 dark:text-gray-100">
      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
    </span>
  </div>
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">Duration:</span>
    <span className="font-medium text-gray-900 dark:text-gray-100">
      {formatDuration(shift.durationHours || shift.duration)}
    </span>
  </div>
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">Night Shift:</span>
    <span className={`font-medium ${shift.isNightShift ? 'text-indigo-600' : 'text-gray-600'}`}>
      {shift.isNightShift ? 'Yes' : 'No'}
    </span>
  </div>
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">Grace Period:</span>
    <span className="text-gray-900">{shift.gracePeriod} min</span>
  </div>
</div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center">
                      <BusinessIcon className="w-3 h-3 mr-1" />
                      Departments:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {shift.assignedDepartments?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center">
                      <WorkIcon className="w-3 h-3 mr-1" />
                      Roles:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {shift.assignedRoles?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center">
                      <PeopleIcon className="w-3 h-3 mr-1" />
                      Direct Employees:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {shift.assignedEmployees?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAssignmentModal(shift)}
                    className="p-2"
                    title="Assign Shift"
                  >
                    <AssignmentIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(shift)}
                    className="p-2"
                    title="Edit Shift"
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadAssignedEmployees(shift)}
                    className="p-2"
                    title="View Assigned Employees"
                  >
                    <VisibilityIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModal({ isOpen: true, shift })}
                    className="p-2"
                    title="Permanently Delete Shift"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Department Settings Tab */}
      {activeTab === 'departments' && (
        <DepartmentShiftSettings />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <Card.Content className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Active Shifts</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{shiftOverview.activeShiftCount}</p>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Departments</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{shiftOverview.departmentAssignments.length}</p>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Roles</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{shiftOverview.roleAssignments.length}</p>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Multi-Shift Employees</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{shiftOverview.multiShiftEmployees.length}</p>
              </Card.Content>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center text-base">
                  <BusinessIcon className="w-4 h-4 mr-2" />
                  Department Allotment
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3">
                {shiftOverview.departmentAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No department shifts allotted.</p>
                ) : shiftOverview.departmentAssignments.map(item => (
                  <div key={item.name} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                      <span className="text-xs text-gray-500">{item.shifts.length} shifts</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.shifts.map(shift => (
                        <span key={shift._id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          <span>{shift.displayName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove ${shift.displayName} from department ${item.name}?`)) {
                                handleRemoveShiftAssignment(shift, 'department', item.name);
                              }
                            }}
                            className="text-blue-500 hover:text-red-600 rounded"
                            title={`Remove ${shift.displayName} from ${item.name}`}
                          >
                            <CloseIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center text-base">
                  <WorkIcon className="w-4 h-4 mr-2" />
                  Role Allotment
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3">
                {shiftOverview.roleAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No role shifts allotted.</p>
                ) : shiftOverview.roleAssignments.map(item => (
                  <div key={item.name} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                      <span className="text-xs text-gray-500">{item.shifts.length} shifts</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.shifts.map(shift => (
                        <span key={shift._id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          <span>{shift.displayName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove ${shift.displayName} from role ${item.name}?`)) {
                                handleRemoveShiftAssignment(shift, 'role', item.name);
                              }
                            }}
                            className="text-emerald-500 hover:text-red-600 rounded"
                            title={`Remove ${shift.displayName} from ${item.name}`}
                          >
                            <CloseIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title className="flex items-center text-base">
                  <PeopleIcon className="w-4 h-4 mr-2" />
                  Employee Allotment
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3">
                {shiftOverview.employeeAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No employees directly allotted to shifts.</p>
                ) : shiftOverview.employeeAssignments.map(item => (
                  <div key={item.employee._id} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.employee.name}</p>
                        <p className="text-xs text-gray-500">{item.employee.department} • {item.employee.position}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{item.shifts.length} shifts</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.shifts.map(shift => (
                        <span key={shift._id} className="px-2 py-1 text-xs rounded bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                          {shift.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>

          <Card>
            <Card.Header>
              <Card.Title>Employees Assigned Multiple Shifts</Card.Title>
            </Card.Header>
            <Card.Content>
              {shiftOverview.multiShiftEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <PeopleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No employee is currently assigned to multiple shifts.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift Overview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {shiftOverview.multiShiftEmployees.map(item => (
                        <tr key={item.employee._id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.employee.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.employee.department || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.employee.position || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.shifts.map(({ shift, sources }) => (
                                <span key={shift._id} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                  {shift.displayName} ({formatTime(shift.startTime)} - {formatTime(shift.endTime)}) • {sources.join(', ')}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {shifts.length === 0 && activeTab === 'shifts' && (
        <div className="text-center py-12">
          <ScheduleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Shifts Created</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Create your first shift to start managing employee work schedules and attendance restrictions.
          </p>
          <Button onClick={() => setModal({ isOpen: true, shift: null, mode: 'create' })}>
            <AddIcon className="w-4 h-4 mr-2" />
            Create First Shift
          </Button>
        </div>
      )}

      {/* Create/Edit Shift Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => {
          setModal({ isOpen: false, shift: null, mode: 'create' });
          resetForm();
        }}
        title={modal.mode === 'create' ? 'Create New Shift' : 'Edit Shift'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shift Name <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                required
              >
                <option value="">Select shift type</option>
                <option value="morning">Morning Shift</option>
                <option value="afternoon">Afternoon Shift</option>
                <option value="evening">Evening Shift</option>
                <option value="night">Night Shift</option>
                <option value="general">General Shift</option>
                <option value="custom">Custom Shift</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                placeholder="e.g., Morning Shift"
                required
              />
            </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Start Time <span className="text-red-500">*</span>
        </label>
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => {
            setTimingError(null);
            setFormData({ ...formData, startTime: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          End Time <span className="text-red-500">*</span>
        </label>
        <input
          type="time"
          value={formData.endTime}
          onChange={(e) => {
            setTimingError(null);
            setFormData({ ...formData, endTime: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          required
        />
      </div>
    </div>

    {/* ✅ ADD THIS ERROR DISPLAY SECTION */}
    {timingError && (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Time Conflict Detected</h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {timingError.message}
            </p>
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-800/30 rounded">
              <p className="text-xs text-red-600 dark:text-red-300">
                Conflicting shift: <span className="font-semibold">{timingError.shiftName}</span>
                ({timingError.startTime} - {timingError.endTime})
              </p>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Please choose a different time slot that doesn't overlap with existing shifts.
            </p>
          </div>
          <button
            onClick={() => setTimingError(null)}
            className="flex-shrink-0 text-red-500 hover:text-red-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )}

          <div className="grid grid-cols-1 gap-4">
            {/*
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grace Period (min)
              </label>
              <input
                type="number"
                value={formData.gracePeriod}
                onChange={(e) => setFormData({ ...formData, gracePeriod: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                min="0"
                max="60"
              />
              <p className="text-xs text-gray-500 mt-1">Allowed after start time</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Late After (min)
              </label>
              <input
                type="number"
                value={formData.lateMarkingAfter}
                onChange={(e) => setFormData({ ...formData, lateMarkingAfter: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                min="0"
                max="120"
              />
              <p className="text-xs text-gray-500 mt-1">Mark as late after</p>
            </div>
            */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Half-Day After (min)
              </label>
              <input
                type="number"
                value={formData.halfDayMarkingAfter}
                onChange={(e) => setFormData({ ...formData, halfDayMarkingAfter: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                min="0"
                max="240"
              />
              <p className="text-xs text-gray-500 mt-1">Must take half-day after</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setModal({ isOpen: false, shift: null, mode: 'create' });
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={modal.mode === 'create' ? handleCreateShift : handleUpdateShift}>
              {modal.mode === 'create' ? 'Create Shift' : 'Update Shift'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={assignmentModal.isOpen}
        onClose={() => {
          setAssignmentModal({ isOpen: false, shift: null, tab: 'departments' });
          setSelectedItems([]);
        }}
        title={`Assign Shift: ${assignmentModal.shift?.displayName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setAssignmentModal(prev => ({ ...prev, tab: 'departments' }));
                setSelectedItems([]);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                assignmentModal.tab === 'departments'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BusinessIcon className="w-4 h-4 inline mr-2" />
              By Department
            </button>
            <button
              onClick={() => {
                setAssignmentModal(prev => ({ ...prev, tab: 'roles' }));
                setSelectedItems([]);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                assignmentModal.tab === 'roles'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <WorkIcon className="w-4 h-4 inline mr-2" />
              By Role
            </button>
            <button
              onClick={() => {
                setAssignmentModal(prev => ({ ...prev, tab: 'employees' }));
                setSelectedItems([]);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                assignmentModal.tab === 'employees'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PeopleIcon className="w-4 h-4 inline mr-2" />
              By Employee
            </button>
          </div>

          {assignmentModal.tab === 'departments' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select departments to assign this shift to all employees in those departments.
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                {Array.isArray(departments) && departments.map((dept) => (
                  <label key={dept} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(dept)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, dept]);
                        } else {
                          setSelectedItems(selectedItems.filter(d => d !== dept));
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">{dept}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {assignmentModal.tab === 'roles' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select roles to assign this shift to all employees with those positions.
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                {Array.isArray(roles) && roles.map((role) => (
                  <label key={role} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, role]);
                        } else {
                          setSelectedItems(selectedItems.filter(r => r !== role));
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {assignmentModal.tab === 'employees' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select individual employees to assign this shift directly.
              </p>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                {Array.isArray(employees) && employees
                  .filter(emp => 
                    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((emp) => (
                    <label key={emp._id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(emp._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, emp._id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== emp._id));
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.department} • {emp.position}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setAssignmentModal({ isOpen: false, shift: null, tab: 'departments' });
                setSelectedItems([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={selectedItems.length === 0}>
              Assign Shift
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Assigned Employees Modal - WITH REMOVE BUTTON */}
      <Modal
        isOpen={viewEmployeesModal.isOpen}
        onClose={() => setViewEmployeesModal({ isOpen: false, shift: null, employees: [] })}
        title={`Directly Assigned Employees - ${viewEmployeesModal.shift?.displayName}`}
        size="lg"
      >
        <div className="space-y-4">
          {viewEmployeesModal.loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : viewEmployeesModal.employees.length === 0 ? (
            <div className="text-center py-8">
              <PeopleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees directly assigned to this shift</p>
              <p className="text-sm text-gray-400 mt-2">
                Use the "Assign" button to add employees to this shift
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Total Directly Assigned: <span className="font-semibold">{viewEmployeesModal.employees.length}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Click the <RemoveIcon className="w-3 h-3 inline text-red-500" /> icon to remove an employee from this shift
                </p>
              </div>
              <div className="space-y-2">
                {viewEmployeesModal.employees.map((emp) => (
                  <div key={emp._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <PeopleIcon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{emp.department} • {emp.position}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove ${emp.name} from this shift?`)) {
                          handleRemoveEmployeeFromShift(emp._id, emp.name);
                        }
                      }}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title={`Remove ${emp.name} from shift`}
                    >
                      <RemoveIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => setViewEmployeesModal({ isOpen: false, shift: null, employees: [] })}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal - HARD DELETE ONLY */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, shift: null })}
        title="⚠️ Permanently Delete Shift"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300 font-medium mb-2">
              You are about to permanently delete: <strong>{deleteModal.shift?.displayName}</strong>
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              ⚠️ This action is <strong>IRREVERSIBLE</strong>. The shift will be completely removed from the database.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setDeleteModal({ isOpen: false, shift: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteShift}>
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShiftManagement;
