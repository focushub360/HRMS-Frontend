/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
const __eslintUnused = null;
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PermissionModal from './PermissionModal';
import { useNavigate } from 'react-router-dom';
import { attendanceService, shiftService, locationService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { formatWorkingHours } from '../../utils/time';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// ─── Custom Select ─────────────────────────────────────────────────────────────

const CustomSelect = ({ value, onChange, options, placeholder = 'Select...', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ArrowDropDownIcon className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg left-0 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer rounded-md transition-colors ${
                String(opt.value) === String(value)
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

// ─── Location text with reverse geocode ───────────────────────────────────────

const LocationText = ({ coords, coordsText, mapsUrl }) => {
  const hasCoords = Boolean(coords && coords.lat != null && coords.lng != null);
  const [place, setPlace] = useState(null);
  const [loadingPlace, setLoadingPlace] = useState(hasCoords);

  useEffect(() => {
    if (!hasCoords) { setLoadingPlace(false); return; }

    const cacheKey = `loc:${Number(coords.lat).toFixed(5)},${Number(coords.lng).toFixed(5)}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setPlace(cached); setLoadingPlace(false); return; }
    } catch (e) { /* ignore */ }

    let cancelled = false;
    const fetchPlace = async () => {
      setLoadingPlace(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lng)}&accept-language=en`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Reverse geocode failed');
        const data = await res.json();
        let label = null;
        if (data && data.address) {
          const a = data.address;
          const parts = [];
          const locality = a.city || a.town || a.village || a.hamlet || a.county;
          const state = a.state || a.region || a.state_district;
          const country = a.country;
          if (locality) parts.push(locality);
          if (state) parts.push(state);
          if (country) parts.push(country);
          if (parts.length > 0) label = parts.join(', ');
        }
        if (!label && data && data.display_name) label = data.display_name;
        if (!cancelled && label) {
          setPlace(label);
          try { sessionStorage.setItem(cacheKey, label); } catch (err) { /* ignore */ }
        }
      } catch (e) { /* ignore */ } finally {
        if (!cancelled) setLoadingPlace(false);
      }
    };

    fetchPlace();
    return () => { cancelled = true; };
  }, [coords, hasCoords]);

  if (!hasCoords) return <span className="text-xs text-gray-400">Location unavailable</span>;

  const label = place || (loadingPlace ? 'Resolving location...' : coordsText || 'Open map');

  return (
    <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
      <span>{label}</span>
      {mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline" title={coordsText}>Open</a>
      ) : null}
    </span>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const Attendance = () => {
  const _unusedUser = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [permissionModal, setPermissionModal] = useState(false);
  const [stats, setStats] = useState({ presentDays: 0, halfDays: 0, fullDays: 0, workingHours: 0, averageHours: 0 });
  const [todayShiftInfo, setTodayShiftInfo] = useState(null);
  const [todayShifts, setTodayShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState('');

  const isCurrentMonth = selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1;

  // ─── Timezone-safe date helper ────────────────────────────────────────────
  const getLocalDateStr = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ─── Helper to filter records strictly by selected month/year ─────────────
  const filterBySelectedMonth = (data) => {
    return (data || []).filter((a) => {
      const dateStr = getLocalDateStr(a.date);
      if (!dateStr) return false;
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      return year === selectedYear && month === selectedMonth;
    });
  };

  // ─── 24-Hour Auto Checkout Logic ─────────────────────────────────────────
  const processRecords = (records) => {
    if (!Array.isArray(records)) return [];
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return records.map(record => {
      if (record.checkIn && !record.checkOut) {
        const checkInTime = new Date(record.checkIn).getTime();
        if (!isNaN(checkInTime) && (now - checkInTime >= twentyFourHours)) {
          return {
            ...record,
            autoCheckedOut: true,
            status: 'absent',
            absentReason: 'not-checked-out',
            workingHours: 0,
          };
        }
      }
      return record;
    });
  };

  // ─── Group attendance records by date to handle multiple sessions ─────────
  const groupByDate = (records) => {
    if (!Array.isArray(records)) return [];
    const byDate = new Map();

    for (const record of records) {
      if (!record) continue;
      const dateStr = getLocalDateStr(record.date || record.checkIn);
      if (!dateStr) continue;

      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, {
          _id: `grouped-${dateStr}`,
          date: record.date || record.checkIn,
          sessions: [],
          status: record.status,
          shiftName: record.shiftName,
          shiftInfo: record.shiftInfo,
          _synthetic: record._synthetic,
          autoCheckedOut: record.autoCheckedOut,
          autoMarked: record.autoMarked,
          absentReason: record.absentReason,
        });
      }

      const grouped = byDate.get(dateStr);

      if (record.checkIn || record.checkOut) {
        grouped.sessions.push({
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
        });
      }

      // Preserve flags
      if (record.autoMarked) grouped.autoMarked = true;
      if (record.absentReason) grouped.absentReason = record.absentReason;

      if (record.autoCheckedOut) {
        if (!grouped.status || grouped.status === 'absent') {
          grouped.status = 'absent';
          grouped.autoCheckedOut = true;
          grouped.absentReason = record.absentReason || 'not-checked-out';
        }
      } else if (record.status && record.status !== 'absent') {
        grouped.status = record.status;
        grouped.autoCheckedOut = false;
      }
      if (record.shiftName && !grouped.shiftName) {
        grouped.shiftName = record.shiftName;
      }
      if (record.shiftInfo && !grouped.shiftInfo) {
        grouped.shiftInfo = record.shiftInfo;
      }
    }

    const result = Array.from(byDate.values()).map((grouped) => {
      // 1. Calculate total valid working hours (ignore auto-checked out sessions)
      const totalHours = grouped.sessions.reduce((sum, session) => {
        if (session.autoCheckedOut) return sum;
        return sum + (Number(session.workingHours) || 0);
      }, 0);

      // 2. Sort sessions chronologically
      grouped.sessions.sort((a, b) => {
        const timeA = a.checkIn ? new Date(a.checkIn).getTime() : 0;
        const timeB = b.checkIn ? new Date(b.checkIn).getTime() : 0;
        return timeA - timeB;
      });

      // 3. Recalculate status based on total working hours (4.5 Hour Threshold)
      const hasValidSession = grouped.sessions.some(s => !s.autoCheckedOut);
      const hasOpenSession = grouped.sessions.some(s => s.checkIn && !s.checkOut && !s.autoCheckedOut);

      if (hasOpenSession) {
        grouped.status = 'working';
        grouped.autoCheckedOut = false;
      } else if (hasValidSession && totalHours > 0 && grouped.status !== 'present-with-permission' && grouped.status !== 'on-permission') {
        if (totalHours > 4.5) {
          grouped.status = 'present';
        } else {
          grouped.status = 'half-day';
        }
        grouped.autoCheckedOut = false;
      }

      return {
        ...grouped,
        workingHours: totalHours,
      };
    });

    return result;
  };

  const supportsGeolocation = () => {
    if (typeof window === 'undefined') return false;
    if (!navigator || !navigator.geolocation) return false;
    if (window.isSecureContext === false) return false;
    return true;
  };

  const acquireLocation = async () => {
    if (!supportsGeolocation()) return null;
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status && status.state === 'denied') return null;
      } catch (err) { /* ignore */ }
    }
    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      } catch (err) { resolve(null); }
    });
  };

  const getId = (value) => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (value.employeeId) return String(value.employeeId);
    return undefined;
  };
  // ─── GPS-only location (skips office name, shows reverse-geocoded coords) ──
