import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PermissionModal from './PermissionModal';
import { permissionService } from '../../services/auth';


// Material-UI Icons
import HistoryIcon from '@mui/icons-material/History';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FilterListIcon from '@mui/icons-material/FilterList';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const MyPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');
  const [permissionModal, setPermissionModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Real-time refresh on permission updates
  useEffect(() => {
    const handlePermissionsUpdate = () => {
      loadPermissions();
    };
    window.addEventListener('permissions-updated', handlePermissionsUpdate);
    return () => window.removeEventListener('permissions-updated', handlePermissionsUpdate);
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [selectedMonth, selectedYear, statusFilter]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await permissionService.getMyPermissions(
        selectedMonth, 
        selectedYear, 
        statusFilter === 'all' ? undefined : statusFilter
      );
      setPermissions(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      alert('Failed to load permission history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (permissionData) => {
    const total = permissionData.length;
    const pending = permissionData.filter(p => p.status === 'pending').length;
    const approved = permissionData.filter(p => p.status === 'approved').length;
    const rejected = permissionData.filter(p => p.status === 'rejected').length;

    setStats({
      total,
      pending,
      approved,
      rejected
    });
  };

  const handlePermissionSuccess = () => {
    loadPermissions(); // Refresh the list
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        label: 'Pending', 
        icon: <PendingActionsIcon className="w-3 h-3" /> 
      },
      approved: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        label: 'Approved', 
        icon: <CheckCircleIcon className="w-3 h-3" /> 
      },
      rejected: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        label: 'Rejected', 
        icon: <CancelIcon className="w-3 h-3" /> 
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  // Format a date/time string into local time with AM/PM
  const formatTimeWithAMPM = (dateString) => {
    if (!dateString) return '--:--';

    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '--:--';

      // Use the Date object's local getters (no manual offset adjustment)
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

  const getPermissionTypeLabel = (type) => {
    const typeLabels = {
      'short-leave': 'Short Leave',
      'half-day': 'Half Day',
      'late-arrival': 'Late Arrival',
      'early-departure': 'Early Departure',
      'break-extension': 'Break Extension'
    };
    return typeLabels[type] || type;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Permission History</h1>
          <p className="text-gray-600">Track all your permission requests and their status</p>
        </div>
        
        <Button
          onClick={() => setPermissionModal(true)}
          className="flex items-center space-x-2"
        >
          <RequestQuoteIcon className="w-4 h-4" />
          <span>New Request</span>
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500"
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

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {stats.total}
            </div>
            <p className="text-sm text-gray-600">Total Requests</p>
            <HistoryIcon className="w-5 h-5 text-primary-600 mx-auto mt-2" />
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {stats.pending}
            </div>
            <p className="text-sm text-gray-600">Pending</p>
            <PendingActionsIcon className="w-5 h-5 text-yellow-600 mx-auto mt-2" />
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {stats.approved}
            </div>
            <p className="text-sm text-gray-600">Approved</p>
            <CheckCircleIcon className="w-5 h-5 text-green-600 mx-auto mt-2" />
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {stats.rejected}
            </div>
            <p className="text-sm text-gray-600">Rejected</p>
            <CancelIcon className="w-5 h-5 text-red-600 mx-auto mt-2" />
          </div>
        </Card>
      </div>

      {/* Permissions List */}
      <Card>
        <Card.Header>
          <Card.Title>
            Permission History ({permissions.length} records)
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {permissions.map((permission) => (
              <div key={permission._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <AccessTimeIcon className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                            {getPermissionTypeLabel(permission.permissionType)}
                          </h4>
                          {getStatusBadge(permission.status)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {permission.reason}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <CalendarMonthIcon className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {formatDate(permission.date)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ScheduleIcon className="w-4 h-4 text-gray-400 dark:text-gray-300" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {formatTimeWithAMPM(permission.startTime)} - {formatTimeWithAMPM(permission.endTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 font-medium">
                          Duration: {permission.duration}h
                        </span>
                      </div>
                    </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500">
                        Applied on {permission.createdAt ? formatDate(permission.createdAt) : 'N/A'}
                      </div>
                      
                      {permission.approvedBy && (
                        <div className="text-xs text-gray-500">
                          {permission.status === 'approved' ? 'Approved' : 'Rejected'} by {permission.approvedBy?.name || 'Admin'}
                          {permission.approvedAt && ` on ${formatDate(permission.approvedAt)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {permissions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <HistoryIcon className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg font-medium mb-2">
                  No permission requests found
                </p>
                <p className="text-gray-400 mb-6">
                  {statusFilter === 'all' 
                    ? "You haven't made any permission requests yet."
                    : `No ${statusFilter} permission requests found for the selected period.`
                  }
                </p>
                <Button
                  onClick={() => setPermissionModal(true)}
                  className="flex items-center space-x-2 mx-auto"
                >
                  <RequestQuoteIcon className="w-4 h-4" />
                  <span>Make Your First Request</span>
                </Button>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={permissionModal}
        onClose={() => setPermissionModal(false)}
        onSuccess={handlePermissionSuccess}
      />
    </div>
  );
};

export default MyPermissions;