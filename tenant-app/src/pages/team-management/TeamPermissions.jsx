import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { permissionService } from '../../services/auth';
import { toast } from '../../utils/toast';

import { useAuth } from '../../context/AuthContext';

const TeamPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await permissionService.getLeadPendingPermissions('pending');
      setPermissions(data);
    } catch (err) {
      console.error('Load permission requests error:', err);
      setError('Failed to load permission requests. Please refresh.');
      toast.error('Failed to load permission requests');
    } finally {
      setLoading(false);
    }
  };

  const [updatingIds, setUpdatingIds] = useState(new Set());

  const updateStatus = async (id, status) => {
    if (updatingIds.has(id)) return; // Prevent double-click

    setUpdatingIds(prev => new Set([...prev, id]));
    try {
      const updatedPermission = await permissionService.updateLeadStatus(id, status);
      toast.success(`Permission ${status}`);
      
      // Update local state with backend response (includes approvals)
      setPermissions(prev => prev.map(p => 
        p._id === updatedPermission._id ? updatedPermission : p
      ));
      
      // Optional full refetch
      setTimeout(() => loadPermissions(), 500);
    } catch (err) {
      console.error('Update status error:', err);
      toast.error('Failed to update status');
      loadPermissions(); // Refresh on error
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Status helper functions
  const getStatusClass = (permission) => {
    const hasLeadApproval = permission.approvals?.some(a => a.approverType === 'lead' && a.status === 'approved');
    const hasAdminApproval = permission.approvals?.some(a => a.approverType === 'admin' && a.status === 'approved');
    const hasRejection = permission.approvals?.some(a => a.status === 'rejected');

    if (hasRejection) return 'bg-red-100 text-red-800';
    if (hasLeadApproval && hasAdminApproval) return 'bg-green-100 text-green-800';
    if (hasLeadApproval) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (permission) => {
    const hasLeadApproval = permission.approvals?.some(a => a.approverType === 'lead' && a.status === 'approved');
    const hasAdminApproval = permission.approvals?.some(a => a.approverType === 'admin' && a.status === 'approved');
    const hasRejection = permission.approvals?.some(a => a.status === 'rejected');

    if (hasRejection) return 'Rejected';
    if (hasLeadApproval && hasAdminApproval) return 'Approved';
    if (hasLeadApproval) return 'Lead ✓ / Admin ⏳';
    return 'Pending';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Permission Requests</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      {permissions.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-lg">No pending permission requests.</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4">Employee</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Time</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Duration</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Approvals</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission._id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{permission.employee?.name || 'N/A'}</td>
                  <td className="py-3 px-4">
                    {permission.date ? new Date(permission.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    {permission.startTime ? new Date(permission.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'} - 
                    {permission.endTime ? new Date(permission.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 capitalize">{permission.permissionType}</td>
                  <td className="py-3 px-4">{permission.duration ? `${permission.duration.toFixed(1)}h` : 'N/A'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getStatusClass(permission)
                  }`}>
                    {getStatusLabel(permission)}
                  </span>
                </td>
                <td className="py-3 px-4">
                      {permission.approvals?.map((approval, idx) => (
                        <span key={idx} className={`px-2 py-1 rounded-full text-xs mr-1 ${
                          approval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {approval.approver?.name || `${approval.approverType} ${approval.status[0]}`}
                        </span>
                      )) || 'None'}
                </td>
                <td className="py-3 px-4 space-x-2">
                  {!permission.approvals?.some(a => a.approverType === 'lead') && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(permission._id, 'approved')}
                        className="px-3 py-1"
                        disabled={updatingIds.has(permission._id)}
                      >
                        {updatingIds.has(permission._id) ? 'Updating...' : 'Approve'}
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => updateStatus(permission._id, 'rejected')}
                        className="px-3 py-1"
                        disabled={updatingIds.has(permission._id)}
                      >
                        {updatingIds.has(permission._id) ? 'Updating...' : 'Reject'}
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

export default TeamPermissions;

