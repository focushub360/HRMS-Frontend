import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PermissionModal from './PermissionModal';
import { permissionService } from '../../services/auth';

import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// ============================================================
// Custom Select Dropdown
// ============================================================
const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ArrowDropDownIcon className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer rounded-md transition-colors ${
                String(opt.value) === String(value)
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
// Status badge
// ============================================================
const getStatusBadge = (status) => {
  const cfg = {
    pending:  { color: 'bg-yellow-100 text-yellow-800', label: 'Pending'  },
    approved: { color: 'bg-green-100 text-green-800',   label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-800',       label: 'Rejected' },
  };
  const { color, label } = cfg[status] || cfg.pending;
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{label}</span>;
};

// ============================================================
// Approved By — only show admin approvals, never lead name
// ============================================================
const ApprovedBy = ({ permission }) => {
  if (permission.status !== 'approved' && permission.status !== 'rejected') {
    return <span className="text-sm italic text-gray-400 dark:text-gray-500">—</span>;
  }

  // Look for an admin actor in the approvals array first
  const adminApproval = permission.approvals?.find(a => a.approverType === 'admin');

  if (adminApproval) {
    const name = adminApproval.approver?.name || 'Admin';
    return (
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        {name} <span className="text-gray-400 dark:text-gray-500 font-normal">(Admin)</span>
      </span>
    );
  }

  // Fall back to approvedBy field — but only show "(Admin)" if the role confirms it
  const actorRole = permission.approvedBy?.role;
  if (permission.approvedBy && (!actorRole || actorRole === 'admin')) {
    const name = permission.approvedBy.name || 'Admin';
    return (
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        {name} <span className="text-gray-400 dark:text-gray-500 font-normal">(Admin)</span>
      </span>
    );
  }

  // A lead approved this (no admin action yet) — don't show admin credit
  return (
    <span className="text-sm italic text-gray-400 dark:text-gray-500">
      Pending 
    </span>
  );
};

// ============================================================
// Main Component
// ============================================================
const MyPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [permissionModal, setPermissionModal] = useState(false);

  useEffect(() => {
    const handlePermissionsUpdate = () => loadPermissions();
    window.addEventListener('permissions-updated', handlePermissionsUpdate);
    return () => window.removeEventListener('permissions-updated', handlePermissionsUpdate);
  }, []);

  useEffect(() => { loadPermissions(); }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await permissionService.getMyPermissions();
      setPermissions(data || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = permissions.filter(p =>
    filter === 'all' ? true : p.status === filter
  );

  const filterOptions = [
    { value: 'all',      label: 'All Requests' },
    { value: 'pending',  label: 'Pending'      },
    { value: 'approved', label: 'Approved'     },
    { value: 'rejected', label: 'Rejected'     },
  ];

  const formatTimeWithAMPM = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '--:--';
      const hours   = date.getHours();
      const minutes = date.getMinutes();
      const ampm    = hours >= 12 ? 'PM' : 'AM';
      const hour12  = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getPermissionTypeLabel = (type) => ({
    'short-leave':     'Short Leave',
    'half-day':        'Half Day',
    'late-arrival':    'Late Arrival',
    'early-departure': 'Early Departure',
    'break-extension': 'Break Extension'
  })[type] || type;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Permissions</h1>
          <p className="text-gray-600 dark:text-gray-300">Track your permission requests and status</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <CustomSelect value={filter} onChange={setFilter} options={filterOptions} />
          </div>
          <Button
            onClick={() => setPermissionModal(true)}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <RequestQuoteIcon className="w-4 h-4" />
            <span>New Request</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                {['Type','Date & Time','Duration','Reason','Status','Approved By','Applied On'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-gray-400 dark:text-gray-500 text-5xl mb-3">⏱️</div>
                    <p className="text-gray-500 dark:text-gray-300 mb-4">
                      {filter === 'all' ? 'No permission requests found' : `No ${filter} permission requests found`}
                    </p>
                    {filter === 'all' && (
                      <Button onClick={() => setPermissionModal(true)}>Make Your First Request</Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((permission) => (
                  <tr
                    key={permission._id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Type */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {getPermissionTypeLabel(permission.permissionType)}
                    </td>
                    {/* Date & Time */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(permission.date)}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatTimeWithAMPM(permission.startTime)} – {formatTimeWithAMPM(permission.endTime)}
                      </div>
                    </td>
                    {/* Duration */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {permission.duration || 0}h
                    </td>
                    {/* Reason */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[200px]">
                      <span className="block truncate" title={permission.reason}>
                        {permission.reason || <span className="italic text-gray-400">—</span>}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(permission.status)}
                    </td>
                    {/* Approved By — admin only */}
                    <td className="py-3 px-4">
                      <ApprovedBy permission={permission} />
                    </td>
                    {/* Applied On */}
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {permission.createdAt ? formatDate(permission.createdAt) : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {[
          { label: 'Pending',  color: 'text-yellow-600', status: 'pending'  },
          { label: 'Approved', color: 'text-green-600',  status: 'approved' },
          { label: 'Rejected', color: 'text-red-600',    status: 'rejected' },
        ].map(({ label, color, status }) => (
          <Card key={status} className="!p-0">
            <div className="text-center p-2 sm:p-4 md:p-6">
              <div className={`text-lg sm:text-xl md:text-2xl font-bold ${color} mb-0.5 sm:mb-2`}>
                {permissions.filter(p => p.status === status).length}
              </div>
              <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={permissionModal}
        onClose={() => setPermissionModal(false)}
        onSuccess={() => loadPermissions()}
      />
    </div>
  );
};

export default MyPermissions;