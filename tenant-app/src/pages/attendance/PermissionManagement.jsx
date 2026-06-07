import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { showSuccess, showError } from '../../utils/toast';
import { permissionService, employeeService } from '../../services/auth';

// Material-UI Icons
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

// Success Notification Component
const SuccessNotification = ({ message, type = 'success', onClose, show }) => {
  if (!show) return null;

  const bgClass = type === 'success'
    ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700'
    : 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700';

  const textClass = type === 'success' ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';

  const icon = type === 'success'
    ? <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-200" />
    : <CancelIcon className="w-5 h-5 text-red-600 dark:text-red-200" />;

  const closeHover = type === 'success' ? 'hover:bg-green-600 dark:hover:bg-green-700' : 'hover:bg-red-600 dark:hover:bg-red-700';

  return (
    <div className={`fixed top-4 right-4 z-50 border rounded-lg p-4 shadow-lg ${bgClass} animate-fade-in`}>
      <div className="flex items-center space-x-3">
        {icon}
        <div className="flex-1">
          <p className={`text-sm font-medium ${textClass}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-full ${closeHover} transition-colors`}
        >
          <CloseIcon className="w-4 h-4 text-current dark:text-gray-100" />
        </button>
      </div>
    </div>
  );
};

const PermissionManagement = () => {
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [actionModal, setActionModal] = useState({ 
    isOpen: false, 
    permission: null, 
    action: '',
    loading: false 
  });
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // 'success' or 'error'
  });

  useEffect(() => {
    loadInitialData();
  }, [filter, selectedMonth, selectedYear, selectedEmployee]);

  // Listen for admin-refresh event from header button
  useEffect(() => {
    const handleAdminRefresh = () => loadInitialData();
    window.addEventListener('admin-refresh', handleAdminRefresh);
    return () => window.removeEventListener('admin-refresh', handleAdminRefresh);
  }, [filter, selectedMonth, selectedYear, selectedEmployee]);

  const showNotification = (message, type = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });

    // Auto hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      let permParams = {};
      
      if (filter === 'pending-no-lead') {
        permParams.status = 'pending';
        permParams.leadApproved = false;
      } else if (filter === 'pending-lead-approved') {
        permParams.status = 'pending';
        permParams.leadApproved = true;
      } else {
        permParams.status = filter;
      }
      
      if (filter !== 'pending-no-lead' && filter !== 'pending-lead-approved') {
        permParams.month = selectedMonth;
        permParams.year = selectedYear;
      }
      
      const [permissionsData, employeesData] = await Promise.all([
        permissionService.getAllPermissions(permParams.status, permParams.month, permParams.year, selectedEmployee !== 'all' ? selectedEmployee : undefined, permParams.leadApproved),
        employeeService.getAll()
      ]);
      setPermissions(permissionsData || []);
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('Failed to load permissions data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!actionModal.permission) return;

    setActionModal(prev => ({ ...prev, loading: true }));
    
    try {
      await permissionService.updateStatus(actionModal.permission._id, actionModal.action);
      
      const actionText = actionModal.action === 'approved' ? 'approved' : 'rejected';
      const employeeName = actionModal.permission.employee?.name || 'the employee';
      showSuccess(`Permission ${actionText} successfully for ${employeeName}`);
      
      await loadInitialData();
      // Notify dashboard to refresh pending count
      window.dispatchEvent(new CustomEvent('permissions-updated'));
      setActionModal({ isOpen: false, permission: null, action: '', loading: false });
    } catch (error) {
      console.error('Failed to update permission status:', error);
      showError(error.response?.data?.message || 'Failed to update permission status');
      setActionModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Status helpers — any single approval is enough to be 'Approved'
  const getStatusClass = (permission) => {
    const hasRejection = permission.approvals?.some(a => a.status === 'rejected');
    const anyApproval = permission.approvals?.some(a => a.status === 'approved');
    if (permission.status === 'rejected' || hasRejection) return 'bg-red-100 text-red-800';
    if (permission.status === 'approved' || anyApproval) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (permission) => {
    const hasRejection = permission.approvals?.some(a => a.status === 'rejected');
    const anyApproval = permission.approvals?.some(a => a.status === 'approved');
    if (permission.status === 'rejected' || hasRejection) return 'Rejected';
    if (permission.status === 'approved' || anyApproval) return 'Approved';
    return 'Pending';
  };

  const getStatusBadge = (permission) => {
    const label = getStatusLabel(permission);
    const color = getStatusClass(permission);
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        <span>{label}</span>
      </span>
    );
  };

  // Format a date/time string into local time with AM/PM
  const formatTimeWithAMPM = (dateString) => {
    if (!dateString) return '--:--';

    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '--:--';

      // Use the Date object's local getters (no manual timezone offset)
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;

      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  // FIXED: Format date properly
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      <SuccessNotification
        message={notification.message}
        type={notification.type}
        show={notification.show}
        onClose={hideNotification}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
          <p className="text-gray-600">Approve or reject employee permission requests</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <FilterListIcon className="w-5 h-5 mr-2 text-gray-600" />
            Filters
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
              >
                <option value="pending-no-lead">Pending (No Lead Approval)</option>
                <option value="pending-lead-approved">Pending (Lead Approved)</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Permissions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Permissions List */}
      <Card>
        <Card.Header>
          <Card.Title>
            {filter === 'pending' ? 'Pending Approval' : 
             filter === 'approved' ? 'Approved Permissions' : 
             filter === 'rejected' ? 'Rejected Permissions' : 'All Permissions'} 
            ({permissions.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div key={permission._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:bg-transparent">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-600">
                          {permission.employee?.name?.charAt(0) || 'E'}
                        </span>
                      </div>
                      <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {permission.employee?.name || 'Unknown Employee'}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {permission.employee?.department || 'N/A'} • {permission.employee?.position || 'N/A'}
                          </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize dark:bg-blue-800 dark:text-blue-100">
                        {permission.permissionType?.replace('-', ' ')}
                      </span>
                      {getStatusBadge(permission)}
                      <span className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                        <ScheduleIcon className="w-3 h-3 mr-1" />
                        {permission.duration}h
                      </span>
                    </div>
                    {/* Lead/Admin Approvals */}
                    {/* <div className="flex flex-wrap gap-1 mb-2">
                      {permission.approvals?.map((approval, idx) => (
                        <span key={idx} className={`px-2 py-1 rounded-full text-xs ${
                          approval.status === 'approved' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}>
                          {approval.approverType}: {approval.approver?.name?.split(' ')[0] || 'Unknown'} {approval.status[0]}
                        </span>
                      )) || <span className="text-xs text-gray-400 italic">No approvals yet</span>}
                    </div> */}
                    
                    <p className="text-sm text-gray-600 mb-2 dark:text-gray-300">
                      {permission.reason || 'No reason provided'}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-300">
                      <span>
                        {formatDate(permission.date)} • {formatTimeWithAMPM(permission.startTime)} - {formatTimeWithAMPM(permission.endTime)}
                      </span>
                      <span>•</span>
                      <span>
                        Applied on {permission.createdAt ? formatDate(permission.createdAt) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {permission.status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActionModal({ 
                          isOpen: true, 
                          permission, 
                          action: 'approved',
                          loading: false 
                        })}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setActionModal({ 
                          isOpen: true, 
                          permission, 
                          action: 'rejected',
                          loading: false 
                        })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

{permission.approvals?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-1">
                      {permission.approvals.map((appr, idx) => (
                        <p key={idx} className="text-xs text-gray-500 dark:text-gray-300">
                          <span className="capitalize">{appr.status}</span> by: {appr.approver?.name || 'Admin'} <span className="text-gray-400 capitalize">({appr.approverType})</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {permissions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <PendingActionsIcon className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500">
                  {filter === 'pending' 
                    ? 'No pending permission requests' 
                    : `No ${filter} permissions found`}
                </p>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => !actionModal.loading && setActionModal({ 
          isOpen: false, 
          permission: null, 
          action: '',
          loading: false 
        })}
        title={`${actionModal.action === 'approved' ? 'Approve' : 'Reject'} Permission Request`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to <strong>{actionModal.action}</strong> the permission request from{' '}
            <strong>{actionModal.permission?.employee?.name || 'this employee'}</strong>?
          </p>
          
          {actionModal.permission && (
            <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Type:</strong> {actionModal.permission.permissionType?.replace('-', ' ') || 'N/A'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <strong>Duration:</strong> {actionModal.permission.duration || 0} hours
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <strong>Date:</strong> {formatDate(actionModal.permission.date)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <strong>Time:</strong> {formatTimeWithAMPM(actionModal.permission.startTime)} - {formatTimeWithAMPM(actionModal.permission.endTime)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <strong>Reason:</strong> {actionModal.permission.reason || 'No reason provided'}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setActionModal({ 
                isOpen: false, 
                permission: null, 
                action: '',
                loading: false 
              })}
              disabled={actionModal.loading}
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.action === 'approved' ? 'primary' : 'danger'}
              onClick={handleStatusUpdate}
              loading={actionModal.loading}
            >
              {actionModal.action === 'approved' ? 'Approve' : 'Reject'} Permission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PermissionManagement;