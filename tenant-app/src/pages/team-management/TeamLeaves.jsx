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
  // Status helpers for leaves (same logic as permissions)
  const getStatusClass = (leave) => {
    const hasLeadApproval = leave.approvals?.some(a => a.approverType === 'lead' && a.status === 'approved');
    const hasAdminApproval = leave.approvals?.some(a => a.approverType === 'admin' && a.status === 'approved');
    const hasRejection = leave.approvals?.some(a => a.status === 'rejected');

    if (hasRejection) return 'bg-red-100 text-red-800';
    if (hasLeadApproval && hasAdminApproval) return 'bg-green-100 text-green-800';
    if (hasLeadApproval) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (leave) => {
    const hasLeadApproval = leave.approvals?.some(a => a.approverType === 'lead' && a.status === 'approved');
    const hasAdminApproval = leave.approvals?.some(a => a.approverType === 'admin' && a.status === 'approved');
    const hasRejection = leave.approvals?.some(a => a.status === 'rejected');

    if (hasRejection) return 'Rejected';
    if (hasLeadApproval && hasAdminApproval) return 'Approved';
    if (hasLeadApproval) return 'Lead ✓ / Admin ⏳';
    return 'Pending';
  };

  const [updatingIds, setUpdatingIds] = useState(new Set());
  const { user } = useAuth();

  useEffect(() => {
    loadLeaves();
  }, []);

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
      
      // Update with backend response
      setLeaves(prev => prev.map(l => 
        l._id === updatedLeave._id ? updatedLeave : l
      ));
      
      setTimeout(() => loadLeaves(), 500);
    } catch (err) {
      console.error('Update status error:', err);
      toast.error('Failed to update status');
      loadLeaves();
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      {leaves.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-lg">No pending leave requests.</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4">Employee</th>
                <th className="text-left py-3 px-4">Dates</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Approvals</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(leave => (
                <tr key={leave._id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{leave.employee?.name || 'N/A'}</td>
                  <td className="py-3 px-4">
                    {leave.startDate?.slice(0,10)} to {leave.endDate?.slice(0,10)}
                  </td>
                  <td className="py-3 px-4 capitalize">{leave.leaveType}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {leave.approvals?.map((approval, idx) => (
                        <span key={idx} className={`px-2 py-1 rounded-full text-xs ${
                          approval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {approval.approver?.name || `${approval.approverType} ${approval.status[0]}`}
                        </span>
                      )) || <span className="text-xs text-gray-400 italic">None</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(leave)}`}>
                      {getStatusLabel(leave)}
                    </span>
                  </td>
                  <td className="py-3 px-4 space-x-2">
                    {!leave.approvals?.some(a => a.approverType === 'lead') && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateStatus(leave._id, 'approved')}
                          className="px-3 py-1"
                          disabled={updatingIds.has(leave._id)}
                        >
                          {updatingIds.has(leave._id) ? 'Updating...' : 'Approve'}
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => updateStatus(leave._id, 'rejected')}
                          className="px-3 py-1"
                          disabled={updatingIds.has(leave._id)}
                        >
                          {updatingIds.has(leave._id) ? 'Updating...' : 'Reject'}
                        </Button>
                      </>
                    )}

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default TeamLeaves;
