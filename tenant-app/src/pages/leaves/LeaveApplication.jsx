import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { leaveService } from '../../services/auth';
import { LEAVE_TYPES } from '../../utils/constants';

// Material-UI Icons
import EventIcon from '@mui/icons-material/Event';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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
    <div className="relative w-full" ref={containerRef}>
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
        <div className="absolute z-50 mt-1 w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
// Leave Application Page
// ============================================================
const LeaveApplication = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await leaveService.apply(formData);
      navigate('/leaves');
    } catch (error) {
      console.error('Failed to apply for leave:', error);
    } finally {
      setSaving(false);
    }
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Apply for Leave</h1>
        <p className="text-gray-600 dark:text-gray-400">Submit a new leave request</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave Details */}
          <Card>
            <Card.Header>
              <Card.Title>Leave Details</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Leave Type *
                </label>
                {/* Replaced native select with CustomSelect to prevent mobile overflow */}
                <CustomSelect
                  value={formData.leaveType}
                  onChange={(val) => setFormData({ ...formData, leaveType: val })}
                  required
                  options={Object.entries(LEAVE_TYPES).map(([key, value]) => ({
                    value: key,
                    label: value.label
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date - Custom Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Start Date *
                  </label>
                  <CustomDatePicker
                    value={formData.startDate}
                    onChange={(date) => setFormData({ ...formData, startDate: date })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* End Date - Custom Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    End Date *
                  </label>
                  <CustomDatePicker
                    value={formData.endDate}
                    onChange={(date) => setFormData({ ...formData, endDate: date })}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Days:</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{calculateDays()} days</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Reason & Preview */}
          <Card>
            <Card.Header>
              <Card.Title>Reason & Preview</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Please provide a detailed reason for your leave request..."
                />
              </div>

              {/* Leave Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Leave Summary</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{LEAVE_TYPES[formData.leaveType]?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Duration:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : '--'}
                      {' to '}
                      {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : '--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Days:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{calculateDays()}</span>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/leaves')}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!formData.startDate || !formData.endDate || !formData.reason}
            className="w-full sm:w-auto"
          >
            Submit Leave Request
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LeaveApplication;