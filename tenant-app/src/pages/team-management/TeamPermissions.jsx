import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { permissionService } from '../../services/auth';
import { toast } from '../../utils/toast';

const TeamPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // ── Status helpers — based on admin decisions only ────────
  const getStatusClass = (permission) => {
    const hasRejection  = permission.approvals?.some(a => a.status === 'rejected');
    const adminApproved = permission.approvals?.some(
      a => a.approverType === 'admin' && a.status === 'approved'
    );
    if (hasRejection)  return 'bg-red-100 text-red-800';
    if (adminApproved) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (permission) => {
    const hasRejection  = permission.approvals?.some(a => a.status === 'rejected');
    const adminApproved = permission.approvals?.some(
      a => a.approverType === 'admin' && a.status === 'approved'
    );
    if (hasRejection)  return 'Rejected';
    if (adminApproved) return 'Approved';
    return 'Pending';
  };

  // ── Approved By — only admin actors, never lead name ─────
  const getApprovedBy = (permission) => {
    if (permission.status !== 'approved' && permission.status !== 'rejected') {
      return <span className="text-sm italic text-gray-400">—</span>;
    }
    const adminApproval = permission.approvals?.find(a => a.approverType === 'admin');
    if (!adminApproval) {
      return (
        <span className="text-sm italic text-gray-400">Pending admin review</span>
      );
    }
    const name = adminApproval.approver?.name || 'Admin';
    return (
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
        {name} <span className="text-gray-400 font-normal">(Admin)</span>
      </span>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Permission Requests
          </h1>
          <p className="text-sm text-amber-600 font-medium mt-0.5">
            ⚠ View only — permission approvals are handled by Admin
          </p>
        </div>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {['Employee','Date','Time','Type','Duration','Reason','Status','Approved By','Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr
                    key={permission._id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Employee */}
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      {permission.employee?.name || 'N/A'}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {permission.date
                        ? new Date(permission.date).toLocaleDateString()
                        : 'N/A'}
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {permission.startTime
                        ? new Date(permission.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'N/A'}
                      {' – '}
                      {permission.endTime
                        ? new Date(permission.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'N/A'}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {permission.permissionType?.replace('-', ' ')}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {permission.duration ? `${permission.duration.toFixed(1)}h` : 'N/A'}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 max-w-[180px]">
                      <span className="block truncate" title={permission.reason}>
                        {permission.reason || <span className="italic text-gray-400">—</span>}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(permission)}`}>
                        {getStatusLabel(permission)}
                      </span>
                    </td>

                    {/* Approved By */}
                    <td className="py-3 px-4">
                      {getApprovedBy(permission)}
                    </td>

                    {/* Actions — buttons present but disabled with tooltip */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex gap-2 items-center">
                        <div className="relative group">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled
                            className="opacity-50 cursor-not-allowed"
                          >
                            Approve
                          </Button>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Only Admin can approve
                          </div>
                        </div>

                        <div className="relative group">
                          <Button
                            size="sm"
                            variant="danger"
                            disabled
                            className="opacity-50 cursor-not-allowed"
                          >
                            Reject
                          </Button>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            Only Admin can reject
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeamPermissions;