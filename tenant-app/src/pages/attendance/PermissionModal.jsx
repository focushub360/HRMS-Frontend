import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { permissionService } from '../../services/auth';

// Material-UI Icons
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const PermissionModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    permissionType: 'short-leave',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    reason: ''
  });

  const permissionTypes = [
    {
      value: 'short-leave',
      label: 'Short Leave',
      description: '1-3 hours permission for urgent work',
      icon: <ScheduleIcon className="w-4 h-4" />
    },
    {
      value: 'half-day',
      label: 'Half Day',
      description: '4 hours permission (morning/afternoon)',
      icon: <AccessTimeIcon className="w-4 h-4" />
    },
    {
      value: 'late-arrival',
      label: 'Late Arrival',
      description: 'Coming late to office',
      icon: <EventIcon className="w-4 h-4" />
    },
    {
      value: 'early-departure',
      label: 'Early Departure',
      description: 'Leaving early from office',
      icon: <EventIcon className="w-4 h-4" />
    },
    {
      value: 'break-extension',
      label: 'Break Extension',
      description: 'Longer break than usual',
      icon: <ScheduleIcon className="w-4 h-4" />
    }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Convert 24-hour to 12-hour format with AM/PM
  const formatTimeWithAMPM = (time24) => {
    if (!time24) return '--:--';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // FIXED: Timezone-safe duration calculation
  const calculateDuration = () => {
    try {
      if (formData.startTime && formData.endTime && formData.date) {
        // Create dates in local timezone (not UTC)
        const start = new Date(`${formData.date}T${formData.startTime}`);
        const end = new Date(`${formData.date}T${formData.endTime}`);
        
        //console.log('Time calculation (Local):', {
        //  startTime: formData.startTime,
        //  endTime: formData.endTime,
        //  startLocal: start.toString(),
        //  endLocal: end.toString(),
        //  startTimeValue: start.getTime(),
        //   endTimeValue: end.getTime()
        // });
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return 0;
        }
        
        const diff = end.getTime() - start.getTime();
        const hours = diff / (1000 * 60 * 60);
        
        //console.log('Calculated hours:', hours);
        
        // Return positive hours only
        return Math.max(0, hours).toFixed(1);
      }
    } catch (error) {
      //console.error('Error calculating duration:', error);
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.startTime || !formData.endTime || !formData.reason) {
      alert('Please fill all required fields');
      return;
    }

    const duration = calculateDuration();
    console.log('Final duration check:', duration);
    
    if (duration <= 0) {
      alert('End time must be after start time. Please check your time selection.');
      return;
    }

    setLoading(true);

    try {
      console.log('Submitting permission data:', {
        ...formData,
        calculatedDuration: duration
      });
      
      const submissionData = {
        permissionType: formData.permissionType,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason
      };
      
      await permissionService.apply(submissionData);
      window.dispatchEvent(new CustomEvent('permissions-updated'));
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        permissionType: 'short-leave',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        reason: ''
      });
    } catch (error) {
      console.error('Failed to apply for permission:', error);
      
      // Show detailed error message
      if (error.response?.data?.errors) {
        alert(`Validation failed: ${error.response.data.errors.join(', ')}`);
      } else {
        alert(error.response?.data?.message || 'Failed to apply for permission');
      }
    } finally {
      setLoading(false);
    }
  };

  const duration = calculateDuration();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Permission"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Permission Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Permission Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissionTypes.map((type) => (
              <div
                key={type.value}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  formData.permissionType === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 dark:border-primary-600 dark:text-primary-100'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-gray-800'
                }`}
                onClick={() => setFormData({ ...formData, permissionType: type.value })}
              >
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded ${
                    formData.permissionType === type.value
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-700 dark:text-primary-100'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {type.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{type.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* Duration Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <div className={`p-2 rounded-lg text-center ${
              duration > 0 ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200' : 'bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            }`}>
              <span className={`text-lg font-semibold ${
                duration > 0 ? 'text-blue-600 dark:text-blue-200' : 'text-gray-500 dark:text-gray-300'
              }`}>
                {duration > 0 ? `${duration} hours` : '--:--'}
              </span>
            </div>
          </div>
        </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatTimeWithAMPM(formData.startTime)}
            </p>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time *
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatTimeWithAMPM(formData.endTime)}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
            Reason *
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            placeholder="Please provide a detailed reason for your permission request..."
          />
        </div>

        {/* Summary */}
        <Card className={`${
          duration > 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        }`}>
          <Card.Content>
            <div className="flex items-center space-x-2 mb-2">
              <DescriptionIcon className={`w-4 h-4 ${
                duration > 0 ? 'text-blue-600' : 'text-gray-600'
              }`} />
              <h4 className={`text-sm font-medium ${
                duration > 0 ? 'text-blue-900' : 'text-gray-900'
              }`}>
                Request Summary
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {permissionTypes.find(t => t.value === formData.permissionType)?.label}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {formData.date ? new Date(formData.date).toLocaleDateString() : '--'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {formData.startTime && formData.endTime 
                    ? `${formatTimeWithAMPM(formData.startTime)} - ${formatTimeWithAMPM(formData.endTime)}`
                    : '--'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className={`ml-2 font-medium ${
                  duration > 0 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {duration > 0 ? `${duration} hours` : '--'}
                </span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Validation Warning */}
        {duration <= 0 && formData.startTime && formData.endTime && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900 dark:border-red-700">
            <p className="text-sm text-red-700 dark:text-red-200">
              ⚠️ End time must be after start time. Please check your time selection.
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.startTime || !formData.endTime || !formData.reason || duration <= 0}
          >
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PermissionModal;