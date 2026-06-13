import React, { useState, useRef, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { leaveService } from '../../services/auth';
import { LEAVE_TYPES } from '../../utils/constants';

// Material-UI Icons
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// ============================================================
// Custom Select Dropdown (Fixes native dropdown overflow on mobile)
// ============================================================
const CustomSelect = ({ value, onChange, options, required = false }) => {
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
        <ArrowDropDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        // w-full ensures it perfectly matches the button width, max-h-60 prevents it from overflowing the screen vertically
        <div className="absolute z-50 mt-1 w-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
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

const LeaveList = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLeaves();
  }, []);

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

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'all') return true;
    return leave.status === filter;
  });

  // Options for the filter dropdown
  const filterOptions = [
    { value: 'all', label: 'All Leaves' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
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
            <CustomSelect
              value={filter}
              onChange={(val) => setFilter(val)}
              options={filterOptions}
            />
          </div>
          
          <Button as="a" href="/leaves/apply" className="text-center">
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leaves List */}
      <Card>
        <Card.Header>
          <Card.Title>Leave History ({filteredLeaves.length})</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {filteredLeaves.map((leave) => (
              <div key={leave._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${LEAVE_TYPES[leave.leaveType]?.color}`}>
                      {LEAVE_TYPES[leave.leaveType]?.label}
                    </span>
                    {getStatusBadge(leave.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{leave.reason}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span>{leave.totalDays} days</span>
                    <span className="hidden sm:inline">•</span>
                    <span>
                      Applied on {new Date(leave.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  {leave.approvedBy && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Approved by {leave.approvedBy.name}
                    </p>
                  )}
                  {leave.approvedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      on {new Date(leave.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {filteredLeaves.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📅</div>
                <p className="text-gray-500 dark:text-gray-300 mb-4">
                  {filter === 'all' ? 'No leave applications found' : `No ${filter} leaves found`}
                </p>
                {filter === 'all' && (
                  <Button as="a" href="/leaves/apply">
                    Apply for Your First Leave
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Leave Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center p-6">
            <div className="text-2xl font-bold text-yellow-600 mb-2">
              {leaves.filter(l => l.status === 'pending').length}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-6">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {leaves.filter(l => l.status === 'approved').length}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Approved</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center p-6">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {leaves.filter(l => l.status === 'rejected').length}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Rejected</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeaveList;