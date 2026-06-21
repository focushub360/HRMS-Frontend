import React, { useState, useRef, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { permissionService } from '../../services/auth';

// Material-UI Icons
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ============================================================
// Custom Date Picker (Sundays highlighted in red)
// ============================================================
const CustomDatePicker = ({ value, onChange, min }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [viewDate, setViewDate] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toDateString = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const minDate = min ? new Date(`${min}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const formatDisplay = (d) => {
    if (!d) return 'Select date';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSelectDay = (day) => {
    const picked = new Date(year, month, day);
    if (minDate && picked < minDate) return;
    onChange(toDateString(picked));
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center space-x-2">
          <EventIcon className="w-4 h-4 text-gray-400 dark:text-gray-400" />
          <span>{formatDisplay(selectedDate)}</span>
        </span>
        <ArrowDropDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full sm:w-72 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-[85vh] overflow-y-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday header - Sunday in red */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((wd, idx) => (
              <div
                key={wd}
                className={`text-center text-xs font-medium py-1 ${
                  idx === 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const cellDate = new Date(year, month, day);
              const isSunday = cellDate.getDay() === 0;
              const isDisabled = minDate ? cellDate < minDate : false;
              const isSelected =
                selectedDate &&
                cellDate.getFullYear() === selectedDate.getFullYear() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getDate() === selectedDate.getDate();
              const isToday = cellDate.getTime() === today.getTime();

              let classes = 'text-center text-sm py-1.5 rounded-md cursor-pointer transition-colors ';

              if (isDisabled) {
                classes += 'text-gray-300 dark:text-gray-600 cursor-not-allowed ';
              } else if (isSelected) {
                classes += 'bg-primary-500 text-white dark:bg-primary-600 font-semibold ';
              } else if (isSunday) {
                classes += 'text-red-500 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900 ';
              } else {
                classes += 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ';
              }

              if (isToday && !isSelected) {
                classes += 'ring-1 ring-primary-400 ';
              }

              return (
                <div
                  key={day}
                  onClick={() => !isDisabled && handleSelectDay(day)}
                  className={classes}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Custom Time Picker (Hour / Minute / AM-PM columns)
// ============================================================
const CustomTimePicker = ({ value, onChange }) => {
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

  const parseTime = (time24) => {
    if (!time24) return { hour: 9, minute: 0, period: 'AM' };
    const parts = time24.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour: hour12, minute: m, period };
  };

  const { hour, minute, period } = parseTime(value);

  const toTime24 = (hour12, min, per) => {
    let h = hour12 % 12;
    if (per === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const formatDisplay = () => {
    if (!value) return '--:--';
    return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  // Updated to show all 60 minutes (00 to 59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const handleHourSelect = (h) => onChange(toTime24(h, minute, period));
  const handleMinuteSelect = (m) => onChange(toTime24(hour, m, period));
  const handlePeriodSelect = (p) => onChange(toTime24(hour, minute, p));

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center space-x-2">
          <AccessTimeIcon className="w-4 h-4 text-gray-400 dark:text-gray-400" />
          <span>{formatDisplay()}</span>
        </span>
        <ArrowDropDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full sm:w-56 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-[85vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {/* Hours */}
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-1">Hour</div>
              <div className="max-h-40 overflow-y-auto scrollbar-hide border border-gray-100 dark:border-gray-700 rounded-md">
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => handleHourSelect(h)}
                    className={`text-center text-sm py-1.5 cursor-pointer transition-colors ${
                      h === hour
                        ? 'bg-primary-500 text-white dark:bg-primary-600 font-semibold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-1">Min</div>
              <div className="max-h-40 overflow-y-auto scrollbar-hide border border-gray-100 dark:border-gray-700 rounded-md">
                {minuteOptions.map((m) => (
                  <div
                    key={m}
                    onClick={() => handleMinuteSelect(m)}
                    className={`text-center text-sm py-1.5 cursor-pointer transition-colors ${
                      m === minute
                        ? 'bg-primary-500 text-white dark:bg-primary-600 font-semibold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* AM / PM */}
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-1">Period</div>
              <div className="border border-gray-100 dark:border-gray-700 rounded-md overflow-hidden">
                {periods.map((p) => (
                  <div
                    key={p}
                    onClick={() => handlePeriodSelect(p)}
                    className={`text-center text-sm py-1.5 cursor-pointer transition-colors ${
                      p === period
                        ? 'bg-primary-500 text-white dark:bg-primary-600 font-semibold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Permission Modal
// ============================================================
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

    const parts = time24.split(':');
    const hour = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${ampm}`;
  };

  // Timezone-safe duration calculation
  const calculateDuration = () => {
    try {
      if (formData.startTime && formData.endTime && formData.date) {
        const start = new Date(`${formData.date}T${formData.startTime}`);
        const end = new Date(`${formData.date}T${formData.endTime}`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return 0;
        }

        const diff = end.getTime() - start.getTime();
        const hours = diff / (1000 * 60 * 60);

        return Math.max(0, hours).toFixed(1);
      }
    } catch (error) {
      // ignore calculation errors
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.startTime || !formData.endTime || !formData.reason) {
      alert('Please fill all required fields');
      return;
    }

    const duration = calculateDuration();

    if (duration <= 0) {
      alert('End time must be after start time. Please check your time selection.');
      return;
    }

    setLoading(true);

    try {
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

      if (error.response && error.response.data && error.response.data.errors) {
        alert(`Validation failed: ${error.response.data.errors.join(', ')}`);
      } else {
        const msg = (error.response && error.response.data && error.response.data.message) || 'Failed to apply for permission';
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const duration = calculateDuration();
  const selectedType = permissionTypes.find((t) => t.value === formData.permissionType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Permission" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Permission Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
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
                  <div
                    className={`p-1 rounded ${
                      formData.permissionType === type.value
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-700 dark:text-primary-100'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
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
          {/* Date - Custom Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Date *
            </label>
            <CustomDatePicker
              value={formData.date}
              onChange={(date) => setFormData({ ...formData, date })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Duration Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Duration
            </label>
            <div
              className={`p-2 rounded-lg text-center ${
                duration > 0
                  ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
                  : 'bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              <span
                className={`text-lg font-semibold ${
                  duration > 0 ? 'text-blue-600 dark:text-blue-200' : 'text-gray-500 dark:text-gray-300'
                }`}
              >
                {duration > 0 ? `${duration} hours` : '--:--'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time - Custom Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Start Time *
            </label>
            <CustomTimePicker
              value={formData.startTime}
              onChange={(time) => setFormData({ ...formData, startTime: time })}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatTimeWithAMPM(formData.startTime)}
            </p>
          </div>

          {/* End Time - Custom Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              End Time *
            </label>
            <CustomTimePicker
              value={formData.endTime}
              onChange={(time) => setFormData({ ...formData, endTime: time })}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
        <Card
          className={`${
            duration > 0
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700'
              : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
          }`}
        >
          <Card.Content>
            <div className="flex items-center space-x-2 mb-2">
              <DescriptionIcon
                className={`w-4 h-4 ${duration > 0 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}
              />
              <h4
                className={`text-sm font-medium ${
                  duration > 0 ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                Request Summary
              </h4>
            </div>

            {/* Responsive summary list: stacked full-width rows on small screens,
                2-column grid with extra spacing between label and value on sm and up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 sm:gap-x-16 sm:gap-y-3 text-sm">
              <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 sm:py-0">
                <span className="text-gray-600 dark:text-gray-300">Type:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 text-right sm:text-left">
                  {selectedType ? selectedType.label : ''}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 sm:py-0">
                <span className="text-gray-600 dark:text-gray-300">Date:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 text-right sm:text-left">
                  {formData.date ? new Date(formData.date).toLocaleDateString() : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 sm:py-0">
                <span className="text-gray-600 dark:text-gray-300">Time:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 text-right sm:text-left">
                  {formData.startTime && formData.endTime
                    ? `${formatTimeWithAMPM(formData.startTime)} - ${formatTimeWithAMPM(formData.endTime)}`
                    : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-3 py-1 sm:py-0">
                <span className="text-gray-600 dark:text-gray-300">Duration:</span>
                <span
                  className={`font-medium text-right sm:text-left ${
                    duration > 0 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
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
              End time must be after start time. Please check your time selection.
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
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