const renderLocationGpsOnly = (record, side) => {
  if (!record) return <span className="text-xs text-gray-400">Location unavailable</span>;

  const extractCoords = (source, preference) => {
    if (!source) return null;
    const candidates = preference === 'out'
      ? [{ lat: source.checkOutLat, lng: source.checkOutLng }, { lat: source.checkInLat, lng: source.checkInLng }]
      : [{ lat: source.checkInLat, lng: source.checkInLng }, { lat: source.checkOutLat, lng: source.checkOutLng }];
    for (const c of candidates) {
      if (c && c.lat != null && c.lng != null) return { lat: Number(c.lat), lng: Number(c.lng) };
    }
    return null;
  };

  const coords = extractCoords(record, side);
  if (coords) {
    const q = `${coords.lat},${coords.lng}`;
    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
    const coordsText = `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}`;
    return <LocationText coords={coords} coordsText={coordsText} mapsUrl={mapsUrl} />;
  }

  return <span className="text-xs text-gray-400">Location unavailable</span>;
};

  const renderLocation = (record, side) => {
    if (!record) return <span className="text-xs text-gray-400">Location unavailable</span>;

    const place = side === 'in'
      ? record.checkInPlace || record.checkInLocation || record.checkInAddress || record.checkIn_location ||
        (record.checkIn && record.checkIn.place) || (record.checkIn && record.checkIn.placeName) || (record.checkIn && record.checkIn.locationName)
      : record.checkOutPlace || record.checkOutLocation || record.checkOutAddress || record.checkOut_location ||
        (record.checkOut && record.checkOut.place) || (record.checkOut && record.checkOut.placeName) || (record.checkOut && record.checkOut.locationName);

    if (place) {
      if (typeof place === 'string') return <span className="text-xs text-gray-500">{place}</span>;
      if (typeof place === 'object') {
        const asName = (place && place.name) || (place && place.title) || null;
        if (asName) return <span className="text-xs text-gray-500">{asName}</span>;
        try { return <span className="text-xs text-gray-500">{String(place)}</span>; } catch (err) { /* ignore */ }
      }
      return <span className="text-xs text-gray-500">{String(place)}</span>;
    }

    if (side === 'out') {
      const hasOutData = Boolean(
        (record.checkOut && Object.keys(record.checkOut || {}).length > 0) ||
        record.checkOutLat != null || record.checkOutLng != null ||
        record.checkOutLocation || record.checkOutPlace || record.checkOutAddress || record.checkOut_location
      );
      if (!hasOutData) return <span className="text-xs text-gray-400">Awaiting check-out</span>;
    }

    const extractCoords = (source, preference) => {
      if (!source) return null;
      if ((source.lat || source.latitude || source.latlng) && (source.lng || source.longitude || source.lon)) {
        const lat = source.lat != null ? source.lat : source.latitude != null ? source.latitude : source.latlng ? source.latlng[0] : null;
        const lng = source.lng != null ? source.lng : source.longitude != null ? source.longitude : source.lon != null ? source.lon : source.latlng ? source.latlng[1] : null;
        if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) };
      }
      const candidates = preference === 'out'
        ? [{ lat: source.checkOutLat, lng: source.checkOutLng }, { lat: source.checkInLat, lng: source.checkInLng }]
        : [{ lat: source.checkInLat, lng: source.checkInLng }, { lat: source.checkOutLat, lng: source.checkOutLng }];
      for (const candidate of candidates) {
        if (candidate && candidate.lat != null && candidate.lng != null) return { lat: Number(candidate.lat), lng: Number(candidate.lng) };
      }
      if (source.location) {
        const loc = source.location;
        if (typeof loc === 'string') {
          const parts = loc.split(',').map((p) => p.trim());
          if (parts.length >= 2 && !Number.isNaN(Number(parts[0])) && !Number.isNaN(Number(parts[1]))) return { lat: Number(parts[0]), lng: Number(parts[1]) };
        }
        if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) return { lat: Number(loc.coordinates[1]), lng: Number(loc.coordinates[0]) };
        if (loc.lat != null && loc.lng != null) return { lat: Number(loc.lat), lng: Number(loc.lng) };
        if (loc.latitude != null && loc.longitude != null) return { lat: Number(loc.latitude), lng: Number(loc.longitude) };
        if (Array.isArray(loc) && loc.length >= 2 && !Number.isNaN(Number(loc[0])) && !Number.isNaN(Number(loc[1]))) return { lat: Number(loc[0]), lng: Number(loc[1]) };
      }
      if (source.type === 'Point' && Array.isArray(source.coordinates) && source.coordinates.length >= 2) return { lat: Number(source.coordinates[1]), lng: Number(source.coordinates[0]) };
      const nestedOrder = preference === 'out' ? [source.checkOut, source.checkIn] : [source.checkIn, source.checkOut];
      for (const nested of nestedOrder) {
        if (nested && typeof nested === 'object' && nested !== source) {
          const coords = extractCoords(nested, preference);
          if (coords) return coords;
        }
      }
      return null;
    };

    const primary = side === 'in' ? record.checkIn || record : record.checkOut || record;
    const coords = extractCoords(primary, side) || extractCoords(record, side) || extractCoords(record.employee, side) || null;

    if (coords && coords.lat != null && coords.lng != null) {
      const q = `${coords.lat},${coords.lng}`;
      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
      const coordsText = `${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)}`;
      return <LocationText coords={coords} coordsText={coordsText} mapsUrl={mapsUrl} />;
    }

    const fallbackLat = side === 'in'
      ? (record.checkInLat != null ? record.checkInLat : record.checkIn && (record.checkIn.lat != null ? record.checkIn.lat : record.checkIn.latitude))
      : (record.checkOutLat != null ? record.checkOutLat : record.checkOut && (record.checkOut.lat != null ? record.checkOut.lat : record.checkOut.latitude));
    const fallbackLng = side === 'in'
      ? (record.checkInLng != null ? record.checkInLng : record.checkIn && (record.checkIn.lng != null ? record.checkIn.lng : record.checkIn.longitude))
      : (record.checkOutLng != null ? record.checkOutLng : record.checkOut && (record.checkOut.lng != null ? record.checkOut.lng : record.checkOut.longitude));

    if (fallbackLat != null && fallbackLng != null) {
      const latNum = Number(fallbackLat);
      const lngNum = Number(fallbackLng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        const coordsText = `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`;
        const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(coordsText)}`;
        return <LocationText coords={{ lat: latNum, lng: lngNum }} coordsText={coordsText} mapsUrl={mapsUrl} />;
      }
      return <span className="text-xs text-gray-500">{`${fallbackLat}, ${fallbackLng}`}</span>;
    }

    return <span className="text-xs text-gray-400">Location unavailable</span>;
  };

  useEffect(() => {
    loadAttendance();
    loadTodayShifts();
    loadLocations();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [selectedMonth, selectedYear]);

  const loadAttendance = async () => {
    try {
      const rawData = await attendanceService.getMyAttendance(selectedMonth, selectedYear);

      // Apply 24-hour auto-checkout rule before grouping
      const processedData = processRecords(rawData);

      const data = groupByDate(processedData);
      setAttendance(data || []);

      const filteredData = filterBySelectedMonth(data);
      calculateStats(filteredData);

      const todayStr = getLocalDateStr(new Date());
      const todayRecord = (data || []).find(
        (a) => a.status !== 'absent' && getLocalDateStr(a.date) === todayStr
      );

      if (todayRecord && todayRecord.shiftInfo) {
        setTodayShiftInfo(todayRecord.shiftInfo);
      } else {
        setTodayShiftInfo(null);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayShifts = async () => {
    if (loading) return;
    setLoadingShifts(true);
    try {
      const data = await shiftService.getTodayShifts();
      setTodayShifts((data.data && data.data.todayShifts) || []);
    } catch (error) {
      console.error('Failed to load today shifts:', error);
      setTodayShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  };

  const loadLocations = async () => {
    try {
      try {
        const data = await locationService.adminGetAll();
        setLocations(Array.isArray(data) ? data : []);
      } catch (err) {
        const fallback = await locationService.getAll();
        setLocations(Array.isArray(fallback) ? fallback : []);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      setLocations([]);
    }
  };

  // ─── Calculate monthly stats ─────────────────────────────────────────────
  const calculateStats = (attendanceData) => {
    const todayStr = getLocalDateStr(new Date());

    let halfDays = 0;
    let fullDays = 0;

    attendanceData.forEach((a) => {
      const isToday = getLocalDateStr(a.date) === todayStr;

      // Skip today if still working (don't count until checked out)
      if (isToday) {
        const hasIncomplete = a.sessions && a.sessions.some((s) => !s.checkOut && !s.autoCheckedOut);
        if (hasIncomplete || a.status === 'working') return;
      }

      if (a.status === 'half-day') {
        halfDays++;
      } else if (a.status === 'present' || a.status === 'present-with-permission') {
        fullDays++;
      }
    });

    const presentDays = halfDays + fullDays;

    const totalWorkingHours = attendanceData.reduce((sum, record) => {
      const isToday = getLocalDateStr(record.date) === todayStr;
      if (isToday) {
        const completedHours = record.sessions
          .filter((s) => s.checkOut && !s.autoCheckedOut)
          .reduce((s, session) => s + (Number(session.workingHours) || 0), 0);
        return sum + completedHours;
      }
      // For non-today records, use the grouped workingHours (already excludes autoCheckedOut)
      return sum + (Number(record.workingHours) || 0);
    }, 0);

    const averageHours = presentDays > 0 ? (totalWorkingHours / presentDays).toFixed(1) : 0;
    setStats((prev) => ({ ...prev, presentDays, halfDays, fullDays, workingHours: totalWorkingHours.toFixed(1), averageHours }));
  };

  const handleCheckIn = async () => {
    if (locations && locations.length > 0) {
      setIsCheckingIn('in');
      setSelectedLocation(null);
      setShowLocationModal(true);
      setChecking(false);
      return;
    }
    await proceedWithCheckIn(null);
  };

  const proceedWithCheckIn = async (locationId) => {
    setChecking(true);
    try {
      let payload = {};
      if (locationId) payload.checkInLocation = locationId;
      if (selectedShiftId) payload.shiftId = selectedShiftId;

      const coords = await acquireLocation();
      if (coords) {
        payload.checkInLat = coords.latitude;
        payload.checkInLng = coords.longitude;
        payload.checkInAccuracy = coords.accuracy;
      }

      const response = await attendanceService.checkIn(payload);
      if (response.shiftInfo) setTodayShiftInfo(response.shiftInfo);
      await loadAttendance();
    } catch (error) {
      console.error('Check-in failed:', error);
      const errorMsg = (error.response && error.response.data && error.response.data.message) || 'Check-in failed';
      if (error.response && error.response.data && error.response.data.requiresShift) {
        const shift = error.response.data.shift || {};
        alert(`${errorMsg}\n\nShift: ${shift.name || 'Not assigned'}\nTiming: ${shift.startTime || '--'} - ${shift.endTime || '--'}`);
      } else {
        alert(errorMsg);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    if (locations && locations.length > 0) {
      setIsCheckingIn('out');
      setSelectedLocation(null);
      setShowLocationModal(true);
      setChecking(false);
      return;
    }
    await proceedWithCheckOut(null);
  };

  const proceedWithCheckOut = async (locationId) => {
    setChecking(true);
    try {
      let payload = {};
      if (locationId) payload.checkOutLocation = locationId;
      if (selectedShiftId) payload.shiftId = selectedShiftId;

      const coords = await acquireLocation();
      if (coords) {
        payload.checkOutLat = coords.latitude;
        payload.checkOutLng = coords.longitude;
        payload.checkOutAccuracy = coords.accuracy;
      }

      await attendanceService.checkOut(payload);
      await loadAttendance();
    } catch (error) {
      console.error('Check-out failed:', error);
      const errorMsg = (error.response && error.response.data && error.response.data.message) || 'Check-out failed';
      if (error.response && error.response.data && error.response.data.requiresShift) {
        const shift = error.response.data.shift || {};
        alert(`${errorMsg}\n\nShift: ${shift.name || 'Not assigned'}`);
      } else {
        alert(errorMsg);
      }
    } finally {
      setChecking(false);
    }
  };

  const handlePermissionSuccess = () => {
    loadAttendance();
  };

  const getTodayAttendance = () => {
    const todayStr = getLocalDateStr(new Date());
    return attendance.find(
      (a) => getLocalDateStr(a.date) === todayStr && a.status !== 'absent'
    );
  };

  // ─── Status badge ─────────────────────────────────────────────────────────
  const getStatusBadge = (record) => {
    const normalizedStatus = String(record?.status || '').toLowerCase();

    // 1. Working (currently checked in, today)
    if (normalizedStatus === 'working') {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Working</span>
        </div>
      );
    }

    // 2. Incomplete (past date, checked in but not checked out)
    if (normalizedStatus === 'incomplete') {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Incomplete</span>
        </div>
      );
    }

    // 3. Absent
    if (normalizedStatus === 'absent') {
      // Check if it's the 24-hour auto-absent
      const hasCheckInButNoOut = record?.checkIn && !record?.checkOut;
      const sessionsHaveOpen = record?.sessions && record.sessions.some(s => s.checkIn && !s.checkOut && !s.autoCheckedOut);
      const is24hAutoAbsent = record?.absentReason === 'not-checked-out-24h' || record?.absentReason === 'not-checked-out';
      const isAutoCheckedOut = record?.autoCheckedOut || (record?.sessions && record.sessions.some(s => s.autoCheckedOut));

      if (hasCheckInButNoOut || sessionsHaveOpen || is24hAutoAbsent || isAutoCheckedOut) {
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent (Not Checked Out)</span>
          </div>
        );
      }

      // Standard absent (no check-in, or admin marked)
      const isAutoMarked = Boolean(record?.autoMarked || record?._synthetic);
      const label = isAutoMarked ? 'Absent (Not Checked In)' : 'Absent (Admin)';
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">{label}</span>
        </div>
      );
    }

    // 4. Standard status badges
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

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ─── Generate synthetic absent rows ───────────────────────────────────────
  const getAttendanceWithAbsents = () => {
    const filteredAttendance = filterBySelectedMonth(attendance);

    if (!isCurrentMonth) {
      return [...filteredAttendance].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const now = new Date();
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);

    const recordedDates = new Set(
      filteredAttendance.map((a) => getLocalDateStr(a.date)).filter(Boolean)
    );

    const syntheticAbsents = [];
    const cursor = new Date(monthStart);

    const user = _unusedUser?.user || _unusedUser;
    const employeeData = user?.employee || user;
    const joiningDateVal = employeeData?.joiningDate || employeeData?.dateOfJoining || user?.joiningDate || user?.dateOfJoining || user?.createdAt;
    const joinDateStr = joiningDateVal ? getLocalDateStr(joiningDateVal) : null;

    while (cursor <= now) {
      const dayOfWeek = cursor.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = getLocalDateStr(cursor);
      const isToday = dateStr === getLocalDateStr(now);

      const effectiveJoinStr = joinDateStr || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const isBeforeJoining = dateStr < effectiveJoinStr;

      if (!isWeekend && !isToday && !isBeforeJoining && !recordedDates.has(dateStr)) {
        syntheticAbsents.push({
          _id: `synthetic-${cursor.toISOString()}`,
          date: new Date(cursor),
          sessions: [],
          workingHours: 0,
          status: 'absent',
          autoMarked: true,
          _synthetic: true,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return [...filteredAttendance, ...syntheticAbsents].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { value: year, label: String(year) };
  });

  const LocationSelectionModal = () => {
    if (!showLocationModal) return null;

    const handleConfirm = async () => {
      if (!selectedLocation) { alert('Please select a location'); return; }
      if (!selectedShiftId) { alert('Please select a shift'); return; }
      setShowLocationModal(false);
      if (isCheckingIn === 'in') {
        await proceedWithCheckIn(selectedLocation._id);
      } else if (isCheckingIn === 'out') {
        await proceedWithCheckOut(selectedLocation._id);
      }
    };

    const handleCancel = () => {
      setShowLocationModal(false);
      setSelectedLocation(null);
      setIsCheckingIn(null);
      setChecking(false);
    };

    const locationOptions = (locations || []).map((location) => ({ value: location._id, label: location.name }));
    const shiftOptions = (Array.isArray(todayShifts) ? todayShifts : []).map((s) => ({
      value: s._id || s.id,
      label: s.displayName || s.name || s.shiftName || `Shift ${s._id || s.id}`,
    }));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Select Location for Check-{isCheckingIn === 'in' ? 'In' : 'Out'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select the location for your attendance:</p>

          <div className="space-y-2 mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Location</label>
            <CustomSelect
              value={(selectedLocation && selectedLocation._id) || ''}
              onChange={(val) => {
                const loc = locations.find((l) => String(l._id) === String(val));
                setSelectedLocation(loc || null);
                setSelectedShiftId('');
              }}
              options={locationOptions}
              placeholder="-- Select Location --"
            />
          </div>

          <div className="space-y-2 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Shift</label>
            <CustomSelect
              value={selectedShiftId}
              onChange={(val) => setSelectedShiftId(val)}
              options={shiftOptions}
              placeholder={selectedLocation ? '-- Select Shift --' : 'Select location first'}
              disabled={!selectedLocation}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleCancel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <Button onClick={handleConfirm} disabled={!selectedLocation || checking} variant="primary" className="flex-1">
              {checking ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const todayAttendance = getTodayAttendance();
  const hasPendingShift = todayShifts.length > 0;
  const canCheckIn = hasPendingShift && (!todayAttendance || !todayAttendance.sessions || todayAttendance.sessions.every((s) => s.checkOut));
  const canCheckOut = todayAttendance && todayAttendance.sessions && todayAttendance.sessions.some((s) => s.checkIn && !s.checkOut && !s.autoCheckedOut);

  const allAttendance = getAttendanceWithAbsents();
  const absentDays = allAttendance.filter((a) => a.status === 'absent').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Attendance</h1>
          <p className="text-gray-600 dark:text-gray-300">Track your daily attendance and working hours</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <Button variant="outline" onClick={() => setPermissionModal(true)} className="flex items-center justify-center space-x-2 w-full sm:w-auto">
            <RequestQuoteIcon className="w-4 h-4" />
            <span>Request Permission</span>
          </Button>
          <Button variant="outline" onClick={() => navigate('/attendance/my-permissions')} className="flex items-center justify-center space-x-2 w-full sm:w-auto">
            <HistoryIcon className="w-4 h-4" />
            <span>View History</span>
          </Button>

          {canCheckOut ? (
            <Button variant="outline" onClick={handleCheckOut} loading={checking} size="lg" className="w-full sm:w-auto sm:min-w-32 flex items-center justify-center">
              <AccessTimeIcon className="w-5 h-5 mr-2" />
              Check Out
            </Button>
          ) : canCheckIn ? (
            <Button onClick={handleCheckIn} loading={checking} size="lg" className="w-full sm:w-auto sm:min-w-32 flex items-center justify-center">
              <AccessTimeIcon className="w-5 h-5 mr-2" />
              {todayShifts[0] && todayShifts[0].displayName ? `Check In ${todayShifts[0].displayName}` : 'Check In Next Shift'}
            </Button>
          ) : (
            <div className="text-center sm:text-right">
              <span className="text-green-600 font-semibold block">
                {hasPendingShift ? 'All shifts completed' : 'Completed for today'}
              </span>
              <span className="text-sm text-gray-500">
                {todayAttendance && todayAttendance.workingHours ? `${formatWorkingHours(todayAttendance.workingHours)} worked` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Today's status card - Only show if viewing the current month */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {isCurrentMonth && (
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title>Today's Status - {new Date().toLocaleDateString()}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold mb-1 ${todayAttendance ? 'text-green-600' : 'text-red-600'}`}>
                    {todayAttendance ? <CheckCircleIcon className="w-8 h-8 mx-auto" /> : <CancelIcon className="w-8 h-8 mx-auto" />}
                  </div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {todayAttendance ? (todayAttendance.status === 'working' ? 'Working' : (todayAttendance.sessions && todayAttendance.sessions.every((s) => s.checkOut) ? 'Completed' : 'Checked In')) : 'Not Checked In'}
                  </p>
                </div>

                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {todayAttendance && todayAttendance.sessions && todayAttendance.sessions[0] ? formatTime(todayAttendance.sessions[0].checkIn) : '--:--'}
                  </div>
                  <p className="text-sm font-medium text-gray-600">First Check In</p>
                  {todayAttendance && todayAttendance.sessions && todayAttendance.sessions[0] && (
                    <div className="mt-2 break-words">{renderLocation(todayAttendance.sessions[0], 'in')}</div>
                  )}
                </div>

                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {todayAttendance && todayAttendance.sessions && todayAttendance.sessions.length > 0 ? formatTime(todayAttendance.sessions[todayAttendance.sessions.length - 1].checkOut) : '--:--'}
                  </div>
                  <p className="text-sm font-medium text-gray-600">Last Check Out</p>
                  {todayAttendance && todayAttendance.sessions && todayAttendance.sessions.length > 0 && (
                    <div className="mt-2 break-words">{renderLocation(todayAttendance.sessions[todayAttendance.sessions.length - 1], 'out')}</div>
                  )}
                </div>
              </div>

              {todayAttendance && todayAttendance.workingHours > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-700">Total Working Hours:</span>
                    <span className="text-lg font-bold text-blue-900">{formatWorkingHours(todayAttendance.workingHours)}</span>
                  </div>
                </div>
              )}

              {(todayShiftInfo || (todayAttendance && todayAttendance.shiftName)) && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ScheduleIcon className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-700">Shift:</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-purple-900">
                        {(todayShiftInfo && todayShiftInfo.name) || (todayAttendance && todayAttendance.shiftName)}
                      </span>
                      {todayShiftInfo && todayShiftInfo.startTime && todayShiftInfo.endTime && (
                        <span className="text-sm text-purple-600 ml-2">({todayShiftInfo.startTime} - {todayShiftInfo.endTime})</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Monthly summary card */}
        <Card className={isCurrentMonth ? "lg:col-span-2" : "lg:col-span-4"}>
          <Card.Header>
            <Card.Title>
              Monthly Summary - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 mb-1">{stats.halfDays}</div>
                <p className="text-sm font-medium text-orange-700">Half Day Present</p>
                <AccessTimeIcon className="w-5 h-5 text-orange-600 mx-auto mt-1" />
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">{stats.fullDays}</div>
                <p className="text-sm font-medium text-green-700">Full Day Present</p>
                <EventAvailableIcon className="w-5 h-5 text-green-600 mx-auto mt-1" />
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">{formatWorkingHours(stats.workingHours, { emptyValue: '0h 0m' })}</div>
                <p className="text-sm font-medium text-blue-700">Total Hours</p>
                <ScheduleIcon className="w-5 h-5 text-blue-600 mx-auto mt-1" />
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">{formatWorkingHours(stats.averageHours, { emptyValue: '0h 0m' })}</div>
                <p className="text-sm font-medium text-purple-700">Avg Hours/Day</p>
                <TrendingUpIcon className="w-5 h-5 text-purple-600 mx-auto mt-1" />
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600 mb-1">{absentDays}</div>
                <p className="text-sm font-medium text-red-700">Total Absent</p>
                <CancelIcon className="w-5 h-5 text-red-600 mx-auto mt-1" />
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Attendance history table */}
      <Card>
        <Card.Header>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Card.Title className="flex items-center">
              <HistoryIcon className="w-5 h-5 mr-2 text-gray-600" />
              Attendance History
            </Card.Title>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-40">
                <CustomSelect value={selectedMonth} onChange={(val) => setSelectedMonth(parseInt(val))} options={monthOptions} />
              </div>
              <div className="w-full sm:w-28">
                <CustomSelect value={selectedYear} onChange={(val) => setSelectedYear(parseInt(val))} options={yearOptions} />
              </div>
            </div>
          </div>
        </Card.Header>
        <Card.Content>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto -mx-px scrollbar-hide">
            <table className="w-full min-w-[760px] divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Day</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Check In / Check Out</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Working Hours</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Office Location</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Shift</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {allAttendance.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(record.date)}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </td>
                   <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
  {!record._synthetic && record.sessions && record.sessions.length > 0 ? (
    <div className="space-y-2">
      {record.sessions.length === 1 ? (
        <div className="space-y-1">
          <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1">
            <span>{formatTime(record.sessions[0].checkIn)}</span>
            <span>→</span>
            {record.sessions[0].autoCheckedOut
              ? <span className="text-red-500 text-xs font-medium whitespace-nowrap">Not checked out</span>
              : record.sessions[0].checkOut
                ? <span>{formatTime(record.sessions[0].checkOut)}</span>
                : <span className="text-gray-400">--:--</span>}
          </div>
          <div className="text-xs text-gray-500">
            {renderLocationGpsOnly(record.sessions[0], 'in')}
            {record.sessions[0].checkOut
              ? <> → {renderLocationGpsOnly(record.sessions[0], 'out')}</>
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
        record.sessions.map((session, idx) => (
          <div key={idx} className="border-l-2 border-primary-200 pl-2 mb-1">
            <div className="flex items-start gap-1.5">
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded shrink-0 mt-0.5">
                #{idx + 1}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap flex items-center gap-1">
                  <span>{formatTime(session.checkIn)}</span>
                  <span>→</span>
                  {session.autoCheckedOut
                    ? <span className="text-red-500 text-xs font-medium whitespace-nowrap">Not checked out</span>
                    : session.checkOut
                      ? <span>{formatTime(session.checkOut)}</span>
                      : <span className="text-gray-400">--:--</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {renderLocationGpsOnly(session, 'in')}
                </div>
                {session.checkOut
                  ? <div className="text-xs text-gray-500 flex items-center gap-1">
                      <span>→</span>
                      {renderLocationGpsOnly(session, 'out')}
                    </div>
                  : (() => {
                      const elapsed = Date.now() - new Date(session.checkIn).getTime();
                      return elapsed >= 24 * 60 * 60 * 1000
                        ? <div className="text-xs text-gray-400 flex items-center gap-1">
                            <span>→</span>
                            <span>No location</span>
                          </div>
                        : null;
                    })()
                }
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  ) : (
    record._synthetic || record.status === 'absent'
      ? <span className="text-xs font-medium text-red-500">Not Checked In</span>
      : <span className="text-gray-400">--</span>
  )}
</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatWorkingHours(record.workingHours)}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
  {(() => {
    if (!record.sessions || record.sessions.length === 0) return <span className="text-gray-400">--</span>;
    // Try checkInLocation from first session or record
    const firstSession = record.sessions[0];
    const locationObj = firstSession?.checkInLocation || record.sessions.map(s => s.checkInLocation).find(Boolean);
    if (locationObj) {
      const name = typeof locationObj === 'string'
        ? locationObj
        : locationObj.name || locationObj.locationName || locationObj.address || '';
      if (name) return (
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">
          {name}
        </span>
      );
    }
    return <span className="text-gray-400">--</span>;
  })()}
</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {record.shiftName ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs">
                          <ScheduleIcon className="w-3 h-3 mr-1" />
                          {record.shiftName}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">{getStatusBadge(record)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {allAttendance.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <CalendarMonthIcon className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500">No attendance records found for selected period</p>
                <p className="text-sm text-gray-400 mt-2">Select a different month or year to view attendance history</p>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      <PermissionModal isOpen={permissionModal} onClose={() => setPermissionModal(false)} onSuccess={handlePermissionSuccess} />
      <LocationSelectionModal />
    </div>
  );
};

export default Attendance;