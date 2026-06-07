import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { attendanceService, employeeService, permissionService } from '../../services/auth';

import NightsStayIcon from '@mui/icons-material/NightsStay';  
import WbSunnyIcon from '@mui/icons-material/WbSunny';  

// Material-UI Icons
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const AttendanceReport = () => {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all'); // all, today, yesterday, last7, thisMonth
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailModal, setDetailModal] = useState({ isOpen: false, record: null });
  const [mobileView, setMobileView] = useState('stats'); // 'stats', 'summary', 'details'

  const syncSelectedPeriod = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return;
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    setSelectedMonth((prev) => (prev === month ? prev : month));
    setSelectedYear((prev) => (prev === year ? prev : year));
  };

  const getMonthYearBuckets = (startISO, endISO) => {
    if (!startISO || !endISO) return [];
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const buckets = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= limit) {
      buckets.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
  };

  const fetchAttendanceEntries = async (employeeParam) => {
    const rangeBuckets = (dateRange && dateRange.start && dateRange.end)
      ? getMonthYearBuckets(dateRange.start, dateRange.end)
      : [];
    const buckets = rangeBuckets.length > 0
      ? rangeBuckets
      : [{ month: selectedMonth, year: selectedYear }];

    const responses = await Promise.all(
      buckets.map(async ({ month, year }) => {
        try {
          const res = await attendanceService.getAllAttendance(month, year, employeeParam);
          return Array.isArray(res) ? res : (res?.data || res?.docs || []);
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
      const key = rec._id || `${getId(rec.employee)}-${normalizeDateString(rec.date) || rec.date || ''}`;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // re-run when filters change or employees list is available
    if (employees && employees.length > 0) {
      loadAttendance();
      loadSummary();
      loadPermissions();
    }
  }, [selectedMonth, selectedYear, selectedEmployee, dateFilter, statusFilter, employees.length, datePreset, dateRange]);

  // compute dateRange whenever datePreset changes
  useEffect(() => {
    const now = new Date();
    const toISODate = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const updateRange = (startISO, endISO) => {
      setDateRange((prev) => {
        if (prev.start === startISO && prev.end === endISO) return prev;
        return { start: startISO, end: endISO };
      });
      setDateFilter('');
    };

    if (!datePreset || datePreset === 'all') {
      setDateRange((prev) => (prev.start === null && prev.end === null ? prev : { start: null, end: null }));
      return;
    }

    if (datePreset === 'today') {
      const s = toISODate(now);
      updateRange(s, s);
      syncSelectedPeriod(now);
      return;
    }

    if (datePreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const s = toISODate(y);
      updateRange(s, s);
      syncSelectedPeriod(y);
      return;
    }

    if (datePreset === 'last7') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      updateRange(toISODate(start), toISODate(now));
      syncSelectedPeriod(now);
      return;
    }

    if (datePreset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      updateRange(toISODate(start), toISODate(end));
      syncSelectedPeriod(now);
      return;
    }
  }, [datePreset]);

  // if a specific date is set manually, clear preset selection (use custom date)
  useEffect(() => {
    if (dateFilter) {
      setDatePreset('all');
      const specific = new Date(dateFilter);
      if (!Number.isNaN(specific.getTime())) {
        syncSelectedPeriod(specific);
      }
    }
  }, [dateFilter]);

  const loadInitialData = async () => {
    try {
      const rawEmployees = await employeeService.getAll();
      const employeesData = Array.isArray(rawEmployees) ? rawEmployees : (rawEmployees?.data || rawEmployees?.docs || []);
      setEmployees((employeesData || []).filter(emp => emp?.isActive !== false));
      // wait for employees to be set and then load other data (useEffect will also trigger)
      await loadAttendance();
      await loadSummary();
      await loadPermissions();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getId = (e) => {
    if (!e) return undefined;
    if (typeof e === 'string') return e;
    if (e._id) return String(e._id);
    if (e.id) return String(e.id);
    if (e.employeeId) return String(e.employeeId);
    return undefined;
  };

  const normalizeDateString = (d) => {
    if (!d) return null;
    try {
      return new Date(d).toDateString();
    } catch (e) {
      return null;
    }
  };

  const loadAttendance = async () => {
    try {
      const employeeParam = selectedEmployee && selectedEmployee !== 'all' ? selectedEmployee : undefined;
      const uniqueEntries = await fetchAttendanceEntries(employeeParam);

      // normalize employee objects on each record (resolve id -> full object from employees list)
      const normalized = (uniqueEntries || []).map((rec) => {
        const copy = { ...rec };
        const emp = rec.employee || rec.employeeId || rec.user || rec.userId;
        const empId = getId(emp);
        if (empId && (!emp || typeof emp === 'string')) {
          const found = (employees || []).find(e => getId(e) === empId);
          if (found) copy.employee = found;
          else copy.employee = { _id: empId, name: empId };
        }
        return copy;
      });

      // apply client-side filters for employee and specific date (if the service doesn't support them)
      let filtered = normalized;
      if (selectedEmployee && selectedEmployee !== 'all') {
        filtered = filtered.filter(r => getId(r.employee) === String(selectedEmployee));
      }
      // Specific date filter has highest priority
      if (dateFilter) {
        const df = normalizeDateString(dateFilter);
        filtered = filtered.filter(r => normalizeDateString(r.date) === df);
      } else if (dateRange && dateRange.start && dateRange.end) {
        const startTime = new Date(dateRange.start).setHours(0,0,0,0);
        const endTime = new Date(dateRange.end).setHours(23,59,59,999);
        filtered = filtered.filter(r => {
          const t = r.date ? new Date(r.date).getTime() : null;
          return t && t >= startTime && t <= endTime;
        });
      }

      setAttendance(filtered || []);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendance([]);
    }
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const employeeParam = selectedEmployee && selectedEmployee !== 'all' ? selectedEmployee : undefined;
      // Reuse attendance fetching logic so presets spanning multiple months are respected
      const entries = await fetchAttendanceEntries(employeeParam);

      const normalized = (entries || []).map((rec) => {
        const copy = { ...rec };
        const emp = rec.employee || rec.employeeId || rec.user || rec.userId;
        const empId = getId(emp);
        if (empId && (!emp || typeof emp === 'string')) {
          const found = (employees || []).find(e => getId(e) === empId);
          if (found) copy.employee = found;
          else copy.employee = { _id: empId, name: empId };
        }
        return copy;
      });

      // apply date filters (if any)
      let filtered = normalized;
      if (dateFilter) {
        const df = normalizeDateString(dateFilter);
        filtered = filtered.filter(r => normalizeDateString(r.date) === df);
      } else if (dateRange && dateRange.start && dateRange.end) {
        const startTime = new Date(dateRange.start).setHours(0,0,0,0);
        const endTime = new Date(dateRange.end).setHours(23,59,59,999);
        filtered = filtered.filter(r => {
          const t = r.date ? new Date(r.date).getTime() : null;
          return t && t >= startTime && t <= endTime;
        });
      }

      if (selectedEmployee && selectedEmployee !== 'all') {
        filtered = filtered.filter(r => getId(r.employee) === String(selectedEmployee));
      }

      // aggregate per employee
      const map = {};
      (filtered || []).forEach(rec => {
        const emp = rec.employee || { _id: getId(rec.employee) || 'unknown', name: rec.employee?.name || 'Unknown' };
        const id = getId(emp) || 'unknown';
        if (!map[id]) {
          map[id] = { _id: id, employee: emp, totalPresent: 0, totalHalfDay: 0, totalPermission: 0, totalWorkingHours: 0 };
        }
        const m = map[id];
        const status = String((rec.status || '')).toLowerCase();
        if (status === 'present') m.totalPresent += 1;
        if (status === 'half-day') m.totalHalfDay += 1;
        if (status === 'present-with-permission' || status === 'with-permission') {
          m.totalPermission += 1;
          m.totalPresent += 1;
        }
        m.totalWorkingHours += Number(rec.workingHours) || 0;
      });

      const agg = Object.values(map);
      setSummary(agg || []);
    } catch (error) {
      console.error('Failed to load summary:', error);
      setSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const employeeParam = selectedEmployee && selectedEmployee !== 'all' ? selectedEmployee : undefined;
      const rangeBuckets = (dateRange && dateRange.start && dateRange.end)
        ? getMonthYearBuckets(dateRange.start, dateRange.end)
        : [];
      const buckets = rangeBuckets.length > 0
        ? rangeBuckets
        : [{ month: selectedMonth, year: selectedYear }];

      const responses = await Promise.all(
        buckets.map(async ({ month, year }) => {
          try {
            const res = await permissionService.getAllPermissions('approved', month, year, employeeParam);
            return Array.isArray(res) ? res : (res?.data || res?.docs || []);
          } catch (err) {
            console.warn('Failed to load permissions for period', { month, year, message: err?.message || err });
            return [];
          }
        })
      );

      let data = responses.flat();

      const seen = new Set();
      data = (data || []).filter((permission) => {
        if (!permission) return false;
        const dateKey = normalizeDateString(permission.date || permission.permissionDate || permission.permission_date) || '';
        const key = permission._id || `${getId(permission.employee)}-${dateKey}-${permission.permissionType || ''}`;
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // apply date range filter if present
      if (dateFilter) {
        const df = normalizeDateString(dateFilter);
        data = (data || []).filter(p => normalizeDateString(p.date || p.permissionDate || p.permission_date) === df);
      } else if (dateRange && dateRange.start && dateRange.end) {
        const startTime = new Date(dateRange.start).setHours(0,0,0,0);
        const endTime = new Date(dateRange.end).setHours(23,59,59,999);
        data = (data || []).filter(p => {
          const d = p.date || p.permissionDate || p.permission_date;
          const t = d ? new Date(d).getTime() : null;
          return t && t >= startTime && t <= endTime;
        });
      }

      setPermissions(data || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    }
  };

  const getStatusBadge = (record) => {
    if (!record.checkIn) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent</span>
        </div>
      );
    }
    
    if (!record.checkOut) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Working</span>
        </div>
      );
    }
    
    switch (record.status) {
      case 'present':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Present</span>
          </div>
        );
      case 'half-day':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">Half Day</span>
          </div>
        );
      case 'present-with-permission':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">With Permission</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Unknown</span>
          </div>
        );
    }
  };

  const getPermissionsForRecord = (record) => {
    if (!record || !record.date) return [];

    const recordDate = normalizeDateString(record.date);
    const empId = getId(record.employee) || getId(record.employee || {});

    return (permissions || []).filter(permission => {
      const pEmpId = getId(permission.employee);
      const pDate = normalizeDateString(permission.date || permission.permissionDate || permission.permission_date);
      return pEmpId && pDate && empId && (pEmpId === empId) && (pDate === recordDate);
    });
  };

  const formatTime = (dateString) => {
    // Accept multiple shapes: ISO string, numeric timestamp, or an object with
    // { startTimeValue, endTimeValue, startLocal, endLocal, startTime, endTime }
    if (!dateString) return '--:--';
    // If the value is an object that contains direct time strings (common shape), prefer them
    if (typeof dateString === 'object') {
      if (dateString.endTime && typeof dateString.endTime === 'string' && dateString.endTime.trim() !== '') {
        return dateString.endTime;
      }
      if (dateString.startTime && typeof dateString.startTime === 'string' && dateString.startTime.trim() !== '') {
        return dateString.startTime;
      }
      // sometimes the field is named simply 'time'
      if (dateString.time && typeof dateString.time === 'string' && dateString.time.trim() !== '') {
        return dateString.time;
      }
    }

    const toDate = (d) => {
      if (!d) return null;
      if (typeof d === 'number') return new Date(d);
      if (typeof d === 'string') return new Date(d);
      if (typeof d === 'object') {
        // common numeric fields
        if (d.startTimeValue) return new Date(Number(d.startTimeValue));
        if (d.endTimeValue) return new Date(Number(d.endTimeValue));
        if (d.timeValue) return new Date(Number(d.timeValue));
        // some payloads include direct epoch (ms)
        if (d.value) return new Date(Number(d.value));
        // if local string is provided, try parsing it
        if (d.startLocal) return new Date(d.startLocal);
        if (d.endLocal) return new Date(d.endLocal);
        // fallback to any date-like field
        if (d.startTime) {
          // startTime may be '09:00' without date — we already handled raw time strings above,
          // so here we can't build a full Date object reliably.
          return null;
        }
        if (d.date) return new Date(d.date);
      }
      return null;
    };

    const dt = toDate(dateString);
    if (!dt || Number.isNaN(dt.getTime())) return '--:--';
    return dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString) => {
    // Accept ISO string, numeric timestamp, or object with date/time values
    if (!dateString) return '--';

    const toDate = (d) => {
      if (!d) return null;
      if (typeof d === 'number') return new Date(d);
      if (typeof d === 'string') return new Date(d);
      if (typeof d === 'object') {
        if (d.startTimeValue) return new Date(Number(d.startTimeValue));
        if (d.endTimeValue) return new Date(Number(d.endTimeValue));
        if (d.timeValue) return new Date(Number(d.timeValue));
        if (d.value) return new Date(Number(d.value));
        if (d.startLocal) return new Date(d.startLocal);
        if (d.endLocal) return new Date(d.endLocal);
        if (d.date) return new Date(d.date);
      }
      return null;
    };

    const dt = toDate(dateString);
    if (!dt || Number.isNaN(dt.getTime())) return '--';
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (hours) => {
    const num = Number(hours || 0);
    if (!num || num === 0) return '--';
    const wholeHours = Math.floor(num);
    const minutes = Math.round((num - wholeHours) * 60);
    return `${wholeHours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  };
  // Helper function to get shift icon based on shift name or timing
const getShiftIcon = (shiftName, isNightShift) => {
  if (isNightShift) {
    return <NightsStayIcon className="w-3 h-3 text-indigo-500" />;
  }
  if (shiftName?.toLowerCase().includes('morning')) {
    return <WbSunnyIcon className="w-3 h-3 text-yellow-500" />;
  }
  return <ScheduleIcon className="w-3 h-3 text-gray-500" />;
};

// Helper function to format shift display
const formatShiftDisplay = (record) => {
  if (record.shiftName) {
    return record.shiftName;
  }
  if (record.shift?.displayName) {
    return record.shift.displayName;
  }
  return null;
};

  const getLocationName = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value.name || value.locationName || value.placeName || value.address || '';
    }
    return '';
  };

  const getSelectedLocationName = (record, type = 'in') => {
    const selectedLocation = type === 'in' ? record?.checkInLocation : record?.checkOutLocation;
    return getLocationName(selectedLocation);
  };

  const getLocationText = (record, type = 'in', options = {}) => {
    const { includeSelectedLocation = true } = options;
    if (!record) return 'Location unavailable';
    const selectedLocationName = includeSelectedLocation ? getSelectedLocationName(record, type) : '';
    if (selectedLocationName) return selectedLocationName;

    const place = type === 'in'
      ? (record.checkInPlace || record.checkInAddress || record.checkIn_location || record.checkIn?.place || record.checkIn?.placeName || record.checkIn?.locationName)
      : (record.checkOutPlace || record.checkOutAddress || record.checkOut_location || record.checkOut?.place || record.checkOut?.placeName || record.checkOut?.locationName);

    return getLocationName(place) || (type === 'out' && !record.checkOut ? 'Awaiting check-out' : 'Location unavailable');
  };

  const renderSelectedLocation = (record) => {
    const locationName = getSelectedLocationName(record, 'in');
    if (!locationName) {
      return <span className="text-xs text-gray-400">--</span>;
    }

    return <span className="text-sm font-medium text-gray-700">{locationName}</span>;
  };

  // Render human-readable location or fallback to coords / Google Maps link
  // Small inner component: given coords, fetch a human-readable place (Nominatim) with sessionStorage cache
  const LocationText = ({ coords, coordsText, mapsUrl }) => {
    const hasCoords = Boolean(coords && coords.lat != null && coords.lng != null);
    const [place, setPlace] = useState(null);
    const [loadingPlace, setLoadingPlace] = useState(hasCoords);

    useEffect(() => {
      if (!coords || coords.lat == null || coords.lng == null) {
        setLoadingPlace(false);
        return;
      }
      const key = `loc:${Number(coords.lat).toFixed(5)},${Number(coords.lng).toFixed(5)}`;
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          setPlace(cached);
          setLoadingPlace(false);
          return;
        }
      } catch (e) {
        // ignore storage errors
      }

      let cancelled = false;
      const fetchPlace = async () => {
        setLoadingPlace(true);
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lng)}&accept-language=en`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Reverse geocode failed');
          const data = await res.json();
          let p = null;
          if (data && data.address) {
            const a = data.address;
            const locality = a.city || a.town || a.village || a.hamlet || a.county;
            const state = a.state || a.region || a.state_district;
            const country = a.country;
            const parts = [];
            if (locality) parts.push(locality);
            if (state) parts.push(state);
            if (country) parts.push(country);
            if (parts.length > 0) p = parts.join(', ');
          }
          if (!p && data && data.display_name) p = data.display_name;

          if (!cancelled && p) {
            setPlace(p);
            try { sessionStorage.setItem(key, p); } catch (e) { /* ignore */ }
          }
        } catch (err) {
          // ignore reverse geocode errors; we'll fall back to coords
          // console.warn('Reverse geocode (client) failed:', err?.message || err);
        } finally {
          if (!cancelled) setLoadingPlace(false);
        }
      };

      fetchPlace();
      return () => { cancelled = true; };
    }, [coords]);

    if (!hasCoords) {
      return <span className="text-xs text-gray-400">Location unavailable</span>;
    }

    const label = place || (loadingPlace ? 'Resolving location...' : 'Open map');

    return (
      <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
        <span>{label}</span>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary-600 hover:underline"
            title={coordsText}
          >
            Open
          </a>
        )}
      </span>
    );
  };

  const renderLocation = (record, type, options = {}) => {
    const { includeSelectedLocation = true } = options;
    if (!record) return <span className="text-xs text-gray-400">Location unavailable</span>;
    // Try to find a human-readable place first
    const selectedLocationName = includeSelectedLocation ? getSelectedLocationName(record, type) : '';
    if (selectedLocationName) {
      return <span className="text-xs text-gray-500">{selectedLocationName}</span>;
    }

    const place = type === 'in'
      ? (record.checkInPlace || record.checkInAddress || record.checkIn_location || record.checkIn?.place || record.checkIn?.placeName || record.checkIn?.locationName)
      : (record.checkOutPlace || record.checkOutAddress || record.checkOut_location || record.checkOut?.place || record.checkOut?.placeName || record.checkOut?.locationName);

    if (place) {
      return <span className="text-xs text-gray-500">{getLocationName(place) || place}</span>;
    }

    if (type === 'out') {
      const hasOutData = Boolean(
        (record.checkOut && Object.keys(record.checkOut || {}).length > 0) ||
        record.checkOutLat != null ||
        record.checkOutLng != null ||
        record.checkOutLocation ||
        record.checkOutPlace ||
        record.checkOutAddress ||
        record.checkOut_location
      );

      if (!hasOutData) {
        return <span className="text-xs text-gray-400">Awaiting check-out</span>;
      }
    }

    // Helper to extract lat/lng from various possible shapes
    const extractCoords = (obj, preference) => {
      if (!obj) return null;
      // direct numeric fields
      if ((obj.lat || obj.latitude || obj.latlng) && (obj.lng || obj.longitude || obj.lon)) {
        const lat = obj.lat ?? obj.latitude ?? (obj.latlng && obj.latlng[0]);
        const lng = obj.lng ?? obj.longitude ?? obj.lon ?? (obj.latlng && obj.latlng[1]);
        if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) };
      }

      // common top-level fields (prioritize requested preference)
      const topLevelCandidates = [];
      if (preference === 'out') {
        topLevelCandidates.push({ lat: obj.checkOutLat, lng: obj.checkOutLng });
        topLevelCandidates.push({ lat: obj.checkInLat, lng: obj.checkInLng });
      } else {
        topLevelCandidates.push({ lat: obj.checkInLat, lng: obj.checkInLng });
        topLevelCandidates.push({ lat: obj.checkOutLat, lng: obj.checkOutLng });
      }
      for (const candidate of topLevelCandidates) {
        if (candidate && candidate.lat != null && candidate.lng != null) {
          return { lat: Number(candidate.lat), lng: Number(candidate.lng) };
        }
      }

      // nested under 'location' object
      if (obj.location) {
        const l = obj.location;
        if (typeof l === 'string') {
          // maybe a 'lat,lng' string
          const parts = l.split(',').map(p => p.trim());
          if (parts.length >= 2 && !Number.isNaN(Number(parts[0])) && !Number.isNaN(Number(parts[1]))) {
            return { lat: Number(parts[0]), lng: Number(parts[1]) };
          }
        }
        if (Array.isArray(l.coordinates) && l.coordinates.length >= 2) {
          // GeoJSON [lng, lat]
          return { lat: Number(l.coordinates[1]), lng: Number(l.coordinates[0]) };
        }
        if (l.lat && l.lng) return { lat: Number(l.lat), lng: Number(l.lng) };
        if (l.latitude && l.longitude) return { lat: Number(l.latitude), lng: Number(l.longitude) };
        if (Array.isArray(l) && l.length >= 2 && !Number.isNaN(Number(l[0])) && !Number.isNaN(Number(l[1]))) {
          return { lat: Number(l[0]), lng: Number(l[1]) };
        }
      }

      // GeoJSON-like at root: { type: 'Point', coordinates: [lng, lat] }
      if (obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
        return { lat: Number(obj.coordinates[1]), lng: Number(obj.coordinates[0]) };
      }

      // check for nested checkIn/checkOut objects containing coords
      const nestedOrder = preference === 'out'
        ? [obj.checkOut, obj.checkIn]
        : [obj.checkIn, obj.checkOut];
      for (const nested of nestedOrder) {
        if (nested && typeof nested === 'object' && nested !== obj) {
          const c = extractCoords(nested, preference);
          if (c) return c;
        }
      }

      return null;
    };

    // Determine which side to check (in/out) and attempt multiple locations
    const sourceObj = type === 'in' ? (record.checkIn ?? record) : (record.checkOut ?? record);
    const coords = extractCoords(sourceObj, type) || extractCoords(record, type) || extractCoords(record.employee, type) || null;

    if (coords && coords.lat != null && coords.lng != null) {
      const q = `${coords.lat},${coords.lng}`;
      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
      const coordsText = `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}`;
      return (
        <LocationText coords={coords} coordsText={coordsText} mapsUrl={mapsUrl} />
      );
    }
    // If nothing found, log a debug message (only in development) to help diagnose
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('Attendance renderLocation: no location found for record', { id: record._id, sample: record });
    }

    return <span className="text-xs text-gray-400">Location unavailable</span>;
  };

  const calculateOverallStats = () => {
    const totalRecords = attendance.length;
    let presentCount = 0;
    let halfDayCount = 0;
    let permissionCount = 0;
    let attendanceScore = 0;

    attendance.forEach((record) => {
      const status = String((record.status || '')).toLowerCase();
      if (status === 'present') {
        presentCount += 1;
        attendanceScore += 1;
      } else if (status === 'half-day') {
        halfDayCount += 1;
        attendanceScore += 0.5;
      } else if (status === 'present-with-permission' || status === 'with-permission') {
        permissionCount += 1;
        presentCount += 1;
        attendanceScore += 0.75;
      }
    });

    const absentCount = attendance.filter(a => !a.checkIn).length;
    const workingCount = attendance.filter(a => a.checkIn && !a.checkOut).length;

    const totalWorkingHours = attendance.reduce((sum, record) => sum + (Number(record.workingHours) || 0), 0);
    const averageHours = totalRecords > 0 ? (totalWorkingHours / totalRecords).toFixed(1) : 0;

    const attendanceRate = totalRecords > 0
      ? ((attendanceScore / totalRecords) * 100).toFixed(1)
      : 0;

    return {
      totalRecords,
      presentCount,
      halfDayCount,
      permissionCount,
      absentCount,
      workingCount,
      totalWorkingHours: totalWorkingHours.toFixed(1),
      averageHours,
      attendanceRate
    };
  };

  const filteredAttendance = attendance.filter(record => {
    if (statusFilter === 'all') return true;

    const normalizedStatus = String(record?.status || '').toLowerCase();

    if (statusFilter === 'present') return normalizedStatus === 'present';
    if (statusFilter === 'half-day') return normalizedStatus === 'half-day';
    if (statusFilter === 'permission') {
      return normalizedStatus === 'present-with-permission' || normalizedStatus === 'with-permission';
    }
    if (statusFilter === 'absent') return !record?.checkIn;
    if (statusFilter === 'working') return Boolean(record?.checkIn) && !record?.checkOut;
    return true;
  });

  const overallStats = calculateOverallStats();

  const exportToCSV = () => {
    const headers = ['Employee', 'Date', 'Check In', 'Selected Location', 'Check In Place', 'Check Out', 'Check Out Date', 'Working Hours', 'Status', 'Department'];
    const csvData = filteredAttendance.map(record => [
      record.employee?.name || 'N/A',
      formatDate(record.date),
      formatTime(record.checkIn),
      getSelectedLocationName(record, 'in') || '--',
      getLocationText(record, 'in', { includeSelectedLocation: false }),
      formatTime(record.checkOut),
      formatDate(record.checkOut),
      (Number(record.workingHours) || 0) > 0 ? `${record.workingHours}h` : '--',
      record.status || 'Unknown',
      record.employee?.department || 'N/A'
    ]);

    // escape values and join
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csvContent = [headers.map(escape).join(',')]
      .concat(csvData.map(row => row.map(escape).join(',')))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedMonth}-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Mobile Navigation Component
  const MobileNavigation = () => (
    <div className="">
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
        <button
          onClick={() => setMobileView('stats')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mobileView === 'stats'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Stats
        </button>
        <button
          onClick={() => setMobileView('summary')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mobileView === 'summary'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            mobileView === 'details'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Details
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-gray-600">Comprehensive attendance overview for all employees</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center space-x-2"
            size="sm"
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Filters - Always visible */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <option value="all" className="dark:bg-gray-800 dark:text-gray-100">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                    {emp.name} - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <option value="all" className="dark:bg-gray-800 dark:text-gray-100">All Status</option>
                <option value="present" className="dark:bg-gray-800 dark:text-gray-100">Present</option>
                <option value="half-day" className="dark:bg-gray-800 dark:text-gray-100">Half Day</option>
                <option value="permission" className="dark:bg-gray-800 dark:text-gray-100">With Permission</option>
                <option value="absent" className="dark:bg-gray-800 dark:text-gray-100">Absent</option>
                <option value="working" className="dark:bg-gray-800 dark:text-gray-100">Working Now</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                    {new Date(2000, i).toLocaleString('default', { month: 'short' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">{year}</option>;
                })}
              </select>
            </div>
          </div>
          
          {/* Date Filter - Full width on mobile */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            {/* Date Presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setDatePreset('today')}
                className={`px-3 py-1 text-sm rounded-md border ${datePreset === 'today' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700'}`}
              >
                Today
              </button>
              <button
                onClick={() => setDatePreset('yesterday')}
                className={`px-3 py-1 text-sm rounded-md border ${datePreset === 'yesterday' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700'}`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDatePreset('last7')}
                className={`px-3 py-1 text-sm rounded-md border ${datePreset === 'last7' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700'}`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDatePreset('thisMonth')}
                className={`px-3 py-1 text-sm rounded-md border ${datePreset === 'thisMonth' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700'}`}
              >
                This Month
              </button>
              <button
                onClick={() => { setDatePreset('all'); setDateFilter(''); }}
                className={`px-3 py-1 text-sm rounded-md border ${datePreset === 'all' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700'}`}
              >
                All
              </button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Summary Stats - Show based on mobile view */}
      {(mobileView === 'stats' || !mobileView) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {[
            { value: overallStats.totalRecords, label: 'Total Records', color: 'primary', icon: EventIcon },
            { value: overallStats.presentCount, label: 'Present', color: 'green', icon: PersonIcon },
            { value: overallStats.halfDayCount, label: 'Half Days', color: 'orange', icon: AccessTimeIcon },
            { value: overallStats.permissionCount, label: 'With Permission', color: 'blue', icon: ScheduleIcon },
            { value: overallStats.absentCount, label: 'Absent', color: 'red', icon: PersonIcon },
            { value: overallStats.workingCount, label: 'Working Now', color: 'yellow', icon: AccessTimeIcon },
            { value: overallStats.totalWorkingHours, label: 'Total Hours', color: 'purple', icon: ScheduleIcon },
            { value: `${overallStats.attendanceRate}%`, label: 'Attendance Rate', color: 'indigo', icon: TrendingUpIcon },
          ].map((stat, index) => (
            <Card key={index} className="p-3 sm:p-4 shadow-sm">
              <div className="text-center">
                <div className={`text-lg sm:text-xl font-bold text-${stat.color}-600 mb-1`}>
                  {stat.value}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-tight">{stat.label}</p>
                <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 text-${stat.color}-600 mx-auto mt-1`} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Employee Summary - Show based on mobile view */}
      {(mobileView === 'summary' || !mobileView) && (
        <Card className={`${mobileView ? 'block' : 'hidden lg:block'} shadow-sm`}>
          <Card.Header>
            <Card.Title className="flex items-center justify-between">
              <span>
                Employee Summary - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              {summaryLoading && <LoadingSpinner size="sm" />}
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
    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Rate</th>
  </tr>
</thead>
               <tbody className="bg-white divide-y divide-gray-200">
  {summary.map((item) => {
    if (!item || !item.employee) return null;

    const permissionFromSummary = Number(item.totalPermission || 0);
    let permissionCount = permissionFromSummary;
    if (!permissionCount && Array.isArray(permissions) && permissions.length > 0) {
      permissionCount = permissions.filter(p => getId(p?.employee) === item._id).length;
    }
    const presentDays = Number(item.totalPresent || 0);
    const halfDays = Number(item.totalHalfDay || 0);
    const purePresentDays = Math.max(0, presentDays - permissionCount);
    const totalDays = purePresentDays + permissionCount + halfDays;
    const effectiveDays = purePresentDays + (permissionCount * 0.75) + (halfDays * 0.5);
    const attendanceRate = totalDays > 0 ? ((effectiveDays / totalDays) * 100).toFixed(1) : 0;

    return (
      <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-xs font-semibold text-primary-600">
                {item.employee?.name?.charAt(0) || 'E'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.employee?.name || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500 sm:hidden">
                {item.employee?.department || 'N/A'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center hidden sm:table-cell">
          {item.employee?.department || 'N/A'}
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
          <span className="font-semibold text-green-600">{presentDays}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden md:table-cell">
          <span className="font-semibold text-orange-600">{halfDays}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden lg:table-cell">
          <span className="font-semibold text-blue-600">{permissionCount}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
          <span className="font-semibold text-purple-600">{formatDuration(item.totalWorkingHours)}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-sm text-center hidden xl:table-cell">
          <span className={`font-semibold ${
            attendanceRate >= 90 ? 'text-green-600' :
            attendanceRate >= 80 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {attendanceRate}%
          </span>
        </td>
      </tr>
    );
  })}
</tbody>
              </table>
            </div>

            {summary.length === 0 && !summaryLoading && (
              <div className="text-center py-8">
                <PersonIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No attendance summary available</p>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Detailed Report - Show based on mobile view */}
      {(mobileView === 'details' || !mobileView) && (
        <Card className={`${mobileView ? 'block' : 'hidden lg:block'} shadow-sm`}>
          <Card.Header>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Card.Title className="text-lg font-semibold text-gray-900">
                Detailed Report ({filteredAttendance.length} records)
              </Card.Title>
              <span className="text-sm font-normal text-gray-500">
                Showing {statusFilter === 'all' ? 'all' : statusFilter} records
              </span>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
                <thead className="bg-gray-50">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Day</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
  </tr>
</thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map((record) => {
  if (!record || !record.employee) return null;
  const recordPermissions = getPermissionsForRecord(record);
  const shiftDisplay = formatShiftDisplay(record);
  const isNightShift = record.isNightShift || record.shift?.isNightShift || false;
  
  return (
    <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-600">
              {record.employee?.name?.charAt(0) || 'E'}
            </span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              {record.employee?.name || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500">
              {record.employee?.department || 'N/A'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {formatDate(record.date)}
        </div>
        <div className="text-xs text-gray-500">
          {record.date ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }) : '--'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>{formatTime(record.checkIn)}</div>
        <div className="mt-1">{renderLocation(record, 'in', { includeSelectedLocation: false })}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {renderSelectedLocation(record)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>{formatTime(record.checkOut)}</div>
        <div className="text-xs text-gray-500">{formatDate(record.checkOut)}</div>
        <div className="mt-1">{renderLocation(record, 'out')}</div>
      </td>
      {/* NEW Shift Column */}
      <td className="px-6 py-4 whitespace-nowrap">
        {shiftDisplay ? (
          <div className="flex items-center space-x-1">
            {getShiftIcon(shiftDisplay, isNightShift)}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {shiftDisplay}
            </span>
            {record.checkInStatus && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                record.checkInStatus === 'late' 
                  ? 'bg-yellow-100 text-yellow-700'
                  : record.checkInStatus === 'on-time'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {record.checkInStatus}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">No shift</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900">
          {record.workingHours > 0 ? formatDuration(record.workingHours) : '--'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(record)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {recordPermissions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {recordPermissions.slice(0, 2).map(permission => (
              <span
                key={permission._id}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {permission.permissionType?.split('-')[0] || 'Perm'}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">--</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => setDetailModal({ isOpen: true, record })}
          className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
        >
          <VisibilityIcon className="w-4 h-4" />
          <span>View</span>
        </button>
      </td>
    </tr>
  );
})}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="space-y-4 lg:hidden">
  {filteredAttendance.map((record) => {
    if (!record || !record.employee) return null;
    const recordPermissions = getPermissionsForRecord(record);
    const shiftDisplay = formatShiftDisplay(record);
    const isNightShift = record.isNightShift || record.shift?.isNightShift || false;
    
    return (
      <Card key={record._id} className="p-4">
        <div className="space-y-3">
          {/* Header - same as before */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {record.employee?.name?.charAt(0) || 'E'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {record.employee?.name || 'Unknown'}
                </div>
                <div className="text-sm text-gray-500">
                  {record.employee?.department || 'N/A'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setDetailModal({ isOpen: true, record })}
              className="text-gray-400 hover:text-gray-600"
            >
              <MoreVertIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Date and Status */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-900">
              {formatDate(record.date)}
            </div>
            {getStatusBadge(record)}
          </div>

          {/* NEW: Shift Info */}
          {shiftDisplay && (
            <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2">
                {getShiftIcon(shiftDisplay, isNightShift)}
                <span className="text-sm font-medium text-purple-700">
                  {shiftDisplay}
                </span>
              </div>
              {record.checkInStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  record.checkInStatus === 'late' 
                    ? 'bg-yellow-200 text-yellow-800'
                    : record.checkInStatus === 'on-time'
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {record.checkInStatus}
                </span>
              )}
            </div>
          )}

          {/* Time Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Check In</div>
              <div className="font-medium">{formatTime(record.checkIn)}</div>
              <div className="mt-1">{renderLocation(record, 'in', { includeSelectedLocation: false })}</div>
            </div>
            <div>
              <div className="text-gray-500">Check Out</div>
              <div className="font-medium">{formatTime(record.checkOut)}</div>
              <div className="text-xs text-gray-500">{formatDate(record.checkOut)}</div>
              <div className="mt-1">{renderLocation(record, 'out')}</div>
            </div>
          </div>

          <div className="text-sm">
            <div className="text-gray-500">Selected Location</div>
            <div className="mt-1">{renderSelectedLocation(record)}</div>
          </div>

          {/* Hours and Permissions */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <div>
              <div className="text-gray-500 text-sm">Working Hours</div>
              <div className="font-semibold text-gray-900">
                {record.workingHours > 0 ? formatDuration(record.workingHours) : '--'}
              </div>
            </div>
            {recordPermissions.length > 0 && (
              <div className="text-right">
                <div className="text-gray-500 text-sm">Permissions</div>
                <div className="flex space-x-1">
                  {recordPermissions.slice(0, 1).map(permission => (
                    <span
                      key={permission._id}
                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {permission.permissionType?.split('-')[0] || 'Perm'}
                    </span>
                  ))}
                  {recordPermissions.length > 1 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      +{recordPermissions.length - 1}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  })}
</div>
            </div>

            {filteredAttendance.length === 0 && (
              <div className="text-center py-12">
                <ScheduleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No attendance records found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Attendance Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, record: null })}
        title="Attendance Details"
        size="lg"
      >
        
{detailModal.record && (detailModal.record.shiftName || detailModal.record.shift?.displayName) && (
  <div className="pt-4 border-t border-gray-200">
    <h5 className="text-sm font-medium text-gray-700 mb-3">Shift Information</h5>
    <div className="bg-purple-50 p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getShiftIcon(detailModal.record.shiftName || detailModal.record.shift?.displayName, detailModal.record.isNightShift)}
          <span className="font-medium text-purple-800">
            {detailModal.record.shiftName || detailModal.record.shift?.displayName}
          </span>
        </div>
        {detailModal.record.checkInStatus && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            detailModal.record.checkInStatus === 'late' 
              ? 'bg-yellow-200 text-yellow-800'
              : detailModal.record.checkInStatus === 'on-time'
              ? 'bg-green-200 text-green-800'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {detailModal.record.checkInStatus === 'late' ? 'Late Check-in' : 
             detailModal.record.checkInStatus === 'on-time' ? 'On-time' : 'Normal'}
          </span>
        )}
      </div>
      {detailModal.record.shift?.startTime && detailModal.record.shift?.endTime && (
        <p className="text-xs text-purple-600 mt-2">
          Shift Timing: {detailModal.record.shift.startTime} - {detailModal.record.shift.endTime}
        </p>
      )}
    </div>
  </div>
)}
      </Modal>
    </div>
  );
};

export default AttendanceReport;
