/* eslint-disable no-unused-vars */
/* eslint-disable no-constant-binary-expression */
//employeeDashboard.jsx
import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PermissionModal from '../attendance/PermissionModal';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dashboardService, attendanceService, permissionService, leaveService, locationService, shiftService } from '../../services/auth';
import { formatWorkingHours } from '../../utils/time';

// NOTE: Employee shift fetching uses shiftService.getTodayShifts() which calls GET /api/shifts/today
// That endpoint is tenant-scoped and requires a valid tenant + auth context.

import Toast from '../../components/ui/Toast'; // Add Toast component for better UX

// Material-UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import HistoryIcon from '@mui/icons-material/WorkHistory';
import PaidIcon from '@mui/icons-material/Paid';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const StatCard = ({ title, value, subtitle, icon, color, loading, onClick, clickable = false }) => (
  <Card
    className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 ${clickable ? 'cursor-pointer transform hover:scale-[1.02]' : ''
      }`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        {loading ? (
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
        )}
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color} transition-colors duration-300 group-hover:scale-110`}>
        {icon}
      </div>
    </div>
    {clickable && (
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <TrendingFlatIcon className="w-4 h-4 text-gray-400" />
      </div>
    )}
  </Card>
);

const QuickActionCard = ({ title, description, icon, color, onClick, buttonText }) => (
  <Card className="group hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-gray-100">
    <Card.Content className="p-6">
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${color} transition-colors duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
            {title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
      <Button
        onClick={onClick}
        variant="outline"
        size="sm"
        className="w-full mt-4 justify-center"
      >
        {buttonText}
      </Button>
    </Card.Content>
  </Card>
);

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [permissionStats, setPermissionStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [pendingPermissionsCount, setPendingPermissionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [permissionModal, setPermissionModal] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({
    isCheckedIn: false,
    activeSession: null,
    latestCompletedSession: null,
    todayCompletedSessions: [],
    overallTodayWorkedHours: 0
  });
  const [liveWorkingHours, setLiveWorkingHours] = useState(0);

  // Location states for check-in popup
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [pendingCheckInParams, setPendingCheckInParams] = useState({ shiftId: null, shiftName: null });
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Toast/Snackbar state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Multi-shift states
  const [todayShifts, setTodayShifts] = useState([]);
  useEffect(() => {
    loadDashboardData();
    loadPermissionStats();
    loadLeadPendingRequests();
    loadLocations();
    loadTodayShifts();
    loadAttendanceStatus();
  }, [user?.role]);

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load tenant locations
  const loadLocations = async () => {
    try {
      console.log('ðŸ”„ Loading tenant locations...');
      const response = await locationService.getAll();
      console.log('âœ… Tenant locations loaded:', response);
      setLocations(response || []);
      if (response && response.length > 0) {
        setSelectedLocationId(response[0]._id);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      setLocations([]);
    }
  };

  // Load multi-shift information
  const loadTodayShifts = async () => {
    setLoadingShifts(true);
    try {
      console.log('ðŸ”„ Loading today shifts...');

      // Admin-created shifts for this tenant.
      // This dropdown should show ALL tenant shifts that are active for "today".
      // Backend endpoint: GET /api/shifts/today
      const response = await shiftService.getTodayShifts();
      console.log('âœ… Today shifts response:', response);

      // Expected backend: { success: true, data: { todayShifts: [...] } }
      const todayShiftsFromApi = response?.data?.data?.todayShifts
        || response?.data?.todayShifts
        || response?.todayShifts;
      const list = Array.isArray(todayShiftsFromApi)
        ? todayShiftsFromApi
        : Array.isArray(response?.data?.todayShifts)
          ? response.data.todayShifts
          : [];

      // Ensure dropdown uses the same data shape for both the overview card + modal.
      // We only want name/startTime/endTime/_id plus the computed flags (status/canCheckIn).
      const normalized = list.map((s) => ({
        _id: s._id || s.id || s._doc?._id,
        name: s.name ?? s.displayName ?? 'Shift',
        displayName: s.displayName,
        startTime: s.startTime,
        endTime: s.endTime,
        isNightShift: s.isNightShift,
        status: s.status,
        canCheckIn: s.canCheckIn,
        canCheckOut: s.canCheckOut,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        checkInWindow: s.checkInWindow,
        workingHours: s.workingHours
      })).filter((shift) => shift._id);

      console.log('âœ… Resolved todayShifts length:', normalized.length, normalized);
      setTodayShifts(normalized);

    } catch {
      // Keep UI resilient if shifts endpoint fails
      setTodayShifts([]);
    } finally {
      setLoadingShifts(false);
    }

  };

  const calculateLiveHours = (checkInTime) => {
    if (!checkInTime) return 0;
    const diffMs = Date.now() - new Date(checkInTime).getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
    return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  };

  const calculateSessionHours = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return 0;
    const diffMs = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
    return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  };

  const getSessionWorkingHours = (session) => {
    const calculated = calculateSessionHours(session?.checkIn, session?.checkOut);
    return calculated > 0 ? calculated : Number(session?.workingHours || 0);
  };

  useEffect(() => {
    const activeCheckIn = attendanceStatus?.activeSession?.checkIn || attendanceStatus?.checkInTime;
    if (!activeCheckIn) {
      setLiveWorkingHours(0);
      return undefined;
    }

    setLiveWorkingHours(calculateLiveHours(activeCheckIn));
    const timer = setInterval(() => {
      setLiveWorkingHours(calculateLiveHours(activeCheckIn));
    }, 30000);

    return () => clearInterval(timer);
  }, [attendanceStatus?.activeSession?.checkIn, attendanceStatus?.checkInTime]);

  const loadAttendanceStatus = async () => {
    try {
      const status = await attendanceService.getStatus();
      setAttendanceStatus({
        isCheckedIn: Boolean(status?.activeSession || status?.isCheckedIn),
        activeSession: status?.activeSession || null,
        latestCompletedSession: status?.latestCompletedSession || null,
        todayCompletedSessions: Array.isArray(status?.todayCompletedSessions) ? status.todayCompletedSessions : [],
        overallTodayWorkedHours: Number(status?.overallTodayWorkedHours || 0),
        activeAttendanceId: status?.activeAttendanceId || status?.activeSession?._id || null,
        checkInTime: status?.checkInTime || status?.activeSession?.checkIn || null
      });
    } catch (error) {
      console.error('Failed to load attendance status:', error);
      setAttendanceStatus({
        isCheckedIn: false,
        activeSession: null,
        latestCompletedSession: null,
        todayCompletedSessions: [],
        overallTodayWorkedHours: 0
      });
    }
  };


  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const [dashboardData, myAttendance, currentStatus] = await Promise.all([
        dashboardService.getEmployeeDashboard(),
        attendanceService.getMyAttendance(now.getMonth() + 1, now.getFullYear()),
        attendanceService.getStatus().catch(() => null)
      ]);
      console.log('Dashboard data received:', dashboardData);
      if (currentStatus) {
        setAttendanceStatus({
          isCheckedIn: Boolean(currentStatus?.activeSession || currentStatus?.isCheckedIn),
          activeSession: currentStatus?.activeSession || null,
          latestCompletedSession: currentStatus?.latestCompletedSession || null,
          todayCompletedSessions: Array.isArray(currentStatus?.todayCompletedSessions) ? currentStatus.todayCompletedSessions : [],
          overallTodayWorkedHours: Number(currentStatus?.overallTodayWorkedHours || 0),
          activeAttendanceId: currentStatus?.activeAttendanceId || currentStatus?.activeSession?._id || null,
          checkInTime: currentStatus?.checkInTime || currentStatus?.activeSession?.checkIn || null
        });
      }
      const attendanceList = Array.isArray(myAttendance) ? myAttendance : [];
      setAttendanceRecords(attendanceList);

      const hasCheckoutValue = (value) => value !== undefined && value !== null && value !== '';
      const getAttendanceDateKey = (record) => new Date(record?.date || record?.checkIn).toDateString();
      const todayKey = new Date().toDateString();
      const todaysRecords = attendanceList.filter(record => getAttendanceDateKey(record) === todayKey);
      const activeTodayRecord = todaysRecords.find(record => record.checkIn && !hasCheckoutValue(record.checkOut));
      const latestTodayRecord = [...todaysRecords].sort(
        (a, b) => new Date(b.checkIn || b.date) - new Date(a.checkIn || a.date)
      )[0] || null;

      setData({
        todaysAttendance: activeTodayRecord || latestTodayRecord || dashboardData.todaysAttendance || null,
        monthlyStats: dashboardData.monthlyStats || {
          presentDays: 0,
          halfDays: 0,
          totalWorkingHours: 0,
          averageHours: 0
        },
        currentPayroll: dashboardData.currentPayroll,
        upcomingLeaves: dashboardData.upcomingLeaves || []
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPermissionStats = async () => {
    try {
      const stats = await permissionService.getStats();
      setPermissionStats(stats);
    } catch (error) {
      console.error('Failed to load permission stats:', error);
    }
  };

  const loadLeadPendingRequests = async () => {
    if (user?.role !== 'team-lead') return;

    try {
      const [leavesResp, permsResp] = await Promise.all([
        leaveService.getLeadPendingLeaves('pending'),
        permissionService.getLeadPendingPermissions('pending')
      ]);
      setPendingLeavesCount(Array.isArray(leavesResp) ? leavesResp.length : 0);
      setPendingPermissionsCount(Array.isArray(permsResp) ? permsResp.length : 0);
    } catch (error) {
      console.error('Failed to load lead pending requests:', error);
      setPendingLeavesCount(0);
      setPendingPermissionsCount(0);
    }
  };

  const getPreciseLocation = async () => {
    const timeoutMs = 2000;
    const accuracyThreshold = 100;

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      let bestPosition = null;
      let watchId;
      let timerId;

      const cleanup = () => {
        if (watchId !== undefined) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (timerId) {
          clearTimeout(timerId);
        }
      };

      const onLocationUpdate = (pos) => {
        if (!bestPosition || (pos.coords.accuracy < bestPosition.coords.accuracy)) {
          bestPosition = pos;
        }

        if (pos.coords.accuracy <= accuracyThreshold) {
          cleanup();
          resolve(pos);
        }
      };

      const onError = (error) => {
        cleanup();
        if (bestPosition) {
          resolve(bestPosition);
        } else {
          if (error.code === 1) {
            cleanup();
            reject(error);
          } else {
            reject(error);
          }
        }
      };

      try {
        watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 60000
        });
      } catch (err) {
        cleanup();
        reject(err);
      }

      timerId = setTimeout(() => {
        cleanup();
        if (bestPosition) {
          resolve(bestPosition);
        } else {
          reject(new Error('Unable to retrieve location within timeout'));
        }
      }, timeoutMs);
    });
  };

  const refreshAttendanceData = () => {
    Promise.all([
      loadAttendanceStatus(),
      loadDashboardData(),
      loadTodayShifts()
    ]).catch((error) => {
      console.error('Failed to refresh attendance data:', error);
    });
  };

  // Intercept check-in to request location first
  const triggerCheckIn = async (shiftId = null, shiftName = null) => {
    setPendingCheckInParams({ shiftId, shiftName });
    if (locations && locations.length > 0) {
      setSelectedLocationId(locations[0]._id);
    } else {
      setSelectedLocationId('');
    }
    setIsCheckInModalOpen(true);
    await loadTodayShifts();
  };

  // Check-in for a specific shift
  const handleCheckIn = async (shiftId = null, shiftName = null, locationId = null) => {
    setChecking(true);
    setCheckingStatus('locating');

    try {
      let payload = {};

      if (navigator.geolocation) {
        try {
          const pos = await getPreciseLocation();
          payload = {
            checkInLat: pos.coords.latitude,
            checkInLng: pos.coords.longitude,
            checkInAccuracy: pos.coords.accuracy,
          };
          console.log('ðŸ“ Location obtained:', payload);
        } catch (geoErr) {
          console.warn('Geolocation failed:', geoErr);
        }
      }

      if (shiftId) {
        payload.shiftId = shiftId;
      }

      if (locationId) {
        payload.checkInLocation = locationId;
      }

      setCheckingStatus('submitting');
      const response = await attendanceService.checkIn(payload);
      setIsCheckInModalOpen(false);
      setLiveWorkingHours(0);
      console.log('âœ… Check-in response:', response);

      // Refresh all data
      // Show success message with working hours if available
      const workingHours = response?.data?.workingHours || response?.workingHours || data?.todaysAttendance?.workingHours;
      const shiftMessage = shiftName ? ` for ${shiftName} shift` : '';
      const hoursMessage = workingHours ? ` You've worked ${formatWorkingHours(workingHours)} so far.` : '';
      showToast(` Check-in successful${shiftMessage}!${hoursMessage}`, 'success');
      refreshAttendanceData();

    } catch (error) {
      console.error(' Check-in failed:', error);
      showToast(error.response?.data?.message || 'Check-in failed. Please try again.', 'error');
    } finally {
      setChecking(false);
      setCheckingStatus('');
    }
  };

  // Check-out from current active shift
  const handleCheckOut = async () => {
    setChecking(true);
    setCheckingStatus('locating');

    try {
      let payload = {};

      if (navigator.geolocation) {
        try {
          const pos = await getPreciseLocation();
          payload = {
            checkOutLat: pos.coords.latitude,
            checkOutLng: pos.coords.longitude,
            checkOutAccuracy: pos.coords.accuracy
          };
        } catch (err) {
          console.warn('Checkout location failed:', err);
        }
      }

      if (attendanceStatus?.activeAttendanceId) {
        payload.attendanceId = attendanceStatus.activeAttendanceId;
      }

      setCheckingStatus('submitting');
      const response = await attendanceService.checkOut(payload);

      setLiveWorkingHours(0);

      // Calculate working hours from response or data
      const workingHours = response?.workingHours || response?.data?.workingHours || data?.todaysAttendance?.workingHours;
      const hoursMessage = workingHours ? ` Total working hours: ${formatWorkingHours(workingHours)}.` : '';
      showToast(` Check-out successful!${hoursMessage} Have a great day!`, 'success');
      refreshAttendanceData();

    } catch (error) {
      console.error('Check-out failed:', error);
      showToast(error.response?.data?.message || 'Check-out failed. Please try again.', 'error');
    } finally {
      setChecking(false);
      setCheckingStatus('');
    }
  };

  const handlePermissionSuccess = () => {
    loadPermissionStats();
    loadDashboardData();
    showToast('Permission request submitted successfully!', 'success');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      loadDashboardData(),
      loadPermissionStats(),
      loadTodayShifts()
    ]).then(() => {
      showToast('Dashboard refreshed!', 'success');
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '--:--';
    }
  };

  const formatShiftTime = (timeString) => {
    if (!timeString) return '--:--';
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      return timeString;
    }
  };

  const getPendingPermissionsCount = () => {
    if (!permissionStats?.yearlyStats) return 0;
    const pendingStat = permissionStats.yearlyStats.find(stat => stat._id === 'pending');
    return pendingStat ? pendingStat.count : 0;
  };

  const getApprovedPermissionsCount = () => {
    if (!permissionStats?.yearlyStats) return 0;
    const approvedStat = permissionStats.yearlyStats.find(stat => stat._id === 'approved');
    return approvedStat ? approvedStat.count : 0;
  };

  const hasCheckoutValue = (value) => value !== undefined && value !== null && value !== '';
  const activeSession = attendanceStatus?.activeSession || null;
  const latestCompletedSession = attendanceStatus?.latestCompletedSession || null;
  const todayCompletedSessions = Array.isArray(attendanceStatus?.todayCompletedSessions)
    ? attendanceStatus.todayCompletedSessions
    : [];
  const pendingShift = todayShifts.find(shift => shift.status === 'pending');
  const nextCheckInShift = todayShifts.find(shift => shift.status === 'pending' && shift.canCheckIn) || pendingShift;
  const checkedInShift = todayShifts.find(shift => {
    return shift.status === 'checked_in'
      && shift.checkIn
      && !hasCheckoutValue(shift.checkOut);
  });
  const allAllocatedShiftsCompleted = false;

  const activeShift = activeSession
    ? {
        name: activeSession.selectedShift?.name || activeSession.selectedShift?.displayName || activeSession.shiftName || 'Shift',
        checkIn: activeSession.checkIn,
        startTime: activeSession.selectedShift?.startTime || activeSession.shiftStartTime,
        endTime: activeSession.selectedShift?.endTime || activeSession.shiftEndTime,
        workingHours: liveWorkingHours,
        isNightShift: activeSession.selectedShift?.isNightShift
      }
    : checkedInShift
    ? {
        name: checkedInShift.displayName || checkedInShift.name || 'Shift',
        checkIn: checkedInShift.checkIn,
        startTime: checkedInShift.startTime,
        endTime: checkedInShift.endTime,
        workingHours: checkedInShift.workingHours,
        isNightShift: checkedInShift.isNightShift
      }
    : data?.todaysAttendance?.checkIn && !hasCheckoutValue(data?.todaysAttendance?.checkOut)
    ? {
        name: data.todaysAttendance.shiftName || 'Shift',
        checkIn: data.todaysAttendance.checkIn,
        startTime: data.todaysAttendance.shiftStartTime,
        endTime: data.todaysAttendance.shiftEndTime,
        workingHours: data.todaysAttendance.workingHours
    }
    : null;

  const completedShift = latestCompletedSession
    ? {
        name: latestCompletedSession.selectedShift?.name || latestCompletedSession.selectedShift?.displayName || latestCompletedSession.shiftName || 'Completed Shift',
        checkIn: latestCompletedSession.checkIn,
        checkOut: latestCompletedSession.checkOut,
        startTime: latestCompletedSession.selectedShift?.startTime || latestCompletedSession.shiftStartTime,
        endTime: latestCompletedSession.selectedShift?.endTime || latestCompletedSession.shiftEndTime,
        workingHours: latestCompletedSession.workingHours
      }
    : null;

  const attendanceCardShift = activeShift || completedShift || nextCheckInShift || {
    name: data?.todaysAttendance?.shiftName || data?.todaysShift?.name || 'Assigned Shift',
    startTime: data?.todaysAttendance?.shiftStartTime || data?.todaysShift?.startTime,
    endTime: data?.todaysAttendance?.shiftEndTime || data?.todaysShift?.endTime,
    workingHours: 0
  };
  const checkInTime = activeShift?.checkIn || completedShift?.checkIn || data?.todaysAttendance?.checkIn;
  const checkOutTime = !activeShift ? (completedShift?.checkOut || data?.todaysAttendance?.checkOut) : null;
  const attendanceComplete = Boolean(!activeShift && latestCompletedSession);
  const attendanceBadgeLabel = activeShift ? 'In Progress' : (latestCompletedSession ? 'Completed' : 'Pending');
  const displayedWorkingHours = activeShift
    ? liveWorkingHours
    : getSessionWorkingHours(latestCompletedSession);
  const actionShift = activeShift ? null : nextCheckInShift;
  const actionLabel = activeShift
    ? 'Check Out'
    : checkInTime && nextCheckInShift
      ? 'Check In'
      : 'Check In';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 animate-slide-in-right ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2`}>
          {toast.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <PendingActionsIcon className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here's your daily overview and performance metrics.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          loading={refreshing}
          className="whitespace-nowrap"
        >
          <RefreshIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Multi-Shift Attendance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
          <Card.Header className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
                  <AccessTimeIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <Card.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Attendance
                  </Card.Title>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {attendanceCardShift.name}
                    {(attendanceCardShift.startTime || attendanceCardShift.endTime) && (
                      <span> â€¢ {formatShiftTime(attendanceCardShift.startTime)} - {formatShiftTime(attendanceCardShift.endTime)}</span>
                    )}
                  </p>
                </div>
              </div>
              <span className={`self-start lg:self-center px-3 py-1 text-xs font-semibold rounded-full border ${
                activeShift
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800'
                  : latestCompletedSession
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}>
                {attendanceBadgeLabel}
              </span>
            </div>
          </Card.Header>

          <Card.Content>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-stretch">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-h-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Check In</p>
                    <span className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <AccessTimeIcon className="w-4 h-4 text-blue-700 dark:text-blue-200" />
                    </span>
                  </div>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-gray-50 tracking-normal">
                    {formatTime(checkInTime)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {checkInTime ? 'Recorded for current shift' : 'Awaiting check-in'}
                  </p>
                </div>

                <div className="min-h-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-5">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Check Out</p>
                    <span className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <CheckCircleIcon className="w-4 h-4 text-green-700 dark:text-green-200" />
                    </span>
                  </div>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-gray-50 tracking-normal">
                    {formatTime(checkOutTime)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {checkOutTime ? 'Recorded for current shift' : 'Pending checkout'}
                  </p>
                </div>
              </div>

              <div className="lg:w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col justify-between gap-5">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Working Hours</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mt-2">
                    {formatWorkingHours(displayedWorkingHours, { emptyValue: '0h 0m' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {activeShift ? 'Live current session' : latestCompletedSession ? 'Latest completed session' : 'Awaiting check-in'}
                  </p>
                </div>

                {activeShift ? (
                  <Button
                    onClick={handleCheckOut}
                    loading={checking}
                    size="lg"
                    variant="danger"
                    className="w-full rounded-lg"
                  >
                    {checking ? (checkingStatus === 'locating' ? 'Acquiring Location...' : 'Checking Out...') : actionLabel}
                  </Button>
                ) : !attendanceComplete || nextCheckInShift ? (
                  <Button
                    onClick={() => triggerCheckIn(actionShift?._id || null, actionShift?.displayName || actionShift?.name || null)}
                    loading={checking}
                    size="lg"
                    variant="success"
                    className="w-full rounded-lg"
                  >
                    {checking ? (checkingStatus === 'locating' ? 'Acquiring Location...' : 'Checking In...') : actionLabel}
                  </Button>
                ) : (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/25 border border-green-200 dark:border-green-800 p-3 text-sm font-medium text-green-700 dark:text-green-200 text-center">
                    Shift Completed
                  </div>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>

        {todayCompletedSessions.length > 0 && (
          <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
            <Card.Header className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
              <Card.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Today's Sessions
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {todayCompletedSessions.map((session) => (
                      <tr key={session._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {session.selectedShift?.name || session.shiftName || '--'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {session.checkInLocation?.name || session.checkInPlace || '--'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatTime(session.checkIn)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatTime(session.checkOut)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatWorkingHours(getSessionWorkingHours(session), { emptyValue: '0h 0m' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Completed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        )}

      </div>

      {/* Rest of your existing components remain the same */}
      {/* Permission Status Card */}
      <Card>
        <Card.Header className="border-b border-gray-200 pb-4">
          <Card.Title className="text-lg font-semibold text-gray-900 flex items-center">
            <PendingActionsIcon className="w-5 h-5 mr-2 text-orange-600" />
            Permission Status
          </Card.Title>
        </Card.Header>
        <Card.Content className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300"
              onClick={() => setPermissionModal(true)}
            >
              <PendingActionsIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700 mb-1">
                {getPendingPermissionsCount()}
              </div>
              <p className="text-sm font-medium text-orange-700">Pending Requests</p>
              <p className="text-xs text-orange-600 mt-1">Click to request</p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl">
              <CheckCircleIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700 mb-1">
                {getApprovedPermissionsCount()}
              </div>
              <p className="text-sm font-medium text-green-700">Approved</p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Monthly Performance & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <StatCard
          title="Present Days"
          value={data?.monthlyStats?.presentDays || 0}
          subtitle="This month"
          icon={<EventAvailableIcon className="w-6 h-6" />}
          color="bg-primary-50 text-primary-600"
          loading={loading}
        />
        <StatCard
          title="Working Hours"
          value={formatWorkingHours(data?.monthlyStats?.totalWorkingHours, { emptyValue: '0h 0m' })}
          subtitle="Total this month"
          icon={<WorkHistoryIcon className="w-6 h-6" />}
          color="bg-green-50 text-green-600"
          loading={loading}
        />
        <StatCard
          title="Avg Hours/Day"
          value={formatWorkingHours(data?.monthlyStats?.averageHours, { emptyValue: '0h 0m' })}
          subtitle="This month"
          icon={<TrendingUpIcon className="w-6 h-6" />}
          color="bg-purple-50 text-purple-600"
          loading={loading}
        />
        {user?.role === 'team-lead' ? (
          <StatCard
            title="Pending Requests"
            value={pendingLeavesCount + pendingPermissionsCount}
            subtitle="Leaves + Permissions"
            icon={<PendingActionsIcon className="w-6 h-6" />}
            color="bg-orange-50 text-orange-600"
            loading={loading}
            onClick={() => navigate('/team-management')}
            clickable={true}
          />
        ) : (
          <StatCard
            title="Half Days"
            value={data?.monthlyStats?.halfDays || 0}
            subtitle="This month"
            icon={<TimerOffIcon className="w-6 h-6" />}
            color="bg-orange-50 text-orange-600"
            loading={loading}
          />
        )}
      </div>

      {/* Quick Actions & Payroll - Keep your existing code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <NotificationsActiveIcon className="w-5 h-5 mr-2 text-primary-600" />
            Quick Actions
          </h3>
          <QuickActionCard
            title="Apply Leave"
            description="Submit a new leave request quickly"
            icon={<EventAvailableIcon className="w-6 h-6" />}
            color="bg-yellow-50 text-yellow-600"
            onClick={() => navigate('/leaves/apply')}
            buttonText="Apply Now"
          />
          <QuickActionCard
            title="Request Permission"
            description="Apply for short leave, half-day, or other permissions"
            icon={<RequestQuoteIcon className="w-6 h-6" />}
            color="bg-orange-50 text-orange-600"
            onClick={() => setPermissionModal(true)}
            buttonText="Request Now"
          />
          <QuickActionCard
            title="View Attendance"
            description="Check your attendance history and reports"
            icon={<AssessmentIcon className="w-6 h-6" />}
            color="bg-blue-50 text-blue-600"
            onClick={() => navigate('/attendance')}
            buttonText="View History"
          />
        </div>

        <Card className="lg:col-span-2">
          <Card.Header className="border-b border-gray-200 pb-4">
            <Card.Title className="text-lg font-semibold text-gray-900 flex items-center">
              <AttachMoneyIcon className="w-5 h-5 mr-2 text-green-600" />
              Salary Overview
            </Card.Title>
          </Card.Header>
          <Card.Content className="pt-6">
            {data?.currentPayroll ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-green-600">Net Salary</p>
                    <p className="text-3xl font-bold text-green-700">
                      ${data.currentPayroll.netSalary?.toLocaleString()}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium border ${data.currentPayroll.status === 'paid'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : data.currentPayroll.status === 'processed'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                    {data.currentPayroll.status?.charAt(0).toUpperCase() + data.currentPayroll.status?.slice(1)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(data.currentPayroll.year, data.currentPayroll.month - 1).toLocaleString('default', { month: 'long' })} {data.currentPayroll.year}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">Working Days</p>
                    <p className="font-semibold text-gray-900">{data.currentPayroll.workingDays}</p>
                  </div>
                </div>

                {data.currentPayroll.paymentDate && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      Paid on {new Date(data.currentPayroll.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <PaidIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No payroll data available</p>
                <p className="text-sm text-gray-400 mt-1">for current period</p>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Upcoming Leaves */}
      <Card>
        <Card.Header className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <Card.Title className="text-lg font-semibold text-gray-900 flex items-center">
              <CalendarTodayIcon className="w-5 h-5 mr-2 text-blue-600" />
              Upcoming Time Off
            </Card.Title>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium border border-gray-200">
              {data?.upcomingLeaves?.length || 0} scheduled
            </span>
          </div>
        </Card.Header>
        <Card.Content className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.upcomingLeaves?.map((leave) => (
              <div
                key={leave._id}
                className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl hover:shadow-md transition-all duration-300"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-600 capitalize mt-1">
                    {leave.leaveType} Leave â€¢ {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full border border-green-200">
                  Approved
                </span>
              </div>
            ))}

            {(!data?.upcomingLeaves || data.upcomingLeaves.length === 0) && (
              <div className="col-span-3 text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <CalendarTodayIcon className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-lg">No upcoming leaves scheduled</p>
                <p className="text-gray-400 mt-2">Plan your next time off through the leave management system</p>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={permissionModal}
        onClose={() => setPermissionModal(false)}
        onSuccess={handlePermissionSuccess}
      />

      {/* Check-In Location Confirmation Modal */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        title="Select Check-In Location"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please select your check-in location to proceed.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Location
            </label>
            {locations.length > 0 ? (
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                {locations.map(loc => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name} {loc.address ? `(${loc.address})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                No location configured for your tenant. You will check in with your current geocoordinates only.
              </p>
            )}
          </div>

          {/* Shift selection right below location (manual from dashboard modal) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Shift
            </label>
            {loadingShifts ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                <LoadingSpinner size="sm" />
                Loading today's shifts...
              </div>
            ) : todayShifts.filter(shift => shift.status === 'pending').length > 0 ? (
              <select
                value={pendingCheckInParams.shiftId || ''}
                onChange={(e) => {
                  const shiftId = e.target.value;
                  const shift = todayShifts.find(s => String(s._id) === String(shiftId)) || null;
                  setPendingCheckInParams({
                    shiftId: shiftId || null,
                    shiftName: shift?.name || shift?.shiftName || null,
                  });
                }}

                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Select shift</option>
                {todayShifts.filter(shift => shift.status === 'pending').map(shift => (
                  <option key={shift._id} value={shift._id}>
                    {shift.displayName || shift.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">No shifts available for today.</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCheckInModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={loadingShifts || checking || !pendingCheckInParams.shiftId}
              onClick={() => {
                handleCheckIn(
                  pendingCheckInParams.shiftId,
                  pendingCheckInParams.shiftName,
                  locations.length > 0 ? selectedLocationId : null
                );
              }}
            >
              Confirm Check In
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeDashboard;
