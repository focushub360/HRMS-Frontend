import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AddProgressModal from '../../components/projects/AddProgressModal';
import TaskProgressHistoryModal from '../../components/projects/TaskProgressHistoryModal';
import Modal from '../../components/ui/Modal';
import { progressService } from '../../services/progress';

// Material-UI Icons
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import UpdateIcon from '@mui/icons-material/Update';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// ============================================================
// Custom Select Dropdown (Fixes native dropdown overflow on mobile)
// ============================================================
const CustomSelect = ({ value, onChange, options, placeholder = 'Select...' }) => {
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
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
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

const MyDailyWork = () => {
  const [todayUpdates, setTodayUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState(null);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [pickerTasks, setPickerTasks] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedPickerTaskId, setSelectedPickerTaskId] = useState('');
  const [selectedPickerTaskTitle, setSelectedPickerTaskTitle] = useState('');
  const [userHasSubmittedToday, setUserHasSubmittedToday] = useState(false);

  useEffect(() => {
    loadTodayUpdates();
  }, []);

  const loadTodayUpdates = async () => {
    setLoading(true);
    try {
      const response = await progressService.getTodayUpdates();
      const items = response.data.data || [];
      setTodayUpdates(items);
      setUserHasSubmittedToday(items.length > 0);
    } catch (error) {
      console.error('Failed to load today updates:', error);
      setTodayUpdates([]);
      setUserHasSubmittedToday(false);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = () => {
    loadTodayUpdates();
    setModalOpen(false);
    setModalTask(null);
  };

  const openHistoryPicker = async () => {
    setHistoryPickerOpen(true);
    if (pickerTasks.length === 0) {
      setPickerLoading(true);
      try {
        const res = await progressService.getTasksForProgress();
        const data = res.data?.data || [];
        setPickerTasks(data);
      } catch (err) {
        console.error('Failed to load tasks for history picker:', err);
        setPickerTasks([]);
      } finally {
        setPickerLoading(false);
      }
    }
  };

  const viewPickedTaskHistory = () => {
    if (!selectedPickerTaskId) return;
    setHistoryTask({ id: selectedPickerTaskId, title: selectedPickerTaskTitle });
    setHistoryOpen(true);
    setHistoryPickerOpen(false);
  };

  const getProgressChange = (update, index) => {
    if (index === 0) return `+${update.progress}%`;
    
    const prevUpdate = todayUpdates[index - 1];
    const change = update.progress - prevUpdate.progress;
    
    if (change > 0) return `+${change}%`;
    if (change < 0) return `${change}%`;
    return '0%';
  };

  // Options for the history task picker dropdown
  const pickerOptions = pickerTasks.map((t) => ({
    value: t._id,
    label: `${t.title}${t.project?.name ? ` — ${t.project.name}` : ''}`
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-2xl flex-shrink-0">
            <CalendarTodayIcon className="w-8 h-8 text-green-600 dark:text-green-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">My Daily Work</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">
              Track your daily progress and updates - {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons - stacked & full width on mobile, inline on larger screens */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <Button
            onClick={() => { if (!userHasSubmittedToday) { setModalTask(null); setModalOpen(true); } }}
            className={`bg-green-600 hover:bg-green-700 border-0 w-full sm:w-auto flex items-center justify-center ${userHasSubmittedToday ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={userHasSubmittedToday}
            title={userHasSubmittedToday ? "You've already submitted today — you can edit existing updates." : 'Log today\'s work'}
          >
            <UpdateIcon className="w-4 h-4 mr-2" />
            Log Today's Work
          </Button>

          <Button
            onClick={openHistoryPicker}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center"
          >
            View History
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <Card.Content className="text-center p-4 sm:p-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{todayUpdates.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Tasks Updated Today</div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="text-center p-4 sm:p-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {todayUpdates.reduce((sum, update) => sum + update.progress, 0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Progress Added</div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="text-center p-4 sm:p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Set(todayUpdates.map(update => update.taskId)).size}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Unique Tasks</div>
          </Card.Content>
        </Card>
      </div>

      {/* Today's Updates */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <UpdateIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
            Today's Progress Updates
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : todayUpdates.length === 0 ? (
            <div className="text-center py-12">
              <CalendarTodayIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No updates today</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Start tracking your work by adding your first progress update
              </p>
              <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
                <UpdateIcon className="w-4 h-4 mr-2" />
                Add First Update
              </Button>
            </div>
              ) : (
            <div className="space-y-4">
              {todayUpdates.map((update, index) => (
                <div key={update._id} className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  {/* Progress Indicator */}
                  <div className="flex-shrink-0 flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{update.progress}%</span>
                    </div>
                    <div className="text-xs sm:text-center sm:mt-1 text-green-600 dark:text-green-400 font-medium">
                      {getProgressChange(update, index)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {update.taskTitle}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600 dark:text-gray-300">
                          <FolderIcon className="w-4 h-4" />
                          <span>{update.projectName}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 sm:text-right">
                        {new Date(update.date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                      <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm leading-relaxed flex-1 sm:mr-3">
                        {update.note}
                      </p>
                        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <Button
                            onClick={() => { setModalTask(update.task || { _id: update.taskId, title: update.taskTitle, project: { _id: update.projectId, name: update.projectName } }); setModalOpen(true); }}
                            variant="outline"
                            className="w-full sm:w-auto flex items-center justify-center"
                          >
                            <TrendingUpIcon className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => { setHistoryTask({ id: update.taskId, title: update.taskTitle }); setHistoryOpen(true); }}
                            variant="outline"
                            className="w-full sm:w-auto flex items-center justify-center"
                          >
                            History
                          </Button>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Progress Modal */}
      <AddProgressModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalTask(null); }}
        task={modalTask}
        onSuccess={handleProgressUpdate}
      />

      {/* History Picker Modal (select a task to view history) */}
      <Modal isOpen={historyPickerOpen} onClose={() => { setHistoryPickerOpen(false); setSelectedPickerTaskId(''); setSelectedPickerTaskTitle(''); }} size="md">
        <div className="p-4 bg-white dark:bg-gray-900">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Select Task to View History</h3>
          {pickerLoading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-3">
              <CustomSelect
                value={selectedPickerTaskId}
                onChange={(id) => {
                  setSelectedPickerTaskId(id);
                  const t = pickerTasks.find(p => p._id === id);
                  setSelectedPickerTaskTitle(t?.title || '');
                }}
                options={pickerOptions}
                placeholder="Choose a task"
              />

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setHistoryPickerOpen(false); setSelectedPickerTaskId(''); setSelectedPickerTaskTitle(''); }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button onClick={viewPickedTaskHistory} disabled={!selectedPickerTaskId} className="w-full sm:w-auto">
                  View
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <TaskProgressHistoryModal
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistoryTask(null); }}
        taskId={historyTask?.id}
        taskTitle={historyTask?.title}
      />
    </div>
  );
};

export default MyDailyWork;