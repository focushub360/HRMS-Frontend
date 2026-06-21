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

  // ── all logic helpers unchanged ──────────────────────────────────────────
  const extractEmployee = (raw) => {
    if (!raw) return null;
    if (raw._id || raw.id) return raw;
    if (raw.data && (raw.data._id || raw.data.id)) return raw.data;
    if (raw.employee && (raw.employee._id || raw.employee.id)) return raw.employee;
    return raw;
  };

  const extractMobileAllowed = (raw) => {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === 'boolean') return raw;
    const emp = extractEmployee(raw);
    if (emp) {
      if (emp.user && typeof emp.user.mobileAllowed === 'boolean') return emp.user.mobileAllowed;
      if (typeof emp.mobileAllowed === 'boolean') return emp.mobileAllowed;
    }
    if (raw.user && typeof raw.user.mobileAllowed === 'boolean') return raw.user.mobileAllowed;
    if (typeof raw.mobileAllowed === 'boolean') return raw.mobileAllowed;
    return undefined;
  };

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const tenantOverride = localStorage.getItem('tenantSubdomain') || localStorage.getItem('tenant');
      const data = await employeeService.getAll(true, true, tenantOverride);
      let normalized = [];
      if (Array.isArray(data)) normalized = data;
      else if (data && Array.isArray(data.data)) normalized = data.data;
      else if (data && Array.isArray(data.employees)) normalized = data.employees;
      else if (data && Array.isArray(data.docs)) normalized = data.docs;
      else if (data && typeof data === 'object') {
        const vals = Object.values(data).filter(v => v && (v._id || v.email || v.name));
        normalized = vals.length ? vals : [];
      }
      normalized = normalized.map(e => ({ ...e, _id: e._id || e.id }));
      setEmployees(normalized);
      setMobileOverrides(prev => {
        const next = {};
        Object.keys(prev).forEach(k => {
          if (normalized.find(e => String(e._id || e.id) === String(k))) next[k] = prev[k];
        });
        return next;
      });
      const missing = normalized.filter(e => extractMobileAllowed(e) === undefined).slice(0, 12);
      if (missing.length) {
        try {
          const fetches = missing.map(emp => {
            const id = emp._id || emp.id;
            return employeeService.getWithUser(id).then(res => ({ id, res })).catch(err => ({ id, err }));
          });
          const settled = await Promise.all(fetches);
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
            setMobileOverrides(prev => {
              const copy = { ...prev };
              Object.keys(updates).forEach(k => {
                const val = extractMobileAllowed(updates[k]);
                if (val !== undefined) delete copy[String(k)];
              });
              return copy;
            });
          }
        } catch (err) {
          console.debug('Eager fetch for mobileAllowed failed', err);
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.response?.data?.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal   = (employee) => { setDeleteModal({ isOpen: true, employee }); setError(''); setSuccessMessage(''); };
  const closeDeleteModal  = () => setDeleteModal({ isOpen: false, employee: null });
  const openPasswordModal = (employee) => { setPasswordModal({ isOpen: true, employee }); setError(''); setSuccessMessage(''); };
  const closePasswordModal = () => setPasswordModal({ isOpen: false, employee: null });

  const openMobileModal = async (employee) => {
    const empId = employee._id || employee.id;
    const currentDisplayed = typeof mobileOverrides[String(empId)] !== 'undefined'
      ? mobileOverrides[String(empId)]
      : (extractMobileAllowed(employee) !== undefined ? extractMobileAllowed(employee) : true);
    setMobileModal({ isOpen: true, employee: { ...employee, _id: employee._id || employee.id }, loading: true, mobileAllowed: currentDisplayed });
    try {
      const data = await employeeService.getWithUser(empId);
      const emp = extractEmployee(data) || {};
      const mobileAllowedFromResp = extractMobileAllowed(data);
      if (mobileAllowedFromResp !== undefined) {
        setMobileOverrides(prev => ({ ...prev, [String(empId)]: mobileAllowedFromResp }));
        setMobileModal({ isOpen: true, employee: { ...emp, _id: emp._id || emp.id || empId }, loading: false, mobileAllowed: mobileAllowedFromResp });
      } else {
        setMobileModal({ isOpen: true, employee: { ...emp, _id: emp._id || emp.id || empId }, loading: false, mobileAllowed: currentDisplayed });
      }
    } catch (err) {
      setMobileModal({ isOpen: true, employee: { ...employee, _id: employee._id || employee.id }, loading: false, mobileAllowed: currentDisplayed });
    }
  };

  const closeMobileModal = () => setMobileModal({ isOpen: false, employee: null, loading: false, mobileAllowed: false });

  const toggleMobileAccess = async () => {
    if (!mobileModal.employee?._id) return;
    try {
      const action = mobileModal.mobileAllowed ? 'restrict' : 'allow';
      if (!window.confirm(`Are you sure you want to ${action} mobile access for ${mobileModal.employee.name}?`)) return;
      const intendedVal = !mobileModal.mobileAllowed;
      const empId = mobileModal.employee._id || mobileModal.employee.id;
      const empName = mobileModal.employee?.name || '';
      const prevOverride = mobileOverrides[String(empId)];
      const prevExtracted = extractMobileAllowed(mobileModal.employee);
      const prevVal = typeof prevOverride !== 'undefined' ? prevOverride : (typeof prevExtracted !== 'undefined' ? prevExtracted : true);
      setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: intendedVal } } : emp));
      setMobileOverrides(prev => ({ ...prev, [String(empId)]: intendedVal }));
      closeMobileModal();
      let setResp;
      try {
        setResp = await employeeService.setMobileAccess(empId, intendedVal);
      } catch (apiErr) {
        try {
          const raw = await employeeService.getWithUser(empId);
          const updated = extractEmployee(raw) || raw;
          if (updated && (updated._id || updated.id)) {
            const id = updated._id || updated.id;
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(id) ? { ...emp, ...updated, _id: updated._id || updated.id } : emp));
          } else {
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: prevVal } } : emp));
          }
        } catch {
          setEmployees(prev => prev.map(emp => String(emp._id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: prevVal } } : emp));
        }
        setMobileOverrides(prev => {
          const copy = { ...prev };
          if (typeof prevOverride !== 'undefined') copy[String(empId)] = prevOverride;
          else delete copy[String(empId)];
          return copy;
        });
        setError(apiErr.response?.data?.message || 'Failed to update mobile access');
        return;
      }
      const serverAllowed = extractMobileAllowed(setResp);
      let resultVal;
      if (serverAllowed !== undefined) {
        const finalVal = serverAllowed;
        const empFromResp = extractEmployee(setResp);
        if (empFromResp && (empFromResp._id || empFromResp.id)) {
          const id = empFromResp._id || empFromResp.id;
          setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(id) ? { ...emp, ...empFromResp, _id: empFromResp._id || empFromResp.id } : emp));
        } else {
          setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: finalVal } } : emp));
        }
        setMobileOverrides(prev => { const copy = { ...prev }; delete copy[String(empId)]; return copy; });
        setMobileModal(prev => ({ ...prev, mobileAllowed: finalVal }));
        resultVal = finalVal;
      } else {
        try {
          const raw = await employeeService.getWithUser(empId);
          const updated = extractEmployee(raw) || raw;
          const updatedId = updated?._id || updated?.id || null;
          if (updatedId) {
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(updatedId) ? { ...emp, ...updated, _id: updated._id || updated.id } : emp));
            const finalVal = extractMobileAllowed(updated);
            if (finalVal !== undefined) {
              setMobileOverrides(prev => { const copy = { ...prev }; delete copy[String(updatedId)]; return copy; });
              setMobileModal(prev => ({ ...prev, mobileAllowed: finalVal }));
              resultVal = finalVal;
            } else { resultVal = intendedVal; }
          } else {
            setEmployees(prev => prev.map(emp => String(emp._id || emp.id) === String(empId) ? { ...emp, user: { ...(emp.user || {}), mobileAllowed: intendedVal } } : emp));
            setMobileOverrides(prev => ({ ...prev, [String(empId)]: intendedVal }));
            setMobileModal(prev => ({ ...prev, mobileAllowed: intendedVal }));
            resultVal = intendedVal;
          }
        } catch {
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
      setError(err.response?.data?.message || 'Failed to update mobile access');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.employee?._id) return;
    setDeleting(true);
    setError('');
    try {
      const employeeId = deleteModal.employee._id;
      await employeeService.delete(employeeId);
      setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
      closeDeleteModal();
      setSuccessMessage(`Employee "${deleteModal.employee.name}" has been successfully deleted.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete employee.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const getStatusBadge = (isActive) => (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
      isActive
        ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700'
        : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const getDepartmentColor = (department) => {
    const colors = {
      'Engineering':        'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
      'Human Resources':    'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
      'Marketing':          'bg-pink-100 text-pink-800 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700',
      'Sales':              'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
      'Finance':            'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
      'Operations':         'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
      'Customer Support':   'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
      'Design':             'bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
      'Product':            'bg-lime-100 text-lime-800 border border-lime-200 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700',
    };
    return colors[department] || 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your team members • {employees.length} {employees.length === 1 ? 'employee' : 'employees'} total
          </p>
        </div>
        <Button
          onClick={() => navigate('/employees/add')}
          className="whitespace-nowrap w-full sm:w-auto"
        >
          <AddIcon className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-green-700 dark:text-green-300 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Employees Table */}
      <Card>
        <Card.Header className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Card.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              All Employees
            </Card.Title>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
              {employees.length} {employees.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </Card.Header>

        <Card.Content className="!p-0">
          {/* Table with thin horizontal scrollbar */}
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#4b5563_transparent]">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {employees.map((employee) => (
                  <tr
                    key={employee._id || employee.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    {/* Employee */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                          <span className="text-sm font-semibold text-white">
                            {employee.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{employee.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{employee.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(employee.department)}`}>
                        {employee.department}
                      </span>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {employee.position}
                    </td>

                    {/* Team */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {employee.teamLead ? (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-medium">{employee.teamLead.name}</span>
                        </div>
                      ) : employee.teamMembers && employee.teamMembers.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                          Lead ({employee.teamMembers.length})
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Independent</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(employee.isActive)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">

                        {/* View */}
                        <button
                          onClick={() => navigate(`/employees/${employee._id || employee.id}`)}
                          className="inline-flex items-center justify-center p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer"
                          title="View employee details"
                        >
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/employees/edit/${employee._id || employee.id}`)}
                          className="inline-flex items-center justify-center p-1.5 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-transparent hover:bg-yellow-100 dark:hover:bg-yellow-900/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors cursor-pointer"
                          title="Edit employee"
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </button>

                        {/* Password */}
                        <button
                          onClick={() => openPasswordModal(employee)}
                          disabled={!employee.isActive}
                          className={`inline-flex items-center justify-center p-1.5 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                            employee.isActive
                              ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:ring-blue-500 cursor-pointer'
                              : 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                          }`}
                          title={employee.isActive ? 'Manage password' : 'Employee is inactive'}
                        >
                          <KeyIcon sx={{ fontSize: 16 }} />
                        </button>

                        {/* Mobile Access */}
                        {(() => {
                          const empId = employee._id || employee.id;
                          const override = mobileOverrides[String(empId)];
                          const extracted = extractMobileAllowed(employee);
                          const isMobileAllowed = override !== undefined ? override : (extracted !== undefined ? extracted : true);
                          const btnClass = employee.isActive
                            ? isMobileAllowed
                              ? 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-transparent hover:bg-indigo-100 dark:hover:bg-indigo-900/40 focus:ring-indigo-500 cursor-pointer'
                              : 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-red-50 dark:bg-transparent hover:bg-red-100 dark:hover:bg-red-900/40 focus:ring-red-500 cursor-pointer'
                            : 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed';
                          return (
                            <button
                              onClick={() => openMobileModal(employee)}
                              className={`inline-flex items-center justify-center p-1.5 border rounded-md focus:outline-none focus:ring-2 transition-colors ${btnClass}`}
                              title={employee.isActive ? (isMobileAllowed ? 'Mobile allowed — click to restrict' : 'Mobile restricted — click to allow') : 'Employee is inactive'}
                            >
                              {isMobileAllowed
                                ? <PhoneAndroidIcon sx={{ fontSize: 16 }} />
                                : <PhoneDisabledIcon sx={{ fontSize: 16 }} />}
                            </button>
                          );
                        })()}

                        {/* Delete */}
                        <button
                          onClick={() => openDeleteModal(employee)}
                          disabled={!employee.isActive}
                          className={`inline-flex items-center justify-center p-1.5 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                            employee.isActive
                              ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-red-50 dark:bg-transparent hover:bg-red-100 dark:hover:bg-red-900/40 focus:ring-red-500 cursor-pointer'
                              : 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
                          }`}
                          title={employee.isActive ? 'Delete employee' : 'Employee is already inactive'}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {employees.length === 0 && (
              <div className="text-center py-16">
                <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <PersonIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">No employees found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Get started by adding your first team member to the system.
                </p>
                <Button onClick={() => navigate('/employees/add')}>
                  <AddIcon className="w-4 h-4 mr-2" />
                  Add First Employee
                </Button>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* ── Modals (logic unchanged) ─────────────────────────────────────── */}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={closeDeleteModal} title="Confirm Employee Deletion" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-11 h-11 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Delete Employee</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              Are you sure you want to delete <strong>{deleteModal.employee?.name}</strong>?
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              The employee will be marked as inactive. This is reversible by an administrator.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              {deleting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Management Modal */}
      <Modal isOpen={passwordModal.isOpen} onClose={closePasswordModal} title={`Manage Password — ${passwordModal.employee?.name || 'Employee'}`} size="lg">
        {passwordModal.employee && (
          <EmployeePassword
            employee={passwordModal.employee}
            onClose={closePasswordModal}
            onSuccess={handlePasswordSuccess}
          />
        )}
      </Modal>

      {/* Mobile Access Modal */}
      <Modal isOpen={mobileModal.isOpen} onClose={closeMobileModal} title={`Mobile Access — ${mobileModal.employee?.name || 'Employee'}`} size="sm">
        <div className="space-y-4">
          {mobileModal.loading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Toggle mobile access for <strong className="text-gray-900 dark:text-gray-100">{mobileModal.employee?.name}</strong>.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow mobile access</span>
                <button
                  onClick={toggleMobileAccess}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
                  title={mobileModal.mobileAllowed ? 'Disable mobile access' : 'Enable mobile access'}
                >
                  {mobileModal.mobileAllowed
                    ? <PhoneDisabledIcon sx={{ fontSize: 18 }} />
                    : <PhoneAndroidIcon sx={{ fontSize: 18 }} />}
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