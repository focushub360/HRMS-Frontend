import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { leaveService } from '../../services/auth';
import { LEAVE_TYPES } from '../../utils/constants';
import {
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
} from '@mui/icons-material';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionModal, setActionModal] = useState({ isOpen: false, leave: null, action: '' });

  useEffect(() => { loadLeaves(); }, [filter]);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const data = await leaveService.getAllLeaves(filter);
      setLeaves(data);
    } catch (error) {
      console.error('Failed to load leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!actionModal.leave) return;
    try {
      await leaveService.updateStatus(actionModal.leave._id, actionModal.action);
      await loadLeaves();
      setActionModal({ isOpen: false, leave: null, action: '' });
    } catch (error) {
      console.error('Failed to update leave status:', error);
    }
  };

  // Derive unified status from dual-approval model
  const deriveStatus = (leave) => {
    const approvals = leave.approvals || [];
    const hasLeadApproval  = approvals.some(a => a.approverType === 'lead'  && a.status === 'approved');
    const hasAdminApproval = approvals.some(a => a.approverType === 'admin' && a.status === 'approved');
    const hasRejection     = approvals.some(a => a.status === 'rejected');
    if (hasRejection)                        return 'rejected';
    if (hasLeadApproval && hasAdminApproval) return 'approved';
    if (hasLeadApproval)                     return 'lead_approved';
    return leave.status || 'pending';
  };

  // ============================================================
  // Accepted By — name(s) of whoever approved (lead/admin)
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

  // Has ANY approver (lead or admin) accepted it? Used for "accepted" counts —
  // a leave is no longer "pending" the moment one approver says yes.
  const isAccepted = (leave) => getAcceptedApprovals(leave).length > 0;
  const isPending  = (leave) => !isAccepted(leave) && deriveStatus(leave) !== 'rejected';
  const isRejected = (leave) => deriveStatus(leave) === 'rejected';

  const getStatusBadge = (leave) => {
    const status = deriveStatus(leave);
    const cfg = {
      pending:       { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      lead_approved: { color: 'bg-blue-100 text-blue-800',     label: 'Lead ✓ / Admin ⏳' },
      approved:      { color: 'bg-green-100 text-green-800',   label: 'Approved' },
      rejected:      { color: 'bg-red-100 text-red-800',       label: 'Rejected' },
    };
    const { color, label } = cfg[status] || cfg.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {label}
      </span>
    );
  };

  // Per-approver green/red badges
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
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {isApproved ? '✓' : '✗'} {label}
          </span>
        );
      })}
    </div>
  );

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

  const getApprovalTrail = (leave) => {
    if (!leave.approvals?.length) return [];
    return leave.approvals
      .filter(a => a.status === 'approved' || a.status === 'rejected')
      .map(a => ({
        name:   a.approver?.name || (a.approverType === 'lead' ? 'Team Lead' : 'Admin'),
        type:   a.approverType === 'lead' ? 'Lead' : 'Admin',
        action: a.status,
        date:   a.approvedAt ? new Date(a.approvedAt).toLocaleDateString() : null,
      }));
  };

  const adminCanAct = (leave) => {
    const s = deriveStatus(leave);
    return s !== 'approved' && s !== 'rejected';
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leave Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Approve or reject employee leave requests</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All Leaves</option>
        </select>
      </div>

      {/* Summary cards — Pending / Accepted / Rejected (based on any-approver acceptance) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        <Card className="!p-0">
          <div className="text-center p-2 sm:p-4 md:p-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 mb-0.5 sm:mb-2">
              {leaves.filter(isPending).length}
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">Pending Approvals</p>
          </div>
        </Card>
        <Card className="!p-0">
          <div className="text-center p-2 sm:p-4 md:p-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mb-0.5 sm:mb-2">
              {leaves.filter(isAccepted).length}
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">Accepted</p>
          </div>
        </Card>
        <Card className="!p-0">
          <div className="text-center p-2 sm:p-4 md:p-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 mb-0.5 sm:mb-2">
              {leaves.filter(isRejected).length}
            </div>
            <p className="text-[11px] sm:text-sm font-medium text-gray-600 dark:text-gray-300">Rejected</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approvals</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accepted By</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="text-gray-400 dark:text-gray-500 mb-3 flex justify-center">
                      {filter === 'pending'
                        ? <CheckCircleIcon style={{ fontSize: 48 }} />
                        : <EventIcon style={{ fontSize: 48 }} />}
                    </div>
                    <p className="text-gray-500 dark:text-gray-300">
                      {filter === 'pending' ? 'No pending leave requests' : `No ${filter} leaves found`}
                    </p>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave._id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">

                    {/* Employee */}
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{leave.employee.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{leave.employee.department}</p>
                    </td>

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

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${LEAVE_TYPES[leave.leaveType]?.color}`}>
                        {LEAVE_TYPES[leave.leaveType]?.label || leave.leaveType}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[180px]">
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

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {adminCanAct(leave) ? (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setActionModal({ isOpen: true, leave, action: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setActionModal({ isOpen: true, leave, action: 'rejected' })}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Done</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, leave: null, action: '' })}
        title={`${actionModal.action === 'approved' ? 'Approve' : 'Reject'} Leave Request`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to{' '}
            <strong>{actionModal.action === 'approved' ? 'approve' : 'reject'}</strong> the leave request from{' '}
            <strong>{actionModal.leave?.employee.name}</strong>?
          </p>

          {actionModal.leave && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Duration:</strong> {actionModal.leave.totalDays ?? '—'} {actionModal.leave.totalDays === 1 ? 'day' : 'days'}</p>
              <p><strong>Dates:</strong> {new Date(actionModal.leave.startDate).toLocaleDateString()} – {new Date(actionModal.leave.endDate).toLocaleDateString()}</p>
              <p><strong>Reason:</strong> {actionModal.leave.reason || <span className="italic text-gray-400">Not provided</span>}</p>
              {getApprovalTrail(actionModal.leave).length > 0 && (
                <div className="pt-1 border-t border-gray-200 dark:border-gray-600 mt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Existing approvals</p>
                  {getApprovalTrail(actionModal.leave).map((e, i) => (
                    <p key={i} className="text-xs">
                      {e.action === 'approved' ? '✓' : '✗'} {e.name} ({e.type}){e.date ? ` · ${e.date}` : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setActionModal({ isOpen: false, leave: null, action: '' })}>
              Cancel
            </Button>
            <Button
              variant={actionModal.action === 'approved' ? 'primary' : 'danger'}
              onClick={handleStatusUpdate}
            >
              {actionModal.action === 'approved' ? 'Approve' : 'Reject'} Leave
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveManagement;