import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { attendanceService, employeeService, permissionService, shiftService, locationService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { formatWorkingHours } from '../../utils/time';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// ─── Timezone-safe Sunday check ─────────────────────────────────────────────
const isSunday = (dateValue) => {
  if (!dateValue) return false;
  let d;
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [y, m, day] = dateValue.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateValue);
  }
  return !Number.isNaN(d.getTime()) && d.getDay() === 0;
};

// ─── Timezone-safe YYYY-MM-DD extraction ────────────────────────────────────
const toLocalDateKey = (value) => {
  if (!value) return null;
  try {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
};

const todayStr = toLocalDateKey(new Date());

// ─── Get date key from a record (absent-safe) ──────────────────────────────
const getRecordDateKey = (record) =>
  toLocalDateKey(record?.date) || toLocalDateKey(record?.checkIn) || null;


// ─── Shared day-status resolver ─────────────────────────────────────────────
const resolveDayAggregate = (records = []) => {
  if (!records.length) return { status: 'absent', dayType: 'full-day', workingHours: 0 };

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  let totalValidHours = 0;
  let hasOpenSessionToday = false;
  let hasValidCompletedSession = false;
  let hasPermission = false;
  let hasNotCheckedOut = false;

  records.forEach(r => {
    const checkInTime = r.checkIn ? new Date(r.checkIn).getTime() : 0;
    const hasCheckOut = Boolean(r.checkOut);
    const recordDateKey = getRecordDateKey(r);
    const isToday = recordDateKey === todayStr;

    // ── Incomplete session (checked in, no checkout) ──────────────────────
   if (r.checkIn && !hasCheckOut) {
  if (now - checkInTime >= twentyFourHours) {
    // >24h without checkout = not-checked-out (regardless of date)
    hasNotCheckedOut = true;
  } else if (isToday) {
    // Today and within 24h = actively working
    hasOpenSessionToday = true;
  } else {
    // Past date but <24h = still treat as open/working
    hasOpenSessionToday = true;
  }
  return; // Never add hours for incomplete sessions
}

    // ── Completed session (has both checkIn and checkOut) ─────────────────
    if (hasCheckOut) {
      // Skip sessions explicitly auto-closed as absent
      if (r.autoCheckedOut || r.absentReason === 'not-checked-out' || r.absentReason === 'not-checked-out-24h') {
        hasNotCheckedOut = true;
        return;
      }

      totalValidHours += Number(r.workingHours) || 0;
      hasValidCompletedSession = true;

      const s = String(r.status || '').toLowerCase();
      if (s === 'present-with-permission' || s === 'with-permission' || s === 'on-permission') {
        hasPermission = true;
      }
    }
  });

  // ── Priority 1: Currently working today (open session) ───────────────────
  if (hasOpenSessionToday) {
    return { status: 'working', dayType: 'full-day', workingHours: totalValidHours };
  }

  // ── Priority 2: Has completed sessions — determine status from hours ──────
  if (hasValidCompletedSession) {
    if (hasPermission) {
      return { status: 'present-with-permission', dayType: 'full-day', workingHours: totalValidHours };
    }
    if (totalValidHours > 4.5) {
      return { status: 'present', dayType: 'full-day', workingHours: totalValidHours };
    } else {
      return { status: 'half-day', dayType: 'half-day', workingHours: totalValidHours };
    }
  }

  // ── Priority 3: No valid completed sessions — check if not-checked-out ────
  if (hasNotCheckedOut) {
    return { status: 'absent', dayType: 'full-day', workingHours: 0, absentReason: 'not-checked-out' };
  }

  // ── Priority 4: Truly absent — no check-in at all ────────────────────────
  return { status: 'absent', dayType: 'full-day', workingHours: 0 };
};

const AttendanceReport = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const start = `${yyyy}-${mm}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dd = String(endDate.getDate()).padStart(2, '0');
    return { start, end: `${yyyy}-${mm}-${dd}` };
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailModal, setDetailModal] = useState({ isOpen: false, record: null });
  const [editModal, setEditModal] = useState({ isOpen: false, record: null, mode: 'edit', employee: null, dateKey: '' });
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', status: 'present', dayType: 'full-day', shiftId: '', locationId: '', reason: '' });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [reportEdit, setReportEdit] = useState({ isEditing: false, record: null });
  const [reportEditForm, setReportEditForm] = useState({ checkIn: '', checkOut: '', status: 'present', dayType: 'full-day', shiftId: '', locationId: '', reason: '' });
  const [reportEditError, setReportEditError] = useState('');
  const [savingReportEdit, setSavingReportEdit] = useState(false);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState(null);
  const [deleteAttendanceError, setDeleteAttendanceError] = useState({ id: null, message: '' });
  const [editAuditModal, setEditAuditModal] = useState({ isOpen: false, row: null, audit: null });
  const [rowStatusModal, setRowStatusModal] = useState({ isOpen: false, row: null });
  const [rowStatusForm, setRowStatusForm] = useState({ status: 'present', checkInTime: '09:00', checkOutTime: '18:00', shiftId: '', locationId: '' });
  const [reportTableView, setReportTableView] = useState('table1');
  const [mobileView, setMobileView] = useState('stats');

  const canEditAttendanceTime = user?.role === 'admin' && user?.canEditAttendanceTime === true;

  const activeDateRange = dateRange;
  const activeDateFilter = dateFilter;

  // ─── Date helpers ─────────────────────────────────────────────────────────
  const syncSelectedPeriod = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return;
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    setSelectedMonth((prev) => (prev === month ? prev : month));
    setSelectedYear((prev) => (prev === year ? prev : year));
  };

  const toISODate = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getSelectedMonthRange = (month = selectedMonth, year = selectedYear) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start: toISODate(start), end: toISODate(end), syncDate: start };
  };

  const getPresetDateRange = (preset) => {
    const now = new Date();
    const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0);
    const clampToSelectedMonth = (d) => {
      if (d < selectedMonthStart) return selectedMonthStart;
      if (d > selectedMonthEnd) return selectedMonthEnd;
      return d;
    };
    if (!preset || preset === 'all') return getSelectedMonthRange();
    if (preset === 'today') {
      const day = toISODate(clampToSelectedMonth(now));
      return { start: day, end: day, syncDate: clampToSelectedMonth(now) };
    }
    if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const clamped = clampToSelectedMonth(yesterday);
      const day = toISODate(clamped);
      return { start: day, end: day, syncDate: clamped };
    }
    if (preset === 'last7') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      const rangeStart = clampToSelectedMonth(start);
      const rangeEnd = clampToSelectedMonth(now);
      return { start: toISODate(rangeStart), end: toISODate(rangeEnd), syncDate: rangeEnd };
    }
    if (preset === 'thisMonth') return getSelectedMonthRange();
    return { start: null, end: null, syncDate: null };
  };

  const applyDatePreset = (preset) => {
    const range = getPresetDateRange(preset);
    setDatePreset(preset);
    setDateFilter('');
    setDateRange((prev) =>
      prev.start === range.start && prev.end === range.end
        ? prev
        : { start: range.start, end: range.end }
    );
    if (range.syncDate) syncSelectedPeriod(range.syncDate);
  };

  const getMonthYearBuckets = (startISO, endISO) => {
    if (!startISO || !endISO) return [];
    const [sYear, sMonth] = startISO.split('-').map(Number);
    const [eYear, eMonth] = endISO.split('-').map(Number);
    const buckets = [];
    let cYear = sYear, cMonth = sMonth;
    while (cYear < eYear || (cYear === eYear && cMonth <= eMonth)) {
      buckets.push({ month: cMonth, year: cYear });
      cMonth++;
      if (cMonth > 12) { cMonth = 1; cYear++; }
    }
    return buckets;
  };

  const getId = (e) => {
    if (!e) return undefined;
    if (typeof e === 'string') return e;
    if (e._id) return String(e._id);
    if (e.id) return String(e.id);
    if (e.value) return String(e.value);
    if (e.employeeId) return String(e.employeeId);
    return undefined;
  };

  // ─── Date range filter ────────────────────────────────────────────────────
  const recordPassesDateFilter = (record) => {
    const dateKey = getRecordDateKey(record);
    if (!dateKey) return false;
    if (activeDateFilter) {
      const df = toLocalDateKey(activeDateFilter);
      return dateKey === df;
    }
    if (activeDateRange && activeDateRange.start && activeDateRange.end) {
      return dateKey >= activeDateRange.start && dateKey <= activeDateRange.end;
    }
    return true;
  };

  // ─── Fetch attendance entries ─────────────────────────────────────────────
  const fetchAttendanceEntries = async (employeeParam) => {
    const rangeBuckets = (activeDateRange && activeDateRange.start && activeDateRange.end)
      ? getMonthYearBuckets(activeDateRange.start, activeDateRange.end)
      : [];
    const buckets = rangeBuckets.length > 0
      ? rangeBuckets
      : [{ month: selectedMonth, year: selectedYear }];

    const responses = await Promise.all(
      buckets.map(async ({ month, year }) => {
        try {
          const res = await attendanceService.getAllAttendance(month, year, employeeParam);
          if (Array.isArray(res)) return res;
          if (Array.isArray(res?.attendance)) return res.attendance;
          if (Array.isArray(res?.data)) return res.data;
          if (Array.isArray(res?.docs)) return res.docs;
          return [];
        } catch (err) {
          console.warn('Failed to load attendance for period', { month, year, message: err?.message || err });
          return [];
        }
      })
    );

    const entries = responses.flat();
    const seen = new Set();
    return (entries || []).filter((rec) => {
      if (!rec) return false;
      const key = rec._id ? String(rec._id) : (() => {
        const empId = getId(rec.employee || rec.employeeId || rec.user || rec.userId) || 'unknown';
        const dateKey = getRecordDateKey(rec) || '';
        const shiftId = getId(rec.shift || rec.selectedShift) || rec.shiftName || '';
        const ci = rec.checkIn ? new Date(rec.checkIn).getTime() : '';
        const co = rec.checkOut ? new Date(rec.checkOut).getTime() : '';
        return `${empId}-${dateKey}-${shiftId}-${ci}-${co}`;
      })();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // ─── Group flat attendance records by employee+date ───────────────────────
  const groupAttendanceByEmployeeDate = (flatRecords) => {
    if (!Array.isArray(flatRecords)) return [];
    const byKey = new Map();

    for (const record of flatRecords) {
      if (!record) continue;
      const dateKey = getRecordDateKey(record);
      if (!dateKey) continue;
      const empId = getId(record.employee) || 'unknown';
      const mapKey = `${empId}__${dateKey}`;

      if (!byKey.has(mapKey)) {
        byKey.set(mapKey, {
          _id: `grouped-${mapKey}`,
          date: record.date || record.checkIn,
          dateKey,
          employee: record.employee,
          sessions: [],
          status: record.status,
          workingHours: 0,
          shiftName: null,
          shift: record.shift,
          _synthetic: record._synthetic || false,
          checkInLocation: record.checkInLocation,
          attendanceTimeEditAudit: record.attendanceTimeEditAudit || [],
          _firstRecord: record,
          _rawRecords: [],
        });
      }

      const grouped = byKey.get(mapKey);
      grouped._rawRecords.push(record);

      if (record.autoMarked) grouped.autoMarked = true;
      if (record.absentReason) grouped.absentReason = record.absentReason;

      if (record.checkIn || record.checkOut) {
        grouped.sessions.push({
          _id: record._id,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          workingHours: record.workingHours,
          checkInLat: record.checkInLat,
          checkInLng: record.checkInLng,
          checkOutLat: record.checkOutLat,
          checkOutLng: record.checkOutLng,
          checkInPlace: record.checkInPlace,
          checkOutPlace: record.checkOutPlace,
          checkInLocation: record.checkInLocation,
          checkOutLocation: record.checkOutLocation,
          autoCheckedOut: record.autoCheckedOut,
          absentReason: record.absentReason,
          _rawRecord: record,
        });
      }

      if (!grouped.shiftName && (record.shiftName || record.shift?.displayName || record.shift?.name)) {
        grouped.shiftName = record.shiftName || record.shift?.displayName || record.shift?.name;
      }
      if (record.checkInLocation && !grouped.checkInLocation) grouped.checkInLocation = record.checkInLocation;
      if (Array.isArray(record.attendanceTimeEditAudit) && record.attendanceTimeEditAudit.length) {
        grouped.attendanceTimeEditAudit = [...(grouped.attendanceTimeEditAudit || []), ...record.attendanceTimeEditAudit];
      }
    }

    return Array.from(byKey.values()).map((g) => {
      g.sessions.sort((a, b) => {
        const ta = a.checkIn ? new Date(a.checkIn).getTime() : 0;
        const tb = b.checkIn ? new Date(b.checkIn).getTime() : 0;
        return ta - tb;
      });
      const resolved = resolveDayAggregate(g._rawRecords);
      g.status = resolved.status;
      g.dayType = resolved.dayType;
      g.workingHours = resolved.workingHours;
      if (resolved.absentReason) g.absentReason = resolved.absentReason;
      return g;
    });
  };

  // ─── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);

  useEffect(() => {
    if (employees && employees.length > 0) {
      loadAttendance();
      loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMonth, selectedYear, selectedEmployee, dateFilter, statusFilter,
    employees.length, datePreset,
    dateRange.start, dateRange.end,
  ]);

  useEffect(() => {
    if (datePreset === 'all' || datePreset === 'thisMonth') {
      const range = getSelectedMonthRange();
      setDateRange((prev) =>
        prev.start === range.start && prev.end === range.end
          ? prev
          : { start: range.start, end: range.end }
      );
      setDateFilter('');
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const range = getPresetDateRange(datePreset);
    setDateRange((prev) =>
      prev.start === range.start && prev.end === range.end
        ? prev
        : { start: range.start, end: range.end }
    );
    if (range.syncDate) syncSelectedPeriod(range.syncDate);
  }, [datePreset]);

  useEffect(() => {
    if (dateFilter) {
      setDatePreset('all');
      const [y, m, d] = dateFilter.split('-').map(Number);
      const specific = new Date(y, m - 1, d);
      if (!Number.isNaN(specific.getTime())) syncSelectedPeriod(specific);
    }
  }, [dateFilter]);

  // ─── Data loaders ─────────────────────────────────────────────────────────
  const loadInitialData = async () => {
    try {
      const rawEmployees = await employeeService.getAll();
      const employeesData = Array.isArray(rawEmployees)
        ? rawEmployees
        : (rawEmployees?.data || rawEmployees?.docs || []);
      setEmployees((employeesData || []).filter(emp => emp?.isActive !== false));
      await loadReportEditOptions();
      await loadAttendance();
      await loadPermissions();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const unwrapListResponse = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.docs)) return value.docs;
    if (Array.isArray(value?.results)) return value.results;
    return [];
  };

  const loadReportEditOptions = async () => {
    const [shiftResult, locationResult] = await Promise.allSettled([
      shiftService.getAll(),
      locationService.adminGetAll().catch(() => locationService.getAll()),
    ]);
    if (shiftResult.status === 'fulfilled') {
      setShifts(unwrapListResponse(shiftResult.value).filter(s => s?.isActive !== false));
    } else { setShifts([]); }
    if (locationResult.status === 'fulfilled') {
      setLocations(unwrapListResponse(locationResult.value).filter(l => l?.isActive !== false));
    } else { setLocations([]); }
  };

  const normalizeEmployee = (rec) => {
    const copy = { ...rec };
    const emp = rec.employee || rec.employeeId || rec.user || rec.userId;
    const empId = getId(emp);
    if (empId && (!emp || typeof emp === 'string')) {
      const found = (employees || []).find(e => getId(e) === empId);
      copy.employee = found || { _id: empId, name: empId };
    }
    return copy;
  };

  // ─── Build synthetic absent records for a date range ──────────────────────
  const buildSyntheticAbsents = (realRecords, empList, startISO, endISO) => {
    if (!startISO || !endISO) return [];

    const realKeys = new Set();
    realRecords.forEach(r => {
      const empId = getId(r.employee);
      const dk = getRecordDateKey(r);
      if (empId && dk) realKeys.add(`${empId}__${dk}`);
    });

    const result = [];
    const empToCheck = empList.filter(e =>
      selectedEmployee === 'all' || String(e._id) === String(selectedEmployee)
    );

    const cursor = new Date(startISO);
    const endDate = new Date(endISO);
    cursor.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const dateKey = toLocalDateKey(new Date(cursor));
      const dayOfWeek = cursor.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend && dateKey < todayStr) {
        empToCheck.forEach(employee => {
          const joinDateStr = toLocalDateKey(
            employee?.joiningDate || employee?.dateOfJoining || employee?.createdAt
          );
          if (joinDateStr && dateKey < joinDateStr) return;
          const empId = getId(employee);
          if (!realKeys.has(`${empId}__${dateKey}`)) {
            result.push({
              _id: `synthetic-stat-${empId}-${dateKey}`,
              employee,
              date: dateKey,
              checkIn: null,
              checkOut: null,
              workingHours: 0,
              status: 'absent',
              autoMarked: true,
              _synthetic: true,
            });
          }
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  };

  const loadAttendance = async () => {
    try {
      const employeeParam = selectedEmployee !== 'all' ? selectedEmployee : undefined;
      const uniqueEntries = await fetchAttendanceEntries(employeeParam);
      let filtered = (uniqueEntries || []).map(normalizeEmployee);

      if (selectedEmployee !== 'all') {
        filtered = filtered.filter(r => getId(r.employee) === String(selectedEmployee));
      }
      filtered = filtered.filter(recordPassesDateFilter);

      setAttendance(filtered);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendance([]);
    }
  };

  const loadPermissions = async () => {
    try {
      const employeeParam = selectedEmployee !== 'all' ? selectedEmployee : undefined;
      const rangeBuckets = (activeDateRange?.start && activeDateRange?.end)
        ? getMonthYearBuckets(activeDateRange.start, activeDateRange.end)
        : [];
      const buckets = rangeBuckets.length > 0 ? rangeBuckets : [{ month: selectedMonth, year: selectedYear }];

      const responses = await Promise.all(
        buckets.map(async ({ month, year }) => {
          try {
            const res = await permissionService.getAllPermissions('approved', month, year, employeeParam);
            return Array.isArray(res) ? res : (res?.data || res?.docs || []);
          } catch (err) {
            return [];
          }
        })
      );

      let data = responses.flat();
      const seen = new Set();
      data = data.filter((p) => {
        if (!p) return false;
        const dateKey = toLocalDateKey(p.date || p.permissionDate || p.permission_date) || '';
        const key = p._id || `${getId(p.employee)}-${dateKey}-${p.permissionType || ''}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      data = data.filter((p) => {
        const pDate = toLocalDateKey(p.date || p.permissionDate || p.permission_date);
        if (!pDate) return false;
        if (activeDateFilter) return pDate === toLocalDateKey(activeDateFilter);
        if (activeDateRange?.start && activeDateRange?.end) {
          return pDate >= activeDateRange.start && pDate <= activeDateRange.end;
        }
        return true;
      });

      setPermissions(data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    }
  };

  // ─── Status badge ─────────────────────────────────────────────────────────
  const getStatusBadge = (record) => {
    const normalizedStatus = String(record?.status || '').toLowerCase();

    if (normalizedStatus === 'working') {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Working</span>
        </div>
      );
    }

    if (normalizedStatus === 'incomplete') {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Incomplete</span>
        </div>
      );
    }

    if (normalizedStatus === 'absent') {
      // Priority 1: Had a check-in but never checked out (24h auto-absent rule)
      const is24hAutoAbsent =
        record?.absentReason === 'not-checked-out-24h' ||
        record?.absentReason === 'not-checked-out' ||
        record?.autoCheckedOut === true;

      // Check sessions — if any session has checkIn but no checkOut and was auto-closed
      const hasSessionNotCheckedOut = Array.isArray(record?.sessions) &&
        record.sessions.some(s => s.checkIn && !s.checkOut && (s._rawRecord?.autoCheckedOut || s.autoCheckedOut));

      // Flat record: checkIn present, no checkOut, not synthetic
      const flatNotCheckedOut = record?.checkIn && !record?.checkOut && !record?._synthetic;

      if (is24hAutoAbsent || hasSessionNotCheckedOut || flatNotCheckedOut) {
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent (Not Checked Out)</span>
          </div>
        );
      }

      // Priority 2: Auto-generated synthetic absent (no check-in at all) — hidden from details but kept for stats
      const isAutoMarked = Boolean(record?.autoMarked || record?._synthetic);
      if (isAutoMarked) {
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent (Not Checked In)</span>
          </div>
        );
      }

      // Priority 3: Admin manually marked absent
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent (Admin)</span>
        </div>
      );
    }

    // Fallback checks for grouped records
    const sessions = record?.sessions;
    if (sessions && sessions.length > 0) {
      const hasOpen = sessions.some(s => {
  if (!s.checkIn || s.checkOut) return false;
  const elapsed = Date.now() - new Date(s.checkIn).getTime();
  return elapsed < 24 * 60 * 60 * 1000;
});
if (hasOpen) {
  return (
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Working</span>
    </div>
  );
}
    } else if (!record?.checkIn) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent</span>
        </div>
      );
    } else if (!record.checkOut && !sessions) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Working</span>
        </div>
      );
    }

    switch (normalizedStatus) {
      case 'present':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Full Day Present</span>
          </div>
        );
      case 'half-day':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">Half Day Present</span>
          </div>
        );
      case 'present-with-permission':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">With Permission</span>
          </div>
        );
      case 'on-permission':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">On Permission</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Unknown</span>
          </div>
        );
    }
  };

  const getPermissionsForRecord = (record) => {
    if (!record) return [];
    const recordDate = record.dateKey || getRecordDateKey(record);
    const empId = getId(record.employee);
    if (!recordDate || !empId) return [];
    return (permissions || []).filter(p => {
      const pEmpId = getId(p.employee);
      const pDate = toLocalDateKey(p.date || p.permissionDate || p.permission_date);
      return pEmpId === empId && pDate === recordDate;
    });
  };

  // ─── Format helpers ───────────────────────────────────────────────────────
  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    if (typeof dateString === 'object' && !dateString._isAMomentObject) {
      if (dateString.endTime && typeof dateString.endTime === 'string') return dateString.endTime;
      if (dateString.startTime && typeof dateString.startTime === 'string') return dateString.startTime;
      if (dateString.time && typeof dateString.time === 'string') return dateString.time;
    }
    const d = new Date(dateString);
    if (!d || Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // ─── Format checkout time — shows "Not checked out" for past open sessions ─
 const formatCheckOutTime = (session) => {
    if (session.checkOut) return formatTime(session.checkOut);
    if (!session.checkIn) return '--:--';
    const checkInTime = new Date(session.checkIn).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    // Only show "Not checked out" after 24 hours have passed since check-in
    if (now - checkInTime >= twentyFourHours) {
      return <span className="text-xs font-medium text-red-500 whitespace-nowrap">Not checked out</span>;
    }
    return '--:--'; // Still within 24 hours — treat as actively working
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    if (!d || Number.isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatExcelDate = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const toDateTimeLocalValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  };

  const buildEditForm = (record) => {
    const normalizedStatus = String(record.status || '').toLowerCase();
    return {
      checkIn: toDateTimeLocalValue(record.checkIn),
      checkOut: toDateTimeLocalValue(record.checkOut),
      status: normalizedStatus === 'absent' ? 'absent' : 'present',
      dayType: normalizedStatus === 'half-day' ? 'half-day' : 'full-day',
      shiftId: getId(record.shift) || '',
      locationId: getId(record.checkInLocation) || '',
      reason: '',
    };
  };

  const resetEditForm = { checkIn: '', checkOut: '', status: 'present', dayType: 'full-day', shiftId: '', locationId: '', reason: '' };

  const openEditModal = (record) => {
    setEditError('');
    setEditForm(buildEditForm(record));
    setEditModal({ isOpen: true, record, mode: 'edit', employee: null, dateKey: '' });
  };

  const openCreateAttendanceModal = (employee, dateKey) => {
    setEditError('');
    setEditForm({ checkIn: `${dateKey}T09:00`, checkOut: `${dateKey}T18:00`, status: 'present', dayType: 'full-day', shiftId: '', locationId: '', reason: '' });
    setEditModal({ isOpen: true, record: null, mode: 'create', employee, dateKey });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, record: null, mode: 'edit', employee: null, dateKey: '' });
    setEditError('');
    setEditForm(resetEditForm);
  };

  const openReportRowEdit = (record) => {
    setReportEditError('');
    setReportEditForm(buildEditForm(record));
    setReportEdit({ isEditing: true, record });
  };

  const closeReportRowEdit = () => {
    setReportEdit({ isEditing: false, record: null });
    setReportEditError('');
    setReportEditForm(resetEditForm);
  };

  const handleDeleteAttendance = async (record) => {
    if (!record?._id || !canEditAttendanceTime) return;
    if (!window.confirm('Delete this attendance record? This cannot be undone.')) return;
    setDeleteAttendanceError({ id: null, message: '' });
    setDeletingAttendanceId(record._id);
    try {
      await attendanceService.deleteAttendanceEntry(record._id);
      if (String(reportEdit.record?._id) === String(record._id)) closeReportRowEdit();
      await loadAttendance();
    } catch (error) {
      setDeleteAttendanceError({ id: record._id, message: error?.response?.data?.message || error.message || 'Failed to delete.' });
    } finally {
      setDeletingAttendanceId(null);
    }
  };

  const handleSaveAttendanceTime = async (event) => {
    event?.preventDefault?.();
    setEditError('');
    if (!editForm.checkIn) { setEditError('Check-in time is required.'); return; }
    const checkInDate = new Date(editForm.checkIn);
    const checkOutDate = editForm.checkOut ? new Date(editForm.checkOut) : null;
    if (Number.isNaN(checkInDate.getTime()) || (checkOutDate && Number.isNaN(checkOutDate.getTime()))) { setEditError('Enter valid date and time values.'); return; }
    if (checkOutDate && checkOutDate <= checkInDate) { setEditError('Checkout time must be after check-in time.'); return; }
    setSavingEdit(true);
    try {
      const payload = { checkIn: checkInDate.toISOString(), checkOut: checkOutDate ? checkOutDate.toISOString() : null, status: editForm.status, dayType: editForm.dayType, shiftId: editForm.shiftId || null, locationId: editForm.locationId || null, reason: editForm.reason };
      if (editModal.mode === 'create') {
        await attendanceService.createAdminAttendanceEntry({ ...payload, employeeId: getId(editModal.employee) });
      } else {
        await attendanceService.updateAttendanceTime(editModal.record._id, payload);
      }
      closeEditModal();
      await loadAttendance();
    } catch (error) {
      setEditError(error?.response?.data?.message || error.message || 'Failed to update attendance time.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveReportAttendanceTime = async () => {
    setReportEditError('');
    if (!reportEditForm.checkIn) { setReportEditError('Check-in time is required.'); return; }
    const checkInDate = new Date(reportEditForm.checkIn);
    const checkOutDate = reportEditForm.checkOut ? new Date(reportEditForm.checkOut) : null;
    if (Number.isNaN(checkInDate.getTime()) || (checkOutDate && Number.isNaN(checkOutDate.getTime()))) { setReportEditError('Enter valid date and time values.'); return; }
    if (checkOutDate && checkOutDate <= checkInDate) { setReportEditError('Checkout time must be after check-in time.'); return; }
    setSavingReportEdit(true);
    try {
      await attendanceService.updateAttendanceTime(reportEdit.record._id, { checkIn: checkInDate.toISOString(), checkOut: checkOutDate ? checkOutDate.toISOString() : null, status: reportEditForm.status, dayType: reportEditForm.dayType, shiftId: reportEditForm.shiftId || null, locationId: reportEditForm.locationId || null, reason: reportEditForm.reason });
      closeReportRowEdit();
      await loadAttendance();
    } catch (error) {
      setReportEditError(error?.response?.data?.message || error.message || 'Failed to update attendance time.');
    } finally {
      setSavingReportEdit(false);
    }
  };

  const buildDefaultCellDateTimes = (dateKey) => ({ checkIn: `${dateKey}T09:00`, checkOut: `${dateKey}T18:00` });
  const combineDateAndTimeLocal = (dateKey, timeValue) => (!dateKey || !timeValue) ? '' : `${dateKey}T${timeValue}`;

  const handleSetReportCellStatus = async (employee, dateKey, cell, status) => {
    if (!canEditAttendanceTime || !employee || !dateKey || !status) return;
    const record = cell?.records?.[0] || null;
    const normalizedStatus = status === 'absent' ? 'absent' : 'present';
    const dateTimes = buildDefaultCellDateTimes(dateKey);
    const checkInValue = record?.checkIn ? toDateTimeLocalValue(record.checkIn) : dateTimes.checkIn;
    const checkOutValue = record?.checkOut ? toDateTimeLocalValue(record.checkOut) : dateTimes.checkOut;
    const checkInDate = new Date(checkInValue);
    const checkOutDate = checkOutValue ? new Date(checkOutValue) : null;
    if (Number.isNaN(checkInDate.getTime())) { setReportEditError('Unable to update status because the date/time is invalid.'); return; }
    setSavingReportEdit(true);
    setReportEditError('');
    try {
      const payload = { checkIn: checkInDate.toISOString(), checkOut: checkOutDate ? checkOutDate.toISOString() : null, status: normalizedStatus, dayType: normalizedStatus === 'absent' ? 'full-day' : (record?.status === 'half-day' ? 'half-day' : 'full-day'), shiftId: getId(record?.shift) || null, locationId: getId(record?.checkInLocation) || null, reason: `Status set to ${normalizedStatus} from attendance report` };
      if (record?._id) {
        await attendanceService.updateAttendanceTime(record._id, payload);
      } else {
        await attendanceService.createAdminAttendanceEntry({ ...payload, employeeId: getId(employee) });
      }
      await loadAttendance();
    } catch (error) {
      setReportEditError(error?.response?.data?.message || error.message || 'Failed to update attendance status.');
    } finally {
      setSavingReportEdit(false);
    }
  };

  const openRowStatusModal = (row) => {
    setReportEditError('');
    setRowStatusForm({ status: 'present', checkInTime: '09:00', checkOutTime: '18:00', shiftId: '', locationId: '' });
    setRowStatusModal({ isOpen: true, row });
  };

  const closeRowStatusModal = () => {
    setRowStatusModal({ isOpen: false, row: null });
    setRowStatusForm({ status: 'present', checkInTime: '09:00', checkOutTime: '18:00', shiftId: '', locationId: '' });
  };

  const handleSetReportRowStatus = async () => {
    const row = rowStatusModal.row;
    if (!canEditAttendanceTime || !row?.employee || !rowStatusForm.status) return;
    const normalizedStatus = rowStatusForm.status === 'absent' ? 'absent' : 'present';
    if (!rowStatusForm.checkInTime) { setReportEditError('Check-in time is required.'); return; }
    setSavingReportEdit(true);
    setReportEditError('');
    try {
      await Promise.all(reportDateColumns.map(async (column) => {
        const cell = row.cells[column.key];
        const record = cell?.records?.[0] || null;
        const checkInValue = combineDateAndTimeLocal(column.key, rowStatusForm.checkInTime);
        const checkOutValue = rowStatusForm.checkOutTime ? combineDateAndTimeLocal(column.key, rowStatusForm.checkOutTime) : '';
        const checkInDate = new Date(checkInValue);
        const checkOutDate = checkOutValue ? new Date(checkOutValue) : null;
        if (Number.isNaN(checkInDate.getTime())) throw new Error(`Invalid date/time for ${formatExcelDate(column.key)}.`);
        const payload = { checkIn: checkInDate.toISOString(), checkOut: checkOutDate ? checkOutDate.toISOString() : null, status: normalizedStatus, dayType: normalizedStatus === 'absent' ? 'full-day' : (record?.status === 'half-day' ? 'half-day' : 'full-day'), shiftId: rowStatusForm.shiftId || null, locationId: rowStatusForm.locationId || null, reason: `Employee row status set to ${normalizedStatus} from attendance report` };
        if (record?._id) return attendanceService.updateAttendanceTime(record._id, payload);
        return attendanceService.createAdminAttendanceEntry({ ...payload, employeeId: getId(row.employee) });
      }));
      await loadAttendance();
      closeRowStatusModal();
    } catch (error) {
      setReportEditError(error?.response?.data?.message || error.message || 'Failed to update employee row status.');
    } finally {
      setSavingReportEdit(false);
    }
  };

  // ─── UI helpers ───────────────────────────────────────────────────────────
  const getDetailedHoursClassName = (hours) => {
    const num = Number(hours || 0);
    return num > 0 && num !== 8 ? 'text-red-600' : 'text-gray-900';
  };

  const getShiftIcon = (shiftName, isNightShift) => {
    if (isNightShift) return <NightsStayIcon className="w-3 h-3 text-indigo-500" />;
    if (shiftName?.toLowerCase().includes('morning')) return <WbSunnyIcon className="w-3 h-3 text-yellow-500" />;
    return <ScheduleIcon className="w-3 h-3 text-gray-500" />;
  };

  const formatShiftDisplay = (record) => {
    if (record.shiftName) return record.shiftName;
    if (record.shift?.displayName) return record.shift.displayName;
    if (record.shift?.name) return record.shift.name;
    const shiftId = getId(record.shift);
    if (shiftId) {
      const found = shifts.find((s) => String(s._id) === String(shiftId));
      if (found) return found.displayName || found.name;
    }
    const audit = Array.isArray(record.attendanceTimeEditAudit)
      ? [...record.attendanceTimeEditAudit].reverse().find(a => a?.newShiftName)
      : null;
    return audit?.newShiftName || null;
  };

  const getLatestEditAudit = (records = []) => getAllEditAudits(records)[0] || null;
  const getAllEditAudits = (records = []) => {
    const audits = records.flatMap(record =>
      Array.isArray(record?.attendanceTimeEditAudit)
        ? record.attendanceTimeEditAudit.map(audit => ({ ...audit, record }))
        : []
    );
    return audits.sort((a, b) => new Date(b.editedAt || 0).getTime() - new Date(a.editedAt || 0).getTime());
  };

  const formatAuditDateTime = (value) => value ? `${formatDate(value)} ${formatTime(value)}` : '--';

  const buildAuditChanges = (audit) => {
    if (!audit) return [];
    const pairs = [
      { label: 'Check In', oldValue: formatAuditDateTime(audit.oldCheckIn), newValue: formatAuditDateTime(audit.newCheckIn) },
      { label: 'Check Out', oldValue: formatAuditDateTime(audit.oldCheckOut), newValue: formatAuditDateTime(audit.newCheckOut) },
      { label: 'Status', oldValue: audit.oldStatus || '--', newValue: audit.newStatus || '--' },
      { label: 'Shift', oldValue: audit.oldShiftName || '--', newValue: audit.newShiftName || '--' },
      { label: 'Location', oldValue: audit.oldLocationName || '--', newValue: audit.newLocationName || '--' },
      { label: 'Working Hours', oldValue: formatWorkingHours(audit.oldWorkingHours), newValue: formatWorkingHours(audit.newWorkingHours) },
    ];
    return pairs.filter(c => String(c.oldValue) !== String(c.newValue));
  };

  const getShiftTiming = (record) => {
    const startTime = record?.shift?.startTime || record?.shiftStartTime || record?.startTime;
    const endTime = record?.shift?.endTime || record?.shiftEndTime || record?.endTime;
    if (!startTime || !endTime) return null;
    return { startTime, endTime };
  };

  const combineDateAndTime = (baseDate, timeString, addDay = false) => {
    if (!baseDate || !timeString) return null;
    const base = new Date(baseDate);
    if (Number.isNaN(base.getTime())) return null;
    const match = String(timeString).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const result = new Date(base);
    result.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (addDay) result.setDate(result.getDate() + 1);
    return result;
  };

  const isCheckInBeforeShiftStart = (record) => {
    const timing = getShiftTiming(record);
    if (!timing || !record?.checkIn) return false;
    const checkIn = new Date(record.checkIn);
    const shiftStart = combineDateAndTime(record.checkIn || record.date, timing.startTime);
    if (Number.isNaN(checkIn.getTime()) || !shiftStart) return false;
    const allowed = new Date(shiftStart);
    allowed.setMinutes(allowed.getMinutes() - 15);
    return checkIn < allowed;
  };

  const isCheckOutBeforeShiftEndGrace = (record) => {
    const timing = getShiftTiming(record);
    if (!timing || !record?.checkOut) return false;
    const checkOut = new Date(record.checkOut);
    const shiftStart = combineDateAndTime(record.checkIn || record.date, timing.startTime);
    const shiftEndSameDay = combineDateAndTime(record.checkIn || record.date || record.checkOut, timing.endTime);
    if (Number.isNaN(checkOut.getTime()) || !shiftEndSameDay) return false;
    const crossesMidnight = shiftStart && shiftEndSameDay <= shiftStart;
    const shiftEnd = combineDateAndTime(record.checkIn || record.date || record.checkOut, timing.endTime, crossesMidnight);
    if (!shiftEnd) return false;
    const allowed = new Date(shiftEnd);
    allowed.setMinutes(allowed.getMinutes() - 15);
    return checkOut < allowed;
  };

  const getTimeClassName = (highlight) => highlight ? 'font-semibold text-red-600' : 'text-gray-900';

  // ─── Location helpers ─────────────────────────────────────────────────────
  const getLocationName = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const found = locations.find(l => String(l._id) === String(value));
      return found?.name || found?.locationName || found?.address || '';
    }
    if (typeof value === 'object') {
      const found = locations.find(l => String(l._id) === String(value._id || value.id));
      return value.name || value.locationName || value.placeName || value.address || found?.name || found?.locationName || found?.address || '';
    }
    return '';
  };

  const getSelectedLocationName = (record, type = 'in') => {
    const selectedLocation = type === 'in' ? record?.checkInLocation : record?.checkOutLocation;
    const selectedName = getLocationName(selectedLocation);
    if (selectedName) return selectedName;
    const audit = Array.isArray(record?.attendanceTimeEditAudit)
      ? [...record.attendanceTimeEditAudit].reverse().find(a => type === 'in' ? a?.newLocationName : a?.newCheckOutLocationName)
      : null;
    return type === 'in' ? audit?.newLocationName || '' : audit?.newCheckOutLocationName || '';
  };

  const getLocationText = (record, type = 'in', options = {}) => {
    const { includeSelectedLocation = true } = options;
    if (!record) return 'Location unavailable';
    const selectedName = includeSelectedLocation ? getSelectedLocationName(record, type) : '';
    if (selectedName) return selectedName;
    const place = type === 'in'
      ? (record.checkInPlace || record.checkInAddress || record.checkIn_location || record.checkIn?.place || record.checkIn?.placeName || record.checkIn?.locationName)
      : (record.checkOutPlace || record.checkOutAddress || record.checkOut_location || record.checkOut?.place || record.checkOut?.placeName || record.checkOut?.locationName);
    return getLocationName(place) || (type === 'out' && !record.checkOut ? 'Awaiting check-out' : 'Location unavailable');
  };

  const renderSelectedLocation = (record) => {
    const locationName = getSelectedLocationName(record, 'in');
    if (!locationName) return <span className="text-xs text-gray-400">--</span>;
    return <span className="text-sm font-medium text-gray-700">{locationName}</span>;
  };

  const LocationText = ({ coords, coordsText, mapsUrl }) => {
    const hasCoords = Boolean(coords && coords.lat != null && coords.lng != null);
    const [place, setPlace] = useState(null);
    const [loadingPlace, setLoadingPlace] = useState(hasCoords);

    useEffect(() => {
      if (!coords || coords.lat == null || coords.lng == null) { setLoadingPlace(false); return; }
      const key = `loc:${Number(coords.lat).toFixed(5)},${Number(coords.lng).toFixed(5)}`;
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) { setPlace(cached); setLoadingPlace(false); return; }
      } catch (e) { /* ignore */ }
      let cancelled = false;
      const fetchPlace = async () => {
        setLoadingPlace(true);
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lng)}&accept-language=en`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('failed');
          const data = await res.json();
          let p = null;
          if (data?.address) {
            const a = data.address;
            const parts = [];
            const locality = a.city || a.town || a.village || a.hamlet || a.county;
            const state = a.state || a.region || a.state_district;
            if (locality) parts.push(locality);
            if (state) parts.push(state);
            if (a.country) parts.push(a.country);
            if (parts.length > 0) p = parts.join(', ');
          }
          if (!p && data?.display_name) p = data.display_name;
          if (!cancelled && p) { setPlace(p); try { sessionStorage.setItem(key, p); } catch (e) { /* ignore */ } }
        } catch { /* ignore */ } finally { if (!cancelled) setLoadingPlace(false); }
      };
      fetchPlace();
      return () => { cancelled = true; };
    }, [coords]);

    if (!hasCoords) return <span className="text-xs text-gray-400">Location unavailable</span>;
    const label = place || (loadingPlace ? 'Resolving location...' : 'Open map');
    return (
      <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
        <span>{label}</span>
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline" title={coordsText}>Open</a>}
      </span>
    );
  };

  const renderLocation = (record, type, options = {}) => {
    const { includeSelectedLocation = true } = options;
    if (!record) return <span className="text-xs text-gray-400">Location unavailable</span>;
    const selectedName = includeSelectedLocation ? getSelectedLocationName(record, type) : '';
    if (selectedName) return <span className="text-xs text-gray-500">{selectedName}</span>;
    const place = type === 'in'
      ? (record.checkInPlace || record.checkInAddress || record.checkIn_location || record.checkIn?.place || record.checkIn?.placeName || record.checkIn?.locationName)
      : (record.checkOutPlace || record.checkOutAddress || record.checkOut_location || record.checkOut?.place || record.checkOut?.placeName || record.checkOut?.locationName);
    if (place) return <span className="text-xs text-gray-500">{getLocationName(place) || place}</span>;
    if (type === 'out') {
      const hasOutData = Boolean((record.checkOut && Object.keys(record.checkOut || {}).length > 0) || record.checkOutLat != null || record.checkOutLng != null || record.checkOutLocation || record.checkOutPlace || record.checkOutAddress || record.checkOut_location);
      if (!hasOutData) return <span className="text-xs text-gray-400">Awaiting check-out</span>;
    }
    const extractCoords = (obj, pref) => {
      if (!obj) return null;
      if ((obj.lat || obj.latitude) && (obj.lng || obj.longitude || obj.lon)) {
        const lat = obj.lat ?? obj.latitude;
        const lng = obj.lng ?? obj.longitude ?? obj.lon;
        if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) };
      }
      const candidates = pref === 'out'
        ? [{ lat: obj.checkOutLat, lng: obj.checkOutLng }, { lat: obj.checkInLat, lng: obj.checkInLng }]
        : [{ lat: obj.checkInLat, lng: obj.checkInLng }, { lat: obj.checkOutLat, lng: obj.checkOutLng }];
      for (const c of candidates) { if (c && c.lat != null && c.lng != null) return { lat: Number(c.lat), lng: Number(c.lng) }; }
      if (obj.location) {
        const l = obj.location;
        if (typeof l === 'string') { const parts = l.split(',').map(p => p.trim()); if (parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) return { lat: Number(parts[0]), lng: Number(parts[1]) }; }
        if (Array.isArray(l.coordinates) && l.coordinates.length >= 2) return { lat: Number(l.coordinates[1]), lng: Number(l.coordinates[0]) };
        if (l.lat && l.lng) return { lat: Number(l.lat), lng: Number(l.lng) };
      }
      if (obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) return { lat: Number(obj.coordinates[1]), lng: Number(obj.coordinates[0]) };
      return null;
    };
    const sourceObj = type === 'in' ? (record.checkIn ?? record) : (record.checkOut ?? record);
    const coords = extractCoords(sourceObj, type) || extractCoords(record, type) || null;
    if (coords) {
      const q = `${coords.lat},${coords.lng}`;
      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
      const coordsText = `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}`;
      return <LocationText coords={coords} coordsText={coordsText} mapsUrl={mapsUrl} />;
    }
    return <span className="text-xs text-gray-400">Location unavailable</span>;
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const calculateOverallStats = (records) => {
    let presentCount = 0, halfDayCount = 0, permissionCount = 0, workingCount = 0, absentCount = 0;
    records.forEach(record => {
      const status = String(record.status || '').toLowerCase();
      if (status === 'working') {
        workingCount++;
      } else if (status === 'absent') {
        absentCount++;
      } else if (status === 'half-day') {
        halfDayCount++;
      } else if (status === 'present-with-permission' || status === 'with-permission') {
        permissionCount++;
        presentCount++;
      } else if (status === 'incomplete') {
        presentCount++;
      } else {
        presentCount++;
      }
    });
    const totalRecords = presentCount + halfDayCount + absentCount + workingCount;
    const totalWorkingHours = records
      .filter(r => r.sessions ? r.sessions.some(s => s.checkOut) : Boolean(r.checkOut))
      .reduce((sum, r) => sum + (Number(r.workingHours) || 0), 0);
    const completedCount = presentCount + halfDayCount;
    const averageHours = completedCount > 0 ? (totalWorkingHours / completedCount).toFixed(1) : 0;
    const attendanceRate = totalRecords > 0
      ? (((presentCount + (halfDayCount * 0.5) + (permissionCount * 0.75)) / totalRecords) * 100).toFixed(1)
      : 0;
    return { totalRecords, presentCount, halfDayCount, permissionCount, absentCount, workingCount, totalWorkingHours: totalWorkingHours.toFixed(1), averageHours, attendanceRate };
  };

  // ─── Build synthetic absents (shared by Stats, Details AND Summary) ───────
  const statsAndDetailsSyntheticAbsents = buildSyntheticAbsents(
    attendance,
    employees,
    activeDateRange?.start || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
    activeDateRange?.end || toLocalDateKey(new Date(selectedYear, selectedMonth, 0))
  );

  const attendanceWithSyntheticAbsents = [...attendance, ...statsAndDetailsSyntheticAbsents];

  // ─── Group for details table (date-wise, sessions in one row) ─────────────
  // Sort by first check-in time descending (latest login first, earliest at bottom)
  const groupedForDetails = groupAttendanceByEmployeeDate(attendanceWithSyntheticAbsents)
    .sort((a, b) => {
      const getFirstCheckIn = (record) => {
        if (record.sessions && record.sessions.length > 0) {
          const times = record.sessions
            .map(s => s.checkIn ? new Date(s.checkIn).getTime() : 0)
            .filter(t => t > 0);
          return times.length > 0 ? Math.min(...times) : 0;
        }
        return record.checkIn ? new Date(record.checkIn).getTime() : 0;
      };
      const tA = getFirstCheckIn(a);
      const tB = getFirstCheckIn(b);
      // Records with no check-in (absents) go to bottom
      if (tA === 0 && tB === 0) {
        const dA = a.dateKey || '';
        const dB = b.dateKey || '';
        return dB.localeCompare(dA);
      }
      if (tA === 0) return 1;
      if (tB === 0) return -1;
      return tB - tA; // Latest first
    });

  const filteredForStats = groupedForDetails;

  // ─── Helper: true ONLY for pure "never checked in" auto-absents ──────────
  const isNotCheckedInAbsent = (record) => {
    const s = String(record?.status || '').toLowerCase();
    if (s !== 'absent') return false;

    // Check if there is ANY real check-in across the record or its sessions
    const hasAnyCheckIn =
      Boolean(record?.checkIn) ||
      Boolean(record?._firstRecord?.checkIn) ||
      (Array.isArray(record?.sessions) && record.sessions.some(sess => Boolean(sess?.checkIn))) ||
      (Array.isArray(record?._rawRecords) && record._rawRecords.some(r => Boolean(r?.checkIn)));

    // If they checked in at some point, always keep the record
    if (hasAnyCheckIn) return false;

    // No check-in found — only hide if system-generated (not admin-manual)
    const isSystemGenerated = Boolean(record?._synthetic) || Boolean(record?.autoMarked);
    return isSystemGenerated;
  };

  // ─── filteredAttendance for DETAILS TABLE ─────────────────────────────────
  // Always exclude "not checked in" auto-absents; only show:
  // 1. Checked-in but not checked-out absents
  // 2. Admin manually marked absents
  // 3. All present / half-day / working / permission records
  const filteredAttendance = groupedForDetails
    .filter(record => !isNotCheckedInAbsent(record))
    .filter(record => {
      if (statusFilter === 'all') return true;
      const s = String(record?.status || '').toLowerCase();
      if (statusFilter === 'present') return s === 'present';
      if (statusFilter === 'half-day') return s === 'half-day';
      if (statusFilter === 'working') return s === 'working';
      if (statusFilter === 'permission') return s === 'present-with-permission' || s === 'with-permission';
      if (statusFilter === 'absent') return s === 'absent';
      return true;
    });

  // ─── Employee Summary ─────────────────────────────────────────────────────
  const summaryRows = employees
    .filter(emp => selectedEmployee === 'all' || String(emp._id) === String(selectedEmployee))
    .map(emp => {
      const empId = getId(emp);
      const empRecords = groupedForDetails.filter(r => getId(r.employee) === empId);
      let totalPresent = 0, totalHalfDay = 0, totalPermission = 0, totalAbsent = 0, totalWorkingHours = 0;
      empRecords.forEach(rec => {
        const status = String(rec.status || '').toLowerCase();
        if (status === 'absent') { totalAbsent += 1; return; }
        if (status === 'working') return;
        if (status === 'present') totalPresent += 1;
        else if (status === 'half-day') totalHalfDay += 1;
        else if (status === 'present-with-permission' || status === 'with-permission') {
          totalPermission += 1;
          totalPresent += 1;
        }
        totalWorkingHours += Number(rec.workingHours) || 0;
      });
      return { _id: empId, employee: emp, totalPresent, totalHalfDay, totalPermission, totalAbsent, totalWorkingHours };
    });

  // ─── Report helpers ───────────────────────────────────────────────────────
  const getReportStatusLabel = (cell) => {
    if (!cell || cell.records.length === 0) return isSunday(cell?.dateKey) ? 'Sunday' : '-';
    if (cell.status === 'working') return 'Working';
    if (cell.status === 'incomplete') return '-';
    if (cell.status === 'absent') return 'Absent';
    if (cell.dayType === 'half-day') return 'Half Day';
    return 'Present';
  };

  const getReportDayLabel = (cell) => {
    if (!cell || cell.records.length === 0) return '-';
    return cell.dayType === 'half-day' ? 'Half Day' : 'Full Day';
  };

  const getReportHoursLabel = (cell) => {
    if (!cell || cell.records.length === 0) return '-';
    return formatWorkingHours(cell.workingHours, { emptyValue: '0h 0m' });
  };

  const getReportStatusCode = (cell) => {
    if (!cell || cell.records.length === 0) return isSunday(cell?.dateKey) ? 'S' : '-';
    if (cell.status === 'working') return 'W';
    if (cell.status === 'incomplete') return '-';
    if (cell.status === 'absent') return 'A';
    if (cell.dayType === 'half-day') return 'HA';
    return 'P';
  };

  const getReportStatusCodeClassName = (cell) => {
    const code = getReportStatusCode(cell);
    if (code === 'P') return 'text-green-600 dark:text-green-300';
    if (code === 'W') return 'text-yellow-600 dark:text-yellow-300';
    if (code === 'HA') return 'text-orange-500 dark:text-orange-300';
    if (code === 'A') return 'text-red-600 dark:text-red-300';
    if (code === 'S') return 'text-indigo-500 dark:text-indigo-300';
    if (code === '-') return 'text-gray-400 dark:text-gray-500';
    return 'text-gray-300 dark:text-gray-600';
  };

  const getReportColumnTotals = (columnKey) =>
    reportRows.reduce((totals, row) => {
      const code = getReportStatusCode(row.cells[columnKey]);
      if (code === 'P') totals.present++;
      if (code === 'HA') totals.halfDay++;
      if (code === 'A') totals.absent++;
      totals.minutes += Math.round(Number(row.cells[columnKey]?.workingHours || 0) * 60);
      return totals;
    }, { present: 0, halfDay: 0, absent: 0, minutes: 0 });

  const getReportRowTotals = (row) =>
    reportDateColumns.reduce((totals, column) => {
      const cell = row.cells[column.key];
      const code = getReportStatusCode(cell);
      if (code === 'P') totals.present++;
      if (code === 'HA') totals.halfDay++;
      if (code === 'A') totals.absent++;
      totals.minutes += Math.round(Number(cell?.workingHours || 0) * 60);
      return totals;
    }, { present: 0, halfDay: 0, absent: 0, minutes: 0 });

  const getReportGrandTotals = () =>
    reportRows.reduce((totals, row) => {
      const rt = getReportRowTotals(row);
      totals.present += rt.present;
      totals.halfDay += rt.halfDay;
      totals.absent += rt.absent;
      totals.minutes += rt.minutes;
      return totals;
    }, { present: 0, halfDay: 0, absent: 0, minutes: 0 });

  const getMostCommonValue = (values = []) => {
    const counts = values.filter(Boolean).reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  };

  const getEmployeeShiftAllotment = (row) => {
    const shiftNames = reportDateColumns.flatMap(column => row.cells[column.key]?.shiftNames || []);
    return getMostCommonValue(shiftNames) || row.employee?.shiftName || row.employee?.shift?.displayName || row.employee?.shift?.name || 'No shift';
  };

  const getShiftAttendanceRows = () => {
    const fromDate = reportDateColumns[0]?.label || '-';
    const toDate = reportDateColumns[reportDateColumns.length - 1]?.label || '-';
    const workingDays = reportDateColumns.length;
    return reportRows.map((row, index) => {
      const totals = getReportRowTotals(row);
      return { serialNo: index + 1, vendorName: row.employee?.companyName || row.employee?.vendorName || row.employee?.department || 'N/A', name: row.employee?.name || 'Unknown', shiftAllotment: getEmployeeShiftAllotment(row), fromDate, toDate, workingDays, present: totals.present, halfDay: totals.halfDay, absent: totals.absent, hours: formatWorkingHours(totals.minutes / 60, { emptyValue: '0h 0m' }) };
    });
  };

  const getLocationDisplayName = (location) => location?.name || location?.locationName || location?.address || location?.label || '';
  const normalizeReportMatchText = (value) => String(value || '').trim().toLowerCase();
  const getRecordLocationName = (record) => getSelectedLocationName(record, 'in') || getLocationText(record, 'in', { includeSelectedLocation: false }) || record?.locationName || record?.checkInPlace || '';

  const getShiftMatrixLocations = () => {
    const configured = (locations || []).map(getLocationDisplayName).filter(Boolean);
    const fromRecords = filteredAttendance.map(getRecordLocationName).filter(n => n && n !== 'Location unavailable');
    return [...new Set([...configured, ...fromRecords])];
  };

  const getShiftMatrixShifts = () => {
    const configured = (shifts || []).map(s => s.displayName || s.name).filter(Boolean);
    const fromRecords = filteredAttendance.map(formatShiftDisplay).filter(Boolean);
    return [...new Set([...configured, ...fromRecords])];
  };

  const isCompletedShiftRecord = (record) => {
    const s = String(record?.status || '').toLowerCase();
    return Boolean(record?.checkIn) && s !== 'absent' && s !== 'cancelled' && s !== 'canceled' && s !== 'not-attended' && s !== 'not attended';
  };

  const hasWorkedLocationShift = (dateKey, locationName, shiftName) => {
    const targetLocation = normalizeReportMatchText(locationName);
    const targetShift = normalizeReportMatchText(shiftName);
    return filteredAttendance.some(record => {
      const recordDate = record.dateKey || getRecordDateKey(record);
      if (recordDate !== dateKey || !isCompletedShiftRecord(record)) return false;
      const recordLocation = normalizeReportMatchText(getRecordLocationName(record));
      const recordShift = normalizeReportMatchText(formatShiftDisplay(record));
      return recordLocation === targetLocation && recordShift === targetShift;
    });
  };

  const getShiftMatrixGroups = () => {
    const matrixShifts = getShiftMatrixShifts();
    return getShiftMatrixLocations().map(locationName => ({ locationName, shifts: matrixShifts })).filter(g => g.shifts.length > 0);
  };

  const formatReportDateLong = (isoDate) => {
    if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [y, m, d] = isoDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (Number.isNaN(date.getTime())) return isoDate || '-';
      return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const date = new Date(isoDate);
    return Number.isNaN(date.getTime()) ? (isoDate || '-') : date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const buildReportCell = (records = [], employee, dateKey) => {
    const cell = { key: `${getId(employee) || 'unknown'}-${dateKey}`, dateKey, employee, status: 'present', dayType: 'full-day', shiftNames: [], locationNames: [], workingHours: 0, records };
    if (records.length > 0) {
      const resolved = resolveDayAggregate(records);
      cell.status = resolved.status;
      cell.dayType = resolved.dayType;
      cell.workingHours = resolved.workingHours;
    }
    records.forEach(record => {
      const shiftName = formatShiftDisplay(record);
      if (shiftName && !cell.shiftNames.includes(shiftName)) cell.shiftNames.push(shiftName);
      const locationName = getSelectedLocationName(record, 'in') || getLocationText(record, 'in', { includeSelectedLocation: false });
      if (locationName && locationName !== 'Location unavailable' && !cell.locationNames.includes(locationName)) cell.locationNames.push(locationName);
    });
    return cell;
  };

  const getReportDateColumns = () => {
    const parseLocal = (isoStr) => {
      const [y, m, d] = isoStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const toISO = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const startISO = dateRange?.start || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endISO = dateRange?.end || toISO(new Date(selectedYear, selectedMonth, 0));
    const start = parseLocal(startISO);
    const end = parseLocal(endISO);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const columns = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const limit = new Date(end);
    limit.setHours(0, 0, 0, 0);
    while (cursor <= limit) {
      const iso = toISO(cursor);
      columns.push({ key: iso, day: cursor.toLocaleDateString('en-US', { weekday: 'long' }), label: formatExcelDate(iso), isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return columns;
  };

  const reportDateColumns = getReportDateColumns();

  const reportRecordsByEmployeeDate = attendance.reduce((acc, record) => {
    if (!record || !record.employee) return acc;
    const employeeId = getId(record.employee) || 'unknown';
    const dateKey = getRecordDateKey(record);
    if (!dateKey) return acc;
    if (!acc[employeeId]) acc[employeeId] = {};
    if (!acc[employeeId][dateKey]) acc[employeeId][dateKey] = [];
    acc[employeeId][dateKey].push(record);
    return acc;
  }, {});

  const reportRows = (employees || [])
    .filter(employee => selectedEmployee === 'all' || String(employee._id) === String(selectedEmployee))
    .map(employee => {
      const joinDateStr = toLocalDateKey(
        employee?.joiningDate || employee?.dateOfJoining || employee?.createdAt
      );
      const cells = reportDateColumns.reduce((acc, column) => {
        const records = reportRecordsByEmployeeDate[getId(employee)]?.[column.key] || [];
        const shouldSynthesizeAbsence = (
          records.length === 0
          && !column.isWeekend
          && column.key < todayStr
          && (!joinDateStr || column.key >= joinDateStr)
        );
        const cellRecords = shouldSynthesizeAbsence
          ? [{
            _id: `synthetic-${getId(employee) || 'unknown'}-${column.key}`,
            employee,
            date: column.key,
            checkIn: null,
            checkOut: null,
            workingHours: 0,
            status: 'absent',
            autoMarked: true,
            _synthetic: true
          }]
          : records;
        acc[column.key] = buildReportCell(cellRecords, employee, column.key);
        return acc;
      }, {});
      return { employee, cells };
    });

  // ─── Export helpers ───────────────────────────────────────────────────────
  const exportToCSV = async () => {
  // Helper: reverse geocode with cache (same logic as LocationText)
  const reverseGeocode = async (lat, lng) => {
    if (lat == null || lng == null) return '';
    const key = `loc:${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=en`
      );
      if (!res.ok) return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
      const data = await res.json();
      let label = '';
      if (data?.address) {
        const a = data.address;
        const parts = [];
        const locality = a.city || a.town || a.village || a.hamlet || a.county;
        const state = a.state || a.region || a.state_district;
        if (locality) parts.push(locality);
        if (state) parts.push(state);
        if (a.country) parts.push(a.country);
        if (parts.length > 0) label = parts.join(', ');
      }
      if (!label && data?.display_name) label = data.display_name;
      if (label) {
        try { sessionStorage.setItem(key, label); } catch (e) { /* ignore */ }
      }
      return label || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    } catch {
      return lat != null && lng != null ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : '';
    }
  };

  // Helper: get GPS location string for a session side
  const getGpsLabel = async (session, side) => {
    const lat = side === 'in' ? session.checkInLat : session.checkOutLat;
    const lng = side === 'in' ? session.checkInLng : session.checkOutLng;
    if (lat != null && lng != null) return await reverseGeocode(lat, lng);
    return '';
  };

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Employee',
    'Department',
    'Date',
    'Day',
    'Session #',
    'Check In Time',
    'Check In GPS Location',
    'Check Out Time',
    'Check Out GPS Location',
    'Session Hours',
    'Total Working Hours',
    'Office Location',
    'Shift',
    'Status',
    'Permissions',
  ];

  const rows = [];

  for (const record of filteredAttendance) {
    if (!record || !record.employee) continue;

    const employeeName = record.employee?.name || 'N/A';
    const department = record.employee?.department || 'N/A';
    const dateStr = record.date
      ? new Date(record.date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
      : '--';
    const dayStr = record.date
      ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })
      : '--';

    // Office location (named, same as table)
    const officeLocation = (() => {
      const locationName = getSelectedLocationName(record._firstRecord || record, 'in');
      return locationName || '--';
    })();

    // Shift display
    const shiftDisplay = record.shiftName || formatShiftDisplay(record._firstRecord || record) || '--';

    // Status label
    const statusLabel = (() => {
      const s = String(record.status || '').toLowerCase();
      if (s === 'present') return 'Full Day Present';
      if (s === 'half-day') return 'Half Day Present';
      if (s === 'working') return 'Working';
      if (s === 'absent') {
        if (record.absentReason === 'not-checked-out' || record.absentReason === 'not-checked-out-24h') return 'Absent (Not Checked Out)';
        if (record.autoMarked || record._synthetic) return 'Absent (Not Checked In)';
        return 'Absent (Admin)';
      }
      if (s === 'present-with-permission') return 'With Permission';
      if (s === 'on-permission') return 'On Permission';
      return record.status || 'Unknown';
    })();

    // Permissions
    const recordPermissions = getPermissionsForRecord(record);
    const permissionsStr = recordPermissions.length > 0
      ? recordPermissions.map((p) => p.permissionType || 'Permission').join('; ')
      : '--';

    // Total hours
    const totalHours = formatWorkingHours(record.workingHours) || '--';

    const isSynthetic = Boolean(record._synthetic);

    if (isSynthetic || !record.sessions || record.sessions.length === 0) {
      // Absent / no sessions row
      rows.push([
        employeeName,
        department,
        dateStr,
        dayStr,
        '--',       // Session #
        '--',       // Check In Time
        '--',       // Check In GPS
        '--',       // Check Out Time
        '--',       // Check Out GPS
        '--',       // Session Hours
        totalHours,
        officeLocation,
        shiftDisplay,
        statusLabel,
        permissionsStr,
      ]);
      continue;
    }

    // One row per session
    for (let idx = 0; idx < record.sessions.length; idx++) {
      const session = record.sessions[idx];
      const sessionNum = record.sessions.length > 1 ? String(idx + 1) : '--';

      const checkInTime = session.checkIn
        ? new Date(session.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '--';

      const checkOutTime = (() => {
        if (session.checkOut) {
          return new Date(session.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (session.checkIn) {
          const elapsed = Date.now() - new Date(session.checkIn).getTime();
          if (elapsed >= 24 * 60 * 60 * 1000) return 'Not checked out';
        }
        return '--';
      })();

      const sessionHours = session.autoCheckedOut
        ? '0h 0m'
        : formatWorkingHours(session.workingHours) || '--';

      // GPS — use cached values first, then fetch
      const checkInGps = await getGpsLabel(session, 'in');
      const checkOutGps = session.checkOut ? await getGpsLabel(session, 'out') : '';

      // Only put total hours and office/shift/status/permissions on the FIRST session row
      const isFirstSession = idx === 0;

      rows.push([
        employeeName,
        department,
        dateStr,
        dayStr,
        sessionNum,
        checkInTime,
        checkInGps || '--',
        checkOutTime,
        checkOutGps || '--',
        sessionHours,
        isFirstSession ? totalHours : '',          // total hours only on first row
        isFirstSession ? officeLocation : '',       // office loc only on first row
        isFirstSession ? shiftDisplay : '',         // shift only on first row
        isFirstSession ? statusLabel : '',          // status only on first row
        isFirstSession ? permissionsStr : '',       // permissions only on first row
      ]);
    }
  }

  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-report-${selectedMonth}-${selectedYear}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};
  const escapeExcelHtml = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cellHtml = (v, cls = '', attrs = '') => `<td class="${cls}" ${attrs}>${escapeExcelHtml(v)}</td>`;
  const headerHtml = (v, cls = '', attrs = '') => `<th class="${cls}" ${attrs}>${escapeExcelHtml(v)}</th>`;

  const buildReportTable1Html = () => {
    const rows = reportRows.map(row => `<tr>${cellHtml(row.employee?.name || 'Unknown', 'sticky-name')}${cellHtml(row.employee?.department || 'N/A', 'sticky-role')}${reportDateColumns.map(column => { const cell = row.cells[column.key]; const text = cell?.records?.length ? `${getReportStatusLabel(cell)} | ${getReportDayLabel(cell)} | ${cell.shiftNames.join(' / ') || 'No shift'} | ${cell.locationNames.join(' / ') || 'No location'} | ${getReportHoursLabel(cell)}` : getReportStatusLabel(cell); return cellHtml(text, column.isWeekend ? 'weekend text-left' : 'text-left'); }).join('')}</tr>`).join('');
    return `<h2>Table 1 - Attendance Calendar Detail</h2><table><thead><tr>${headerHtml('Employee', 'dark-header')}${headerHtml('Department', 'dark-header')}${reportDateColumns.map(c => headerHtml(`${c.day} ${c.label}`, c.isWeekend ? 'weekend-header' : 'dark-header')).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  };

  const buildReportTable2Html = () => {
    const bodyRows = reportRows.map(row => { const rt = getReportRowTotals(row); return `<tr>${cellHtml(row.employee?.name || 'Unknown', 'sticky-name')}${cellHtml(row.employee?.position || row.employee?.role || row.employee?.department || 'N/A', 'sticky-role')}${reportDateColumns.map(column => { const cell = row.cells[column.key]; const code = getReportStatusCode(cell); return cellHtml(code, code === 'P' ? 'present-code' : code === 'HA' ? 'halfday-code' : code === 'A' ? 'absent-code' : code === 'S' ? 'sunday-code' : 'empty-code'); }).join('')}${cellHtml(rt.present, 'present-total')}${cellHtml(rt.halfDay, 'halfday-total')}${cellHtml(rt.absent, 'absent-total')}${cellHtml(formatWorkingHours(rt.minutes / 60, { emptyValue: '0h 0m' }), 'hours-total')}</tr>`; }).join('');
    const gt = getReportGrandTotals();
    return `<h2>Table 2 - Attendance Matrix</h2><table><thead><tr>${headerHtml('Employee Name', 'dark-header', 'rowspan="2"')}${headerHtml('Role', 'dark-header', 'rowspan="2"')}${reportDateColumns.map(c => headerHtml(new Date(c.key).getDate(), c.isWeekend ? 'weekend-header' : 'matrix-header')).join('')}${headerHtml('P', 'present-header', 'rowspan="2"')}${headerHtml('HA', 'halfday-header', 'rowspan="2"')}${headerHtml('A', 'absent-header', 'rowspan="2"')}${headerHtml('Hours', 'matrix-header', 'rowspan="2"')}</tr><tr>${reportDateColumns.map(c => headerHtml(c.day, c.isWeekend ? 'weekend-header' : 'matrix-header')).join('')}</tr></thead><tbody>${bodyRows}<tr class="total-row">${cellHtml('TOTAL:', 'text-right', 'colspan="2"')}${reportDateColumns.map(c => { const t = getReportColumnTotals(c.key); return cellHtml(`${t.present}/${t.halfDay || 0}/${t.absent}`, 'hours-total'); }).join('')}${cellHtml(gt.present, 'present-total')}${cellHtml(gt.halfDay, 'halfday-total')}${cellHtml(gt.absent, 'absent-total')}${cellHtml(formatWorkingHours(gt.minutes / 60, { emptyValue: '0h 0m' }), 'hours-total')}</tr></tbody></table>`;
  };

  const buildReportTable3Html = () => {
    const rows = getShiftAttendanceRows().map(row => `<tr>${cellHtml(row.serialNo, 'text-center')}${cellHtml(row.vendorName)}${cellHtml(row.name, 'bold')}${cellHtml(row.shiftAllotment, 'shift-cell')}${cellHtml(row.fromDate, 'text-center')}${cellHtml(row.toDate, 'text-center')}${cellHtml(row.workingDays, 'text-center bold')}${cellHtml(row.present, 'present-total')}${cellHtml(row.halfDay, 'halfday-total')}${cellHtml(row.absent, 'absent-total')}${cellHtml(row.hours, 'hours-total')}</tr>`).join('');
    return `<h2>Table 3 - Shift Based Overall Attendance</h2><table><thead><tr>${['S.No', 'Vendor Name', 'Name', 'Shift Allotment', 'From', 'To', 'Actual Org Working Days'].map(h => headerHtml(h, 'yellow-header')).join('')}${headerHtml('Present', 'present-header')}${headerHtml('Half Day', 'halfday-header')}${headerHtml('Absent', 'absent-header')}${headerHtml('Hours', 'yellow-header')}</tr></thead><tbody>${rows}</tbody></table>`;
  };

  const buildReportTable4Html = () => {
    const groups = getShiftMatrixGroups();
    const headerOne = groups.map(g => headerHtml(g.locationName, 'orange-header', `colspan="${g.shifts.length}"`)).join('');
    const headerTwo = groups.flatMap(g => g.shifts.map(s => headerHtml(s, 'matrix-header'))).join('');
    const rows = reportDateColumns.map(column => `<tr>${cellHtml(formatReportDateLong(column.key), 'sticky-name')}${groups.flatMap(g => g.shifts.map(sn => { const worked = hasWorkedLocationShift(column.key, g.locationName, sn); return cellHtml(worked ? '✓' : '✕', worked ? 'tick-cell' : 'cross-cell'); })).join('')}</tr>`).join('');
    return `<h2>Table 4 - Location Shift Completion Check</h2><table><thead><tr>${headerHtml('Date', 'orange-header', 'rowspan="2"')}${headerOne}</tr><tr>${headerTwo}</tr></thead><tbody>${rows}</tbody></table>`;
  };

  const exportReportToExcel = () => {
    const tableExportMap = {
      table1: { title: 'Table 1 - Attendance Calendar Detail', fileName: `attendance-table-1-${selectedMonth}-${selectedYear}.xls`, content: buildReportTable1Html() },
      table2: { title: 'Table 2 - Attendance Matrix', fileName: `attendance-table-2-${selectedMonth}-${selectedYear}.xls`, content: buildReportTable2Html() },
      table3: { title: 'Table 3 - Shift Based Overall Attendance', fileName: `attendance-table-3-${selectedMonth}-${selectedYear}.xls`, content: buildReportTable3Html() },
      table4: { title: 'Table 4 - Location Shift Completion Check', fileName: `attendance-table-4-${selectedMonth}-${selectedYear}.xls`, content: buildReportTable4Html() },
    };
    const sel = tableExportMap[reportTableView] || tableExportMap.table1;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/><style>body{font-family:Calibri,Arial,sans-serif;color:#111827}h1{font-size:18px;margin:0 0 12px}h2{font-size:15px;margin:24px 0 8px}table{border-collapse:collapse;margin-bottom:24px}th,td{border:1px solid #9ca3af;padding:6px 8px;font-size:12px;vertical-align:middle;mso-number-format:"\\@"}th{font-weight:700}.dark-header{background:#0f172a;color:#bfdbfe}.matrix-header{background:#f3f4f6;color:#111827;text-align:center;font-weight:700}.weekend-header{background:#fee2e2;color:#b91c1c;text-align:center;font-weight:700}.yellow-header{background:#facc15;color:#111827;text-align:center;font-weight:700}.orange-header{background:#fed7aa;color:#111827;text-align:center;font-weight:700}.present-header{background:#bbf7d0;color:#14532d;text-align:center;font-weight:700}.halfday-header{background:#ffedd5;color:#9a3412;text-align:center;font-weight:700}.absent-header{background:#fecaca;color:#7f1d1d;text-align:center;font-weight:700}.sticky-name{background:#fff;color:#111827;font-weight:700}.sticky-role{background:#fff;color:#374151}.weekend{background:#fef2f2;color:#b91c1c}.present-code{color:#16a34a;text-align:center;font-weight:700}.halfday-code{color:#ea580c;text-align:center;font-weight:700}.absent-code{color:#dc2626;text-align:center;font-weight:700}.sunday-code{color:#6366f1;text-align:center;font-weight:700}.empty-code{color:#9ca3af;text-align:center;font-weight:700}.present-total{background:#dcfce7;color:#14532d;text-align:center;font-weight:700}.halfday-total{background:#ffedd5;color:#9a3412;text-align:center;font-weight:700}.absent-total{background:#fee2e2;color:#7f1d1d;text-align:center;font-weight:700}.hours-total{background:#f3f4f6;color:#111827;text-align:center;font-weight:700}.shift-cell{background:#e5e7eb;color:#111827}.tick-cell{color:#16a34a;text-align:center;font-size:16px;font-weight:700}.cross-cell{color:#dc2626;text-align:center;font-size:16px;font-weight:700}.total-row td{background:#f3f4f6;font-weight:700}.text-center{text-align:center}.text-right{text-align:right}.text-left{text-align:left}.bold{font-weight:700}</style></head><body><h1>${escapeExcelHtml(sel.title)} - ${escapeExcelHtml(reportDateColumns[0]?.label || '')} to ${escapeExcelHtml(reportDateColumns[reportDateColumns.length - 1]?.label || '')}</h1>${sel.content}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sel.fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const MobileNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
      {['stats', 'summary', 'details', 'report'].map(view => (
        <button key={view} onClick={() => setMobileView(view)} className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors capitalize ${mobileView === view ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          {view}
        </button>
      ))}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  const overallStats = calculateOverallStats(filteredForStats);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-gray-600">Comprehensive attendance overview for all employees</p>
        </div>
        {mobileView !== 'report' && (
          <Button onClick={exportToCSV} variant="outline" className="flex items-center space-x-2" size="sm">
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        )}
      </div>

      <MobileNavigation />

      {/* Filters */}
      <Card className="shadow-sm">
        <Card.Header>
          <Card.Title className="flex items-center">
            <FilterListIcon className="w-5 h-5 mr-2 text-gray-600" />
            Filters
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            <div className="sm:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                <option value="all">All Employees</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} - {emp.department}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                {Array.from({ length: 5 }, (_, i) => { const year = new Date().getFullYear() - 2 + i; return <option key={year} value={year}>{year}</option>; })}
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">From Date</label>
              <input type="date" value={dateRange.start || ''} onChange={e => { const v = e.target.value; setDatePreset('all'); setDateRange(prev => { const end = prev.end && v && new Date(prev.end) < new Date(v) ? v : prev.end; return { start: v, end }; }); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">To Date</label>
              <input type="date" value={dateRange.end || ''} min={dateRange.start || undefined} onChange={e => { const v = e.target.value; setDatePreset('all'); setDateRange(prev => ({ start: prev.start || v, end: v })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Summary Stats */}
      {(mobileView === 'stats' || !mobileView) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {[
            { value: overallStats.totalRecords, label: 'Total Records', color: 'primary', icon: EventIcon },
            { value: overallStats.presentCount, label: 'Full Day Present', color: 'green', icon: PersonIcon },
            { value: overallStats.halfDayCount, label: 'Half Day Present', color: 'orange', icon: AccessTimeIcon },
            { value: overallStats.permissionCount, label: 'With Permission', color: 'blue', icon: ScheduleIcon },
            { value: overallStats.absentCount, label: 'Absent', color: 'red', icon: PersonIcon },
            { value: overallStats.workingCount, label: 'Working Now', color: 'yellow', icon: AccessTimeIcon },
            { value: formatWorkingHours(overallStats.totalWorkingHours, { emptyValue: '0h 0m' }), label: 'Total Hours', color: 'purple', icon: ScheduleIcon },
            { value: `${overallStats.attendanceRate}%`, label: 'Attendance Rate', color: 'indigo', icon: TrendingUpIcon },
          ].map((stat, index) => (
            <Card key={index} className="p-3 sm:p-4 shadow-sm">
              <div className="text-center">
                <div className={`text-lg sm:text-xl font-bold text-${stat.color}-600 mb-1`}>{stat.value}</div>
                <p className="text-xs sm:text-sm text-gray-600 leading-tight">{stat.label}</p>
                <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 text-${stat.color}-600 mx-auto mt-1`} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Employee Summary */}
      {(mobileView === 'summary' || !mobileView) && (
        <Card className={`${mobileView ? 'block' : 'hidden lg:block'} shadow-sm`}>
          <Card.Header>
            <Card.Title className="flex items-center justify-between">
              <span>Employee Summary - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Dept</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Half Days</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Permissions</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryRows.map(item => {
                    if (!item || !item.employee) return null;
                    const presentDays = item.totalPresent;
                    const halfDays = item.totalHalfDay;
                    const permissionCount = item.totalPermission;
                    const absentDays = item.totalAbsent;
                    const purePresentDays = Math.max(0, presentDays - permissionCount);
                    const totalDays = purePresentDays + permissionCount + halfDays + absentDays;
                    const effectiveDays = purePresentDays + (permissionCount * 0.75) + (halfDays * 0.5);
                    const attendanceRate = totalDays > 0 ? ((effectiveDays / totalDays) * 100).toFixed(1) : 0;
                    const totalWorkingHours = Number(item.totalWorkingHours || 0);
                    const shouldHighlightTodayHours = datePreset === 'today' && totalWorkingHours < 8;
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center mr-2">
                              <span className="text-xs font-semibold text-primary-600">{item.employee?.name?.charAt(0) || 'E'}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{item.employee?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500 sm:hidden">{item.employee?.department || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center hidden sm:table-cell">{item.employee?.department || 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center"><span className="font-semibold text-green-600">{presentDays}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden md:table-cell"><span className="font-semibold text-orange-600">{halfDays}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden lg:table-cell"><span className="font-semibold text-blue-600">{permissionCount}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center"><span className="font-semibold text-red-600">{absentDays}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                          <span className={`inline-block rounded-md px-2 py-1 font-semibold ${shouldHighlightTodayHours ? 'border border-red-300 bg-red-100 text-red-700' : 'text-purple-600'}`}>{formatWorkingHours(totalWorkingHours)}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden xl:table-cell">
                          <span className={`font-semibold ${attendanceRate >= 90 ? 'text-green-600' : attendanceRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{attendanceRate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {summaryRows.length === 0 && (
              <div className="text-center py-8"><PersonIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">No employees found</p></div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ─── Detailed Report ─────────────────────────────────────────────────── */}
      {(mobileView === 'details' || !mobileView) && (
        <Card className={`${mobileView ? 'block' : 'hidden lg:block'} shadow-sm`}>
          <Card.Header>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Card.Title className="text-lg font-semibold text-gray-900">Detailed Report ({filteredAttendance.length} records)</Card.Title>
              <span className="text-sm font-normal text-gray-500">Sorted by check-in time — latest first</span>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              {/* Desktop table */}
              <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
                <thead className="bg-gray-50">
                  <tr>
                    {['Employee', 'Date', 'Sessions (Check In / Check Out)', 'Total Hours', 'Office Location', 'Shift', 'Status', 'Permissions', 'Actions'].map(h => (
  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map(record => {
                    if (!record || !record.employee) return null;
                    const recordPermissions = getPermissionsForRecord(record);
                    const isSynthetic = Boolean(record._synthetic);
                    const shiftDisplay = record.shiftName || formatShiftDisplay(record._firstRecord || record);
                    const isNightShift = record._firstRecord?.isNightShift || false;

                    return (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {/* Employee */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary-600">{record.employee?.name?.charAt(0) || 'E'}</span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{record.employee?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{record.employee?.department || 'N/A'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatDate(record.date)}</div>
                          <div className="text-xs text-gray-500">{record.dateKey}</div>
                        </td>

                        {/* Sessions */}
                        <td className="px-6 py-4">
                          {isSynthetic || !record.sessions || record.sessions.length === 0 ? (
                            <span className="text-gray-400 text-sm">--</span>
                          ) : record.sessions.length === 1 ? (
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 flex items-center gap-1">
                                {formatTime(record.sessions[0].checkIn)} → {formatCheckOutTime(record.sessions[0])}
                              </div>
                              <div className="text-xs text-gray-500">
  {renderLocation(record.sessions[0], 'in', { includeSelectedLocation: false })}
  {record.sessions[0].checkOut
    ? <> → {renderLocation(record.sessions[0], 'out')}</>
    : (() => {
        const elapsed = Date.now() - new Date(record.sessions[0].checkIn).getTime();
        return elapsed >= 24 * 60 * 60 * 1000
          ? <> → <span className="text-gray-400">No location</span></>
          : null;
      })()
  }
</div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {record.sessions.map((session, idx) => (
  <div key={idx} className="border-l-2 border-primary-200 pl-2 mb-1">
    <div className="flex items-start gap-1.5">
      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1 py-0.5 rounded shrink-0 mt-0.5">
        #{idx + 1}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-sm text-gray-900 whitespace-nowrap">
          {formatTime(session.checkIn)} → {formatCheckOutTime(session)}
        </div>
        <div className="text-xs text-gray-500">
          {renderLocation(session, 'in', { includeSelectedLocation: false })}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
  <span>→</span>
  {session.checkOut
    ? renderLocation(session, 'out')
    : (() => {
        const elapsed = Date.now() - new Date(session.checkIn).getTime();
        return elapsed >= 24 * 60 * 60 * 1000
          ? <span className="text-gray-400">No location</span>
          : null;
      })()
  }
</div>
      </div>
    </div>
  </div>
))}
                            </div>
                          )}
                        </td>

                        {/* Total Hours */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-semibold ${getDetailedHoursClassName(record.workingHours)}`}>
                            {formatWorkingHours(record.workingHours)}
                          </div>
                          {record.sessions && record.sessions.length > 1 && (
                            <div className="text-xs text-gray-400">{record.sessions.length} sessions</div>
                          )}
                        </td>
                               {/* Office Location */}
<td className="px-6 py-4 whitespace-nowrap">
  {isSynthetic ? (
    <span className="text-xs text-gray-400">--</span>
  ) : (() => {
    const locationName = getSelectedLocationName(record._firstRecord || record, 'in');
    return locationName
      ? <span className="inline-flex items-center px-2 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">{locationName}</span>
      : <span className="text-xs text-gray-400">--</span>;
  })()}
</td>

                        {/* Shift */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {shiftDisplay && !isSynthetic ? (
                            <div className="flex items-center space-x-1">
                              {getShiftIcon(shiftDisplay, isNightShift)}
                              <span className="text-sm text-gray-700 dark:text-gray-300">{shiftDisplay}</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">--</span>}
                        </td>
                 

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record)}</td>

                        {/* Permissions */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {recordPermissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {recordPermissions.slice(0, 2).map(p => <span key={p._id} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{p.permissionType?.split('-')[0] || 'Perm'}</span>)}
                            </div>
                          ) : <span className="text-xs text-gray-400">--</span>}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isSynthetic ? (
                            canEditAttendanceTime && (
                              <button onClick={() => openCreateAttendanceModal(record.employee, record.dateKey || getRecordDateKey(record))} className="text-blue-600 hover:text-blue-900 flex items-center space-x-1 text-xs">
                                <AddIcon className="w-4 h-4" /><span>Add Entry</span>
                              </button>
                            )
                          ) : (
                            <div className="flex items-center space-x-3">
                              {record._firstRecord && (
                                <button onClick={() => setDetailModal({ isOpen: true, record: record._firstRecord })} className="text-primary-600 hover:text-primary-900 flex items-center space-x-1">
                                  <VisibilityIcon className="w-4 h-4" /><span>View</span>
                                </button>
                              )}
                              {canEditAttendanceTime && record._firstRecord && (
                                <button onClick={() => openEditModal(record._firstRecord)} className="text-blue-600 hover:text-blue-900 flex items-center space-x-1">
                                  <EditIcon className="w-4 h-4" /><span>Edit</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="space-y-4 lg:hidden">
                {filteredAttendance.map(record => {
                  if (!record || !record.employee) return null;
                  const recordPermissions = getPermissionsForRecord(record);
                  const isSynthetic = Boolean(record._synthetic);
                  const shiftDisplay = record.shiftName || formatShiftDisplay(record._firstRecord || record);
                  const isNightShift = record._firstRecord?.isNightShift || false;

                  return (
                    <Card key={record._id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary-600">{record.employee?.name?.charAt(0) || 'E'}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{record.employee?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{record.employee?.department || 'N/A'}</div>
                            </div>
                          </div>
                          {!isSynthetic && record._firstRecord && (
                            <button onClick={() => setDetailModal({ isOpen: true, record: record._firstRecord })} className="text-gray-400 hover:text-gray-600">
                              <MoreVertIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-900">{formatDate(record.date)}</div>
                          {getStatusBadge(record)}
                        </div>

                        {shiftDisplay && !isSynthetic && (
                          <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              {getShiftIcon(shiftDisplay, isNightShift)}
                              <span className="text-sm font-medium text-purple-700">{shiftDisplay}</span>
                            </div>
                          </div>
                        )}

                        {/* Sessions */}
                        {!isSynthetic && record.sessions && record.sessions.length > 0 && (
                          <div className="space-y-2">
                            {record.sessions.length === 1 ? (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-500">Check In</div>
                                  <div className="font-medium">{formatTime(record.sessions[0].checkIn)}</div>
                                  <div className="mt-1">{renderLocation(record.sessions[0], 'in', { includeSelectedLocation: false })}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Check Out</div>
                                  <div className="font-medium">{formatCheckOutTime(record.sessions[0])}</div>
                                  <div className="mt-1">{renderLocation(record.sessions[0], 'out')}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-500 uppercase">Sessions ({record.sessions.length})</div>
                                {record.sessions.map((session, idx) => (
                                  <div key={idx} className="bg-gray-50 rounded p-2 text-sm">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">#{idx + 1}</span>
                                      <span className="flex items-center gap-1">{formatTime(session.checkIn)} → {formatCheckOutTime(session)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">{renderLocation(session, 'in', { includeSelectedLocation: false })}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <div>
                            <div className="text-gray-500 text-sm">Total Working Hours</div>
                            <div className={`font-semibold ${getDetailedHoursClassName(record.workingHours)}`}>{formatWorkingHours(record.workingHours)}</div>
                          </div>
                          {!isSynthetic && recordPermissions.length > 0 && (
                            <div className="text-right">
                              <div className="text-gray-500 text-sm">Permissions</div>
                              <div className="flex space-x-1">
                                {recordPermissions.slice(0, 1).map(p => <span key={p._id} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{p.permissionType?.split('-')[0] || 'Perm'}</span>)}
                                {recordPermissions.length > 1 && <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">+{recordPermissions.length - 1}</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        {canEditAttendanceTime && (
                          <div className="pt-2">
                            {isSynthetic ? (
                              <button type="button" onClick={() => openCreateAttendanceModal(record.employee, record.dateKey || getRecordDateKey(record))} className="inline-flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                                <AddIcon className="w-4 h-4" /><span>Add Attendance Entry</span>
                              </button>
                            ) : record._firstRecord && (
                              <button type="button" onClick={() => openEditModal(record._firstRecord)} className="inline-flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                                <EditIcon className="w-4 h-4" /><span>Edit Attendance Time</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            {filteredAttendance.length === 0 && (
              <div className="text-center py-12"><ScheduleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">No attendance records found</p><p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p></div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Report Calendar */}
      {(mobileView === 'report' || !mobileView) && (
        <Card className={`${mobileView ? 'block' : 'hidden lg:block'} shadow-sm`}>
          <Card.Header>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Card.Title className="text-lg font-semibold text-gray-900">
                Attendance Calendar — {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} ({reportRows.length} employees)
              </Card.Title>
              <Button onClick={exportReportToExcel} variant="outline" size="sm" className="flex items-center space-x-2"><DownloadIcon className="w-4 h-4" /><span>Export Excel</span></Button>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
              {[['table1', 'Table 1'], ['table2', 'Table 2'], ['table3', 'Table 3']].map(([view, label]) => (
                <button key={view} type="button" onClick={() => setReportTableView(view)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${reportTableView === view ? 'bg-white text-primary-600 shadow-sm dark:bg-gray-900 dark:text-blue-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'}`}>{label}</button>
              ))}
            </div>

            {/* ── Table 1 ── */}
            {reportTableView === 'table1' && (
              <div className="overflow-x-auto">
                <table className="min-w-max divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="sticky z-20 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-blue-200" style={{ left: 0, width: '14rem', minWidth: '14rem' }}>Employee</th>
                      <th className="sticky z-20 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-blue-200" style={{ left: '14rem', width: '10rem', minWidth: '10rem' }}>Department</th>
                      {reportDateColumns.map(column => (
                        <th key={column.key} className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${column.isWeekend ? 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-300' : 'text-gray-500 dark:text-blue-200'}`} style={{ width: '8.5rem', minWidth: '8.5rem' }}>
                          <div>{column.day}</div>
                          <div className="mt-1 font-semibold normal-case tracking-normal text-gray-900 dark:text-gray-100">{column.label}</div>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-green-900 dark:text-green-100 bg-green-100 dark:bg-green-900/40" style={{ width: '3.5rem', minWidth: '3.5rem' }}>P</th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-orange-900 dark:text-orange-100 bg-orange-100 dark:bg-orange-900/40" style={{ width: '3.5rem', minWidth: '3.5rem' }}>HA</th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/40" style={{ width: '3.5rem', minWidth: '3.5rem' }}>A</th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800" style={{ width: '5rem', minWidth: '5rem' }}>Hours</th>
                      {canEditAttendanceTime && <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900/30" style={{ width: '7rem', minWidth: '7rem' }}>Edit P/A</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {reportRows.map(row => {
                      const controlClassName = 'w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';
                      const rowTotals = getReportRowTotals(row);
                      return (
                        <tr key={row.employee?._id || row.employee?.name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="sticky z-10 bg-white px-4 py-3 align-top text-sm font-medium text-gray-900 dark:bg-gray-900 dark:text-gray-100" style={{ left: 0, width: '14rem', minWidth: '14rem' }}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{row.employee?.name?.charAt(0) || 'E'}</div>
                              <span className="whitespace-normal">{row.employee?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="sticky z-10 bg-white px-4 py-3 align-top text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-200" style={{ left: '14rem', width: '10rem', minWidth: '10rem' }}>{row.employee?.department || 'N/A'}</td>
                          {reportDateColumns.map(column => {
                            const cell = row.cells[column.key];
                            const editableRecord = cell?.records?.find(r => !r._synthetic);
                            const latestAudit = getLatestEditAudit(cell?.records || []);
                            const isEditingCell = Boolean(editableRecord && reportEdit.isEditing && String(reportEdit.record?._id) === String(editableRecord._id));
                            return (
                              <td key={`${row.employee?._id || row.employee?.name}-${column.key}`} className={`align-top ${isEditingCell ? 'bg-blue-50 dark:bg-blue-900/30' : column.isWeekend ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`} style={{ width: '8.5rem', minWidth: '8.5rem' }}>
                                {cell?.records?.length > 0 ? (
                                  <div className="relative min-h-28 space-y-1 px-2 py-2 text-xs text-gray-700 dark:text-gray-200">
                                    {canEditAttendanceTime && latestAudit && (
                                      <button type="button" onClick={() => setEditAuditModal({ isOpen: true, row: cell, audit: latestAudit })} className="absolute right-1.5 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-100">Edited</button>
                                    )}
                                    <div className="pr-12">
                                      {isEditingCell ? (
                                        <select value={reportEditForm.status} onChange={e => setReportEditForm(prev => ({ ...prev, status: e.target.value }))} className={controlClassName}>
                                          <option value="present">Present</option>
                                          <option value="absent">Absent</option>
                                        </select>
                                      ) : (
                                        <span className={`font-semibold ${cell.status === 'absent' ? 'text-red-600 dark:text-red-300' : cell.dayType === 'half-day' ? 'text-orange-600 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}>{getReportStatusLabel(cell)}</span>
                                      )}
                                    </div>
                                    <div>
                                      {isEditingCell ? (
                                        <select value={reportEditForm.dayType} onChange={e => setReportEditForm(prev => ({ ...prev, dayType: e.target.value }))} className={controlClassName}>
                                          <option value="full-day">Full Day</option>
                                          <option value="half-day">Half Day</option>
                                        </select>
                                      ) : getReportDayLabel(cell)}
                                    </div>
                                    {isEditingCell && (
                                      <>
                                        <div><input type="datetime-local" value={reportEditForm.checkIn} onChange={e => setReportEditForm(prev => ({ ...prev, checkIn: e.target.value }))} className={controlClassName} title="Check-in time" /></div>
                                        <div><input type="datetime-local" value={reportEditForm.checkOut} onChange={e => setReportEditForm(prev => ({ ...prev, checkOut: e.target.value }))} className={controlClassName} title="Checkout time" /></div>
                                      </>
                                    )}
                                    <div>
                                      {isEditingCell ? (
                                        <select value={reportEditForm.shiftId} onChange={e => setReportEditForm(prev => ({ ...prev, shiftId: e.target.value }))} className={controlClassName}>
                                          <option value="">No shift</option>
                                          {shifts.map(s => <option key={s._id} value={s._id}>{s.displayName || s.name}</option>)}
                                        </select>
                                      ) : cell.shiftNames.join(', ') || '--'}
                                    </div>
                                    <div>
                                      {isEditingCell ? (
                                        <select value={reportEditForm.locationId} onChange={e => setReportEditForm(prev => ({ ...prev, locationId: e.target.value }))} className={controlClassName}>
                                          <option value="">No location</option>
                                          {locations.map(l => <option key={l._id} value={l._id}>{l.name || l.locationName || l.address || 'Location'}</option>)}
                                        </select>
                                      ) : cell.locationNames.join(', ') || '--'}
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{getReportHoursLabel(cell)}</div>
                                    {canEditAttendanceTime && (
                                      <div className="border-t border-gray-100 pt-1 dark:border-gray-700">
                                        {editableRecord ? (
                                          isEditingCell ? (
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-3">
                                                <button type="button" onClick={handleSaveReportAttendanceTime} disabled={savingReportEdit} className="font-medium text-green-700 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-green-300">{savingReportEdit ? 'Saving...' : 'Save'}</button>
                                                <button type="button" onClick={closeReportRowEdit} disabled={savingReportEdit} className="font-medium text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-300">Cancel</button>
                                              </div>
                                              {reportEditError && <div className="whitespace-normal text-xs text-red-600 dark:text-red-300">{reportEditError}</div>}
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <button type="button" onClick={() => openReportRowEdit(editableRecord)} disabled={deletingAttendanceId === editableRecord._id} className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-300"><EditIcon className="w-4 h-4" /><span>Edit</span></button>
                                              <button type="button" onClick={() => handleDeleteAttendance(editableRecord)} disabled={deletingAttendanceId === editableRecord._id} className="flex items-center gap-1 font-medium text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"><DeleteIcon className="w-4 h-4" /><span>{deletingAttendanceId === editableRecord._id ? 'Deleting...' : 'Delete'}</span></button>
                                              {String(deleteAttendanceError.id) === String(editableRecord._id) && <div className="whitespace-normal text-xs text-red-600 dark:text-red-300">{deleteAttendanceError.message}</div>}
                                            </div>
                                          )
                                        ) : (
                                          <button type="button" onClick={() => openCreateAttendanceModal(row.employee, column.key)} className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-900 dark:text-blue-300"><AddIcon className="w-4 h-4" /><span>Add</span></button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex min-h-28 flex-col items-center justify-center gap-2 px-2 py-2 text-sm text-gray-300 dark:text-gray-600">
                                    <span className={isSunday(column.key) ? 'font-medium text-indigo-400 dark:text-indigo-300' : ''}>{isSunday(column.key) ? 'Sunday' : '-'}</span>
                                    {canEditAttendanceTime && (
                                      <button type="button" onClick={() => openCreateAttendanceModal(row.employee, column.key)} className="inline-flex h-2 w-2 items-center justify-center rounded text-blue-600 hover:bg-blue-500/10 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-blue-300/10">
                                        <AddIcon className="w-1 h-1" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="align-top bg-green-50 px-3 py-3 text-center text-sm font-bold text-green-900 dark:bg-green-900/20 dark:text-green-100" style={{ width: '3.5rem', minWidth: '3.5rem' }}>{rowTotals.present}</td>
                          <td className="align-top bg-orange-50 px-3 py-3 text-center text-sm font-bold text-orange-900 dark:bg-orange-900/20 dark:text-orange-100" style={{ width: '3.5rem', minWidth: '3.5rem' }}>{rowTotals.halfDay}</td>
                          <td className="align-top bg-red-50 px-3 py-3 text-center text-sm font-bold text-red-900 dark:bg-red-900/20 dark:text-red-100" style={{ width: '3.5rem', minWidth: '3.5rem' }}>{rowTotals.absent}</td>
                          <td className="align-top bg-gray-50 px-3 py-3 text-center text-xs font-bold text-gray-900 dark:bg-gray-800 dark:text-gray-100" style={{ width: '5rem', minWidth: '5rem' }}>{formatWorkingHours(rowTotals.minutes / 60, { emptyValue: '0h 0m' })}</td>
                          {canEditAttendanceTime && (
                            <td className="align-top bg-blue-50 px-3 py-3 text-center dark:bg-blue-900/20" style={{ width: '7rem', minWidth: '7rem' }}>
                              <button type="button" onClick={() => openRowStatusModal(row)} disabled={savingReportEdit} className="w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-950/30">Edit P/A</button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold dark:bg-gray-800">
                      <td className="sticky z-10 bg-gray-50 px-4 py-3 text-right text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100" style={{ left: 0, width: '14rem', minWidth: '14rem' }}>TOTAL:</td>
                      <td className="sticky z-10 bg-gray-50 px-4 py-3 dark:bg-gray-800" style={{ left: '14rem', width: '10rem', minWidth: '10rem' }} />
                      {reportDateColumns.map(column => {
                        const totals = getReportColumnTotals(column.key);
                        return (
                          <td key={`t1-total-${column.key}`} className="px-3 py-3 text-center text-xs text-gray-900 dark:text-gray-100" style={{ width: '8.5rem', minWidth: '8.5rem' }}>
                            <span className="font-bold text-green-700 dark:text-green-300">{totals.present}</span>
                            <span className="mx-0.5 text-gray-400">/</span>
                            <span className="font-bold text-orange-600 dark:text-orange-300">{totals.halfDay}</span>
                            <span className="mx-0.5 text-gray-400">/</span>
                            <span className="font-bold text-red-700 dark:text-red-300">{totals.absent}</span>
                          </td>
                        );
                      })}
                      {(() => { const gt = getReportGrandTotals(); return (<>
                        <td className="bg-green-100 px-3 py-3 text-center text-sm font-bold text-green-900 dark:bg-green-900/40 dark:text-green-100" style={{ width: '3.5rem', minWidth: '3.5rem' }}>{gt.present}</td>
                        <td className="bg-orange-100 px-3 py-3 text-center text-sm font-bold text-orange-900 dark:bg-orange-900/40 dark:text-orange-100" style={{ width: '3.5rem', minWidth: '3.5rem' }}>{gt.halfDay}</td>
                        <td className="bg-red-100 px-3 py-3 text-center text-sm font-bold text-red-900 dark:bg-red-900/40 dark:text-red-100" style={{ width: '3.5rem', minWidth: '3.5rem' }}>{gt.absent}</td>
                        <td className="bg-gray-100 px-3 py-3 text-center text-xs font-bold text-gray-900 dark:bg-gray-800 dark:text-gray-100" style={{ width: '5rem', minWidth: '5rem' }}>{formatWorkingHours(gt.minutes / 60, { emptyValue: '0h 0m' })}</td>
                        {canEditAttendanceTime && <td className="bg-blue-50 px-3 py-3 dark:bg-blue-900/20" style={{ width: '7rem', minWidth: '7rem' }} />}
                      </>); })()}
                    </tr>
                  </tbody>
                </table>
                {reportEditError && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">{reportEditError}</div>}
              </div>
            )}

            {/* ── Table 2 ── */}
            {reportTableView === 'table2' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-max border-separate border-spacing-0 border border-gray-200 text-xs dark:border-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th rowSpan={2} className="sticky left-0 z-20 border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" style={{ width: '10.5rem', minWidth: '10.5rem' }}>Employee Name</th>
                        <th rowSpan={2} className="sticky z-20 border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" style={{ left: '10.5rem', width: '8rem', minWidth: '8rem' }}>Role</th>
                        {reportDateColumns.map(column => {
                          const date = new Date(column.key);
                          return <th key={column.key} className={`border border-gray-200 px-3 py-1 text-center font-semibold dark:border-gray-700 ${column.isWeekend ? 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`} style={{ width: '3.25rem', minWidth: '3.25rem' }}>{Number.isNaN(date.getTime()) ? '' : date.getDate()}</th>;
                        })}
                        <th rowSpan={2} className="border border-gray-200 bg-green-100 px-3 py-2 text-center font-semibold text-green-900 dark:border-gray-700 dark:bg-green-900/40 dark:text-green-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>P</th>
                        <th rowSpan={2} className="border border-gray-200 bg-orange-100 px-3 py-2 text-center font-semibold text-orange-900 dark:border-gray-700 dark:bg-orange-900/40 dark:text-orange-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>HA</th>
                        <th rowSpan={2} className="border border-gray-200 bg-red-100 px-3 py-2 text-center font-semibold text-red-900 dark:border-gray-700 dark:bg-red-900/40 dark:text-red-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>A</th>
                        <th rowSpan={2} className="border border-gray-200 bg-gray-100 px-3 py-2 text-center font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" style={{ width: '4.5rem', minWidth: '4.5rem' }}>Hours</th>
                      </tr>
                      <tr>{reportDateColumns.map(column => <th key={`${column.key}-day`} className={`border border-gray-200 px-3 py-1 text-center font-medium dark:border-gray-700 ${column.isWeekend ? 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`} style={{ width: '3.25rem', minWidth: '3.25rem' }}>{column.day}</th>)}</tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                      {reportRows.map(row => {
                        const rt = getReportRowTotals(row);
                        return (
                          <tr key={`m-${row.employee?._id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="sticky left-0 z-10 border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" style={{ width: '10.5rem', minWidth: '10.5rem' }}>{row.employee?.name || 'Unknown'}</td>
                            <td className="sticky z-10 border border-gray-200 bg-white px-3 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" style={{ left: '10.5rem', width: '8rem', minWidth: '8rem' }}>{row.employee?.position || row.employee?.role || row.employee?.department || 'N/A'}</td>
                            {reportDateColumns.map(column => {
                              const cell = row.cells[column.key];
                              return <td key={`m-${row.employee?._id}-${column.key}`} className={`border border-gray-200 px-3 py-2 text-center font-bold dark:border-gray-700 ${getReportStatusCodeClassName(cell)}`} style={{ width: '3.25rem', minWidth: '3.25rem' }} title={cell?.records?.length ? `${getReportStatusLabel(cell)} - ${getReportHoursLabel(cell)}` : getReportStatusLabel(cell)}>{getReportStatusCode(cell)}</td>;
                            })}
                            <td className="border border-gray-200 bg-green-50 px-3 py-2 text-center font-bold text-green-900 dark:border-gray-700 dark:bg-green-900/20 dark:text-green-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{rt.present}</td>
                            <td className="border border-gray-200 bg-orange-50 px-3 py-2 text-center font-bold text-orange-900 dark:border-gray-700 dark:bg-orange-900/20 dark:text-orange-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{rt.halfDay}</td>
                            <td className="border border-gray-200 bg-red-50 px-3 py-2 text-center font-bold text-red-900 dark:border-gray-700 dark:bg-red-900/20 dark:text-red-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{rt.absent}</td>
                            <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-center font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" style={{ width: '4.5rem', minWidth: '4.5rem' }}>{formatWorkingHours(rt.minutes / 60, { emptyValue: '0h 0m' })}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 font-semibold dark:bg-gray-800">
                        <td className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-3 py-2 text-right text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" style={{ width: '10.5rem', minWidth: '10.5rem' }}>TOTAL:</td>
                        <td className="sticky z-10 border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" style={{ left: '10.5rem', width: '8rem', minWidth: '8rem' }} />
                        {reportDateColumns.map(column => { const totals = getReportColumnTotals(column.key); return <td key={`t2-total-${column.key}`} className="border border-gray-200 px-2 py-2 text-center text-gray-900 dark:border-gray-700 dark:text-gray-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{totals.present}</td>; })}
                        {(() => { const gt = getReportGrandTotals(); return (<>
                          <td className="border border-gray-200 bg-green-100 px-2 py-2 text-center text-green-900 dark:border-gray-700 dark:bg-green-900/40 dark:text-green-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{gt.present}</td>
                          <td className="border border-gray-200 bg-orange-100 px-2 py-2 text-center text-orange-900 dark:border-gray-700 dark:bg-orange-900/40 dark:text-orange-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{gt.halfDay}</td>
                          <td className="border border-gray-200 bg-red-100 px-2 py-2 text-center text-red-900 dark:border-gray-700 dark:bg-red-900/40 dark:text-red-100" style={{ width: '3.25rem', minWidth: '3.25rem' }}>{gt.absent}</td>
                          <td className="border border-gray-200 bg-gray-100 px-2 py-2 text-center text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" style={{ width: '4.5rem', minWidth: '4.5rem' }}>{formatWorkingHours(gt.minutes / 60, { emptyValue: '0h 0m' })}</td>
                        </>); })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <div><span className="font-bold text-green-600 dark:text-green-300">P</span> = Present (full day)</div>
                  <div><span className="font-bold text-orange-500 dark:text-orange-300">HA</span> = Half Day</div>
                  <div><span className="font-bold text-red-600 dark:text-red-300">A</span> = Absent</div>
                  <div><span className="font-bold text-yellow-600 dark:text-yellow-300">W</span> = Working (Checked in, not Checked out - Today only)</div>
                  <div><span className="font-bold text-indigo-500 dark:text-indigo-300">S</span> = Sunday (no entry expected)</div>
                  <div><span className="font-bold text-gray-400">-</span> = Incomplete / Future Date / No Data</div>
                </div>
              </div>
            )}

            {/* ── Table 3 ── */}
            {reportTableView === 'table3' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-max border-separate border-spacing-0 border border-gray-200 text-xs dark:border-gray-700">
                    <thead>
                      <tr className="bg-yellow-300 text-gray-950 dark:bg-yellow-500">
                        {['S.No', 'Vendor Name', 'Name', 'Shift Allotment', 'From', 'To', 'Actual Org Working Days'].map(h => <th key={h} className="border border-gray-300 px-3 py-2 text-center font-bold dark:border-gray-700">{h}</th>)}
                        <th className="border border-gray-300 bg-green-200 px-3 py-2 text-center font-bold text-green-950 dark:border-gray-700 dark:bg-green-700 dark:text-green-50">Present</th>
                        <th className="border border-gray-300 bg-orange-200 px-3 py-2 text-center font-bold text-orange-950 dark:border-gray-700 dark:bg-orange-700 dark:text-orange-50">Half Day</th>
                        <th className="border border-gray-300 bg-red-200 px-3 py-2 text-center font-bold text-red-950 dark:border-gray-700 dark:bg-red-700 dark:text-red-50">Absent</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-bold dark:border-gray-700">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                      {getShiftAttendanceRows().map(row => (
                        <tr key={`s-${row.serialNo}-${row.name}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="border border-gray-200 px-3 py-2 text-center text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.serialNo}</td>
                          <td className="border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.vendorName}</td>
                          <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.name}</td>
                          <td className="border border-gray-200 bg-gray-100 px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">{row.shiftAllotment}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.fromDate}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.toDate}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.workingDays}</td>
                          <td className="border border-gray-200 bg-green-50 px-3 py-2 text-center font-bold text-green-800 dark:border-gray-700 dark:bg-green-900/20 dark:text-green-100">{row.present}</td>
                          <td className="border border-gray-200 bg-orange-50 px-3 py-2 text-center font-bold text-orange-800 dark:border-gray-700 dark:bg-orange-900/20 dark:text-orange-100">{row.halfDay}</td>
                          <td className="border border-gray-200 bg-red-50 px-3 py-2 text-center font-bold text-red-800 dark:border-gray-700 dark:bg-red-900/20 dark:text-red-100">{row.absent}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center font-bold text-gray-900 dark:border-gray-700 dark:text-gray-100">{row.hours}</td>
                        </tr>
                      ))}
                      {(() => {
                        const rows = getShiftAttendanceRows();
                        const present = rows.reduce((s, r) => s + r.present, 0);
                        const halfDay = rows.reduce((s, r) => s + r.halfDay, 0);
                        const absent = rows.reduce((s, r) => s + r.absent, 0);
                        const gt = getReportGrandTotals();
                        return (
                          <tr className="bg-gray-100 font-bold text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                            <td className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700" colSpan={7}>TOTAL:</td>
                            <td className="border border-gray-200 bg-green-100 px-3 py-2 text-center text-green-900 dark:border-gray-700 dark:bg-green-900/40 dark:text-green-100">{present}</td>
                            <td className="border border-gray-200 bg-orange-100 px-3 py-2 text-center text-orange-900 dark:border-gray-700 dark:bg-orange-900/40 dark:text-orange-100">{halfDay}</td>
                            <td className="border border-gray-200 bg-red-100 px-3 py-2 text-center text-red-900 dark:border-gray-700 dark:bg-red-900/40 dark:text-red-100">{absent}</td>
                            <td className="border border-gray-200 px-3 py-2 text-center dark:border-gray-700">{formatWorkingHours(gt.minutes / 60, { emptyValue: '0h 0m' })}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-gray-600 dark:text-gray-300">Shift allotment uses the most frequent shift recorded for the employee in the selected report date range.</div>
              </div>
            )}

            {(reportRows.length === 0 || reportDateColumns.length === 0) && (
              <div className="text-center py-12"><ScheduleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500">No report data found</p><p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p></div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Row Status Modal */}
      <Modal isOpen={rowStatusModal.isOpen} onClose={closeRowStatusModal} title="Edit Employee Row Attendance" size="md">
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            Applying to {rowStatusModal.row?.employee?.name || 'employee'} for {reportDateColumns.length} visible report date(s).
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status</label>
              <select value={rowStatusForm.status} onChange={e => setRowStatusForm(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Shift</label>
              <select value={rowStatusForm.shiftId} onChange={e => setRowStatusForm(prev => ({ ...prev, shiftId: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">No shift</option>
                {shifts.map(s => <option key={s._id} value={s._id}>{s.displayName || s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Check-in time</label>
              <input type="time" value={rowStatusForm.checkInTime} onChange={e => setRowStatusForm(prev => ({ ...prev, checkInTime: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Checkout time</label>
              <input type="time" value={rowStatusForm.checkOutTime} onChange={e => setRowStatusForm(prev => ({ ...prev, checkOutTime: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Location</label>
            <select value={rowStatusForm.locationId} onChange={e => setRowStatusForm(prev => ({ ...prev, locationId: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No location</option>
              {locations.map(l => <option key={l._id} value={l._id}>{l.name || l.locationName || l.address || 'Location'}</option>)}
            </select>
          </div>
          {reportEditError && <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/25 px-3 py-2 text-sm text-red-700 dark:text-red-200">{reportEditError}</div>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeRowStatusModal} disabled={savingReportEdit}>Cancel</Button>
            <Button type="button" onClick={handleSetReportRowStatus} loading={savingReportEdit}>Apply</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Audit Modal */}
      <Modal isOpen={editAuditModal.isOpen} onClose={() => setEditAuditModal({ isOpen: false, row: null, audit: null })} title="Edit Details" size="lg">
        {editAuditModal.audit && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Edited By</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{editAuditModal.audit.editedByName || editAuditModal.audit.editedByEmail || 'Admin'}</div>
                  {editAuditModal.audit.editedByEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{editAuditModal.audit.editedByEmail}</div>}
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Edited At</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatAuditDateTime(editAuditModal.audit.editedAt)}</div>
                </div>
              </div>
              {editAuditModal.audit.reason && <div className="mt-3"><div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reason</div><div className="mt-1 text-sm text-gray-800 dark:text-gray-100">{editAuditModal.audit.reason}</div></div>}
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-blue-200">Field</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-blue-200">Before</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-blue-200">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {buildAuditChanges(editAuditModal.audit).map(change => (
                    <tr key={change.label}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{change.label}</td>
                      <td className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{change.oldValue}</td>
                      <td className="px-4 py-3 text-sm text-green-700 dark:text-green-300">{change.newValue}</td>
                    </tr>
                  ))}
                  {buildAuditChanges(editAuditModal.audit).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No field-level differences were recorded for this edit.</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Edit History</h4>
              <div className="space-y-3">
                {getAllEditAudits(editAuditModal.row?.records || []).map((audit, index) => {
                  const isSelected = String(audit.editedAt || '') === String(editAuditModal.audit?.editedAt || '') && String(audit.record?._id || '') === String(editAuditModal.audit?.record?._id || '');
                  return (
                    <button key={`${audit.editedAt || index}-${audit.record?._id || index}`} type="button" onClick={() => setEditAuditModal(prev => ({ ...prev, audit }))} className={`w-full rounded-lg border p-3 text-left transition-colors ${isSelected ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'}`}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{audit.editedByName || audit.editedByEmail || 'Admin'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatAuditDateTime(audit.editedAt)}</span>
                      </div>
                      {audit.reason && <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{audit.reason}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailModal.isOpen} onClose={() => setDetailModal({ isOpen: false, record: null })} title="Attendance Details" size="lg">
        {detailModal.record && (detailModal.record.shiftName || detailModal.record.shift?.displayName) && (
          <div className="pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Shift Information</h5>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getShiftIcon(detailModal.record.shiftName || detailModal.record.shift?.displayName, detailModal.record.isNightShift)}
                  <span className="font-medium text-purple-800">{detailModal.record.shiftName || detailModal.record.shift?.displayName}</span>
                </div>
                {detailModal.record.checkInStatus && (
                  <span className={`text-xs px-2 py-1 rounded-full ${detailModal.record.checkInStatus === 'late' ? 'bg-yellow-200 text-yellow-800' : detailModal.record.checkInStatus === 'on-time' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                    {detailModal.record.checkInStatus === 'late' ? 'Late Check-in' : detailModal.record.checkInStatus === 'on-time' ? 'On-time' : 'Normal'}
                  </span>
                )}
              </div>
              {detailModal.record.shift?.startTime && detailModal.record.shift?.endTime && (
                <p className="text-xs text-purple-600 mt-2">Shift Timing: {detailModal.record.shift.startTime} - {detailModal.record.shift.endTime}</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit / Create Modal */}
      <Modal isOpen={editModal.isOpen} onClose={closeEditModal} title={editModal.mode === 'create' ? 'Create Attendance Entry' : 'Edit Attendance Time'} size="md">
        <form onSubmit={handleSaveAttendanceTime} className="space-y-4">
          {editModal.mode === 'create' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
              Creating entry for {editModal.employee?.name || 'employee'} on {formatExcelDate(editModal.dateKey)}.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status</label>
              <select value={editForm.status} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Day</label>
              <select value={editForm.dayType} onChange={e => setEditForm(prev => ({ ...prev, dayType: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="full-day">Full Day</option>
                <option value="half-day">Half Day</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Shift</label>
            <select value={editForm.shiftId} onChange={e => setEditForm(prev => ({ ...prev, shiftId: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No shift</option>
              {shifts.map(s => <option key={s._id} value={s._id}>{s.displayName || s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Location</label>
            <select value={editForm.locationId} onChange={e => setEditForm(prev => ({ ...prev, locationId: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">No location</option>
              {locations.map(l => <option key={l._id} value={l._id}>{l.name || l.locationName || l.address || 'Location'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Check-in date/time *</label>
            <input type="datetime-local" value={editForm.checkIn} onChange={e => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))} required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Checkout date/time</label>
            <input type="datetime-local" value={editForm.checkOut} onChange={e => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          {editError && <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/25 px-3 py-2 text-sm text-red-700 dark:text-red-200">{editError}</div>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeEditModal}>Cancel</Button>
            <Button type="submit" loading={savingEdit}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceReport;
