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
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionModal, setActionModal] = useState({ isOpen: false, leave: null, action: '' });

  useEffect(() => {
    loadLeaves();
  }, [filter]);

  const loadLeaves = async () => {
    try {
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leave Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Approve or reject employee leave requests</p>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <option value="pending" className="dark:bg-gray-800 dark:text-gray-100">Pending Approval</option>
          <option value="approved" className="dark:bg-gray-800 dark:text-gray-100">Approved</option>
          <option value="rejected" className="dark:bg-gray-800 dark:text-gray-100">Rejected</option>
          <option value="all" className="dark:bg-gray-800 dark:text-gray-100">All Leaves</option>
        </select>
      </div>

      {/* Leaves List */}
      <Card>
        <Card.Header>
          <Card.Title>
            {filter === 'pending' ? 'Pending Approval' : 
             filter === 'approved' ? 'Approved Leaves' : 
             filter === 'rejected' ? 'Rejected Leaves' : 'All Leaves'} 
            ({leaves.length})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div key={leave._id} className="p-4 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <PersonIcon className="w-4 h-4 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {leave.employee.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          {leave.employee.department} • {leave.employee.position}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${LEAVE_TYPES[leave.leaveType]?.color}`}>
                        {LEAVE_TYPES[leave.leaveType]?.label}
                      </span>
                      {getStatusBadge(leave.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{leave.reason}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{leave.totalDays} days</span>
                      <span>•</span>
                      <span>
                        Applied on {new Date(leave.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {leave.status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
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
                  )}
                </div>

                {leave.approvedBy && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {leave.status === 'approved' ? 'Approved' : 'Rejected'} by {leave.approvedBy.name} 
                      on {new Date(leave.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {leaves.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  {filter === 'pending' ? (
                    <CheckCircleIcon className="w-16 h-16 mx-auto" />
                  ) : (
                    <EventIcon className="w-16 h-16 mx-auto" />
                  )}
                </div>
                      <p className="text-gray-500 dark:text-gray-300">
                  {filter === 'pending' 
                    ? 'No pending leave requests' 
                    : `No ${filter} leaves found`}
                </p>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, leave: null, action: '' })}
        title={`${actionModal.action === 'approved' ? 'Approve' : 'Reject'} Leave Request`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to {actionModal.action} the leave request from{' '}
            <strong>{actionModal.leave?.employee.name}</strong>?
          </p>
          
          {actionModal.leave && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Duration:</strong> {actionModal.leave.totalDays} days
                ({new Date(actionModal.leave.startDate).toLocaleDateString()} - {new Date(actionModal.leave.endDate).toLocaleDateString()})
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Reason:</strong> {actionModal.leave.reason}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setActionModal({ isOpen: false, leave: null, action: '' })}
            >
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