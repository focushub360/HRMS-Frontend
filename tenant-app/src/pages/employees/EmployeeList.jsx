import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { employeeService } from '../../services/auth';

// Import Material-UI icons
import KeyIcon from '@mui/icons-material/Key';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import PhoneDisabledIcon from '@mui/icons-material/PhoneDisabled';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';

// Import the EmployeePassword component
import EmployeePassword from './EmployeePasswordManagement';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    employee: null 
  });
  const [passwordModal, setPasswordModal] = useState({ 
    isOpen: false, 
    employee: null 
  });
  const [mobileModal, setMobileModal] = useState({ isOpen: false, employee: null, loading: false, mobileAllowed: false });
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mobileOverrides, setMobileOverrides] = useState({});
  
  const navigate = useNavigate();

  // Helpers to normalize different API response shapes
  const extractEmployee = (raw) => {
    if (!raw) return null;
    if (raw._id || raw.id) return raw;
    if (raw.data && (raw.data._id || raw.data.id)) return raw.data;
    if (raw.employee && (raw.employee._id || raw.employee.id)) return raw.employee;
    // sometimes API returns { user: {...}, ... }
    return raw;
  };

  const extractMobileAllowed = (raw) => {
    if (raw === undefined || raw === null) return undefined;
    // If raw is a boolean
    if (typeof raw === 'boolean') return raw;
    // Try common shapes
    const emp = extractEmployee(raw);
    if (emp) {
      if (emp.user && typeof emp.user.mobileAllowed === 'boolean') return emp.user.mobileAllowed;
      if (typeof emp.mobileAllowed === 'boolean') return emp.mobileAllowed;
    }
    // Try top-level mobileAllowed or user
    if (raw.user && typeof raw.user.mobileAllowed === 'boolean') return raw.user.mobileAllowed;
    if (typeof raw.mobileAllowed === 'boolean') return raw.mobileAllowed;
    return undefined;
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      console.debug('EmployeeList.loadEmployees -> requesting includeInactive=true, includeLegacy=true');
      // Use tenant override from localStorage if available to ensure correct tenant is requested
      const tenantOverride = localStorage.getItem('tenantSubdomain') || localStorage.getItem('tenant');
      console.debug('EmployeeList.loadEmployees -> tenantOverride:', tenantOverride);
      const data = await employeeService.getAll(true, true, tenantOverride);
      console.debug('EmployeeList.loadEmployees raw:', data);

      // Defensive normalization: ensure we always set an array of employee objects
      let normalized = [];
      if (Array.isArray(data)) {
        normalized = data;
      } else if (data && Array.isArray(data.data)) {
        normalized = data.data;
      } else if (data && Array.isArray(data.employees)) {
        normalized = data.employees;
      } else if (data && Array.isArray(data.docs)) {
        normalized = data.docs;
      } else if (data && typeof data === 'object') {
        // collect values that look like employee objects
        const vals = Object.values(data).filter(v => v && (v._id || v.email || v.name));
        normalized = vals.length ? vals : [];
      }

      console.debug('EmployeeList.loadEmployees -> normalized employees count:', normalized.length);
      // Ensure a consistent `_id` property (some API shapes use `id`)
      normalized = normalized.map(e => ({ ...e, _id: e._id || e.id }));
      setEmployees(normalized);
      // Reconcile transient overrides: remove overrides for employees that no longer exist
      setMobileOverrides(prev => {
        const next = {};
        Object.keys(prev).forEach(k => {
          if (normalized.find(e => String(e._id || e.id) === String(k))) next[k] = prev[k];
        });
        return next;
      });

      // Eagerly fetch populated user objects for employees that lack authoritative
      // mobileAllowed information so the table renders the server value immediately.
      // Limit the number of parallel fetches to avoid spamming the API on large lists.
      const missing = normalized.filter(e => extractMobileAllowed(e) === undefined).slice(0, 12);
      if (missing.length) {
        try {
          const fetches = missing.map(emp => {
            const id = emp._id || emp.id;
            return employeeService.getWithUser(id).then(res => ({ id, res })).catch(err => ({ id, err }));
          });
          const settled = await Promise.all(fetches);

          // Build a map of updates from successful fetches
          const updates = {};
          settled.forEach(item => {
            if (item && item.res) {
              const updated = extractEmployee(item.res) || item.res;
              const updatedId = updated?._id || updated?.id || item.id;
              if (updatedId) updates[String(updatedId)] = updated;
            }
          });

          if (Object.keys(updates).length) {
            setEmployees(prev => prev.map(p => {
              const key = String(p._id || p.id);
              const u = updates[key];
              return u ? { ...p, ...u, _id: u._id || u.id } : p;
            }));
            // Only remove overrides for updates that actually include authoritative mobileAllowed
            setMobileOverrides(prev => {
              const copy = { ...prev };
              Object.keys(updates).forEach(k => {
                const maybe = updates[k];
                const val = extractMobileAllowed(maybe);
                if (val !== undefined) delete copy[String(k)];
              });
              return copy;
            });
          }
        } catch (err) {
          // if anything goes wrong here, don't block the UI — keep what's loaded
          console.debug('Eager fetch for mobileAllowed failed', err);
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      const msg = err.response?.data?.message || 'Failed to load employees.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (employee) => {
    setDeleteModal({ 
      isOpen: true, 
      employee 
    });
    setError('');
    setSuccessMessage('');
  };

  const closeDeleteModal = () => {
    setDeleteModal({ 
      isOpen: false, 
      employee: null 
    });
  };

  const openPasswordModal = (employee) => {
    console.log('Opening password modal for:', employee.name);
    setPasswordModal({ 
      isOpen: true, 
      employee 
    });
    setError('');
    setSuccessMessage('');
  };

  const openMobileModal = async (employee) => {
    const empId = employee._id || employee.id;

    // Determine the value currently displayed in the table (override takes precedence)
    const currentDisplayed = typeof mobileOverrides[String(empId)] !== 'undefined'
      ? mobileOverrides[String(empId)]
      : (extractMobileAllowed(employee) !== undefined ? extractMobileAllowed(employee) : true);

    // Open modal with the current displayed value so label and confirm match the table
    setMobileModal({ isOpen: true, employee: { ...employee, _id: employee._id || employee.id }, loading: true, mobileAllowed: currentDisplayed });

    try {
      const data = await employeeService.getWithUser(empId);
      // Normalize response and extract authoritative mobileAllowed
      const emp = extractEmployee(data) || {};
      const mobileAllowedFromResp = extractMobileAllowed(data);

      if (mobileAllowedFromResp !== undefined) {
        // Server provided an authoritative value — set override to match it
        setMobileOverrides(prev => ({ ...prev, [String(empId)]: mobileAllowedFromResp }));
        setMobileModal({ isOpen: true, employee: { ...emp, _id: emp._id || emp.id || empId }, loading: false, mobileAllowed: mobileAllowedFromResp });
      } else {
        // Server didn't provide the flag — keep the displayed value and update modal employee
        setMobileModal({ isOpen: true, employee: { ...emp, _id: emp._id || emp.id || empId }, loading: false, mobileAllowed: currentDisplayed });
      }
    } catch (err) {
      console.error('Failed to load user for mobile modal:', err);
      // Keep the displayed value instead of defaulting to `false` so modal matches table
      setMobileModal({ isOpen: true, employee: { ...employee, _id: employee._id || employee.id }, loading: false, mobileAllowed: currentDisplayed });
    }
  };

  const closeMobileModal = () => {
    setMobileModal({ isOpen: false, employee: null, loading: false, mobileAllowed: false });
  };

  const toggleMobileAccess = async () => {
    if (!mobileModal.employee?._id) return;
    try {
      const action = mobileModal.mobileAllowed ? 'restrict' : 'allow';
      const confirmMsg = `Are you sure you want to ${action} mobile access for ${mobileModal.employee.name}?`;
      if (!window.confirm(confirmMsg)) return;
      // optimistic/new value we intend to set
      const intendedVal = !mobileModal.mobileAllowed;
      const empId = mobileModal.employee._id || mobileModal.employee.id;
      const empName = mobileModal.employee?.name || '';

      // Compute previous value to allow rollback if request fails
      const prevOverride = mobileOverrides[String(empId)];
      const prevExtracted = extractMobileAllowed(mobileModal.employee);
      const prevVal = typeof prevOverride !== 'undefined' ? prevOverride : (typeof prevExtracted !== 'undefined' ? prevExtracted : true);

      // Apply optimistic update so admin sees instant feedback
      setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: intendedVal } } : emp));
      setMobileOverrides(prev => ({ ...prev, [String(empId)]: intendedVal }));
      // Close modal instantly for better UX
      closeMobileModal();

      // send request and capture server response if any
      let setResp;
      try {
        setResp = await employeeService.setMobileAccess(empId, intendedVal);
      } catch (apiErr) {
        // Attempt to recover: fetch authoritative record, else rollback
        console.error('API setMobileAccess failed:', apiErr);
        try {
          const raw = await employeeService.getWithUser(empId);
          const updated = extractEmployee(raw) || raw;
          if (updated && (updated._id || updated.id)) {
            const id = updated._id || updated.id;
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(id) ? { ...emp, ...updated, _id: updated._id || updated.id } : emp));
          } else {
            // rollback to prevVal
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: prevVal } } : emp));
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch authoritative employee after API error:', fetchErr);
          // rollback to previous value if we couldn't fetch
          setEmployees(prev => prev.map(emp => String(emp._id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: prevVal } } : emp));
        }
        // restore overrides to previous state (or remove)
        setMobileOverrides(prev => {
          const copy = { ...prev };
          if (typeof prevOverride !== 'undefined') copy[String(empId)] = prevOverride;
          else delete copy[String(empId)];
          return copy;
        });
        setError(apiErr.response?.data?.message || 'Failed to update mobile access');
        return;
      }

      // Try to extract authoritative value from the set response
      const serverAllowed = extractMobileAllowed(setResp);
      let resultVal;

      if (serverAllowed !== undefined) {
        // Server reported authoritative value — use it
        const finalVal = serverAllowed;
        // Patch the row using any employee object in response if present
        const empFromResp = extractEmployee(setResp);
        if (empFromResp && (empFromResp._id || empFromResp.id)) {
          const id = empFromResp._id || empFromResp.id;
          setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(id) ? { ...emp, ...empFromResp, _id: empFromResp._id || empFromResp.id } : emp));
        } else {
          // otherwise apply a minimal patch
          setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: finalVal } } : emp));
        }
        // remove any transient override — server is authoritative
        setMobileOverrides(prev => {
          const copy = { ...prev };
          delete copy[String(empId)];
          return copy;
        });
        setMobileModal(prev => ({ ...prev, mobileAllowed: finalVal }));
        resultVal = finalVal;
      } else {
        // No authoritative info in PUT response — fetch the updated employee
        try {
          const raw = await employeeService.getWithUser(empId);
          const updated = extractEmployee(raw) || raw;
          const updatedId = updated?._id || updated?.id || null;

          if (updatedId) {
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(updatedId) ? { ...emp, ...updated, _id: updated._id || updated.id } : emp));
            const finalVal = extractMobileAllowed(updated);
            // Only remove transient override if server returned authoritative mobileAllowed
            if (finalVal !== undefined) {
              setMobileOverrides(prev => {
                const copy = { ...prev };
                delete copy[String(updatedId)];
                return copy;
              });
              setMobileModal(prev => ({ ...prev, mobileAllowed: finalVal }));
              resultVal = finalVal;
            } else {
              // keep optimistic override
              resultVal = intendedVal;
            }
          } else {
            // Fallback local patch and keep override
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: intendedVal } } : emp));
            setMobileOverrides(prev => ({ ...prev, [String(empId)]: intendedVal }));
            setMobileModal(prev => ({ ...prev, mobileAllowed: intendedVal }));
            resultVal = intendedVal;
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch updated employee after set, keeping optimistic state:', fetchErr);
          // keep optimistic update in place
          setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: intendedVal } } : emp));
          setMobileOverrides(prev => ({ ...prev, [String(empId)]: intendedVal }));
          setMobileModal(prev => ({ ...prev, mobileAllowed: intendedVal }));
          resultVal = intendedVal;
        }
      }

      const msgVal = resultVal !== undefined ? resultVal : intendedVal;
      setSuccessMessage(`Mobile access ${msgVal ? 'allowed' : 'restricted'} for ${empName}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Toggle mobile access failed:', err);
      setError(err.response?.data?.message || 'Failed to update mobile access');
    }
  };

  const closePasswordModal = () => {
    console.log('Closing password modal');
    setPasswordModal({ 
      isOpen: false, 
      employee: null 
    });
  };

  const handleDelete = async () => {
    if (!deleteModal.employee?._id) return;

    setDeleting(true);
    setError('');

    try {
      const employeeId = deleteModal.employee._id;
      await employeeService.delete(employeeId);

      // Update local state
      setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      
      // Close modal and show success
      closeDeleteModal();
      setSuccessMessage(`Employee "${deleteModal.employee.name}" has been successfully deleted.`);
      
      // Auto hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Delete failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete employee.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordSuccess = (message) => {
    console.log('Password operation successful:', message);
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const getStatusBadge = (isActive) => (
    <span className={`px-2.5 py-1.5 text-xs font-medium rounded-full ${
      isActive 
        ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700' 
        : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const getDepartmentColor = (department) => {
    const colors = {
      'Engineering': 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      'Human Resources': 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      'Marketing': 'bg-pink-100 text-pink-800 border border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-700',
      'Sales': 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      'Finance': 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      'Operations': 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
      'Customer Support': 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
      'Design': 'bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700',
      'Product': 'bg-lime-100 text-lime-800 border border-lime-200 dark:bg-lime-900 dark:text-lime-200 dark:border-lime-700'
    };
    return colors[department] || 'bg-gray-100 text-gray-800 border border-gray-200';
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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your team members • {employees.length} {employees.length === 1 ? 'employee' : 'employees'} total
          </p>
        </div>
        <Button 
          onClick={() => navigate('/employees/add')}
          className="whitespace-nowrap"
        >
          <AddIcon className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-green-700 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Employees Table */}
      <Card>
        <Card.Header className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center justify-between">
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              All Employees
            </Card.Title>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                {employees.length} {employees.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {employees.map((employee) => (
                  <tr 
                    key={employee._id || employee.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-sm font-semibold text-white">
                            {employee.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-300">
                            {employee.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(employee.department)}`}>
                        {employee.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {employee.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {employee.teamLead ? (
                        <div className="flex items-center text-xs">
                          <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-medium text-gray-900">{employee.teamLead.name}</span>
                        </div>
                      ) : employee.teamMembers && employee.teamMembers.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Team Lead ({employee.teamMembers.length} members)
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Independent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(employee.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {/* View Button */}
                        <button
                          onClick={() => navigate(`/employees/${employee._id || employee.id}`)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 cursor-pointer dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                          title="View employee details cursor-pointer"
                        >
                          <VisibilityIcon className="w-3 h-3 mr-1" />
                         
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => navigate(`/employees/edit/${employee._id || employee.id}`)}
                          className="inline-flex items-center px-3 py-1.5 border border-yellow-300 shadow-sm text-xs font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200 cursor-pointer dark:text-yellow-300 dark:bg-transparent dark:hover:bg-yellow-700"
                          title="Edit employee information"
                        >
                          <EditIcon className="w-3 h-3 mr-1" />
                        
                        </button>

                        {/* Password Management Button */}
                        <button
                          onClick={() => openPasswordModal(employee)}
                          disabled={!employee.isActive}
                          className={`inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 cursor-pointer ${
                            employee.isActive 
                              ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500 dark:text-blue-200 dark:bg-transparent dark:hover:bg-blue-800' 
                              : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                          }`}
                          title={employee.isActive ? "Manage password" : "Employee is inactive"}
                        >
                          <KeyIcon className="w-3 h-3 mr-1" />
                          {/* Password */}
                        </button>

                        {/* Mobile Access Button (shows allowed/restricted state) */}
                        {(() => {
                          const empId = employee._id || employee.id;
                          const override = mobileOverrides[String(empId)];
                          const extracted = extractMobileAllowed(employee);
                          const isMobileAllowed = override !== undefined ? override : (extracted !== undefined ? extracted : true);
                          const btnClass = employee.isActive
                            ? isMobileAllowed
                              ? 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:ring-indigo-500 dark:text-indigo-200 dark:bg-transparent dark:hover:bg-indigo-800'
                              : 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500 dark:text-red-200 dark:bg-transparent dark:hover:bg-red-800'
                            : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500';

                          return (
                            <button
                              onClick={() => openMobileModal(employee)}
                              className={`inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 cursor-pointer ${btnClass}`}
                              title={employee.isActive ? (isMobileAllowed ? 'Mobile allowed — click to restrict' : 'Mobile restricted — click to allow') : 'Employee is inactive'}
                            >
                              {isMobileAllowed ? (
                                <PhoneAndroidIcon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                              ) : (
                                <PhoneDisabledIcon className="w-4 h-4 text-red-600" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })()}

                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteModal(employee)}
                          disabled={!employee.isActive}
                          className={`inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 cursor-pointer ${
                            employee.isActive 
                              ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500 dark:text-red-200 dark:bg-transparent dark:hover:bg-red-800' 
                              : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                          }`}
                          title={employee.isActive ? "Delete employee" : "Employee is already inactive"}
                        >
                          <DeleteIcon className="w-3 h-3 mr-1 " />
                          {/* Delete */}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {employees.length === 0 && (
              <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <PersonIcon className="w-12 h-12 text-gray-400 dark:text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No employees found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Get started by adding your first team member to the system.
                </p>
                <Button 
                  onClick={() => navigate('/employees/add')}
                  size="lg"
                >
                  <AddIcon className="w-4 h-4 mr-2" />
                  Add First Employee
                </Button>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        title="Confirm Employee Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Employee</h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong className="font-semibold">{deleteModal.employee?.name}</strong>?
            </p>
            <p className="text-xs text-red-600 mt-1">
              The employee will be marked as inactive and their account will be deactivated.
              This action is reversible by an administrator.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={deleting}
              className="min-w-20"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              className="min-w-32"
            >
              {deleting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Management Modal - Using the same Modal component */}
      <Modal
        isOpen={passwordModal.isOpen}
        onClose={closePasswordModal}
        title={`Manage Password - ${passwordModal.employee?.name || 'Employee'}`}
        size="lg"
      >
        {passwordModal.employee && (
          <EmployeePassword 
            employee={passwordModal.employee}
            onClose={closePasswordModal}
            onSuccess={handlePasswordSuccess}
          />
        )}
      </Modal>

      {/* Mobile Access Modal */}
      <Modal
        isOpen={mobileModal.isOpen}
        onClose={closeMobileModal}
        title={`Mobile Access - ${mobileModal.employee?.name || 'Employee'}`}
        size="sm"
      >
        <div className="space-y-4">
          {mobileModal.loading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="text-sm text-gray-500 mt-2">Loading...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Toggle mobile access for <strong>{mobileModal.employee?.name}</strong>.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Allow mobile access</span>
                <button
                  onClick={toggleMobileAccess}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm"
                  title={mobileModal.mobileAllowed ? 'Disable mobile access' : 'Enable mobile access'}
                  aria-label={mobileModal.mobileAllowed ? 'Disable mobile access' : 'Enable mobile access'}
                >
                  {mobileModal.mobileAllowed ? (
                    <PhoneDisabledIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <PhoneAndroidIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeList;