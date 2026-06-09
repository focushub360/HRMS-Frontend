import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { permissionService, employeeService } from '../../services/auth';

const PermissionHistory = () => {
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: 'all',
    status: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [stats, setStats] = useState(null);
  const [detailModal, setDetailModal] = useState({ isOpen: false, permission: null });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [employeesData] = await Promise.all([
        employeeService.getAll()
      ]);
      setEmployees(employeesData.filter(emp => emp.isActive));
      await loadPermissions();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await permissionService.getAllPermissions(
        filters.status === 'all' ? undefined : filters.status,
        filters.month,
        filters.year,
        filters.employeeId === 'all' ? undefined : filters.employeeId
      );
      setPermissions(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    }
  };

  const calculateStats = (permissionData) => {
    const total = permissionData.length;
    const approved = permissionData.filter(p => p.status === 'approved').length;
    const rejected = permissionData.filter(p => p.status === 'rejected').length;
    const pending = permissionData.filter(p => p.status === 'pending').length;
    
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : 0;
    
    // Employee-wise stats
    const employeeStats = {};
    permissionData.forEach(permission => {
      const empId = permission.employee?._id;
      if (empId) {
        if (!employeeStats[empId]) {
          employeeStats[empId] = {
            name: permission.employee?.name,
            department: permission.employee?.department,
            total: 0,
            approved: 0,
            rejected: 0,
            pending: 0
          };
        }
        employeeStats[empId].total++;
        employeeStats[empId][permission.status]++;
      }
    });

    // Permission type stats
    const typeStats = {};
    permissionData.forEach(permission => {
      const type = permission.permissionType;
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    setStats({
      total,
      approved,
      rejected,
      pending,
      approvalRate,
      employeeStats: Object.values(employeeStats).sort((a, b) => b.total - a.total),
      typeStats
    });
  };

  const handleStatusUpdate = async (permissionId, status) => {
    try {
      await permissionService.updateStatus(permissionId, status);
      await loadPermissions(); // Refresh data
    } catch (error) {
      console.error('Failed to update permission status:', error);
      alert(error.response?.data?.message || 'Failed to update permission status');
    }
  };

  // FIXED: Convert UTC time to local time with AM/PM
  const formatTimeWithAMPM = (utcDateString) => {
    if (!utcDateString) return '--:--';
    
    try {
      const date = new Date(utcDateString);

      // `new Date(isoString)` already returns the correct local-time instant.
      // Avoid applying timezoneOffset again (that causes double-shifting).
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

  // Excel Export Function
  const exportToExcel = async () => {
    if (permissions.length === 0) {
      alert('No data to export');
      return;
    }

    setExportLoading(true);
    try {
      // Prepare data for export
      const exportData = permissions.map(permission => ({
        'Employee Name': permission.employee?.name || 'N/A',
        'Employee ID': permission.employee?._id || 'N/A',
        'Department': permission.employee?.department || 'N/A',
        'Position': permission.employee?.position || 'N/A',
        'Permission Type': formatPermissionType(permission.permissionType),
        'Date': formatDateForExport(permission.date),
        'Start Time': formatTimeForExport(permission.startTime),
        'End Time': formatTimeForExport(permission.endTime),
        'Duration (Hours)': permission.duration || 0,
        'Reason': permission.reason || 'No reason provided',
        'Status': formatStatus(permission.status),
        'Applied Date': formatDateForExport(permission.createdAt),
        'Approved By': permission.approvedBy?.name || 'N/A',
        'Approved Date': permission.approvedAt ? formatDateForExport(permission.approvedAt) : 'N/A'
      }));

      // Create CSV content
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in values
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = generateFileName();
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      //console.log('Excel export completed successfully');
    } catch (error) {
      console.error('Export to Excel failed:', error);
      alert('Failed to export data to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Helper functions for export
  const formatPermissionType = (type) => {
    if (!type) return 'N/A';
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDateForExport = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTimeForExport = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatStatus = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusMap[status] || status;
  };

  const generateFileName = () => {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    let fileName = `permission_history_${date}_${time}`;
    
    // Add filters to filename if not "all"
    if (filters.employeeId !== 'all') {
      const employee = employees.find(emp => emp._id === filters.employeeId);
      if (employee) {
        fileName += `_${employee.name.replace(/\s+/g, '_')}`;
      }
    }
    
    if (filters.status !== 'all') {
      fileName += `_${filters.status}`;
    }
    
    if (filters.month && filters.year) {
      fileName += `_${filters.month}_${filters.year}`;
    }
    
    return `${fileName}.csv`;
  };

  // Status helpers — any single approval is enough to be 'Approved'
  const getStatusClass = (permission) => {
    const hasRejection = permission.approvals?.some(a => a.status === 'rejected');
    const anyApproval = permission.approvals?.some(a => a.status === 'approved');
    // Also respect the DB status field for fully persisted records
    if (permission.status === 'rejected' || hasRejection) return 'bg-red-100 text-red-800 border-red-200';
    if (permission.status === 'approved' || anyApproval) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getStatusLabel = (permission) => {
    const hasRejection = permission.approvals?.some(a => a.status === 'rejected');
    const anyApproval = permission.approvals?.some(a => a.status === 'approved');
    if (permission.status === 'rejected' || hasRejection) return 'Rejected';
    if (permission.status === 'approved' || anyApproval) return 'Approved';
    return 'Pending';
  };

  const getStatusBadge = (permission) => {
    // Accept either a permission object or a plain status string (legacy)
    if (typeof permission === 'string') {
      const colorMap = { approved: 'bg-green-100 text-green-800 border-green-200', rejected: 'bg-red-100 text-red-800 border-red-200', pending: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      const labelMap = { approved: 'Approved', rejected: 'Rejected', pending: 'Pending' };
      return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorMap[permission] || colorMap.pending}`}>{labelMap[permission] || permission}</span>;
    }
    const label = getStatusLabel(permission);
    const color = getStatusClass(permission);
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${color}`}>
        {label}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Permission History</h1>
          <p className="text-gray-600 dark:text-gray-300">View and manage all employee permission requests</p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={exportToExcel}
            loading={exportLoading}
            variant="outline"
            className="whitespace-nowrap"
            disabled={permissions.length === 0}
          >
            {exportLoading ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {stats.total}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {stats.approved}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Approved</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {stats.rejected}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Rejected</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {stats.pending}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Pending</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.approvalRate}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Approval Rate</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {stats.employeeStats.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Employees</p>
            </div>
          </Card>
        </div>
      )}

      {/* Export Information */}
      {permissions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200 dark:bg-transparent dark:border-gray-700">
          <Card.Content className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Export Ready
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  Export includes {permissions.length} permission records with all details including employee information, dates, times, and status.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">
                  File: {generateFileName().replace('.csv', '')}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  CSV format - Compatible with Excel
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <Card.Header>
          <Card.Title>Filters</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <option value="all" className="dark:bg-gray-800 dark:text-gray-100">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                    {emp.name} - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <option value="all" className="dark:bg-gray-800 dark:text-gray-100">All Status</option>
                <option value="pending" className="dark:bg-gray-800 dark:text-gray-100">Pending</option>
                <option value="approved" className="dark:bg-gray-800 dark:text-gray-100">Approved</option>
                <option value="rejected" className="dark:bg-gray-800 dark:text-gray-100">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
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
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">{year}</option>;
                })}
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Employee Permission Summary */}
      {stats && stats.employeeStats.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Employee Permission Summary</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rejected
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {stats.employeeStats.slice(0, 10).map((emp, index) => {
                    const approvalRate = emp.total > 0 ? ((emp.approved / emp.total) * 100).toFixed(1) : 0;
                    
                      return (
                      <tr key={emp.name + index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary-600">
                                {emp.name?.charAt(0) || 'E'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {emp.name || 'Unknown Employee'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-300">
                                {emp.department || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">
                          <span className="font-semibold">{emp.total}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-green-600 dark:text-green-300">{emp.approved}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-red-600 dark:text-red-300">{emp.rejected}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-yellow-600 dark:text-yellow-300">{emp.pending}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`font-semibold ${
                            approvalRate >= 80 ? 'text-green-600' :
                            approvalRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {approvalRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Detailed Permission History */}
      <Card>
        <Card.Header>
          <Card.Title>
            Permission History ({permissions.length} records)
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approvals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {permissions.map((permission) => (
                  <tr key={permission._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary-600">
                            {permission.employee?.name?.charAt(0) || 'E'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {permission.employee?.name || 'Unknown Employee'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300">
                            {permission.employee?.department || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 capitalize">
                      {permission.permissionType?.replace('-', ' ') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div>
                        <div>{formatDate(permission.date)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300">
                          {formatTimeWithAMPM(permission.startTime)} - {formatTimeWithAMPM(permission.endTime)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {permission.duration || 0}h
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {permission.reason || 'No reason provided'}
                    </td>
                    <td className="py-3 px-4">
                      {permission.approvals?.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {permission.approvals.map((appr, idx) => (
                            <span key={idx} className="text-xs text-gray-600 dark:text-gray-300">
                              <span className={`font-medium capitalize ${appr.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{appr.status}</span>
                              {' '}by {appr.approver?.name || 'Admin'}
                              <span className="text-gray-400 ml-1 capitalize">({appr.approverType})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No approvals yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(permission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setDetailModal({ isOpen: true, permission })}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-100"
                      >
                        View
                      </button>
                      {permission.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(permission._id, 'approved')}
                            className="text-green-600 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(permission._id, 'rejected')}
                            className="text-red-600 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {permissions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📋</div>
                <p className="text-gray-500 dark:text-gray-300">No permission records found for selected filters</p>
                <p className="text-sm text-gray-400 dark:text-gray-400 mt-2">
                  Try adjusting your filters or select a different period
                </p>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Permission Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, permission: null })}
        title="Permission Details"
        size="md"
      >
        {detailModal.permission && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {detailModal.permission.employee?.name?.charAt(0) || 'E'}
                </span>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {detailModal.permission.employee?.name || 'Unknown Employee'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {detailModal.permission.employee?.department || 'N/A'} • {detailModal.permission.employee?.position || 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Permission Type</label>
                <p className="text-gray-900 dark:text-gray-100 capitalize">
                  {detailModal.permission.permissionType?.replace('-', ' ') || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Status</label>
                <div className="mt-1">{getStatusBadge(detailModal.permission)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Date</label>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(detailModal.permission.date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Duration</label>
                <p className="text-gray-900 dark:text-gray-100">{detailModal.permission.duration || 0} hours</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Time Period</label>
                <p className="text-gray-900 dark:text-gray-100">
                  {formatTimeWithAMPM(detailModal.permission.startTime)} - {formatTimeWithAMPM(detailModal.permission.endTime)}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-300">Reason</label>
                <p className="text-gray-900 dark:text-gray-100 mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {detailModal.permission.reason || 'No reason provided'}
                </p>
              </div>
            </div>

            {detailModal.permission.approvedBy && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {detailModal.permission.status === 'approved' ? 'Approved' : 'Rejected'} by {detailModal.permission.approvedBy?.name || 'Admin'}
                  {detailModal.permission.approvedAt && ` on ${formatDate(detailModal.permission.approvedAt)}`}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PermissionHistory;