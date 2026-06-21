import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { dailyUpdateService, employeeService, attendanceService } from '../../services/auth';

import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

const MAX_ROWS = 10;

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: new Date(2000, i).toLocaleString('default', { month: 'long' })
}));

const yearOptions = (() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(current - 2 + i));
})();

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtDate = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtFull = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtTime = (v) => {
  if (!v) return '--';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtHours = (v) => {
  if (v === undefined || v === null || v === '') return '--';
  const n = Number(v);
  if (Number.isNaN(n)) return '--';
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return `${h}h ${m}m`;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const collectTitles = (records) => {
  const titles = [];
  records.forEach((u) => {
    (u.rows || []).forEach((r) => {
      if (r.title && !titles.includes(r.title) && titles.length < MAX_ROWS) titles.push(r.title);
    });
  });
  return titles;
};

const getCell = (rows, title) => {
  const row = (rows || []).find((r) => r.title === title);
  return row?.content || '--';
};

const toDateKey = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Resolve a daily-update record's calendar date: prefer its own attendance
// check-in date if present, otherwise fall back to record.date.
const resolveDate = (u) => {
  if (u.attendance?.checkIn) {
    const k = toDateKey(u.attendance.checkIn);
    if (k) return k;
  }
  return toDateKey(u.date);
};

const resolveEmployeeId = (u) => u.employee?._id || u.employee || u.employeeId || 'unknown';

// ============================================================
// buildAttendanceMap
//
// The raw `/attendance` collection (fetched via
// attendanceService.getAllAttendance) can contain MORE THAN ONE
// record per employee per calendar date — e.g. the employee checks
// in, checks out, then checks in again later the same day. Each of
// those is its own attendance document with its own
// checkIn/checkOut/workingHours.
//
// This groups all attendance documents by employee + date into a
// single entry holding every check-in/check-out pair as a
// "session", plus the summed total working hours for that day —
// exactly the approach MyDailyWork.jsx already uses for the
// logged-in user's own table.
// ============================================================
const buildAttendanceMap = (attRecords) => {
  const map = {};
  (attRecords || []).forEach((rec) => {
    const empId = rec.employee?._id || rec.employee || rec.employeeId;
    const dateStr = toDateKey(rec.date || rec.checkIn || rec.checkOut);
    if (!empId || !dateStr) return;

    const key = `${empId}__${dateStr}`;
    if (!map[key]) map[key] = { sessions: [], workingHours: 0 };

    // A single attendance record can itself already carry a nested
    // sessions[] array in some setups — handle both shapes.
    if (Array.isArray(rec.sessions) && rec.sessions.length > 0) {
      rec.sessions.forEach((s) => {
        if (s.checkIn || s.checkOut) {
          map[key].sessions.push({ checkIn: s.checkIn, checkOut: s.checkOut, workingHours: s.workingHours });
          map[key].workingHours += Number(s.workingHours) || 0;
        }
      });
    } else if (rec.checkIn || rec.checkOut) {
      map[key].sessions.push({ checkIn: rec.checkIn, checkOut: rec.checkOut, workingHours: rec.workingHours });
      map[key].workingHours += Number(rec.workingHours) || 0;
    }
  });

  // Sort each entry's sessions chronologically and dedupe identical pairs
  Object.values(map).forEach((entry) => {
    const seen = new Set();
    const unique = [];
    entry.sessions.forEach((s) => {
      const sig = `${s.checkIn || ''}|${s.checkOut || ''}`;
      if (!seen.has(sig)) { seen.add(sig); unique.push(s); }
    });
    unique.sort((a, b) => new Date(a.checkIn || a.checkOut || 0) - new Date(b.checkIn || b.checkOut || 0));
    entry.sessions = unique;
  });

  return map;
};

// ============================================================
// groupByEmployeeDate
//
// Merges daily-update records (which can also have duplicates for
// the same employee+date) into one row per employee+date, and
// attaches the matching sessions/total from attendanceMap. Falls
// back to whatever is embedded on the record's own `attendance`
// field only if nothing is found in attendanceMap.
// ============================================================
const groupByEmployeeDate = (records, attendanceMap = {}) => {
  const map = {};
  const order = [];

  records.forEach((r) => {
    const dateKey = resolveDate(r);
    if (!dateKey) return;
    const empId = resolveEmployeeId(r);
    const key = `${empId}__${dateKey}`;

    if (!map[key]) {
      map[key] = { ...r, _id: r._id, _latestTime: -Infinity };
      order.push(key);
    }

    const g = map[key];
    const rTime = new Date(r.updatedAt || r.createdAt || r.date).getTime();
    const effectiveTime = Number.isNaN(rTime) ? 0 : rTime;
    if (effectiveTime >= g._latestTime) {
      g._latestTime = effectiveTime;
      g.rows = r.rows;
      g._id = r._id;
      g.employee = r.employee;
      g.date = r.date;
      g.isUserEditable = r.isUserEditable;
    }

    // Fallback sessions, used only if attendanceMap has nothing for this key
    if (!g._fallbackSessions) g._fallbackSessions = [];
    if (r.attendance?.checkIn || r.attendance?.checkOut) {
      g._fallbackSessions.push({
        checkIn: r.attendance.checkIn,
        checkOut: r.attendance.checkOut,
        workingHours: r.attendance.workingHours,
      });
    }
  });

  return order.map((key) => {
    const g = map[key];
    const fromAttendance = attendanceMap[key];

    if (fromAttendance && fromAttendance.sessions.length > 0) {
      g._sessions = fromAttendance.sessions;
      g._totalHours = fromAttendance.workingHours;
    } else {
      g._sessions = g._fallbackSessions || [];
      g._totalHours = g._sessions.reduce((s, sess) => s + (Number(sess.workingHours) || 0), 0);
    }
    delete g._fallbackSessions;
    delete g._latestTime;
    return g;
  });
};

// ============================================================
// Cell components — render one line per session, or a single
// value when there's only one session for that day.
// ============================================================
const CheckInCell = ({ sessions }) => {
  if (!sessions.length) return <span className="text-gray-400 text-sm">--</span>;
  if (sessions.length === 1) {
    return <span className="text-sm text-gray-700 dark:text-gray-200">{fmtTime(sessions[0].checkIn)}</span>;
  }
  return (
    <div className="space-y-1">
      {sessions.map((s, idx) => (
        <div key={idx} className="text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
          <span className="text-xs font-semibold text-gray-400 mr-1">Time {idx + 1}:</span>
          {fmtTime(s.checkIn)}
        </div>
      ))}
    </div>
  );
};

const CheckOutCell = ({ sessions }) => {
  if (!sessions.length) return <span className="text-gray-400 text-sm">--</span>;
  if (sessions.length === 1) {
    return <span className="text-sm text-gray-700 dark:text-gray-200">{fmtTime(sessions[0].checkOut)}</span>;
  }
  return (
    <div className="space-y-1">
      {sessions.map((s, idx) => (
        <div key={idx} className="text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
          <span className="text-xs font-semibold text-gray-400 mr-1">Time {idx + 1}:</span>
          {fmtTime(s.checkOut)}
        </div>
      ))}
    </div>
  );
};

const WorkingHoursCell = ({ sessions, total }) => {
  if (!sessions.length) {
    return <span className="text-gray-400 text-sm">{fmtHours(total)}</span>;
  }
  if (sessions.length === 1) {
    const h = sessions[0].workingHours ?? total;
    return <span className="text-sm text-gray-700 dark:text-gray-200">{fmtHours(h)}</span>;
  }
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
        {fmtHours(total)}
      </div>
      {sessions.map((s, idx) => (
        <div key={idx} className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          <span className="font-medium mr-1">S{idx + 1}:</span>{fmtHours(s.workingHours)}
        </div>
      ))}
    </div>
  );
};

// Excel export equivalents (plain text, "Time 1: ... | Time 2: ...")
const exportCheckIn = (sessions) => {
  if (!sessions.length) return '--';
  if (sessions.length === 1) return fmtTime(sessions[0].checkIn);
  return sessions.map((s, i) => `Time ${i + 1}: ${fmtTime(s.checkIn)}`).join(' | ');
};
const exportCheckOut = (sessions) => {
  if (!sessions.length) return '--';
  if (sessions.length === 1) return fmtTime(sessions[0].checkOut);
  return sessions.map((s, i) => `Time ${i + 1}: ${fmtTime(s.checkOut)}`).join(' | ');
};
const exportHours = (sessions, total) => {
  if (!sessions.length) return fmtHours(total);
  if (sessions.length === 1) return fmtHours(sessions[0].workingHours ?? total);
  const breakdown = sessions.map((s, i) => `S${i + 1}: ${fmtHours(s.workingHours)}`).join(' | ');
  return `${fmtHours(total)} (${breakdown})`;
};

const DailyUpdates = () => {
  const now = new Date();

  // ── Today/Yesterday toggle (for the default table only) ──
  const [dayView, setDayView] = useState('today'); // 'today' | 'yesterday'

  // ── Day table state ──
  const [dayPool, setDayPool] = useState({ today: [], yesterday: [] });
  const [dayAttendanceMap, setDayAttendanceMap] = useState({});
  const [todayLoading, setTodayLoading] = useState(true);
  const [todaySearchTerm, setTodaySearchTerm] = useState('');

  // ── Monthly filter state ──
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Employees ──
  const [allEmployees, setAllEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // ── Monthly results ──
  const [updates, setUpdates] = useState([]);
  const [monthlyAttendanceMap, setMonthlyAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ── Edit / Delete ──
  const [editModal, setEditModal] = useState({ isOpen: false, record: null });
  const [editRows, setEditRows] = useState([]);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const monthParam = `${year}-${month}`;

  // ── Load employees once ──
  useEffect(() => {
    const load = async () => {
      setEmpLoading(true);
      try {
        const raw = await employeeService.getAll();
        const list = Array.isArray(raw) ? raw : raw?.data || raw?.docs || [];
        setAllEmployees(list.filter((e) => e?.isActive !== false));
      } catch (err) {
        console.error('Failed to load employees:', err);
        setAllEmployees([]);
      } finally {
        setEmpLoading(false);
      }
    };
    load();
  }, []);

  // Normalize whatever shape attendanceService.getAllAttendance returns into an array
  const extractAttendanceArray = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.records)) return raw.records;
    if (Array.isArray(raw?.attendance)) return raw.attendance;
    return [];
  };

  // ── Load today + yesterday in one shot (daily updates + raw attendance) ──
  const loadDayUpdates = useCallback(async () => {
    setTodayLoading(true);
    try {
      const today = todayStr();
      const yesterday = yesterdayStr();
      const currentMonthParam = today.slice(0, 7);
      const [curYear, curMonth] = currentMonthParam.split('-');

      let allFetched = [];
      let allAttendance = [];

      const [dailyRes, attRes] = await Promise.allSettled([
        dailyUpdateService.adminGetAll(currentMonthParam, undefined, 1, 500),
        attendanceService.getAllAttendance(Number(curMonth), Number(curYear)),
      ]);

      allFetched = Array.isArray(dailyRes.value?.updates) ? dailyRes.value.updates : [];
      allAttendance = extractAttendanceArray(attRes.value);

      // If yesterday is in a different month, fetch that too
      if (yesterday.slice(0, 7) !== currentMonthParam) {
        const [prevYear, prevMonth] = yesterday.slice(0, 7).split('-');
        try {
          const prevDaily = await dailyUpdateService.adminGetAll(yesterday.slice(0, 7), undefined, 1, 500);
          allFetched = [...allFetched, ...(Array.isArray(prevDaily?.updates) ? prevDaily.updates : [])];
        } catch (_) { /* best effort */ }
        try {
          const prevAtt = await attendanceService.getAllAttendance(Number(prevMonth), Number(prevYear));
          allAttendance = [...allAttendance, ...extractAttendanceArray(prevAtt)];
        } catch (_) { /* best effort */ }
      }

      setDayAttendanceMap(buildAttendanceMap(allAttendance));
      setDayPool({
        today: allFetched.filter((u) => resolveDate(u) === today),
        yesterday: allFetched.filter((u) => resolveDate(u) === yesterday),
      });
    } catch (err) {
      console.error('Failed to load day updates:', err);
      setDayPool({ today: [], yesterday: [] });
      setDayAttendanceMap({});
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDayUpdates();
    // Auto-refresh at midnight
    const scheduleNext = () => {
      const n = new Date();
      const midnight = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 0, 0);
      return setTimeout(() => {
        loadDayUpdates();
        intervalRef.current = setInterval(loadDayUpdates, 24 * 60 * 60 * 1000);
      }, midnight.getTime() - n.getTime());
    };
    const intervalRef = { current: null };
    const tid = scheduleNext();
    return () => { clearTimeout(tid); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadDayUpdates]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived ──
  const departments = [...new Set(allEmployees.map((e) => e.department).filter(Boolean))].sort();
  const deptEmployees = selectedDept ? allEmployees.filter((e) => e.department === selectedDept) : allEmployees;
  const suggestions = searchTerm.trim()
    ? deptEmployees.filter((e) => (e.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : deptEmployees.slice(0, 8);

  // Active day records (today or yesterday), filtered by search, merged by employee+date
  const activeDayRecordsRaw = (dayView === 'today' ? dayPool.today : dayPool.yesterday).filter((u) => {
    if (!todaySearchTerm.trim()) return true;
    return (u.employee?.name || '').toLowerCase().includes(todaySearchTerm.trim().toLowerCase());
  });
  const activeDayRecords = groupByEmployeeDate(activeDayRecordsRaw, dayAttendanceMap);
  const activeDayTitles = collectTitles(activeDayRecords);

  // ── Filter handlers ──
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedEmployee(null);
    setShowSuggestions(true);
  };
  const handleSelectSuggestion = (emp) => {
    setSelectedEmployee(emp);
    setSearchTerm(emp.name);
    setShowSuggestions(false);
  };
  const handleClearSearch = () => { setSearchTerm(''); setSelectedEmployee(null); setShowSuggestions(false); };
  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    if (selectedEmployee && dept && selectedEmployee.department !== dept) {
      setSelectedEmployee(null);
      setSearchTerm('');
    }
  };

  // ── Load monthly (daily updates + raw attendance) ──
  const loadUpdates = useCallback(async () => {
    setLoading(true);
    setHasLoaded(false);
    try {
      const empId = selectedEmployee?._id || undefined;
      const [dailyRes, attRes] = await Promise.allSettled([
        dailyUpdateService.adminGetAll(monthParam, empId, 1, 500),
        attendanceService.getAllAttendance(Number(month), Number(year), empId),
      ]);
      setUpdates(Array.isArray(dailyRes.value?.updates) ? dailyRes.value.updates : []);
      setMonthlyAttendanceMap(buildAttendanceMap(extractAttendanceArray(attRes.value)));
    } catch (err) {
      console.error('Failed to load daily updates:', err);
      setUpdates([]);
      setMonthlyAttendanceMap({});
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [monthParam, month, year, selectedEmployee]);

  // Client-side filter for monthly table
  const filteredUpdatesRaw = updates.filter((u) => {
    if (selectedDept && u.employee?.department !== selectedDept) return false;
    if (selectedEmployee && u.employee?._id !== selectedEmployee._id) return false;
    if (!selectedEmployee && searchTerm.trim()) {
      if (!(u.employee?.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase())) return false;
    }
    if (fromDate) {
      const uDate = new Date(u.date); uDate.setHours(0, 0, 0, 0);
      const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
      if (uDate < from) return false;
    }
    if (toDate) {
      const uDate = new Date(u.date); uDate.setHours(0, 0, 0, 0);
      const to = new Date(toDate); to.setHours(23, 59, 59, 999);
      if (uDate > to) return false;
    }
    return true;
  });

  // Merge same-day duplicate sessions per employee for display & export
  const filteredUpdates = groupByEmployeeDate(filteredUpdatesRaw, monthlyAttendanceMap);

  const monthlyTitles = collectTitles(filteredUpdates);

  // Is "All Employees" mode (no specific employee selected/searched)
  const isAllEmployees = !selectedEmployee && !searchTerm.trim();

  // Group by dept → employee for All Employees mode (operates on already-merged records)
  const buildGrouped = (records) => {
    const grouped = {};
    records.forEach((u) => {
      const dept = u.employee?.department || 'No Department';
      const empId = u.employee?._id || u.employee?.name || 'unknown';
      const name = u.employee?.name || 'Unknown';
      if (!grouped[dept]) grouped[dept] = {};
      if (!grouped[dept][empId]) grouped[dept][empId] = { name, records: [] };
      grouped[dept][empId].records.push(u);
    });
    return grouped;
  };

  const monthlyGrouped = buildGrouped(filteredUpdates);

  // ── Edit modal helpers ──
  const openEditModal = (record) => {
    setEditError('');
    setEditRows((record.rows || []).map((r) => ({ title: r.title || '', content: r.content || '' })));
    setEditModal({ isOpen: true, record });
  };
  const closeEditModal = () => { setEditModal({ isOpen: false, record: null }); setEditRows([]); setEditError(''); };
  const updateEditRow = (i, f, v) => setEditRows((p) => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const addEditRow = () => { if (editRows.length < MAX_ROWS) setEditRows((p) => [...p, { title: '', content: '' }]); };
  const removeEditRow = (i) => setEditRows((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const handleSaveEdit = async () => {
    if (editRows.some((r) => !r.title.trim())) { setEditError('Every row needs a title.'); return; }
    setSaving(true); setEditError('');
    try {
      await dailyUpdateService.adminEdit(
        editModal.record._id,
        editRows.map((r) => ({ title: r.title.trim(), content: r.content.trim() }))
      );
      closeEditModal();
      await Promise.all([loadDayUpdates(), hasLoaded ? loadUpdates() : Promise.resolve()]);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete daily update for ${record.employee?.name || 'this employee'} on ${fmtFull(record.date)}?`)) return;
    setDeletingId(record._id);
    try {
      await dailyUpdateService.adminDelete(record._id);
      await Promise.all([loadDayUpdates(), hasLoaded ? loadUpdates() : Promise.resolve()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Excel Export ──
  const exportToExcel = () => {
    if (filteredUpdates.length === 0) { alert('No data to export.'); return; }

    const monthLabel = monthOptions.find((m) => m.value === month)?.label || month;
    const deptLabel = selectedDept || 'All Departments';
    const dateRange = (fromDate || toDate)
      ? ` (${fromDate || ''}${toDate ? ' to ' + toDate : ''})`
      : '';

    const hStyle = `background:#0f172a;color:#bfdbfe;font-weight:700;border:1px solid #9ca3af;padding:6px 8px;font-size:12px;text-align:left;`;
    const cStyle = `border:1px solid #9ca3af;padding:6px 8px;font-size:12px;vertical-align:top;`;

    // Build a table for a given employee's (already-merged) records using provided titles
    const buildTable = (records, titles) => {
      const fixedHeaders = ['Date', 'Check In', 'Check Out', 'Total Working Hours', ...titles];
      const thHtml = fixedHeaders.map((h) => `<th style="${hStyle}">${esc(h)}</th>`).join('');
      const rowsHtml = records.map((u) => {
        const sessions = u._sessions || [];
        const total = u._totalHours || 0;
        const cells = [
          fmtDate(u.date),
          exportCheckIn(sessions),
          exportCheckOut(sessions),
          exportHours(sessions, total),
          ...titles.map((t) => getCell(u.rows, t)),
        ];
        return `<tr>${cells.map((c) => `<td style="${cStyle}">${esc(c)}</td>`).join('')}</tr>`;
      }).join('');
      return `<table style="border-collapse:collapse;margin-bottom:16px;"><thead><tr>${thHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    };

    let body = `<h1 style="font-size:16px;margin:0 0 4px;">Daily Updates — ${esc(monthLabel)} ${esc(year)}${esc(dateRange)}</h1>
                <h2 style="font-size:13px;margin:0 0 16px;color:#374151;">${esc(deptLabel)}</h2>`;

    if (isAllEmployees) {
      // Dept → employee → stacked tables on one sheet, all employees in same dept share unified columns
      Object.keys(monthlyGrouped).sort().forEach((dept) => {
        // Collect ALL titles across ALL employees in this department (unified columns per dept)
        const deptRecords = Object.values(monthlyGrouped[dept]).flatMap((emp) => emp.records);
        const deptTitles = collectTitles(deptRecords);

        // Department header
        body += `<h3 style="font-size:13px;margin:20px 0 8px;padding:4px 10px;background:#e0e7ff;color:#1e40af;display:inline-block;border-radius:4px;">${esc(dept)}</h3><br/>`;

        // Each employee table uses the SAME dept-wide columns so headers align
        Object.values(monthlyGrouped[dept]).forEach((emp) => {
          body += `<p style="font-size:13px;font-weight:600;margin:10px 0 4px;">👤 ${esc(emp.name)}</p>`;
          body += buildTable(emp.records, deptTitles);
        });
      });
    } else {
      // Single employee or dept-filtered: one flat table
      const empLabel = selectedEmployee?.name || (searchTerm.trim() || 'All Employees');
      body += `<p style="font-size:13px;font-weight:600;margin:0 0 6px;">👤 ${esc(empLabel)}</p>`;
      body += buildTable(filteredUpdates, monthlyTitles);
    }

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"/>
      <style>body{font-family:Calibri,Arial,sans-serif;color:#111827;}</style>
      </head><body>${body}</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-updates-${year}-${month}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ── Shared action buttons cell ──
  const ActionCell = ({ record }) => (
    <td className="px-3 py-3 align-top text-center">
      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={() => openEditModal(record)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-300" title="Edit">
          <EditIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => handleDelete(record)} disabled={deletingId === record._id}
          className="text-red-500 hover:text-red-700 dark:text-red-300 disabled:opacity-40" title="Delete">
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </td>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Updates</h1>
        <p className="text-gray-600 dark:text-gray-300">Review, edit, and export employees' daily work logs</p>
      </div>

      {/* ═══════════════════════ FILTERS CARD ═══════════════════════ */}
      <Card className="shadow-sm">
        <Card.Header>
          <Card.Title className="flex items-center">
            <FilterListIcon className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            Filters
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Department</label>
              <select value={selectedDept} onChange={(e) => handleDeptChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Employee dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Employee Name</label>
              <select
                value={selectedEmployee?._id || ''}
                onChange={(e) => {
                  const emp = deptEmployees.find((x) => x._id === e.target.value);
                  if (emp) { setSelectedEmployee(emp); setSearchTerm(emp.name); }
                  else { setSelectedEmployee(null); setSearchTerm(''); }
                }}
                disabled={empLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 disabled:opacity-60">
                <option value="">{empLoading ? 'Loading employees...' : 'All Employees'}</option>
                {deptEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name}{emp.department ? ` (${emp.department})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Search autocomplete */}
            <div ref={searchRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Search Employee</label>
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchTerm} onChange={handleSearchChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={empLoading ? 'Loading employees...' : 'Search employee name...'}
                  disabled={empLoading}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 disabled:opacity-60" />
                {searchTerm && (
                  <button type="button" onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {suggestions.map((emp) => (
                    <div key={emp._id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(emp); }}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/30 ${selectedEmployee?._id === emp._id ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary-700 dark:text-primary-200">
                          {(emp.name || 'E').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{emp.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.department || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showSuggestions && searchTerm.trim() && suggestions.length === 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No employees found
                </div>
              )}
            </div>
          </div>

          {/* Apply / Clear */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={loadUpdates} loading={loading} className="w-full sm:w-auto">Apply Filters</Button>
            <Button variant="outline" onClick={() => {
              setSelectedDept(''); setSelectedEmployee(null); setSearchTerm('');
              setFromDate(''); setToDate(''); setUpdates([]); setHasLoaded(false);
            }} className="w-full sm:w-auto">Clear Filters</Button>
          </div>
        </Card.Content>
      </Card>

      {/* ═══════════════════════ MONTHLY TABLE (after Apply Filters) ═══════════════════════ */}
      {(hasLoaded || loading) && (
        <Card className="shadow-sm">
          <Card.Header>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title className="flex flex-wrap items-center gap-2">
                  <AssignmentIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="text-primary-600 dark:text-primary-300">{year}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-primary-600 dark:text-primary-300">{monthOptions.find((m) => m.value === month)?.label}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-primary-600 dark:text-primary-300">{selectedDept || 'All Departments'}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-primary-600 dark:text-primary-300">
                    {selectedEmployee?.name || (searchTerm.trim() || 'All Employees')}
                  </span>
                </Card.Title>
                {hasLoaded && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {filteredUpdates.length} record{filteredUpdates.length !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>
              <Button onClick={exportToExcel} variant="outline"
                disabled={filteredUpdates.length === 0 || !hasLoaded}
                className="flex items-center justify-center gap-2 w-full sm:w-auto flex-shrink-0">
                <DownloadIcon className="w-4 h-4" />
                Export Excel
              </Button>
            </div>

            {/* Date range sub-filter */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 mt-3">
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">To Date</label>
                <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
              </div>
              {(fromDate || toDate) && (
                <Button variant="outline" onClick={() => { setFromDate(''); setToDate(''); }} className="w-full sm:w-auto">
                  Clear Dates
                </Button>
              )}
            </div>
          </Card.Header>

          <Card.Content>
            {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}

            {hasLoaded && !loading && filteredUpdates.length === 0 && (
              <div className="text-center py-12">
                <AssignmentIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No daily updates found for this selection</p>
              </div>
            )}

            {hasLoaded && !loading && filteredUpdates.length > 0 && (
              isAllEmployees ? (
                /* ── ALL EMPLOYEES: grouped dept → per-employee table ── */
                <div className="space-y-10">
                  {Object.keys(monthlyGrouped).sort().map((dept) => (
                    <div key={dept}>
                      {/* Department badge */}
                      <div className="flex items-center gap-3 mb-5">
                        <span className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider">
                          {dept}
                        </span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      </div>

                      <div className="space-y-7 pl-2">
                        {Object.values(monthlyGrouped[dept]).map((emp) => {
                          const empTitles = collectTitles(emp.records);
                          return (
                            <div key={emp.name}>
                              {/* Employee name header */}
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-200">
                                    {emp.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{emp.name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  · {emp.records.length} record{emp.records.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Per-employee table */}
                              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                                <table className="divide-y divide-gray-200 dark:divide-gray-700"
                                  style={{ minWidth: `${500 + empTitles.length * 160}px`, width: '100%' }}>
                                  <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Date</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check In</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check Out</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-32">Total Working Hours</th>
                                      {empTitles.map((t) => (
                                        <th key={t} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ minWidth: '150px' }}>{t}</th>
                                      ))}
                                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-20">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {emp.records.map((record) => {
                                      const sessions = record._sessions || [];
                                      const total = record._totalHours || 0;
                                      return (
                                        <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                          <td className="px-3 py-3 align-top text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtDate(record.date)}</td>
                                          <td className="px-3 py-3 align-top whitespace-nowrap"><CheckInCell sessions={sessions} /></td>
                                          <td className="px-3 py-3 align-top whitespace-nowrap"><CheckOutCell sessions={sessions} /></td>
                                          <td className="px-3 py-3 align-top whitespace-nowrap"><WorkingHoursCell sessions={sessions} total={total} /></td>
                                          {empTitles.map((t) => (
                                            <td key={t} className="px-3 py-3 align-top text-sm text-gray-700 dark:text-gray-200">{getCell(record.rows, t)}</td>
                                          ))}
                                          <ActionCell record={record} />
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── SINGLE EMPLOYEE: flat table ── */
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                  <table className="divide-y divide-gray-200 dark:divide-gray-700"
                    style={{ minWidth: `${500 + monthlyTitles.length * 160}px`, width: '100%' }}>
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check In</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check Out</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-32">Total Working Hours</th>
                        {monthlyTitles.map((t) => (
                          <th key={t} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ minWidth: '150px' }}>{t}</th>
                        ))}
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredUpdates.map((record) => {
                        const sessions = record._sessions || [];
                        const total = record._totalHours || 0;
                        return (
                          <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 py-3 align-top text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtDate(record.date)}</td>
                            <td className="px-3 py-3 align-top whitespace-nowrap"><CheckInCell sessions={sessions} /></td>
                            <td className="px-3 py-3 align-top whitespace-nowrap"><CheckOutCell sessions={sessions} /></td>
                            <td className="px-3 py-3 align-top whitespace-nowrap"><WorkingHoursCell sessions={sessions} total={total} /></td>
                            {monthlyTitles.map((t) => (
                              <td key={t} className="px-3 py-3 align-top text-sm text-gray-700 dark:text-gray-200">{getCell(record.rows, t)}</td>
                            ))}
                            <ActionCell record={record} />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Card.Content>
        </Card>
      )}

      {/* ═══════════════════════ TODAY / YESTERDAY TABLE ═══════════════════════ */}
      <Card className="shadow-sm">
        <Card.Header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Card.Title className="flex flex-wrap items-center gap-2">
              <AssignmentIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span>{dayView === 'today' ? "Today's" : "Yesterday's"} Update</span>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span className="text-primary-600 dark:text-primary-300">
                {fmtFull(dayView === 'today' ? new Date() : new Date(Date.now() - 86400000))}
              </span>
            </Card.Title>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Today / Yesterday toggle */}
              <select
                value={dayView}
                onChange={(e) => { setDayView(e.target.value); setTodaySearchTerm(''); }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 flex-shrink-0"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
              </select>

              <Button variant="outline" onClick={loadDayUpdates} loading={todayLoading} className="flex-shrink-0">
                Refresh
              </Button>

              {/* Employee search */}
              <div className="relative w-full sm:w-64">
                <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={todaySearchTerm} onChange={(e) => setTodaySearchTerm(e.target.value)}
                  placeholder="Search employee name..."
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
                {todaySearchTerm && (
                  <button type="button" onClick={() => setTodaySearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {!todayLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {activeDayRecords.length} record{activeDayRecords.length !== 1 ? 's' : ''} found
            </p>
          )}
        </Card.Header>

        <Card.Content>
          {todayLoading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}

          {!todayLoading && activeDayRecords.length === 0 && (
            <div className="text-center py-12">
              <AssignmentIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No daily updates found for {dayView === 'today' ? 'today' : 'yesterday'}
              </p>
            </div>
          )}

          {!todayLoading && activeDayRecords.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="divide-y divide-gray-200 dark:divide-gray-700"
                style={{ minWidth: `${600 + activeDayTitles.length * 160}px`, width: '100%' }}>
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-36">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check In</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-28">Check Out</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-32">Total Working Hours</th>
                    {activeDayTitles.map((t) => (
                      <th key={t} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ minWidth: '150px' }}>{t}</th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {activeDayRecords.map((record) => {
                    const sessions = record._sessions || [];
                    const total = record._totalHours || 0;
                    return (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-3 py-3 align-top text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{record.employee?.name || '--'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{record.employee?.department || ''}</div>
                        </td>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><CheckInCell sessions={sessions} /></td>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><CheckOutCell sessions={sessions} /></td>
                        <td className="px-3 py-3 align-top whitespace-nowrap"><WorkingHoursCell sessions={sessions} total={total} /></td>
                        {activeDayTitles.map((t) => (
                          <td key={t} className="px-3 py-3 align-top text-sm text-gray-700 dark:text-gray-200">{getCell(record.rows, t)}</td>
                        ))}
                        <ActionCell record={record} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* ═══════════════════════ EDIT MODAL ═══════════════════════ */}
      <Modal isOpen={editModal.isOpen} onClose={closeEditModal} title="Edit Daily Update" size="lg">
        <div className="space-y-4">
          {editModal.record && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
              {editModal.record.employee?.name || 'Employee'} — {fmtFull(editModal.record.date)}
            </div>
          )}

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[480px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-1/3">Title</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Content</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {editRows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 align-top">
                      <input type="text" value={row.title} onChange={(e) => updateEditRow(index, 'title', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <textarea value={row.content} onChange={(e) => updateEditRow(index, 'content', e.target.value)} rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      <button type="button" onClick={() => removeEditRow(index)} disabled={editRows.length <= 1}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30">
                        <DeleteIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editRows.length < MAX_ROWS && (
            <button type="button" onClick={addEditRow}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-300">
              <AddIcon className="w-4 h-4" /> Add row ({editRows.length}/{MAX_ROWS})
            </button>
          )}

          {editError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/25 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {editError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeEditModal} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
            <Button type="button" onClick={handleSaveEdit} loading={saving} className="w-full sm:w-auto">Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DailyUpdates;