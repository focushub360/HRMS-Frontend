import React, { useMemo, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { shiftService, employeeService } from '../../services/auth';
import { showSuccess, showError } from '../../utils/toast';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DepartmentShiftSettings from './DepartmentShiftSettings';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';

// ============================================================
// CustomTimePicker — dropdown rendered via portal so it is
// never clipped by any ancestor overflow:hidden / overflow:auto
// ============================================================
const CustomTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);

  const parse24h = (val) => {
    if (!val) return { hour12: 9, minute: 0, ampm: 'AM' };
    const [h, m] = val.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return { hour12, minute: m || 0, ampm };
  };

  const to24h = ({ hour12, minute, ampm }) => {
    let h = hour12 % 12;
    if (ampm === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const { hour12, minute, ampm } = parse24h(value);

  const setHour   = (h) => onChange(to24h({ hour12: h, minute, ampm }));
  const setMinute = (m) => onChange(to24h({ hour12, minute: m, ampm }));
  const setAmpm   = (a) => onChange(to24h({ hour12, minute, ampm: a }));

  const display = value
    ? `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`
    : 'Select time';

  // Reposition the portal dropdown to sit below the trigger button
  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 256,
        zIndex: 99999,
      });
    }
    setIsOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        !document.getElementById('time-picker-portal')?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle((prev) => ({ ...prev, top: rect.bottom + 4, left: rect.left }));
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen]);

  const hours   = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const dropdown = (
    <div
      id="time-picker-portal"
      style={dropdownStyle}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
    >
      <div className="text-center mb-3 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
        <span className="text-lg font-semibold text-primary-700 dark:text-primary-300">
          {String(hour12).padStart(2, '0')}:{String(minute).padStart(2, '0')} {ampm}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 text-center">Hour</p>
          <div
            className="max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md"
            style={{ scrollbarWidth: 'none' }}
          >
            {hours.map((h) => (
              <div
                key={h}
                onClick={() => setHour(h)}
                className={`px-2 py-1.5 text-sm text-center cursor-pointer transition-colors ${
                  h === hour12
                    ? 'bg-primary-500 text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 text-center">Min</p>
          <div
            className="max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md"
            style={{ scrollbarWidth: 'none' }}
          >
            {minutes.map((m) => (
              <div
                key={m}
                onClick={() => setMinute(m)}
                className={`px-2 py-1.5 text-sm text-center cursor-pointer transition-colors ${
                  m === minute
                    ? 'bg-primary-500 text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {String(m).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        <div className="w-14">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 text-center">AM/PM</p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            {['AM', 'PM'].map((a) => (
              <div
                key={a}
                onClick={() => setAmpm(a)}
                className={`px-2 py-2.5 text-sm text-center cursor-pointer transition-colors font-medium ${
                  a === ampm
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {a}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="mt-3 w-full py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
      >
        Done
      </button>
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm">
          <ScheduleIcon className="text-gray-400 dark:text-gray-500 flex-shrink-0" style={{ fontSize: 18 }} />
          <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
            {display}
          </span>
        </span>
        <ArrowDropDownIcon
          className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ fontSize: 20 }}
        />
      </button>

      {isOpen && ReactDOM.createPortal(dropdown, document.body)}
    </div>
  );
};

// ============================================================
// Time helpers — all in minutes since midnight
// ============================================================

/** Convert "HH:MM" → minutes since midnight (0–1439) */
const toMins = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Calculate shift duration in minutes, crossing midnight correctly.
 * e.g. 22:00 → 06:00 = 480 min (not -960)
 */
const shiftDurationMins = (startTime, endTime) => {
  const s = toMins(startTime);
  const e = toMins(endTime);
  return e > s ? e - s : e + 1440 - s;
};



// ============================================================
// ShiftManagement
// ============================================================
const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, shift: null, mode: 'create' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, shift: null });
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, shift: null, tab: 'departments' });
  const [viewEmployeesModal, setViewEmployeesModal] = useState({ isOpen: false, shift: null, employees: [], loading: false });
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
    isActive: true,
  });
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
      employeesArray.forEach((emp) => { employeesMap[emp._id] = emp; });
      setAllEmployeesMap(employeesMap);
      setDepartments([...new Set(employeesArray.map((emp) => emp.department).filter(Boolean))]);
      setRoles([...new Set(employeesArray.map((emp) => emp.position).filter(Boolean))]);
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
      const directAssignedEmployees = employeesArray.filter((emp) =>
        shift.assignedEmployees?.includes(emp._id)
      );
      setViewEmployeesModal({ isOpen: true, shift, employees: directAssignedEmployees, loading: false });
    } catch (error) {
      console.error('Failed to load assigned employees:', error);
      showError('Failed to load assigned employees');
      setViewEmployeesModal({ isOpen: false, shift: null, employees: [], loading: false });
    }
  };

  const handleRemoveEmployeeFromShift = async (employeeId, employeeName) => {
    try {
      const shift = viewEmployeesModal.shift;
      const remainingEmployees = shift.assignedEmployees.filter((id) => id !== employeeId);
      await shiftService.update(shift._id, { assignedEmployees: remainingEmployees });
      showSuccess(`Removed ${employeeName} from shift`);
      setViewEmployeesModal((prev) => ({
        ...prev,
        employees: prev.employees.filter((emp) => emp._id !== employeeId),
      }));
      loadShifts();
    } catch (error) {
      console.error('Failed to remove employee:', error);
      showError(error.response?.data?.message || 'Failed to remove employee');
    }
  };

  const handleRemoveShiftAssignment = async (shift, type, itemName) => {
    try {
      const fieldName = type === 'department' ? 'assignedDepartments' : 'assignedRoles';
      const remainingItems = (shift[fieldName] || []).filter((item) => item !== itemName);
      await shiftService.update(shift._id, { [fieldName]: remainingItems });
      showSuccess(`Removed ${shift.displayName} from ${itemName}`);
      loadShifts();
    } catch (error) {
      console.error(`Failed to remove ${type} shift assignment:`, error);
      showError(error.response?.data?.message || `Failed to remove ${type} shift assignment`);
    }
  };



  // ── Create ─────────────────────────────────────────────────
  const handleCreateShift = async () => {
    if (!formData.name)               { showError('Please select a shift type'); return; }
    if (!formData.displayName?.trim()) { showError('Please enter a display name'); return; }
    if (!formData.startTime)          { showError('Please select start time'); return; }
    if (!formData.endTime)            { showError('Please select end time'); return; }

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
      isActive: true,
    };

    try {
      await shiftService.create(shiftData);
      showSuccess('Shift created successfully');
      setModal({ isOpen: false, shift: null, mode: 'create' });
      loadShifts();
      resetForm();
    } catch (error) {
      console.error('Create shift error:', error);
      showError(error.response?.data?.message || error.response?.data?.error || 'Failed to create shift');
    }
  };

  // ── Update ─────────────────────────────────────────────────
  const handleUpdateShift = async () => {
    try {
      await shiftService.update(modal.shift._id, formData);
      showSuccess('Shift updated successfully');
      setModal({ isOpen: false, shift: null, mode: 'create' });
      loadShifts();
      resetForm();
    } catch (error) {
      console.error('Failed to update shift:', error);
      showError(error.response?.data?.message || error.response?.data?.error || 'Failed to update shift');
    }
  };

  const handleDeleteShift = async () => {
    try {
      await shiftService.delete(deleteModal.shift._id);
      showSuccess('Shift deleted permanently');
      setDeleteModal({ isOpen: false, shift: null });
      loadShifts();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      showError(error.response?.data?.message || 'Failed to delete shift');
    }
  };

  const handleAssign = async () => {
    try {
      if (assignmentModal.tab === 'departments' && selectedItems.length > 0) {
        await shiftService.assignToDepartments(assignmentModal.shift._id, selectedItems);
        showSuccess(`Shift assigned to ${selectedItems.length} department${selectedItems.length > 1 ? 's' : ''}`);
      } else if (assignmentModal.tab === 'roles' && selectedItems.length > 0) {
        await shiftService.assignToRoles(assignmentModal.shift._id, selectedItems);
        showSuccess(`Shift assigned to ${selectedItems.length} role${selectedItems.length > 1 ? 's' : ''}`);
      } else if (assignmentModal.tab === 'employees' && selectedItems.length > 0) {
        await shiftService.assignToEmployees(assignmentModal.shift._id, selectedItems);
        showSuccess(`Shift assigned to ${selectedItems.length} employee${selectedItems.length > 1 ? 's' : ''}`);
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
      isActive: shift.isActive,
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
      isActive: true,
    });
  };

  const getShiftIcon = (name) => {
    switch (name) {
      case 'morning':   return <WbSunnyIcon className="w-6 h-6 text-yellow-500" />;
      case 'afternoon': return <WbSunnyIcon className="w-6 h-6 text-orange-500" />;
      case 'night':     return <NightsStayIcon className="w-6 h-6 text-indigo-500" />;
      default:          return <ScheduleIcon className="w-6 h-6 text-primary-500" />;
    }
  };

  const formatDuration = (startTime, endTime, legacyHours) => {
    // Prefer live calculation from startTime/endTime when both are available
    if (startTime && endTime) {
      const mins = shiftDurationMins(startTime, endTime);
      const hrs  = Math.floor(mins / 60);
      const rem  = mins % 60;
      return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
    }
    // Fallback to server-provided durationHours
    if (!legacyHours && legacyHours !== 0) return '--:--';
    const total = typeof legacyHours === 'string' ? parseFloat(legacyHours) : legacyHours;
    if (isNaN(total)) return '--:--';
    const hrs  = Math.floor(total);
    const mins = Math.round((total - hrs) * 60);
    return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const shiftOverview = useMemo(() => {
    const activeShifts    = shifts.filter((s) => s.isActive !== false);
    const activeEmployees = employees.filter((e) => e.isActive !== false);
    const employeeShiftMap = new Map();

    const addEmployeeShift = (employee, shift, source) => {
      if (!employee?._id || !shift?._id) return;
      if (!employeeShiftMap.has(employee._id)) {
        employeeShiftMap.set(employee._id, { employee, shiftsById: new Map() });
      }
      const empShift = employeeShiftMap.get(employee._id);
      const shiftId  = shift._id.toString();
      const current  = empShift.shiftsById.get(shiftId);
      const labels   = { department: 'Department', role: 'Role', employee: 'Employee' };
      empShift.shiftsById.set(shiftId, {
        shift,
        sources: current
          ? Array.from(new Set([...current.sources, labels[source]]))
          : [labels[source]],
      });
    };

    activeShifts.forEach((shift) => {
      const assignedDepts = shift.assignedDepartments || [];
      const assignedRoles = shift.assignedRoles || [];
      const assignedEmps  = (shift.assignedEmployees || []).map((id) => id?.toString?.() || id);
      activeEmployees.forEach((emp) => {
        if (assignedDepts.includes(emp.department))                           addEmployeeShift(emp, shift, 'department');
        if (assignedRoles.includes(emp.position))                             addEmployeeShift(emp, shift, 'role');
        if (assignedEmps.includes(emp._id?.toString?.() || emp._id))         addEmployeeShift(emp, shift, 'employee');
      });
    });

    const departmentAssignments = departments
      .map((dept) => ({ name: dept, shifts: activeShifts.filter((s) => (s.assignedDepartments || []).includes(dept)) }))
      .filter((i) => i.shifts.length > 0);

    const roleAssignments = roles
      .map((role) => ({ name: role, shifts: activeShifts.filter((s) => (s.assignedRoles || []).includes(role)) }))
      .filter((i) => i.shifts.length > 0);

    const employeeAssignments = activeEmployees
      .map((emp) => ({
        employee: emp,
        shifts: activeShifts.filter((s) => {
          const ae = (s.assignedEmployees || []).map((id) => id?.toString?.() || id);
          return ae.includes(emp._id?.toString?.() || emp._id);
        }),
      }))
      .filter((i) => i.shifts.length > 0);

    const multiShiftEmployees = Array.from(employeeShiftMap.values())
      .map((item) => ({
        employee: item.employee,
        shifts: Array.from(item.shiftsById.values()).sort((a, b) =>
          (a.shift.startTime || '').localeCompare(b.shift.startTime || '')
        ),
      }))
      .filter((i) => i.shifts.length > 1)
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

    return { departmentAssignments, roleAssignments, employeeAssignments, multiShiftEmployees, activeShiftCount: activeShifts.length };
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
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage shifts and department shift requirements</p>
        </div>
        {activeTab === 'shifts' && (
          <Button onClick={() => { resetForm(); setModal({ isOpen: true, shift: null, mode: 'create' }); }}>
            <AddIcon className="w-4 h-4 mr-2" />
            Create Shift
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'shifts',      label: 'Shifts',             Icon: ScheduleIcon   },
          { key: 'overview',    label: 'Shift Overview',      Icon: AssignmentIcon },
          { key: 'departments', label: 'Department Settings', Icon: BusinessIcon   },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4 inline mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Shifts Grid ── */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <Card key={shift._id} className="hover:shadow-lg transition-shadow h-full">
              <Card.Content className="p-6">
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      {getShiftIcon(shift.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{shift.displayName}</h3>
                      <p className="text-xs text-gray-500 capitalize">{shift.name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                    shift.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {shift.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Timing info */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Timing:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDuration(shift.startTime, shift.endTime, shift.durationHours || shift.duration)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Night Shift:</span>
                    <span className={`font-medium ${shift.isNightShift ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {shift.isNightShift ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Grace Period:</span>
                    <span className="text-gray-900 dark:text-gray-100">{shift.gracePeriod} min</span>
                  </div>
                </div>

                {/* Assignment counts */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                  {[
                    { Icon: BusinessIcon, label: 'Departments',      count: shift.assignedDepartments?.length || 0 },
                    { Icon: WorkIcon,     label: 'Roles',            count: shift.assignedRoles?.length || 0 },
                    { Icon: PeopleIcon,   label: 'Direct Employees', count: shift.assignedEmployees?.length || 0 },
                  ].map(({ Icon, label, count }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center">
                        <Icon className="w-3 h-3 mr-1" />{label}:
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" size="sm" onClick={() => openAssignmentModal(shift)}              className="p-2" title="Assign Shift"><AssignmentIcon className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => openEditModal(shift)}                    className="p-2" title="Edit Shift"><EditIcon className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => loadAssignedEmployees(shift)}            className="p-2" title="View Employees"><VisibilityIcon className="w-4 h-4" /></Button>
                  <Button variant="danger"  size="sm" onClick={() => setDeleteModal({ isOpen: true, shift })} className="p-2" title="Delete Shift"><DeleteIcon className="w-4 h-4" /></Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* ── Department Settings ── */}
      {activeTab === 'departments' && <DepartmentShiftSettings />}

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Shifts',        value: shiftOverview.activeShiftCount             },
              { label: 'Departments',           value: shiftOverview.departmentAssignments.length },
              { label: 'Roles',                 value: shiftOverview.roleAssignments.length       },
              { label: 'Multi-Shift Employees', value: shiftOverview.multiShiftEmployees.length   },
            ].map(({ label, value }) => (
              <Card key={label}>
                <Card.Content className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
                </Card.Content>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center text-base">
                  <BusinessIcon className="w-4 h-4 mr-2" />Department Allotment
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3">
                {shiftOverview.departmentAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No department shifts allotted.</p>
                ) : shiftOverview.departmentAssignments.map((item) => (
                  <div key={item.name} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                      <span className="text-xs text-gray-500">{item.shifts.length} shift{item.shifts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.shifts.map((shift) => (
                        <span key={shift._id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {shift.displayName}
                          <button
                            type="button"
                            onClick={() => { if (window.confirm(`Remove ${shift.displayName} from department ${item.name}?`)) handleRemoveShiftAssignment(shift, 'department', item.name); }}
                            className="text-blue-500 hover:text-red-600 rounded"
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
                  <WorkIcon className="w-4 h-4 mr-2" />Role Allotment
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3">
                {shiftOverview.roleAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No role shifts allotted.</p>
                ) : shiftOverview.roleAssignments.map((item) => (
                  <div key={item.name} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                      <span className="text-xs text-gray-500">{item.shifts.length} shift{item.shifts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.shifts.map((shift) => (
                        <span key={shift._id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          {shift.displayName}
                          <button
                            type="button"
                            onClick={() => { if (window.confirm(`Remove ${shift.displayName} from role ${item.name}?`)) handleRemoveShiftAssignment(shift, 'role', item.name); }}
                            className="text-emerald-500 hover:text-red-600 rounded"
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
                  <PeopleIcon className="w-4 h-4 mr-2" />Employee Allotment
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-3">
                {shiftOverview.employeeAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No employees directly allotted to shifts.</p>
                ) : shiftOverview.employeeAssignments.map((item) => (
                  <div key={item.employee._id} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.employee.name}</p>
                        <p className="text-xs text-gray-500">{item.employee.department} · {item.employee.position}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{item.shifts.length} shift{item.shifts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.shifts.map((shift) => (
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
                        {['Employee', 'Department', 'Role', 'Shift Overview'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {shiftOverview.multiShiftEmployees.map((item) => (
                        <tr key={item.employee._id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.employee.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.employee.department || '–'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.employee.position || '–'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.shifts.map(({ shift, sources }) => (
                                <span key={shift._id} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                  {shift.displayName} ({formatTime(shift.startTime)} – {formatTime(shift.endTime)}) · {sources.join(', ')}
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

      {/* Empty state */}
      {shifts.length === 0 && activeTab === 'shifts' && (
        <div className="text-center py-12">
          <ScheduleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Shifts Created</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Create your first shift to start managing employee work schedules and attendance.
          </p>
          <Button onClick={() => { resetForm(); setModal({ isOpen: true, shift: null, mode: 'create' }); }}>
            <AddIcon className="w-4 h-4 mr-2" />
            Create First Shift
          </Button>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => { setModal({ isOpen: false, shift: null, mode: 'create' }); resetForm(); }}
        title={modal.mode === 'create' ? 'Create New Shift' : 'Edit Shift'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shift Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
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
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
                placeholder="e.g., Morning Shift"
              />
            </div>
          </div>

          {/* Time pickers — portal handles clipping, no overflow hacks needed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <CustomTimePicker
                value={formData.startTime}
                onChange={(val) => setFormData((prev) => ({ ...prev, startTime: val }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <CustomTimePicker
                value={formData.endTime}
                onChange={(val) => setFormData((prev) => ({ ...prev, endTime: val }))}
              />
            </div>
          </div>

          {/* Live duration preview */}
          {formData.startTime && formData.endTime && (
            <p className="text-xs text-gray-500">
              Duration:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatDuration(formData.startTime, formData.endTime)}
              </span>
              {toMins(formData.endTime) <= toMins(formData.startTime) && (
                <span className="ml-2 text-indigo-500">(crosses midnight)</span>
              )}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Half-Day After (min)
            </label>
            <input
              type="number"
              value={formData.halfDayMarkingAfter}
              onChange={(e) => setFormData({ ...formData, halfDayMarkingAfter: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
              min="0"
              max="240"
            />
            <p className="text-xs text-gray-500 mt-1">Must take half-day if late beyond this threshold</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={() => { setModal({ isOpen: false, shift: null, mode: 'create' }); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={modal.mode === 'create' ? handleCreateShift : handleUpdateShift}>
              {modal.mode === 'create' ? 'Create Shift' : 'Update Shift'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Assignment Modal ── */}
      <Modal
        isOpen={assignmentModal.isOpen}
        onClose={() => { setAssignmentModal({ isOpen: false, shift: null, tab: 'departments' }); setSelectedItems([]); }}
        title={`Assign Shift: ${assignmentModal.shift?.displayName}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { key: 'departments', label: 'By Department', Icon: BusinessIcon },
              { key: 'roles',       label: 'By Role',       Icon: WorkIcon     },
              { key: 'employees',   label: 'By Employee',   Icon: PeopleIcon   },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setAssignmentModal((prev) => ({ ...prev, tab: key })); setSelectedItems([]); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  assignmentModal.tab === key
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />{label}
              </button>
            ))}
          </div>

          {assignmentModal.tab === 'departments' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Select departments to assign this shift to all employees in those departments.</p>
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                {departments.map((dept) => (
                  <label key={dept} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(dept)}
                      onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, dept] : selectedItems.filter((d) => d !== dept))}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Select roles to assign this shift to all employees with those positions.</p>
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                {roles.map((role) => (
                  <label key={role} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(role)}
                      onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, role] : selectedItems.filter((r) => r !== role))}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Select individual employees to assign this shift directly.</p>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
              />
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                {employees
                  .filter(
                    (emp) =>
                      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((emp) => (
                    <label key={emp._id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(emp._id)}
                        onChange={(e) => setSelectedItems(e.target.checked ? [...selectedItems, emp._id] : selectedItems.filter((id) => id !== emp._id))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.department} · {emp.position}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={() => { setAssignmentModal({ isOpen: false, shift: null, tab: 'departments' }); setSelectedItems([]); }}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={selectedItems.length === 0}>
              Assign Shift ({selectedItems.length})
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── View Employees Modal ── */}
      <Modal
        isOpen={viewEmployeesModal.isOpen}
        onClose={() => setViewEmployeesModal({ isOpen: false, shift: null, employees: [], loading: false })}
        title={`Directly Assigned Employees — ${viewEmployeesModal.shift?.displayName}`}
        size="lg"
      >
        <div className="space-y-4">
          {viewEmployeesModal.loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : viewEmployeesModal.employees.length === 0 ? (
            <div className="text-center py-8">
              <PeopleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees directly assigned to this shift</p>
              <p className="text-sm text-gray-400 mt-2">Use the "Assign" button to add employees to this shift</p>
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
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                        <PeopleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{emp.department} · {emp.position}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { if (window.confirm(`Remove ${emp.name} from this shift?`)) handleRemoveEmployeeFromShift(emp._id, emp.name); }}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <RemoveIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={() => setViewEmployeesModal({ isOpen: false, shift: null, employees: [], loading: false })}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ── */}
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
            <Button variant="secondary" onClick={() => setDeleteModal({ isOpen: false, shift: null })}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteShift}>Permanently Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShiftManagement;