import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AddProgressModal from '../../components/projects/AddProgressModal';
import TaskProgressHistoryModal from '../../components/projects/TaskProgressHistoryModal';
import Modal from '../../components/ui/Modal';
import DailyUpdateModal from '../attendance/DailyUpdateModal';
import { progressService } from '../../services/progress';
import { attendanceService, dailyUpdateService } from '../../services/auth';

// Material-UI Icons
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import UpdateIcon from '@mui/icons-material/Update';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';

// ============================================================
// Custom Select Dropdown
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
        <div className="absolute z-50 mt-1 w-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
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

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: new Date(2000, i).toLocaleString('default', { month: 'long' })
}));

const yearOptions = (() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const year = current - 2 + i;
    return { value: String(year), label: String(year) };
  });
})();

// ============================================================
// Utilities
// ============================================================
const escapeExcelHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatHours = (value) => {
  if (value === undefined || value === null || value === '') return '--';
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return '--';
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return `${h}h ${m}m`;
};

// Local date string YYYY-MM-DD (timezone-safe)
const toLocalDateStr = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCell = (rows, title) => {
  const row = (rows || []).find((r) => r.title === title);
  return row?.content || '--';
};

const collectTitles = (records) => {
  const titles = [];
  records.forEach((u) => {
    (u.rows || []).forEach((r) => {
      if (r.title && !titles.includes(r.title) && titles.length < 10) titles.push(r.title);
    });
  });
  return titles;
};

// ============================================================
// getSessions
// ============================================================
const getSessions = (record, attendanceMap = {}) => {
  if (Array.isArray(record.attendance?.sessions) && record.attendance.sessions.length > 0) {
    return record.attendance.sessions;
  }
  if (Array.isArray(record.sessions) && record.sessions.length > 0) {
    return record.sessions;
  }
  const attId =
    (typeof record.attendance === 'string' ? record.attendance : null) ||
    (typeof record.attendance?._id === 'string' ? record.attendance._id : null) ||
    (typeof record.attendanceId === 'string' ? record.attendanceId : null);

  if (attId && attendanceMap[attId]) {
    const mapped = attendanceMap[attId];
    if (Array.isArray(mapped.sessions) && mapped.sessions.length > 0) {
      return mapped.sessions;
    }
    const ci = mapped.checkIn;
    const co = mapped.checkOut;
    const wh = mapped.workingHours;
    if (ci || co) return [{ checkIn: ci, checkOut: co, workingHours: wh }];
  }

  if (record.attendance && typeof record.attendance === 'object') {
    const ci = record.attendance.checkIn;
    const co = record.attendance.checkOut;
    const wh = record.attendance.workingHours;
    if (ci || co) return [{ checkIn: ci, checkOut: co, workingHours: wh }];
  }

  const ci = record.checkIn;
  const co = record.checkOut;
  const wh = record.workingHours;
  if (ci || co) return [{ checkIn: ci, checkOut: co, workingHours: wh }];

  return [];
};

// ============================================================
// getTotalWorkingHours
// ============================================================
const getTotalWorkingHours = (record, sessions, attendanceMap = {}) => {
  if (sessions && sessions.length > 0) {
    const summed = sessions.reduce((s, sess) => s + (Number(sess.workingHours) || 0), 0);
    if (summed > 0) return summed;
  }

  const attId =
    (typeof record.attendance === 'string' ? record.attendance : null) ||
    (typeof record.attendance?._id === 'string' ? record.attendance._id : null) ||
    (typeof record.attendanceId === 'string' ? record.attendanceId : null);

  if (attId && attendanceMap[attId]?.workingHours != null) {
    return Number(attendanceMap[attId].workingHours);
  }

  const topLevel = record.attendance?.workingHours ?? record.workingHours;
  if (topLevel != null && Number(topLevel) > 0) return Number(topLevel);

  return 0;
};

// ============================================================
// FIX 1: Sort sessions by checkIn ascending before rendering
// so Session 1 is always the earliest (first) session.
// ============================================================
const sortSessionsByTime = (sessions) =>
  [...sessions].sort((a, b) => {
    const ta = a.checkIn ? new Date(a.checkIn).getTime() : Infinity;
    const tb = b.checkIn ? new Date(b.checkIn).getTime() : Infinity;
    return ta - tb;
  });

