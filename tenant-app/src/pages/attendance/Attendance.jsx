/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';

// eslint-disable-next-line no-unused-vars
const __eslintUnused = null;
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PermissionModal from './PermissionModal';
import { useNavigate } from 'react-router-dom';
import { attendanceService, permissionService, shiftService, locationService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { formatWorkingHours } from '../../utils/time';

/*
 * NOTE: This file contains a large number of optional UI helpers.
 * ESLint rules in this repo may flag some unused vars in the legacy code.
 */

// Material-UI Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

const LocationText = ({ coords, coordsText, mapsUrl }) => {
  const hasCoords = Boolean(coords && coords.lat != null && coords.lng != null);
  const [place, setPlace] = useState(null);
  const [loadingPlace, setLoadingPlace] = useState(hasCoords);

  useEffect(() => {
    if (!hasCoords) {
      setLoadingPlace(false);
      return;
    }

    const cacheKey = `loc:${Number(coords.lat).toFixed(5)},${Number(coords.lng).toFixed(5)}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setPlace(cached);
        setLoadingPlace(false);
        return;
      }
    } catch (e) {
      // ignore sessionStorage errors
    }

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
          const locality = a.city || a.town || a.village || a.hamlet || a.county;
          const state = a.state || a.region || a.state_district;
          const country = a.country;
          const parts = [];
          if (locality) parts.push(locality);
          if (state) parts.push(state);
          if (country) parts.push(country);
          if (parts.length > 0) label = parts.join(', ');
        }
        if (!label && data && data.display_name) label = data.display_name;
        if (!cancelled && label) {
          setPlace(label);
          try {
            sessionStorage.setItem(cacheKey, label);
          } catch (err) {
            // ignore storage errors
          }
        }
      } catch (e) {
        // ignore fetch errors
      } finally {
        if (!cancelled) setLoadingPlace(false);
      }
    };

    fetchPlace();
    return () => {
      cancelled = true;
    };
  }, [coords, hasCoords]);

  if (!hasCoords) {
    return <span className="text-xs text-gray-400">Location unavailable</span>;
  }

  const label = place || (loadingPlace ? 'Resolving location...' : coordsText || 'Open map');

  return (
    <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
      <span>{label}</span>
      {mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline" title={coordsText}>
          Open
        </a>
      ) : null}
    </span>
  );
};

const Attendance = () => {
  const _unusedUser = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [permissionModal, setPermissionModal] = useState(false);
  const [stats, setStats] = useState({
    presentDays: 0,
    workingHours: 0,
    averageHours: 0,
    pendingPermissions: 0
  });
  const [todayShiftInfo, setTodayShiftInfo] = useState(null);
  const [todayShifts, setTodayShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(null); // 'in' or 'out'
  const [selectedShiftId, setSelectedShiftId] = useState('');

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
        if (status && status.state === 'denied') {
          return null;
        }
      } catch (err) {
        // ignore permission query failures
      }
    }

    return new Promise((resolve) => {
      const onSuccess = (pos) => resolve(pos.coords);
      const onError = () => resolve(null);

      try {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        });
      } catch (err) {
        resolve(null);
      }
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

  const renderLocation = (record, side) => {
    if (!record) return <span className="text-xs text-gray-400">Location unavailable</span>;

    const place =
      side === 'in'
        ? record.checkInPlace ||
          record.checkInLocation ||
          record.checkInAddress ||
          record.checkIn_location ||
          (record.checkIn && record.checkIn.place) ||
          (record.checkIn && record.checkIn.placeName) ||
          (record.checkIn && record.checkIn.locationName)
        : record.checkOutPlace ||
          record.checkOutLocation ||
          record.checkOutAddress ||
          record.checkOut_location ||
          (record.checkOut && record.checkOut.place) ||
          (record.checkOut && record.checkOut.placeName) ||
          (record.checkOut && record.checkOut.locationName);

    if (place) {
      if (typeof place === 'string') {
        return <span className="text-xs text-gray-500">{place}</span>;
      }
      if (typeof place === 'object') {
        const asName = (place && place.name) || (place && place.title) || null;
        if (asName) {
          return <span className="text-xs text-gray-500">{asName}</span>;
        }
        try {
          return <span className="text-xs text-gray-500">{String(place)}</span>;
        } catch (err) {
          // ignore stringify errors
        }
      }
      return <span className="text-xs text-gray-500">{String(place)}</span>;
    }

    if (side === 'out') {
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

    const extractCoords = (source, preference) => {
      if (!source) return null;
      if ((source.lat || source.latitude || source.latlng) && (source.lng || source.longitude || source.lon)) {
        const lat = source.lat != null ? source.lat : source.latitude != null ? source.latitude : source.latlng ? source.latlng[0] : null;
        const lng = source.lng != null ? source.lng : source.longitude != null ? source.longitude : source.lon != null ? source.lon : source.latlng ? source.latlng[1] : null;
        if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) };
      }

      const candidates = [];
      if (preference === 'out') {
        candidates.push({ lat: source.checkOutLat, lng: source.checkOutLng });
        candidates.push({ lat: source.checkInLat, lng: source.checkInLng });
      } else {
        candidates.push({ lat: source.checkInLat, lng: source.checkInLng });
        candidates.push({ lat: source.checkOutLat, lng: source.checkOutLng });
      }
      for (const candidate of candidates) {
        if (candidate && candidate.lat != null && candidate.lng != null) {
          return { lat: Number(candidate.lat), lng: Number(candidate.lng) };
        }
      }

      if (source.location) {
        const loc = source.location;
        if (typeof loc === 'string') {
          const parts = loc.split(',').map((p) => p.trim());
          if (parts.length >= 2 && !Number.isNaN(Number(parts[0])) && !Number.isNaN(Number(parts[1]))) {
            return { lat: Number(parts[0]), lng: Number(parts[1]) };
          }
        }
        if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
          return { lat: Number(loc.coordinates[1]), lng: Number(loc.coordinates[0]) };
        }
        if (loc.lat != null && loc.lng != null) return { lat: Number(loc.lat), lng: Number(loc.lng) };
        if (loc.latitude != null && loc.longitude != null) return { lat: Number(loc.latitude), lng: Number(loc.longitude) };
        if (Array.isArray(loc) && loc.length >= 2 && !Number.isNaN(Number(loc[0])) && !Number.isNaN(Number(loc[1]))) {
          return { lat: Number(loc[0]), lng: Number(loc[1]) };
        }
      }

      if (source.type === 'Point' && Array.isArray(source.coordinates) && source.coordinates.length >= 2) {
        return { lat: Number(source.coordinates[1]), lng: Number(source.coordinates[0]) };
      }

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

    const fallbackLat =
      side === 'in'
        ? record.checkInLat != null ? record.checkInLat : record.checkIn && (record.checkIn.lat != null ? record.checkIn.lat : record.checkIn.latitude)
        : record.checkOutLat != null ? record.checkOutLat : record.checkOut && (record.checkOut.lat != null ? record.checkOut.lat : record.checkOut.latitude);
    const fallbackLng =
      side === 'in'
        ? record.checkInLng != null ? record.checkInLng : record.checkIn && (record.checkIn.lng != null ? record.checkIn.lng : record.checkIn.longitude)
        : record.checkOutLng != null ? record.checkOutLng : record.checkOut && (record.checkOut.lng != null ? record.checkOut.lng : record.checkOut.longitude);

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

    if (import.meta && import.meta.env && import.meta.env.MODE === 'development') {
      // eslint-disable-next-line no-console
      console.debug('Attendance page renderLocation: missing coordinates', {
        id: record._id || getId(record.employee)
      });
    }

    return <span className="text-xs text-gray-400">Location unavailable</span>;
  };

  useEffect(() => {
    loadAttendance();
    loadPermissions();
    loadTodayShifts();
    loadLocations();
  }, []);

  useEffect(() => {
    loadAttendance();
    loadPermissions();
  }, [selectedMonth, selectedYear]);

  const loadAttendance = async () => {
    try {
      const data = await attendanceService.getMyAttendance(selectedMonth, selectedYear);
      setAttendance(data);
      calculateStats(data);

      const today = new Date().toDateString();
      const todayRecords = data.filter((a) => new Date(a.date).toDateString() === today);
      if (todayRecords.length > 0) {
        const latest = todayRecords[todayRecords.length - 1];
        if (latest && latest.shiftInfo) {
          setTodayShiftInfo(latest.shiftInfo);
        }
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

  const loadPermissions = async () => {
    try {
      const data = await permissionService.getMyPermissions(selectedMonth, selectedYear, 'pending');
      setPermissions(data);
      updatePermissionStats(data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const calculateStats = (attendanceData) => {
    const presentDays = attendanceData.filter(
      (a) => a.status === 'present' || a.status === 'half-day' || a.status === 'present-with-permission'
    ).length;
    const totalWorkingHours = attendanceData.reduce((sum, record) => sum + (Number(record.workingHours) || 0), 0);
    const averageHours = presentDays > 0 ? (totalWorkingHours / presentDays).toFixed(1) : 0;

    setStats((prev) => ({
      ...prev,
      presentDays,
      workingHours: totalWorkingHours.toFixed(1),
      averageHours
    }));
  };

  const updatePermissionStats = (permissionData) => {
    setStats((prev) => ({
      ...prev,
      pendingPermissions: permissionData.length
    }));
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
      if (locationId) {
        payload.checkInLocation = locationId;
      }
      if (selectedShiftId) {
        payload.shiftId = selectedShiftId;
      }

      const coords = await acquireLocation();
      if (coords) {
        payload.checkInLat = coords.latitude;
        payload.checkInLng = coords.longitude;
        payload.checkInAccuracy = coords.accuracy;
      }

      const response = await attendanceService.checkIn(payload);
      if (response.shiftInfo) {
        setTodayShiftInfo(response.shiftInfo);
      }
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
      if (locationId) {
        payload.checkOutLocation = locationId;
      }
      if (selectedShiftId) {
        payload.shiftId = selectedShiftId;
      }

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
    loadPermissions();
  };

  const getTodayAttendance = () => {
    const today = new Date().toDateString();
    return attendance.find((a) => new Date(a.date).toDateString() === today);
  };

  const reloadShiftsAfterCheckout = async () => {
    await loadTodayShifts();
    await loadAttendance();
  };

  const getStatusBadge = (record) => {
    if (!record.checkIn) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent</span>;
    }

    if (!record.checkOut) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Working</span>;
    }

    switch (record.status) {
      case 'present':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Present</span>;
      case 'half-day':
        return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">Half Day</span>;
      case 'present-with-permission':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">With Permission</span>;
      case 'absent':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Absent</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const LocationSelectionModal = () => {
    if (!showLocationModal) return null;

    const handleConfirm = async () => {
      if (!selectedLocation) {
        alert('Please select a location');
        return;
      }

      if (!selectedShiftId) {
        alert('Please select a shift');
        return;
      }

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

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Select Location for Check-{isCheckingIn === 'in' ? 'In' : 'Out'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">Select the location for your attendance:</p>

          <div className="space-y-2 mb-3">
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <select
              value={(selectedLocation && selectedLocation._id) || ''}
              onChange={(ev) => {
                const loc = locations.find((l) => String(l._id) === ev.target.value);
                setSelectedLocation(loc || null);
                setSelectedShiftId('');
                setTimeout(() => {
                  const el = document.getElementById('attendance-shift-select');
                  if (el && el.focus) el.focus();
                }, 0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <option value="">-- Select Location --</option>
              {(locations || []).map((location) => (
                <option key={location._id} value={location._id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 mb-6">
            <label className="block text-sm font-medium text-gray-700">Shift</label>
            {selectedLocation ? (
              <select
                id="attendance-shift-select"
                value={selectedShiftId}
                onChange={(ev) => setSelectedShiftId(ev.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <option value="">-- Select Shift --</option>
                {(Array.isArray(todayShifts) ? todayShifts : []).map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.displayName || s.name || s.shiftName || `Shift ${s._id || s.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <select value="" disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400">
                <option value="">Select location first</option>
              </select>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
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
  const canCheckIn = hasPendingShift && (!todayAttendance || !todayAttendance.checkIn);
  const canCheckOut = todayAttendance && todayAttendance.checkIn && !todayAttendance.checkOut;

  const ShiftSelect = ({ disabled, label, value, onChange }) => {
    const shiftLabel = label || 'Shift';
    const shifts = Array.isArray(todayShifts) ? todayShifts : [];

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{shiftLabel}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !shifts.length}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
        >
          <option value="">-- Select Shift --</option>
          {shifts.map((s) => (
            <option key={s._id || s.id} value={s._id || s.id}>
              {s.displayName || s.name || s.shiftName || `Shift ${s._id || s.id}`}
            </option>
          ))}
        </select>
        {!shifts.length && <div className="text-xs text-gray-500">No shifts available for today</div>}
      </div>
    );
  };

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
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600">Track your daily attendance and working hours</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                  {todayAttendance ? (todayAttendance.checkOut ? 'Completed' : 'Checked In') : 'Not Checked In'}
                </p>
              </div>

              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatTime(todayAttendance && todayAttendance.checkIn)}</div>
                <p className="text-sm font-medium text-gray-600">Check In</p>
                <div className="mt-2 break-words">{renderLocation(todayAttendance, 'in')}</div>
              </div>

              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatTime(todayAttendance && todayAttendance.checkOut)}</div>
                <p className="text-sm font-medium text-gray-600">Check Out</p>
                <div className="mt-2 break-words">{renderLocation(todayAttendance, 'out')}</div>
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
                      <span className="text-sm text-purple-600 ml-2">
                        ({todayShiftInfo.startTime} - {todayShiftInfo.endTime})
                      </span>
                    )}
                  </div>
                </div>
                {todayAttendance && todayAttendance.checkInStatus && (
                  <div className="mt-2 flex items-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        todayAttendance.checkInStatus === 'late'
                          ? 'bg-yellow-100 text-yellow-800'
                          : todayAttendance.checkInStatus === 'on-time'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {todayAttendance.checkInStatus === 'late'
                        ? 'Late Check-in'
                        : todayAttendance.checkInStatus === 'on-time'
                        ? 'On Time'
                        : todayAttendance.isLateCheckIn
                        ? 'Late'
                        : 'Normal'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>
              Monthly Summary - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">{stats.presentDays}</div>
                <p className="text-sm font-medium text-green-700">Present Days</p>
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

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 mb-1">{stats.pendingPermissions}</div>
                <p className="text-sm font-medium text-orange-700">Pending Requests</p>
                <PendingActionsIcon className="w-5 h-5 text-orange-600 mx-auto mt-1" />
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {permissions.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center">
              <PendingActionsIcon className="w-5 h-5 mr-2 text-orange-600" />
              Pending Permission Requests ({permissions.length})
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {permissions.map((permission) => (
                <div key={permission._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-orange-800 capitalize">
                        {permission.permissionType && permission.permissionType.replace('-', ' ')}
                      </span>
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">Pending</span>
                    </div>
                    <p className="text-sm text-orange-700">{permission.reason}</p>
                    <div className="flex items-center space-x-4 text-xs text-orange-600 mt-1">
                      <span>
                        {new Date(permission.date).toLocaleDateString()} - {formatTime(permission.startTime)} to {formatTime(permission.endTime)}
                      </span>
                      <span>-</span>
                      <span>{permission.duration}h</span>
                    </div>
                  </div>
                  <div className="text-sm text-orange-600 sm:text-right">Applied {new Date(permission.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      <Card>
        <Card.Header>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Card.Title className="flex items-center">
              <HistoryIcon className="w-5 h-5 mr-2 text-gray-600" />
              Attendance History
            </Card.Title>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year} className="dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                      {year}
                    </option>
                  );
                })}
              </select>
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
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Check In</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Check Out</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Working Hours</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Shift</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {attendance.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(record.date)}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatTime(record.checkIn)}
                      <div className="mt-1">{renderLocation(record, 'in')}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatTime(record.checkOut)}
                      <div className="mt-1">{renderLocation(record, 'out')}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatWorkingHours(record.workingHours)}</td>
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

            {attendance.length === 0 && (
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