import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AddProgressModal from '../../components/projects/AddProgressModal';
import TaskProgressHistoryModal from '../../components/projects/TaskProgressHistoryModal';
import { progressService } from '../../services/progress';
import { projectService } from '../../services/projects';

// Material-UI Icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import UpdateIcon from '@mui/icons-material/Update';
import TimelineIcon from '@mui/icons-material/Timeline';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';

const ProgressTimeline = ({ updates }) => {
  if (!updates || updates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <TimelineIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No progress updates yet</p>
        <p className="text-sm">Start tracking your progress to see the timeline here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update, index) => (
        <div key={update._id} className="flex space-x-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${
              index === 0 ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            {index < updates.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-gray-900">{update.progress}%</span>
                <span className="text-sm text-gray-500">progress</span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(update.date).toLocaleDateString()} •{' '}
                {new Date(update.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm leading-relaxed">
              {update.note}
            </p>
            <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
              <PersonIcon className="w-4 h-4" />
              <span>{update.userId?.name || 'User'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const TaskProgress = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [taskProgress, setTaskProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Admin table
  const [adminFilters, setAdminFilters] = useState({ project: '', employee: '', from: '', to: '', minProgress: '', maxProgress: '' });
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit, setAdminLimit] = useState(25);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminRows, setAdminRows] = useState([]);
  // Defensive no-op debug variables kept to avoid runtime ReferenceErrors
  // (some development builds may still reference these temporarily).
  // const debugParams = null;
  // const debugCount = 0;

  useEffect(() => {
    loadProjects();
  }, []);

  // Keep admin project filter in sync when the top project selector changes
  useEffect(() => {
    setAdminFilters(prev => ({ ...prev, project: selectedProject }));
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject);
    } else {
      setTasks([]);
      setSelectedTask('');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedTask) {
      loadTaskProgress(selectedTask);
    } else {
      setTaskProgress(null);
    }
  }, [selectedTask]);


  const loadProjects = async () => {
    try {
      const response = await projectService.getProjects();
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTasks = async (projectId) => {
    setLoading(true);
    try {
      const response = await progressService.getTasksForProgress(projectId);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskProgress = async (taskId) => {
    setProgressLoading(true);
    try {
      const response = await progressService.getTaskProgress(taskId);
      setTaskProgress(response.data.data);
    } catch (error) {
      console.error('Failed to load task progress:', error);
      setTaskProgress(null);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadAdminRows = useCallback(async (page = adminPage) => {
    setAdminLoading(true);
    try {
      // Request ascending sort by date for the admin table (oldest first)
      // remove empty string params to avoid sending e.g. employee=""
      // ensure the currently selected project (top selector) is used as a fallback
      const raw = { ...adminFilters, page, limit: adminLimit, sort: 'date' };
      if (!raw.project && selectedProject) raw.project = selectedProject;
      // current selection state (no debug logging in production)
      const params = Object.keys(raw).reduce((acc, k) => {
        const v = raw[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') acc[k] = v;
        return acc;
      }, {});
      // console logging removed
      const res = await progressService.listProgress(params);
      const rows = res.data.data || [];
      // removed debug counters/logging
      setAdminRows(rows);
      setAdminTotal(res.data.total || 0);
      setAdminPage(res.data.page || page);
    } catch (err) {
      console.error('Failed to load admin progress rows:', err);
      if (err.response) console.error('API response data:', err.response.data);
      setAdminRows([]);
      setAdminTotal(0);
    } finally {
      setAdminLoading(false);
    }
  }, [adminFilters, adminLimit, adminPage, selectedProject]);

  // load admin rows when filters/page/limit change
  useEffect(() => {
    loadAdminRows();
  }, [adminPage, adminLimit, adminFilters, loadAdminRows]);

  const onApplyAdminFilters = () => {
    setAdminPage(1);
    loadAdminRows(1);
  };

  const exportCsv = (rows) => {
    if (!rows || rows.length === 0) return;
    const headers = ['Date','Task','Project','Employee','Progress','Note'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const date = new Date(r.date).toLocaleString();
      const userObj = r.employee || r.user || r.userId || null;
      const user = userObj ? (userObj.name || (typeof userObj === 'string' ? userObj : '')) : '';
      const projectObj = r.project || r.projectDoc || null;
      const project = projectObj ? (projectObj.name || (typeof projectObj === 'string' ? projectObj : '')) : '';
      const task = r.taskTitle || r.task || '';
      const progress = r.progress;
      const note = (r.note || '').replace(/\n/g,' ').replace(/"/g,'""');
      lines.push(`"${date}","${task}","${project}","${user}","${progress}","${note}"`);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-progress-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = (rows) => {
    // simple print view: open new window with table and print
    const html = `
      <html><head><title>Task Progress</title>
      <style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style>
      </head><body>
      <h3>Task Progress Export</h3>
      <table>
        <thead><tr><th>Date</th><th>Task</th><th>Project</th><th>User</th><th>Progress</th><th>Note</th></tr></thead>
        <tbody>
        ${rows.map(r=>{
          const userObj = r.employee || r.user || r.userId || null;
          const userName = userObj ? (userObj.name || (typeof userObj === 'string' ? userObj : '')) : '';
          const projectObj = r.project || r.projectDoc || null;
          const projectName = projectObj ? (projectObj.name || (typeof projectObj === 'string' ? projectObj : '')) : '';
          return `<tr><td>${new Date(r.date).toLocaleString()}</td><td>${(r.taskTitle||r.task||'')}</td><td>${projectName}</td><td>${userName}</td><td>${r.progress}%</td><td>${(r.note||'').replace(/</g,'&lt;')}</td></tr>`
        }).join('')}
        </tbody>
      </table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const handleProgressUpdate = () => {
    loadTaskProgress(selectedTask);
    setModalOpen(false);
  };

  const getSelectedTaskDetails = () => {
    return tasks.find(task => task._id === selectedTask);
  };

  const taskDetails = getSelectedTaskDetails();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <TrendingUpIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Progress Tracking</h1>
              <p className="text-gray-600 mt-1">Monitor and update your task progress daily</p>
            </div>
          </div>
        </div>

        {/* Project & Task Selection */}
        <Card>
          <Card.Content className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Task
                </label>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  disabled={!selectedProject || loading}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:disabled:bg-gray-700"
                >
                  <option value="">Choose a task</option>
                  {tasks.map(task => (
                    <option key={task._id} value={task._id}>
                      {task.title} {task.progress > 0 && `(${task.progress}%)`}
                    </option>
                  ))}
                </select>
                {loading && (
                  <div className="mt-2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Task Progress Display */}
        {taskDetails && (
          <Card>
            <Card.Content className="p-6">
              {/* Task Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{taskDetails.title}</h2>
                  <p className="text-gray-600">{taskDetails.project?.name}</p>
                </div>
                <Button
                  onClick={() => setModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 border-0"
                >
                  <UpdateIcon className="w-4 h-4 mr-2" />
                  Add Progress Update
                </Button>
              </div>

              {/* Current Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Current Progress</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-blue-600">{taskDetails.progress}%</span>
                    <Button onClick={() => setHistoryOpen(true)} className="px-2 py-1 text-sm">History</Button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${taskDetails.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TimelineIcon className="w-5 h-5 mr-2 text-gray-500" />
                  Progress History
                </h3>
                {progressLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <ProgressTimeline updates={taskProgress?.updates || []} />
                )}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Empty State */}
        {!selectedTask && (
          <Card>
            <Card.Content className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUpIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Task Selected</h3>
              <p className="text-gray-500 mb-6">
                Select a project and task to view and update progress
              </p>
            </Card.Content>
          </Card>
        )}

        {/* Admin Listing & Export */}
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Progress Reports</h3>
              <div className="flex items-center space-x-2">
                <Button onClick={() => exportCsv(adminRows)} className="bg-green-600 hover:bg-green-700 border-0">Export CSV</Button>
                <Button onClick={() => exportPdf(adminRows)} className="bg-gray-700 hover:bg-gray-800 border-0">Export PDF</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Project</label>
                <select className="w-full px-2 py-1 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600" value={adminFilters.project} onChange={(e)=>setAdminFilters({...adminFilters, project: e.target.value})}>
                  <option value="">All</option>
                  {projects.map(p=> <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm text-gray-600 mb-1">Employee</label>
                <input className="w-full px-2 py-1 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600" value={adminFilters.employee} onChange={(e)=>setAdminFilters({...adminFilters, employee: e.target.value})} placeholder="employee name or id" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm text-gray-600 mb-1">From</label>
                <input type="date" className="w-full px-2 py-1 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600" value={adminFilters.from} onChange={(e)=>setAdminFilters({...adminFilters, from: e.target.value})} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm text-gray-600 mb-1">To</label>
                <input type="date" className="w-full px-2 py-1 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600" value={adminFilters.to} onChange={(e)=>setAdminFilters({...adminFilters, to: e.target.value})} />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button onClick={onApplyAdminFilters} className="w-full">Apply</Button>
              </div>
            </div>

            {/* Debug panel removed */}

            <div className="mb-3">
              <div className="overflow-x-auto">
                {adminLoading ? (
                  <div className="py-8 flex justify-center"><LoadingSpinner /></div>
                ) : (
                  <table className="min-w-full bg-white dark:bg-gray-800">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">Date</th>
                        <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">Task</th>
                        <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">Project</th>
                        <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">User</th>
                        <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">Progress</th>
                        <th className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminRows.map(row => (
                        <tr key={row._id} className="odd:bg-gray-50 dark:odd:bg-gray-700">
                          <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{new Date(row.date).toLocaleString()}</td>
                          <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.taskTitle || row.task || ''}</td>
                          <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.project?.name || row.project || ''}</td>
                          <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.employee?.name || row.user?.name || (typeof row.user === 'string' ? row.user : '')}</td>
                          <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.progress}%</td>
                          <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{row.note}</td>
                        </tr>
                      ))}
                      {adminRows.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-300">No rows</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total: {adminTotal}</div>
              <div className="flex items-center space-x-2">
                <select value={adminLimit} onChange={(e)=>{ setAdminLimit(Number(e.target.value)); setAdminPage(1); }} className="px-2 py-1 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <Button onClick={()=>{ if(adminPage>1) { setAdminPage(adminPage-1); loadAdminRows(adminPage-1); } }}>Prev</Button>
                <div className="px-2">Page {adminPage}</div>
                <Button onClick={()=>{ const maxPage = Math.ceil((adminTotal||0)/adminLimit) || 1; if(adminPage < maxPage) { setAdminPage(adminPage+1); loadAdminRows(adminPage+1); } }}>Next</Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Progress Modal */}
      <AddProgressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        task={taskDetails}
        onSuccess={handleProgressUpdate}
      />
      <TaskProgressHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} taskId={selectedTask} taskTitle={taskDetails?.title} />
    </div>
  );
};

export default TaskProgress;