// ============================================================
// Cell components
// ============================================================
const CheckInCell = ({ sessions }) => {
  if (!sessions.length) return <span className="text-gray-400 text-sm">--</span>;
  if (sessions.length === 1) {
    return <span className="text-sm text-gray-700 dark:text-gray-200">{formatTime(sessions[0].checkIn)}</span>;
  }
  return (
    <div className="space-y-1">
      {sessions.map((s, idx) => (
        <div key={idx} className="text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
          <span className="text-xs font-semibold text-gray-400 mr-1">Session {idx + 1}:</span>
          {formatTime(s.checkIn)}
        </div>
      ))}
    </div>
  );
};

const CheckOutCell = ({ sessions }) => {
  if (!sessions.length) return <span className="text-gray-400 text-sm">--</span>;
  if (sessions.length === 1) {
    return <span className="text-sm text-gray-700 dark:text-gray-200">{formatTime(sessions[0].checkOut)}</span>;
  }
  return (
    <div className="space-y-1">
      {sessions.map((s, idx) => (
        <div key={idx} className="text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
          <span className="text-xs font-semibold text-gray-400 mr-1">Session {idx + 1}:</span>
          {formatTime(s.checkOut)}
        </div>
      ))}
    </div>
  );
};

const WorkingHoursCell = ({ sessions, total }) => {
  if (!sessions.length) return <span className="text-gray-400 text-sm">{formatHours(total) === '--' ? '--' : formatHours(total)}</span>;
  if (sessions.length === 1) {
    const h = sessions[0].workingHours ?? total;
    return <span className="text-sm text-gray-700 dark:text-gray-200">{formatHours(h)}</span>;
  }
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
        {formatHours(total)}
      </div>
      {sessions.map((s, idx) => (
        <div key={idx} className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          <span className="font-medium mr-1">S{idx + 1}:</span>{formatHours(s.workingHours)}
        </div>
      ))}
    </div>
  );
};

// ============================================================
// Export helpers
// ============================================================
const exportCheckIn = (sessions) => {
  if (!sessions.length) return '--';
  if (sessions.length === 1) return formatTime(sessions[0].checkIn);
  return sessions.map((s, i) => `Session ${i + 1}: ${formatTime(s.checkIn)}`).join(' | ');
};
const exportCheckOut = (sessions) => {
  if (!sessions.length) return '--';
  if (sessions.length === 1) return formatTime(sessions[0].checkOut);
  return sessions.map((s, i) => `Session ${i + 1}: ${formatTime(s.checkOut)}`).join(' | ');
};

