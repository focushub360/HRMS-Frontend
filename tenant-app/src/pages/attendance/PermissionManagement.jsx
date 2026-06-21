import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { showSuccess, showError } from '../../utils/toast';
import { permissionService, employeeService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';

// ============================================================
// Success Notification Component
// ============================================================
const SuccessNotification = ({ message, type = 'success', onClose, show }) => {
  if (!show) return null;

  const bgClass = type === 'success'
    ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700'
    : 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700';

  const textClass = type === 'success' ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100';

  const icon = type === 'success'
    ? <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-200" />
    : <CancelIcon className="w-5 h-5 text-red-600 dark:text-red-200" />;

  const closeHover = type === 'success'
    ? 'hover:bg-green-600 dark:hover:bg-green-700'
    : 'hover:bg-red-600 dark:hover:bg-red-700';

  return (
    <div className={`fixed top-4 right-4 z-50 border rounded-lg p-4 shadow-lg ${bgClass} animate-fade-in`}>
      <div className="flex items-center space-x-3">
        {icon}
        <div className="flex-1">
          <p className={`text-sm font-medium ${textClass}`}>{message}</p>
        </div>
        <button onClick={onClose} className={`p-1 rounded-full ${closeHover} transition-colors`}>
          <CloseIcon className="w-4 h-4 text-current dark:text-gray-100" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================
const PermissionManagement = () => {
  // ── Auth ──────────────────────────────────────────────────
  const { user } = useAuth();
  // ONLY the 'admin' role can approve/reject permissions.
  // 'team-lead' role is read-only in this component.
  const isAdmin = user?.role === 'admin';

  // ── State ─────────────────────────────────────────────────
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  // refreshKey forces a reload even when the same filter value is re-selected
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    permission: null,
    action: '',
    loading: false,
  });
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  // ── Effects ───────────────────────────────────────────────
  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedMonth, selectedYear, selectedEmployee, refreshKey]);

  useEffect(() => {
    const handleAdminRefresh = () => loadInitialData();
    window.addEventListener('admin-refresh', handleAdminRefresh);
    return () => window.removeEventListener('admin-refresh', handleAdminRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedMonth, selectedYear, selectedEmployee]);

  // ── Helpers ───────────────────────────────────────────────
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const hideNotification = () => setNotification(prev => ({ ...prev, show: false }));

  const closeActionModal = () =>
    setActionModal({ isOpen: false, permission: null, action: '', loading: false });

  // Helper: set a filter value; if it's already the current value, bump refreshKey instead
  const applyFilter = (setter, current, next) => {
    if (next === current) {
      setRefreshKey(k => k + 1);
    } else {
      setter(next);
    }
  };

  // ── Data loading ──────────────────────────────────────────
  const loadInitialData = async () => {
    try {
      setTableLoading(true);
      const statusParam = filter === 'all' ? undefined : filter;

      const [permissionsData, employeesData] = await Promise.all([
        permissionService.getAllPermissions(
          statusParam,
          selectedMonth,
          selectedYear,
          selectedEmployee !== 'all' ? selectedEmployee : undefined
        ),
        employeeService.getAll(),
      ]);

      setPermissions(permissionsData || []);
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('Failed to load permissions data', 'error');
    } finally {
      setTableLoading(false);
      setInitialLoading(false);
    }
  };

  // ── Action handler (admin only) ───────────────────────────
  const handleStatusUpdate = async () => {
    // Guard: should never be reachable for non-admins, but belt-and-suspenders
    if (!isAdmin || !actionModal.permission) return;

    setActionModal(prev => ({ ...prev, loading: true }));
    try {
      await permissionService.updateStatus(actionModal.permission._id, actionModal.action);
      const actionText = actionModal.action === 'approved' ? 'approved' : 'rejected';
      const employeeName = actionModal.permission.employee?.name || 'the employee';
      showSuccess(`Permission ${actionText} successfully for ${employeeName}`);
      await loadInitialData();
      window.dispatchEvent(new CustomEvent('permissions-updated'));
      closeActionModal();
    } catch (error) {
      console.error('Failed to update permission status:', error);
      showError(error.response?.data?.message || 'Failed to update permission status');
      setActionModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ── UI helpers ────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const cfg = {
      pending:  { color: 'bg-yellow-100 text-yellow-800', label: 'Pending'  },
      approved: { color: 'bg-green-100 text-green-800',   label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800',       label: 'Rejected' },
    };
    const { color, label } = cfg[status] || cfg.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {label}
      </span>
    );
  };

  // "Approved By" — only shows the admin who acted; never shows a lead name
  const ApprovedBy = ({ permission }) => {
    if (permission.status !== 'approved' && permission.status !== 'rejected') {
      return <span className="text-sm italic text-gray-400 dark:text-gray-500">—</span>;
    }

    // Only trust approvedBy if the actor was an admin
    const actorRole = permission.approvedBy?.role;
    if (actorRole && actorRole !== 'admin') {
      // A non-admin somehow approved this (legacy data or bug) — show a neutral label
      return (
        <span className="text-sm italic text-gray-400 dark:text-gray-500">
          Pending admin review
        </span>
      );
    }

    const name = permission.approvedBy?.name || 'Admin';
    return (
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        {name}{' '}
        <span className="text-gray-400 dark:text-gray-500 font-normal">(Admin)</span>
      </span>
    );
  };

  const formatTimeWithAMPM = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '--:--';
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // ── Render ────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Column count changes depending on whether the Actions column is shown
  const colSpan = isAdmin ? 8 : 7;

  return (
    <div className="space-y-6">
      {/* Notification */}
      <SuccessNotification
        message={notification.message}
        type={notification.type}
        show={notification.show}
        onClose={hideNotification}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Permission Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {isAdmin
              ? 'Approve or reject employee permission requests'
              : 'View your team\'s permission requests'}
          </p>
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

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Status
              </label>
              <select
                value={filter}
                onChange={(e) => applyFilter(setFilter, filter, e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Permissions</option>
              </select>
            </div>

            {/* Employee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => applyFilter(setSelectedEmployee, selectedEmployee, e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => applyFilter(setSelectedMonth, selectedMonth, parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => applyFilter(setSelectedYear, selectedYear, parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>

          </div>
        </Card.Content>
      </Card>

      {/* Table */}
      <Card>
        <Card.Header>
          <Card.Title>
            {filter === 'pending'  ? 'Pending Approval'      :
             filter === 'approved' ? 'Approved Permissions'  :
             filter === 'rejected' ? 'Rejected Permissions'  : 'All Permissions'}
            {' '}({permissions.length})
          </Card.Title>
        </Card.Header>

        <div className="overflow-x-auto relative">
          {tableLoading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 flex items-center justify-center z-10">
              <LoadingSpinner size="md" />
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date &amp; Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approved By</th>
                {/* Actions column header — admin only */}
                {isAdmin && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {permissions.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="text-center py-12">
                    <div className="text-gray-400 dark:text-gray-500 mb-3 flex justify-center">
                      <PendingActionsIcon style={{ fontSize: 48 }} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-300">
                      {filter === 'pending'
                        ? 'No pending permission requests'
                        : `No ${filter} permissions found`}
                    </p>
                  </td>
                </tr>
              ) : (
                permissions.map((permission) => (
                  <tr
                    key={permission._id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {permission.employee?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {permission.employee?.department || 'N/A'}
                      </p>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize dark:bg-blue-800 dark:text-blue-100">
                        {permission.permissionType?.replace('-', ' ')}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <EventIcon className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(permission.date)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatTimeWithAMPM(permission.startTime)} – {formatTimeWithAMPM(permission.endTime)}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {permission.duration || 0}h
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[180px]">
                      <span className="block truncate" title={permission.reason}>
                        {permission.reason || <span className="italic text-gray-400">—</span>}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(permission.status)}
                    </td>

                    {/* Approved By */}
                    <td className="py-3 px-4">
                      <ApprovedBy permission={permission} />
                    </td>

                    {/* Actions — admin only */}
                    {isAdmin && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {permission.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setActionModal({
                                isOpen: true,
                                permission,
                                action: 'approved',
                                loading: false,
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
                                loading: false,
                              })}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Done</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal — admin only */}
      {isAdmin && (
        <Modal
          isOpen={actionModal.isOpen}
          onClose={() => !actionModal.loading && closeActionModal()}
          title={`${actionModal.action === 'approved' ? 'Approve' : 'Reject'} Permission Request`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to <strong>{actionModal.action}</strong> the permission
              request from{' '}
              <strong>{actionModal.permission?.employee?.name || 'this employee'}</strong>?
            </p>

            {actionModal.permission && (
              <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Type:</strong>{' '}
                  {actionModal.permission.permissionType?.replace('-', ' ') || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Duration:</strong> {actionModal.permission.duration || 0} hours
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Date:</strong> {formatDate(actionModal.permission.date)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Time:</strong>{' '}
                  {formatTimeWithAMPM(actionModal.permission.startTime)} –{' '}
                  {formatTimeWithAMPM(actionModal.permission.endTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Reason:</strong>{' '}
                  {actionModal.permission.reason || 'No reason provided'}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={closeActionModal}
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
      )}
    </div>
  );
};

export default PermissionManagement;