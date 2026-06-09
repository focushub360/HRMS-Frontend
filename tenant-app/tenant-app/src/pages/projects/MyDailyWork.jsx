import React, { useState, useEffect } from 'react';
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-2xl">
              <CalendarTodayIcon className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Daily Work</h1>
              <p className="text-gray-600 mt-1">
                Track your daily progress and updates - {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => { if (!userHasSubmittedToday) { setModalTask(null); setModalOpen(true); } }}
              className={`bg-green-600 hover:bg-green-700 border-0 ${userHasSubmittedToday ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={userHasSubmittedToday}
              title={userHasSubmittedToday ? "You've already submitted today — you can edit existing updates." : 'Log today\'s work'}
            >
              <UpdateIcon className="w-4 h-4 mr-2" />
              Log Today's Work
            </Button>

            <Button
              onClick={openHistoryPicker}
              variant="outline"
            >
              View History
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <Card.Content className="text-center p-6">
              <div className="text-2xl font-bold text-gray-900">{todayUpdates.length}</div>
              <div className="text-sm text-gray-600">Tasks Updated Today</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="text-center p-6">
              <div className="text-2xl font-bold text-blue-600">
                {todayUpdates.reduce((sum, update) => sum + update.progress, 0)}%
              </div>
              <div className="text-sm text-gray-600">Total Progress Added</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="text-center p-6">
              <div className="text-2xl font-bold text-green-600">
                {new Set(todayUpdates.map(update => update.taskId)).size}
              </div>
              <div className="text-sm text-gray-600">Unique Tasks</div>
            </Card.Content>
          </Card>
        </div>

        {/* Today's Updates */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center">
              <UpdateIcon className="w-5 h-5 mr-2 text-gray-500" />
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
                <CalendarTodayIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No updates today</h3>
                <p className="text-gray-500 mb-6">
                  Start tracking your work by adding your first progress update
                </p>
                <Button onClick={() => setModalOpen(true)}>
                  <UpdateIcon className="w-4 h-4 mr-2" />
                  Add First Update
                </Button>
              </div>
                ) : (
              <div className="space-y-4">
                {todayUpdates.map((update, index) => (
                  <div key={update._id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {/* Progress Indicator */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{update.progress}%</span>
                      </div>
                      <div className="text-xs text-center mt-1 text-green-600 font-medium">
                        {getProgressChange(update, index)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {update.taskTitle}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                            <FolderIcon className="w-4 h-4" />
                            <span>{update.projectName}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 text-right">
                          {new Date(update.date).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm leading-relaxed flex-1 mr-3">
                          {update.note}
                        </p>
                          <div className="flex-shrink-0 flex items-center space-x-2">
                            <Button
                              onClick={() => { setModalTask(update.task || { _id: update.taskId, title: update.taskTitle, project: { _id: update.projectId, name: update.projectName } }); setModalOpen(true); }}
                              variant="outline"
                            >
                              <TrendingUpIcon className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => { setHistoryTask({ id: update.taskId, title: update.taskTitle }); setHistoryOpen(true); }}
                              variant="outline"
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
      </div>

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
              <select
                value={selectedPickerTaskId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPickerTaskId(id);
                  const t = pickerTasks.find(p => p._id === id);
                  setSelectedPickerTaskTitle(t?.title || '');
                }}
                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              >
                <option value="">Choose a task</option>
                {pickerTasks.map(t => (
                  <option key={t._id} value={t._id}>{t.title} {t.project?.name ? `— ${t.project.name}` : ''}</option>
                ))}
              </select>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => { setHistoryPickerOpen(false); setSelectedPickerTaskId(''); setSelectedPickerTaskTitle(''); }}>Cancel</Button>
                <Button onClick={viewPickedTaskHistory} disabled={!selectedPickerTaskId}>View</Button>
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