// ============================================================
// Main component
// ============================================================
const MyDailyWork = () => {
  const [todayUpdates, setTodayUpdates]           = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [modalOpen, setModalOpen]                 = useState(false);
  const [modalTask, setModalTask]                 = useState(null);
  const [historyOpen, setHistoryOpen]             = useState(false);
  const [historyTask, setHistoryTask]             = useState(null);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [pickerTasks, setPickerTasks]             = useState([]);
  const [pickerLoading, setPickerLoading]         = useState(false);
  const [selectedPickerTaskId, setSelectedPickerTaskId]       = useState('');
  const [selectedPickerTaskTitle, setSelectedPickerTaskTitle] = useState('');
  const [userHasSubmittedToday, setUserHasSubmittedToday]     = useState(false);

  const now = new Date();
  const [dailyUpdateModalOpen, setDailyUpdateModalOpen] = useState(false);
  const [activeAttendanceId, setActiveAttendanceId]     = useState(null);

  // FIX 2: Track which record is being edited so we can pass its attendanceId
  const [editingRecord, setEditingRecord] = useState(null);

  const [dailyMonth, setDailyMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [dailyYear,  setDailyYear]  = useState(String(now.getFullYear()));

  const [enrichedUpdates, setEnrichedUpdates] = useState([]);
  const [dailyLoading, setDailyLoading]       = useState(true);

  useEffect(() => { loadTodayUpdates(); loadAttendanceStatus(); }, []);
  useEffect(() => { loadDailyUpdates(); }, [dailyMonth, dailyYear]); // eslint-disable-line

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

  const loadAttendanceStatus = async () => {
    try {
      const status = await attendanceService.getStatus();
      setActiveAttendanceId(status?.activeAttendanceId || status?.activeSession?._id || null);
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  };

  const loadDailyUpdates = async () => {
    setDailyLoading(true);
    try {
      const month = `${dailyYear}-${dailyMonth}`;

      const [dailyData, rawAttendance] = await Promise.allSettled([
        dailyUpdateService.getMyUpdates(month),
        attendanceService.getMyAttendance(Number(dailyMonth), Number(dailyYear)),
      ]);

      const updates = Array.isArray(dailyData.value?.updates) ? dailyData.value.updates : [];
      const attRecords = Array.isArray(rawAttendance.value) ? rawAttendance.value : [];

      const attendanceMap = {};
      const byDate = {};

      for (const rec of attRecords) {
        const dateStr = toLocalDateStr(rec.date || rec.checkIn);
        if (!dateStr) continue;

        if (!byDate[dateStr]) {
          byDate[dateStr] = { _id: rec._id, sessions: [], workingHours: 0 };
        }

        if (rec.checkIn || rec.checkOut) {
          byDate[dateStr].sessions.push({
            checkIn: rec.checkIn,
            checkOut: rec.checkOut,
            workingHours: rec.workingHours,
          });
          byDate[dateStr].workingHours += Number(rec.workingHours) || 0;
        }

        attendanceMap[String(rec._id)] = byDate[dateStr];
      }

      for (const [dateStr, grouped] of Object.entries(byDate)) {
        attendanceMap[dateStr] = grouped;
      }

      const enriched = updates.map((record) => {
        const dateStr = toLocalDateStr(record.date);

        const sessions = getSessions(record, attendanceMap);
        const rawSessions =
          sessions.length > 0
            ? sessions
            : (dateStr && attendanceMap[dateStr]?.sessions) || [];

        // FIX 1 applied here: sort sessions by checkIn ascending
        const resolvedSessions = sortSessionsByTime(rawSessions);

        const total = getTotalWorkingHours(record, resolvedSessions, attendanceMap)
          || (dateStr && attendanceMap[dateStr]?.workingHours)
          || 0;

        return { ...record, _resolvedSessions: resolvedSessions, _totalHours: total };
      });

      setEnrichedUpdates(enriched);
    } catch (error) {
      console.error('Failed to load daily updates:', error);
      setEnrichedUpdates([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleDailyUpdateSubmitted = () => {
    setEditingRecord(null);
    loadDailyUpdates();
  };

  const isTodayRecord = (record) =>
    new Date(record.date).toDateString() === new Date().toDateString();

  // FIX 2: Editability is based solely on the 24-hour window —
  // no check-in/check-out state required.
  const isEditableRecord = (record) => {
    if (!isTodayRecord(record)) return false;
    if (record.isUserEditable === false) return false;
    const submittedAt = record.updatedAt || record.createdAt || record.date;
    if (!submittedAt) return true;
    const hoursSince = (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60);
    return hoursSince <= 24;
  };

  // FIX 3: Resolve the attendanceId from the record itself so the modal
  // can open without requiring the user to be actively checked in.
  const handleEditRecord = (record) => {
    setEditingRecord(record);
    const recordAttId =
      (typeof record.attendance === 'string' ? record.attendance : null) ||
      (typeof record.attendance?._id === 'string' ? record.attendance._id : null) ||
      (typeof record.attendanceId === 'string' ? record.attendanceId : null) ||
      activeAttendanceId; // last resort fallback
    setActiveAttendanceId(recordAttId);
    setDailyUpdateModalOpen(true);
  };

  const formatDailyDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const dailyTitles = collectTitles(enrichedUpdates);

  // ------------------------------------------------------------------ Export
  const exportDailyUpdatesToExcel = () => {
    if (enrichedUpdates.length === 0) return;
    const monthLabel = monthOptions.find((m) => m.value === dailyMonth)?.label || dailyMonth;

    let empName = '', empDept = '';
    const recordEmployee = enrichedUpdates.find((r) => r.employee)?.employee;
    if (recordEmployee) { empName = recordEmployee.name || ''; empDept = recordEmployee.department || ''; }
    else {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || 'null');
        empName = stored?.name || ''; empDept = stored?.department || '';
      } catch { /* ignore */ }
    }

    const fixedHeaders = ['Date', 'Check In', 'Check Out', 'Working Hours', ...dailyTitles];
    const headerHtml = fixedHeaders
      .map((h) => `<th style="background:#0f172a;color:#bfdbfe;font-weight:700;border:1px solid #9ca3af;padding:6px 8px;font-size:12px;text-align:left;">${escapeExcelHtml(h)}</th>`)
      .join('');

    const rows = enrichedUpdates.map((record) => {
      const sessions = record._resolvedSessions || [];
      const cells = [
        formatDailyDate(record.date),
        exportCheckIn(sessions),
        exportCheckOut(sessions),
        formatHours(record._totalHours),
        ...dailyTitles.map((t) => getCell(record.rows, t)),
      ];
      return `<tr>${cells.map((c) => `<td style="border:1px solid #9ca3af;padding:6px 8px;font-size:12px;vertical-align:top;">${escapeExcelHtml(c)}</td>`).join('')}</tr>`;
    }).join('');

    const infoHtml = (empName || empDept)
      ? `<p style="margin:0;"><strong>Name:</strong> ${escapeExcelHtml(empName || '--')}</p><p style="margin:0;"><strong>Department:</strong> ${escapeExcelHtml(empDept || '--')}</p>`
      : '';

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"/>
        <style>body{font-family:Calibri,Arial,sans-serif;color:#111827;}h1{font-size:16px;margin:0 0 12px;}table{border-collapse:collapse;width:100%;}p{font-size:13px;margin:2px 0;}</style>
        </head>
        <body>
          <h1>Daily Updates - ${escapeExcelHtml(monthLabel)} ${escapeExcelHtml(dailyYear)}</h1>
          <table><thead><tr>${headerHtml}</tr></thead><tbody>${rows}</tbody></table>
          ${infoHtml}
        </body>
      </html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `daily-updates-${dailyYear}-${dailyMonth}.xls`; a.click();
    window.URL.revokeObjectURL(url);
  };

  // ------------------------------------------------------------------ Progress
  const handleProgressUpdate = () => { loadTodayUpdates(); setModalOpen(false); setModalTask(null); };

  const openHistoryPicker = async () => {
    setHistoryPickerOpen(true);
    if (pickerTasks.length === 0) {
      setPickerLoading(true);
      try {
        const res  = await progressService.getTasksForProgress();
        setPickerTasks(res.data?.data || []);
      } catch (err) { console.error('Failed to load tasks for history picker:', err); setPickerTasks([]); }
      finally { setPickerLoading(false); }
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
    const change = update.progress - todayUpdates[index - 1].progress;
    return change > 0 ? `+${change}%` : change < 0 ? `${change}%` : '0%';
  };

  const pickerOptions = pickerTasks.map((t) => ({
    value: t._id,
    label: `${t.title}${t.project?.name ? ` — ${t.project.name}` : ''}`,
  }));

  // ================================================================== RENDER
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <Button
            onClick={() => { if (!userHasSubmittedToday) { setModalTask(null); setModalOpen(true); } }}
            className={`bg-green-600 hover:bg-green-700 border-0 w-full sm:w-auto flex items-center justify-center ${userHasSubmittedToday ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={userHasSubmittedToday}
            title={userHasSubmittedToday ? "You've already submitted today — you can edit existing updates." : "Log today's work"}
          >
            <UpdateIcon className="w-4 h-4 mr-2" />
            Log Today's Work
          </Button>
          <Button onClick={openHistoryPicker} variant="outline" className="w-full sm:w-auto flex items-center justify-center">
            View History
          </Button>
        </div>
      </div>

      {/* Stats */}
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
              {todayUpdates.reduce((sum, u) => sum + u.progress, 0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Progress Added</div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="text-center p-4 sm:p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {new Set(todayUpdates.map(u => u.taskId)).size}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Unique Tasks</div>
          </Card.Content>
        </Card>
      </div>

      {/* Today's Progress Updates */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <UpdateIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
            Today's Progress Updates
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : todayUpdates.length === 0 ? (
            <div className="text-center py-12">
              <CalendarTodayIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No updates today</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Start tracking your work by adding your first progress update</p>
              <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
                <UpdateIcon className="w-4 h-4 mr-2" />Add First Update
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {todayUpdates.map((update, index) => (
                <div key={update._id} className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-shrink-0 flex sm:flex-col items-center gap-3 sm:gap-0 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{update.progress}%</span>
                    </div>
                    <div className="text-xs sm:text-center sm:mt-1 text-green-600 dark:text-green-400 font-medium">
                      {getProgressChange(update, index)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{update.taskTitle}</h4>
                        <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600 dark:text-gray-300">
                          <FolderIcon className="w-4 h-4" /><span>{update.projectName}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 sm:text-right">
                        {new Date(update.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                      <p className="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm leading-relaxed flex-1 sm:mr-3">
                        {update.note}
                      </p>
                      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => {
                            setModalTask(update.task || { _id: update.taskId, title: update.taskTitle, project: { _id: update.projectId, name: update.projectName } });
                            setModalOpen(true);
                          }}
                          variant="outline"
                          className="w-full sm:w-auto flex items-center justify-center"
                        >
                          <TrendingUpIcon className="w-4 h-4 mr-2" />Edit
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

      {/* Daily Updates Table */}
      <Card>
        <Card.Header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Card.Title className="flex items-center">
              <AssignmentIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
              Daily Updates
            </Card.Title>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-32">
                <CustomSelect value={dailyMonth} onChange={setDailyMonth} options={monthOptions} />
              </div>
              <div className="w-24">
                <CustomSelect value={dailyYear} onChange={setDailyYear} options={yearOptions} />
              </div>
              <Button onClick={() => { setEditingRecord(null); setDailyUpdateModalOpen(true); }} variant="outline" size="sm" className="flex items-center gap-1">
                <UpdateIcon className="w-4 h-4" />Log Today
              </Button>
              <Button
                onClick={exportDailyUpdatesToExcel}
                variant="outline" size="sm"
                disabled={enrichedUpdates.length === 0}
                className="flex items-center gap-1"
              >
                <DownloadIcon className="w-4 h-4" />Export
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Content>
          {dailyLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : enrichedUpdates.length === 0 ? (
            <div className="text-center py-10">
              <AssignmentIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">No daily updates for this month yet</p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto
              [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600
              [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400
              dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500
              [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]
              dark:[scrollbar-color:#4b5563_transparent]">
              <table
                className="divide-y divide-gray-200 dark:divide-gray-700"
                style={{ minWidth: `${500 + dailyTitles.length * 160}px`, width: '100%' }}
              >
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check In</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check Out</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-32">Total Working Hours</th>
                    {dailyTitles.map((t) => (
                      <th key={t} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ minWidth: '150px' }}>{t}</th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {enrichedUpdates.map((record) => {
                    const sessions = record._resolvedSessions || [];
                    const total    = record._totalHours || 0;
                    return (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-3 py-3 align-top text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {formatDailyDate(record.date)}
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <CheckInCell sessions={sessions} />
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <CheckOutCell sessions={sessions} />
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <WorkingHoursCell sessions={sessions} total={total} />
                        </td>
                        {dailyTitles.map((t) => (
                          <td key={t} className="px-3 py-3 align-top text-sm text-gray-700 dark:text-gray-200">
                            {getCell(record.rows, t)}
                          </td>
                        ))}
                        {/* FIX 3: Edit opens without requiring active check-in */}
                        <td className="px-3 py-3 align-top text-center">
                          {isEditableRecord(record) && (
                            <button
                              type="button"
                              onClick={() => handleEditRecord(record)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-300"
                              title="Edit today's update (within 24 hours)"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Only today's entry can be edited, and only within 24 hours of submission.
          </p>
        </Card.Content>
      </Card>

      {/* Modals */}
      <AddProgressModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalTask(null); }}
        task={modalTask}
        onSuccess={handleProgressUpdate}
      />

      {/*
        FIX 3: Pass existingRecord to DailyUpdateModal so it can pre-fill
        fields and use the record's own attendanceId — no re-login needed.
      */}
      <DailyUpdateModal
        isOpen={dailyUpdateModalOpen}
        onClose={() => { setDailyUpdateModalOpen(false); setEditingRecord(null); }}
        attendanceId={activeAttendanceId}
        existingRecord={editingRecord}
        onSubmitted={handleDailyUpdateSubmitted}
      />

      <Modal
        isOpen={historyPickerOpen}
        onClose={() => { setHistoryPickerOpen(false); setSelectedPickerTaskId(''); setSelectedPickerTaskTitle(''); }}
        size="md"
      >
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
                  setSelectedPickerTaskTitle(pickerTasks.find(p => p._id === id)?.title || '');
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