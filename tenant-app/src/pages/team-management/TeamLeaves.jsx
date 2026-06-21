import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { leaveService } from '../../services/auth';
import { toast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';

const TeamLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const { user } = useAuth();

  useEffect(() => { loadLeaves(); }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await leaveService.getLeadPendingLeaves('pending');
      setLeaves(data);
    } catch (err) {
      console.error('Load leave requests error:', err);
      setError('Failed to load leave requests. Please refresh.');
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    if (updatingIds.has(id)) return;
    setUpdatingIds(prev => new Set([...prev, id]));
    try {
      const updatedLeave = await leaveService.updateLeadStatus(id, status);
      toast.success(`Leave ${status}`);
      setLeaves(prev => prev.map(l => l._id === updatedLeave._id ? updatedLeave : l));
      setTimeout(() => loadLeaves(), 500);
    } catch (err) {
      console.error('Update status error:', err);
      toast.error('Failed to update status');
      loadLeaves();
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Derive overall status from approvals array
  const deriveStatus = (leave) => {
    const approvals = leave.approvals || [];
    const hasLeadApproval  = approvals.some(a => a.approverType === 'lead'  && a.status === 'approved');
    const hasAdminApproval = approvals.some(a => a.approverType === 'admin' && a.status === 'approved');
    const hasRejection     = approvals.some(a => a.status === 'rejected');
    if (hasRejection)                        return 'rejected';
    if (hasLeadApproval && hasAdminApproval) return 'approved';
    if (hasLeadApproval)                     return 'lead_approved';
    return 'pending';
  };

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

  // Per-approver green/red badges — same as LeaveManagement
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leave Requests</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">{error}</div>
        )}
      </div>

      <Card>
        {leaves.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pending leave requests.</p>
          </div>
        ) : (
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => {
                  const hasLeadActed = leave.approvals?.some(a => a.approverType === 'lead');

                  return (
                    <tr key={leave._id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">

                      {/* Employee */}
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {leave.employee?.name || 'N/A'}
                        </p>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {leave.startDate?.slice(0, 10)}
                        <span className="mx-1 text-gray-400">→</span>
                        {leave.endDate?.slice(0, 10)}
                      </td>

                      {/* Days */}
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 text-sm capitalize text-gray-700 dark:text-gray-300">
                        {leave.leaveType}
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

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {!hasLeadActed ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateStatus(leave._id, 'approved')}
                              disabled={updatingIds.has(leave._id)}
                            >
                              {updatingIds.has(leave._id) ? 'Updating…' : 'Approve'}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => updateStatus(leave._id, 'rejected')}
                              disabled={updatingIds.has(leave._id)}
                            >
                              {updatingIds.has(leave._id) ? 'Updating…' : 'Reject'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeamLeaves;