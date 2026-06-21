import React, { useState, useRef, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { leaveService } from '../../services/auth';
import { LEAVE_TYPES } from '../../utils/constants';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// ============================================================
// Custom Select Dropdown
// ============================================================
const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

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
// Per-approver Lead / Admin badges (green = approved, red = not yet)
// ============================================================
const ApprovalBadges = ({ leave }) => (
  <div className="flex flex-wrap gap-1">
    {['lead', 'admin'].map((type) => {
      const approval   = leave.approvals?.find(a => a.approverType === type);
      const isApproved = approval?.status === 'approved';
      const label      = type === 'lead' ? 'Team Lead' : 'Admin';
      return (
        <span
          key={type}
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            isApproved
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {isApproved ? '✓' : '✗'} {label}
        </span>
      );
    })}
  </div>
);

// ============================================================
// Accepted By — shows the name(s) of whoever approved (lead/admin)
// Deduped so the SAME approver type never shows twice, but BOTH
// lead and admin will show together if both approved.
// ============================================================
const ACCEPTED_BY_LABELS = { lead: 'Lead', admin: 'Admin' };

const getAcceptedApprovals = (leave) => {
  const approved = (leave.approvals || []).filter(a => a.status === 'approved');

  // Dedupe by approverType — keep the most recent entry per type
  const latestByType = {};
  approved.forEach((a) => {
    const existing = latestByType[a.approverType];
    if (
      !existing ||
      new Date(a.approvedAt || 0) >= new Date(existing.approvedAt || 0)
    ) {
      latestByType[a.approverType] = a;
    }
  });

  // Keep a stable order: lead first, then admin
  return ['lead', 'admin']
    .map((type) => latestByType[type])
    .filter(Boolean);
};

const AcceptedBy = ({ leave }) => {
  const accepted = getAcceptedApprovals(leave);

  if (accepted.length === 0) {
    return <span className="text-sm italic text-gray-400 dark:text-gray-500">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {accepted.map((a) => {
        const name = a.approverName || a.approver?.name || a.approvedBy?.name || 'Unknown';
        const tag  = ACCEPTED_BY_LABELS[a.approverType] || a.approverType;
        return (
          <span
            key={a.approverType}
            className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap"
          >
            {name} <span className="text-gray-400 dark:text-gray-500 font-normal">({tag})</span>
          </span>
        );
      })}
    </div>
  );
};

// Treat a leave as "accepted" if ANY approver (lead or admin) approved it,
// regardless of the overall leave.status field.
const isAccepted = (leave) => getAcceptedApprovals(leave).length > 0;
const isPending  = (leave) => !isAccepted(leave) && leave.status !== 'rejected';

// ============================================================
// Main Component
// ============================================================
const LeaveList = () => {
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => { loadLeaves(); }, []);

  const loadLeaves = async () => {
    try {
      const data = await leaveService.getMyLeaves();
      setLeaves(data);
    } catch (error) {
      console.error('Failed to load leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'all') return true;
    if (filter === 'pending')  return isPending(leave);
    if (filter === 'approved') return isAccepted(leave);
    if (filter === 'rejected') return leave.status === 'rejected';
    return true;
  });

  const filterOptions = [
    { value: 'all',      label: 'All Leaves' },
    { value: 'pending',  label: 'Pending'    },
    { value: 'approved', label: 'Approved'   },
    { value: 'rejected', label: 'Rejected'   },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Leaves</h1>
          <p className="text-gray-600 dark:text-gray-300">Track your leave applications and status</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <CustomSelect value={filter} onChange={setFilter} options={filterOptions} />
          </div>
          <Button as="a" href="/leaves/apply" className="text-center">
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#4b5563_transparent]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approvals</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accepted By</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applied On</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-gray-400 dark:text-gray-500 text-5xl mb-3">📅</div>
                    <p className="text-gray-500 dark:text-gray-300 mb-4">
                      {filter === 'all' ? 'No leave applications found' : `No ${filter} leaves found`}
                    </p>
                    {filter === 'all' && (
                      <Button as="a" href="/leaves/apply">Apply for Your First Leave</Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">

                    {/* Dates */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(leave.startDate).toLocaleDateString()}
                      <span className="mx-1 text-gray-400">→</span>
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>

                    {/* Days */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                    </td>

                    {/* Type - Plain text */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {LEAVE_TYPES[leave.leaveType]?.label || leave.leaveType}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[200px]">
                      <span className="block truncate" title={leave.reason}>
                        {leave.reason || <span className="italic text-gray-400">—</span>}
                      </span>
                    </td>

                    {/* Approvals — Lead + Admin badges */}
                    <td className="py-3 px-4">
                      <ApprovalBadges leave={leave} />
                    </td>

                    {/* Accepted By — name(s) of whoever approved */}
                    <td className="py-3 px-4">
                      <AcceptedBy leave={leave} />
                    </td>

                    {/* Applied On */}
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statistics — compact on mobile, normal on larger screens */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        <Card className="!p-0">
          <div className="text-center p-2 sm:p-4 md:p-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 mb-0.5 sm:mb-2">
              {leaves.filter(isPending).length}
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
          </div>
        </Card>
        <Card className="!p-0">
          <div className="text-center p-2 sm:p-4 md:p-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mb-0.5 sm:mb-2">
              {leaves.filter(isAccepted).length}
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">Approved</p>
          </div>
        </Card>
        <Card className="!p-0">
          <div className="text-center p-2 sm:p-4 md:p-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 mb-0.5 sm:mb-2">
              {leaves.filter(l => l.status === 'rejected').length}
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">Rejected</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeaveList;