import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { dashboardService, permissionService, employeeService, attendanceService } from '../../services/auth';
import Modal from '../../components/ui/Modal';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Lock as LockIcon,
  Event as EventIcon,
  Add as AddIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarTodayIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as AccessTimeIcon,
  PendingActions as PendingActionsIcon,
  Approval as ApprovalIcon,
  ScheduleSend as ScheduleSendIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { LineChart, Line } from 'recharts';

const StatCard = ({ title, value, icon, color, loading, change, onDoubleClick }) => (
  <Card onDoubleClick={onDoubleClick} className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 ${onDoubleClick ? 'cursor-pointer' : ''}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        {loading ? (
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900 mb-2">{value?.toLocaleString()}</p>
        )}
        {onDoubleClick && (
          <p className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1">Double-click for more details</p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color} transition-colors duration-300 group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  </Card>
);

const QuickActionCard = ({ to, title, description, icon, color }) => (
  <Link
    to={to}
    className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 group"
  >
    <div className="flex items-start space-x-4">
      <div className={`p-3 rounded-lg ${color} transition-colors duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transform group-hover:translate-x-1 transition-all duration-200" />
    </div>
  </Link>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [permissionStats, setPermissionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Modal state for showing employees related to a stat card (always declare hooks at top)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalEmployees, setModalEmployees] = useState([]);
  const [attendanceDerived, setAttendanceDerived] = useState(null);
  const [absentEmployeesList, setAbsentEmployeesList] = useState(null);
  const [absentCount, setAbsentCount] = useState(null);
  // Charts state
  const [chartFilter, setChartFilter] = useState('1d'); // '1d','1w','1m','3m'
  const [chartLoading, setChartLoading] = useState(false);
  const [employeeChartData, setEmployeeChartData] = useState([]);
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null); // null = all
  const [isDarkMode, setIsDarkMode] = useState(false);
  const attendanceCacheRef = React.useRef(new Map()); // cache keyed by `${year}-${month}` -> attendance array

  useEffect(() => {
    loadDashboardData();
    loadPermissionStats();
    loadTodayAttendance();
  }, []);

  // Recompute charts when filter, data or attendanceDerived change
  useEffect(() => {
    buildEmployeeCharts();
  }, [chartFilter, data, attendanceDerived, showAllEmployees, chartType, selectedEmployeeId, employeesList]);

  // detect dark mode on mount (client-side only)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const update = () => setIsDarkMode(el.classList.contains('dark'));
    update();
    const obs = new MutationObserver(() => update());
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Fetch employees list once for the selector
  useEffect(() => {
    let mounted = true;
    employeeService.getAll()
      .then(list => { if (mounted) setEmployeesList(Array.isArray(list) ? list : (list?.data || list?.docs || [])); })
      .catch(() => { if (mounted) setEmployeesList([]); });
    return () => { mounted = false; };
  }, []);

  const getDateRangeDates = (filterKey) => {
    const today = new Date();
    const dates = [];
    let days = 1;
    if (filterKey === '1d') days = 1;
    else if (filterKey === '1w') days = 7;
    else if (filterKey === '1m') days = 30;
    else if (filterKey === '3m') days = 90;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      // zero out time for consistent comparisons
      d.setHours(0,0,0,0);
      dates.push(new Date(d));
    }
    return dates;
  };

  // Fetch attendance entries for months covering the date range
  const fetchAttendanceForRange = async (dates) => {
    if (!dates || dates.length === 0) return [];
    // collect unique month/year pairs
    const pairs = new Set();
    dates.forEach(d => pairs.add(`${d.getFullYear()}-${d.getMonth()+1}`));
    const results = [];
    const missingPairs = [];

    // consult cache first
    for (const p of Array.from(pairs)) {
      const [y,m] = p.split('-').map(Number);
      const key = `${y}-${m}`;
      if (attendanceCacheRef.current.has(key)) {
        const cached = attendanceCacheRef.current.get(key) || [];
        results.push(...cached);
      } else {
        missingPairs.push({ y, m, key });
      }
    }

    // fetch missing months in parallel but limited (small number of months)
    if (missingPairs.length > 0) {
      try {
        const fetchedArrays = await Promise.all(missingPairs.map(p => attendanceService.getAllAttendance(p.m, p.y).catch(err => { console.error('Failed to fetch attendance for', p.m, p.y, err); return []; })));
        fetchedArrays.forEach((res, idx) => {
          const p = missingPairs[idx];
          const arr = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
          attendanceCacheRef.current.set(p.key, arr);
          results.push(...arr);
        });
      } catch (err) {
        console.error('Failed to fetch missing attendance months:', err);
      }
    }

    return results;
  };

  const buildEmployeeCharts = async () => {
    try {
      setChartLoading(true);
      const dates = getDateRangeDates(chartFilter);
      const daysCount = dates.length;

      // get employees list (prefer cached `employeesList` fetched at mount)
      let employees = (employeesList && employeesList.length > 0) ? employeesList : await employeeService.getAll().catch(() => []);

      // if user selected a specific employee, filter to only that one
      if (selectedEmployeeId) {
        employees = employees.filter(e => {
          const id = (e && (e._id || e.id || e.email));
          return String(id) === String(selectedEmployeeId);
        });
      }
      if (!employees || employees.length === 0) {
        setEmployeeChartData([]);
        setChartLoading(false);
        return;
      }

      // fetch attendance entries covering range
      const attendanceEntries = await fetchAttendanceForRange(dates);

      // helper to normalize id
      const getId = (e) => {
        if (!e) return undefined;
        if (typeof e === 'string') return e;
        if (e._id) return String(e._id);
        if (e.id) return String(e.id);
        if (e.email) return String(e.email);
        return undefined;
      };

      // index attendance by empId + dateString
      const attendanceMap = new Map();
      attendanceEntries.forEach(rec => {
        const emp = rec.employee || rec.employeeId || rec.user || rec.userId;
        const id = getId(emp);
        if (!id) return;
        const dateCandidate = rec.date || rec.attendanceDate || rec.recordedAt || rec.createdAt || rec.recorded_at;
        if (!dateCandidate) return;
        const d = new Date(dateCandidate);
        d.setHours(0,0,0,0);
        const key = `${id}::${d.toDateString()}`;
        if (!attendanceMap.has(key)) attendanceMap.set(key, rec);
      });

      const dataForChart = employees.map(emp => {
        const id = getId(emp);
        const name = emp.name || emp.fullName || emp.firstName || id || 'Unknown';
        let present = 0;
        let absent = 0;
        dates.forEach(d => {
          const key = `${id}::${d.toDateString()}`;
          const rec = attendanceMap.get(key);
          if (rec) {
            const s = (rec.status || '').toString().toLowerCase();
            const hasPresent = s.includes('present') || s.includes('checked-in') || rec.checkIn || rec.checkedInAt || rec.inTime || (rec.isPresent === true);
            const hasPermission = s.includes('permission') || s.includes('with-permission') || rec.onPermission || rec.withPermission || rec.hasPermission || rec.permissionType;
            const hrs = (rec.hoursWorked ?? rec.workHours ?? rec.durationHours ?? rec.hours ?? undefined);
            // treat half-day or permission as present for chart
            if (hasPresent || hasPermission || (hrs !== undefined && Number(hrs) > 0)) present += 1;
            else absent += 1;
          } else {
            // no record -> absent
            absent += 1;
          }
        });

        const presentPct = daysCount > 0 ? (present / daysCount) * 100 : 0;
        const absentPct = daysCount > 0 ? (absent / daysCount) * 100 : 0;
        return {
          name,
          presentPct: Math.round(presentPct * 100) / 100,
          absentPct: Math.round(absentPct * 100) / 100
        };
      });

      // Sort by presentPct desc so most present employees appear first
      const sorted = dataForChart.sort((a, b) => (b.presentPct || 0) - (a.presentPct || 0));

      // Limit to top N unless user selected 'Show all' or a specific employee
      const TOP_N = 25;
      const final = selectedEmployeeId ? sorted : (showAllEmployees ? sorted : sorted.slice(0, TOP_N));

      setEmployeeChartData(final);
    } catch (err) {
      console.error('Failed to build employee charts:', err);
      setEmployeeChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  // Recompute absent list/count whenever base data changes
  useEffect(() => {
    const computeAbsent = async () => {
      try {
        // helper to normalize id values (strings)
        const getId = (e) => {
          if (!e) return undefined;
          if (typeof e === 'string') return e;
          if (e._id) return String(e._id);
          if (e.id) return String(e.id);
          if (e.email) return String(e.email);
          return undefined;
        };

        // fetch all employees
        const allEmployees = await employeeService.getAll().catch(() => []);
        if (!allEmployees || allEmployees.length === 0) {
          setAbsentEmployeesList([]);
          setAbsentCount(0);
          return;
        }

        // get today's attendance entries
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const attendanceEntries = await attendanceService.getAllAttendance(month, year).catch(() => []);
        const todaysEntries = (attendanceEntries || []).filter((a) => {
          const dateCandidate = a.date || a.attendanceDate || a.recordedAt || a.createdAt || a.recorded_at;
          if (dateCandidate) {
            const d = new Date(dateCandidate);
            return d.toDateString() === today.toDateString();
          }
          return false;
        });

        // derive present/half/permission ids from todaysEntries
        const presentIds = new Set();
        const halfIds = new Set();
        const withPermIds = new Set();

        const getHours = (rec) => {
          if (!rec) return undefined;
          if (rec.hoursWorked !== undefined) return Number(rec.hoursWorked);
          if (rec.workHours !== undefined) return Number(rec.workHours);
          if (rec.durationHours !== undefined) return Number(rec.durationHours);
          if (rec.hours !== undefined) return Number(rec.hours);
          if (rec.durationMinutes !== undefined) return Number(rec.durationMinutes) / 60;
          if (rec.minutes !== undefined) return Number(rec.minutes) / 60;
          if (rec.duration !== undefined) {
            const v = Number(rec.duration);
            if (Number.isNaN(v)) return undefined;
            if (v > 1000) return v / 3600000;
            if (v > 24) return v / 60;
            return v;
          }
          if (rec.checkIn && rec.checkOut) {
            try {
              const inT = new Date(rec.checkIn);
              const outT = new Date(rec.checkOut);
              const diff = (outT - inT) / (1000 * 60 * 60);
              if (!Number.isNaN(diff) && diff >= 0) return diff;
            } catch (e) {}
          }
          return undefined;
        };

        todaysEntries.forEach((rec) => {
          const emp = rec.employee || rec.employeeId || rec.user;
          const id = getId(emp);
          if (!id) return;
          const hrs = getHours(rec);
          if (hrs !== undefined && !Number.isNaN(hrs)) {
            if (hrs < 4.5) { halfIds.add(id); return; }
            presentIds.add(id); return;
          }
          if (rec.checkIn || rec.checkedInAt || rec.inTime) { presentIds.add(id); return; }
          const s = (rec.status || '').toString().toLowerCase();
          if (s === 'present' || s === 'checked-in' || s === 'in') { presentIds.add(id); return; }
          if (s === 'half' || s === 'half-day' || s === 'halfday') { halfIds.add(id); return; }
          const hasPermissionFlag = !!(rec.onPermission || rec.withPermission || rec.hasPermission || rec.permission === true || rec.isPermission === true);
          const permissionInStatus = s.includes('permission') || s.includes('with-permission') || s.includes('present-with-permission');
          if (hasPermissionFlag || permissionInStatus || rec.permissionType || rec.permissionId) { withPermIds.add(id); return; }
        });

        // include any with-permission ids from permissionStats (recentPermissions)
        const permsFromStats = (permissionStats?.recentPermissions || []).map(p => p.employee || p.employeeId || p.user).filter(Boolean);
        permsFromStats.forEach((p) => {
          const id = getId(p);
          if (id) withPermIds.add(id);
        });

        // leaves
        const leaveArr = data?.recentLeaves?.map(l => l.employee).filter(Boolean) || [];
        const leaveIds = new Set(leaveArr.map(e => getId(e)).filter(Boolean));

        // compute absentIds by scanning allEmployees
        const absentIds = new Set();
        allEmployees.forEach((emp) => {
          const id = getId(emp);
          if (!id) return;
          if (presentIds.has(id)) return;
          if (withPermIds.has(id)) return;
          if (halfIds.has(id)) return;
          if (leaveIds.has(id)) return;
          absentIds.add(id);
        });

        // build absent employee objects
        const absentList = allEmployees.filter(e => absentIds.has(getId(e)));
        setAbsentEmployeesList(absentList);
        setAbsentCount(absentList.length);
      } catch (err) {
        console.error('Failed to compute absent list:', err);
        setAbsentEmployeesList([]);
        setAbsentCount(0);
      }
    };

    computeAbsent();
  }, [data, attendanceDerived, permissionStats]);

  // Listen for permission apply events from other pages/tabs and refresh
  useEffect(() => {
    const handler = (e) => {
      if (!e) return;
      if (e.key === 'permission:applied') {
        // refresh permission related data
        loadPermissionStats();
        loadDashboardData();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const attendanceEntries = await attendanceService.getAllAttendance(month, year);
      const todaysEntries = (attendanceEntries || []).filter((a) => {
        const dateCandidate = a.date || a.attendanceDate || a.recordedAt || a.createdAt || a.recorded_at;
        if (dateCandidate) {
          const d = new Date(dateCandidate);
          return d.toDateString() === today.toDateString();
        }
        return false;
      });

      const getHours = (rec) => {
        if (!rec) return undefined;
        if (rec.hoursWorked !== undefined) return Number(rec.hoursWorked);
        if (rec.workHours !== undefined) return Number(rec.workHours);
        if (rec.durationHours !== undefined) return Number(rec.durationHours);
        if (rec.hours !== undefined) return Number(rec.hours);
        if (rec.durationMinutes !== undefined) return Number(rec.durationMinutes) / 60;
        if (rec.minutes !== undefined) return Number(rec.minutes) / 60;
        if (rec.duration !== undefined) {
          const v = Number(rec.duration);
          if (Number.isNaN(v)) return undefined;
          if (v > 1000) return v / 3600000;
          if (v > 24) return v / 60;
          return v;
        }
        if (rec.checkIn && rec.checkOut) {
          try {
            const inT = new Date(rec.checkIn);
            const outT = new Date(rec.checkOut);
            const diff = (outT - inT) / (1000 * 60 * 60);
            if (!Number.isNaN(diff) && diff >= 0) return diff;
          } catch (e) {}
        }
        return undefined;
      };

      const present = [];
      const half = [];
      const permission = [];

      todaysEntries.forEach((rec) => {
        const hrs = getHours(rec);
        const emp = rec.employee || rec.employeeId || rec.user;
        if (hrs !== undefined && !Number.isNaN(hrs)) {
          if (hrs < 4.5) {
            if (emp) half.push(emp);
          } else {
            if (emp) present.push(emp);
          }
          return;
        }
        if (rec.checkIn || rec.checkedInAt || rec.inTime) {
          if (emp) present.push(emp);
          return;
        }
        if (rec.status) {
          const s = String(rec.status).toLowerCase();
          if (s === 'present' || s === 'checked-in' || s === 'in') { if (emp) present.push(emp); return; }
          if (s === 'half' || s === 'half-day' || s === 'halfday') { if (emp) half.push(emp); return; }
          if (s.includes('permission') || s.includes('with-permission') || s.includes('present-with-permission')) { if (emp) permission.push(emp); return; }
        }
      });

      // Also check for explicit permission flags on entries
      todaysEntries.forEach((rec) => {
        const emp = rec.employee || rec.employeeId || rec.user;
        if (!emp) return;
        const s = (rec.status || '').toString().toLowerCase();
        const hasPermissionFlag = !!(rec.onPermission || rec.withPermission || rec.hasPermission || rec.permission === true || rec.isPermission === true);
        const permissionInStatus = s.includes('permission') || s.includes('with-permission') || s.includes('present-with-permission');
        if ((hasPermissionFlag || permissionInStatus) && emp) permission.push(emp);
      });

      setAttendanceDerived({
        presentCount: present.length,
        halfCount: half.length,
        permissionCount: permission.length,
        presentEmployees: present,
        halfEmployees: half,
        permissionEmployees: permission,
        raw: todaysEntries
      });
    } catch (err) {
      console.error('Failed to load today attendance summary:', err);
      setAttendanceDerived(null);
    }
  };

  const loadDashboardData = async () => {
    try {
      const dashboardData = await dashboardService.getAdminDashboard();
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPermissionStats = async () => {
    try {
      const resp = await permissionService.getAllPermissions('pending');
      // normalize response which may be an array or a paginated object
      let permissions = [];
      if (Array.isArray(resp)) permissions = resp;
      else if (resp && Array.isArray(resp.data)) permissions = resp.data;
      else if (resp && Array.isArray(resp.docs)) permissions = resp.docs;
      else if (resp && Array.isArray(resp.permissions)) permissions = resp.permissions;
      else permissions = [];

      setPermissionStats({
        pendingPermissions: permissions.length || 0,
        recentPermissions: permissions.slice(0, 3) || []
      });
    } catch (error) {
      console.error('Failed to load permission stats:', error);
      setPermissionStats({
        pendingPermissions: 0,
        recentPermissions: []
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    loadPermissionStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <WarningIcon className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
        <p className="text-gray-500 mb-4">There was an error loading the dashboard data.</p>
        <Button onClick={loadDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  // safe fallbacks / derived attendance metrics
  const withPermission = (attendanceDerived?.permissionCount ?? data.withPermission) ?? 0;
  const halfDay = data.halfDay ?? data.halfDays ?? data.half_day ?? 0;
  const absentToday = data.absentToday ?? (typeof data.totalEmployees === 'number'
    ? Math.max(0, data.totalEmployees - (data.presentToday ?? 0) - withPermission)
    : 0
  );
  const attendanceRate = data.attendanceRate ?? (data.totalEmployees
    ? Math.round(((data.presentToday ?? 0) / data.totalEmployees) * 100)
    : 0
  );

  // Use attendance-derived counts when available (computed on mount)
  const displayedPresent = attendanceDerived?.presentCount ?? data.presentToday ?? 0;
  const displayedHalf = attendanceDerived?.halfCount ?? halfDay ?? 0;
  const displayedAbsent = (Array.isArray(absentEmployeesList) && absentCount !== null)
    ? absentCount
    : ((attendanceDerived && typeof data.totalEmployees === 'number')
      ? Math.max(0, data.totalEmployees - (attendanceDerived.presentCount ?? 0) - (attendanceDerived.halfCount ?? 0) - (withPermission ?? 0))
      : (data.absentToday ?? absentToday ?? 0));

  const findArrayForType = (type) => {
    // common candidate keys on dashboard data to check for detailed lists
    const map = {
      Absent: ['absentEmployees', 'absentees', 'absent_list'],
      'With Permission': ['withPermissionEmployees', 'permissionEmployees', 'with_permission_employees'],
      'Half Day': ['halfDayEmployees', 'half_day_employees', 'halfDaysList'],
      'Present Today': ['presentEmployees', 'present_list']
    };
    const keys = map[type] || [];
    for (const k of keys) {
      if (Array.isArray(data[k]) && data[k].length > 0) return data[k];
    }
    return null;
  };

  const openCardModal = async (type, title) => {
    setModalTitle(title || type);
    setModalOpen(true);
    setModalLoading(true);

    try {
      // Prefer arrays that may come embedded in dashboard payload
      const arr = findArrayForType(type);
      if (arr) {
        // try to normalize employee objects
        const employees = arr.map((it) => it.employee ? it.employee : it);
        setModalEmployees(employees);
        return;
      }

      // Special-case: pending permissions (we have permission objects)
      if (type === 'Pending Permissions' && permissionStats?.recentPermissions) {
        // recentPermissions items may include `employee` as an object, or only an id in
        // `employeeId`/`user`/`userId`. Normalize by resolving ids to full employee objects
        // when necessary so the modal can display name/department properly.
        const perms = permissionStats.recentPermissions;
        const employeesFromPerms = [];

        // Collect ids that need fetching
        const idsToFetch = [];

        perms.forEach((p) => {
          if (!p) return;
          // prefer full employee object if present
          if (p.employee && typeof p.employee === 'object') {
            employeesFromPerms.push(p.employee);
            return;
          }

          // some APIs put user/employee id in different fields
          const maybeId = p.employeeId || p.employee || p.user || p.userId || p.employee_id;
          if (maybeId) {
            // if it's an object with _id, push it
            if (typeof maybeId === 'object') {
              employeesFromPerms.push(maybeId);
            } else {
              idsToFetch.push(String(maybeId));
            }
          }
        });

        if (idsToFetch.length === 0) {
          setModalEmployees(employeesFromPerms);
          return;
        }

        try {
          const fetched = await Promise.all(idsToFetch.map(id => employeeService.getById(id).catch(() => null)));
          const valid = fetched.filter(Boolean);
          setModalEmployees([...employeesFromPerms, ...valid]);
        } catch (err) {
          console.error('Failed to resolve permission employees:', err);
          setModalEmployees(employeesFromPerms);
        }
        return;
      }

        // Special-case: employees who are currently 'With Permission' (today)
        // Use today's attendance records to determine 'With Permission' status
        // (this mirrors the logic used in AttendanceReport and is more reliable
        // when permission objects are not fully populated on the permission endpoint).
        if (type === 'With Permission') {
          try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();

            const attendanceEntries = await attendanceService.getAllAttendance(month, year);
            const todaysEntries = (attendanceEntries || []).filter((a) => {
              const dateCandidate = a.date || a.attendanceDate || a.recordedAt || a.createdAt || a.recorded_at;
              if (dateCandidate) {
                const d = new Date(dateCandidate);
                return d.toDateString() === today.toDateString();
              }
              return false;
            });

            const employeesFromAttendance = [];
            const idsToFetch = [];

            todaysEntries.forEach((rec) => {
              // Several possible indicators that this attendance entry was with permission
              const status = (rec.status || '').toString().toLowerCase();
              const hasPermissionFlag = !!(rec.onPermission || rec.withPermission || rec.hasPermission || rec.permission === true || rec.isPermission === true);
              const permissionInStatus = status.includes('permission') || status.includes('with-permission') || status.includes('present-with-permission');
              const hasPermissionField = rec.permissionType || rec.permissionId || rec.permission;

              if (permissionInStatus || hasPermissionFlag || hasPermissionField) {
                const emp = rec.employee || rec.employeeId || rec.user || rec.userId;
                if (!emp) return;
                if (typeof emp === 'object') {
                  employeesFromAttendance.push(emp);
                } else {
                  idsToFetch.push(String(emp));
                }
              }
            });

            // If none found in attendance, fall back to permission endpoint (today)
            if (employeesFromAttendance.length === 0 && idsToFetch.length === 0) {
              try {
                const perms = await permissionService.getAllPermissions('all', month, year);
                const todays = (perms || []).filter((p) => {
                  const dateCandidate = p.date || p.permissionDate || p.permission_date;
                  if (!dateCandidate) return false;
                  const d = new Date(dateCandidate);
                  return d.toDateString() === today.toDateString();
                }).filter(p => (p.status || '').toLowerCase() !== 'rejected');

                todays.forEach((p) => {
                  if (!p) return;
                  if (p.employee && typeof p.employee === 'object') employeesFromAttendance.push(p.employee);
                  else if (p.employeeId || p.user || p.userId) idsToFetch.push(String(p.employeeId || p.user || p.userId));
                });
              } catch (err) {
                console.error('Permission fallback failed:', err);
              }
            }

            const fetched = await Promise.all(idsToFetch.map(id => employeeService.getById(id).catch(() => null)));
            const valid = fetched.filter(Boolean);

            // Deduplicate
            const map = new Map();
            employeesFromAttendance.concat(valid).forEach((e) => {
              if (!e) return;
              const id = e._id || e.id || e.email;
              if (!id) return;
              map.set(String(id), e);
            });

            const result = Array.from(map.values());
            setModalEmployees(result);
            return;
          } catch (err) {
            console.error('Failed to compute With Permission list:', err);
            setModalEmployees([]);
            return;
          }
        }

      // Special-case: pending leaves/recent leaves
      if (type === 'Pending Leaves' && data?.recentLeaves) {
        setModalEmployees(data?.recentLeaves?.map(l => l.employee).filter(Boolean));
        return;
      }

      // Try to fetch today's attendance entries when user asks for Present Today or Absent
      const all = await employeeService.getAll();

      // If user explicitly asked for Total Employees, return all
      if (type === 'Total Employees') {
        setModalEmployees(all);
        return;
      }

      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      if (type === 'Present Today' || type === 'Absent' || type === 'Half Day') {
        try {
          const attendanceEntries = await attendanceService.getAllAttendance(month, year);
          const todaysEntries = (attendanceEntries || []).filter((a) => {
            const dateCandidate = a.date || a.attendanceDate || a.recordedAt || a.createdAt || a.recorded_at;
            if (dateCandidate) {
              const d = new Date(dateCandidate);
              return d.toDateString() === today.toDateString();
            }
            return false;
          });

          // helper to compute worked hours for an attendance record
          const getHours = (rec) => {
            if (!rec) return undefined;
            if (rec.hoursWorked !== undefined) return Number(rec.hoursWorked);
            if (rec.workHours !== undefined) return Number(rec.workHours);
            if (rec.durationHours !== undefined) return Number(rec.durationHours);
            if (rec.hours !== undefined) return Number(rec.hours);
            if (rec.durationMinutes !== undefined) return Number(rec.durationMinutes) / 60;
            if (rec.minutes !== undefined) return Number(rec.minutes) / 60;
            if (rec.duration !== undefined) {
              const v = Number(rec.duration);
              if (Number.isNaN(v)) return undefined;
              if (v > 1000) return v / 3600000; // ms -> hours
              if (v > 24) return v / 60; // minutes -> hours
              return v; // assume hours
            }
            // fallback to compute from checkIn/checkOut timestamps
            if (rec.checkIn && rec.checkOut) {
              try {
                const inT = new Date(rec.checkIn);
                const outT = new Date(rec.checkOut);
                const diff = (outT - inT) / (1000 * 60 * 60);
                if (!Number.isNaN(diff) && diff >= 0) return diff;
              } catch (e) {
                // ignore
              }
            }
            return undefined;
          };

          const presentEmployees = [];
          const halfDayEmployees = [];

          todaysEntries.forEach((rec) => {
            const hrs = getHours(rec);
            const emp = rec.employee || rec.employeeId || rec.user;
            // if we have hours, classify by threshold
            if (hrs !== undefined && !Number.isNaN(hrs)) {
              if (hrs < 4.5) {
                if (emp) halfDayEmployees.push(emp);
              } else {
                if (emp) presentEmployees.push(emp);
              }
              return;
            }

            // no hours field: treat any checkIn as present
            if (rec.checkIn || rec.checkedInAt || rec.inTime) {
              if (emp) presentEmployees.push(emp);
              return;
            }

            // status or isPresent fallback
            if (rec.status) {
              const s = String(rec.status).toLowerCase();
              if (s === 'present' || s === 'checked-in' || s === 'in') {
                if (emp) presentEmployees.push(emp);
                return;
              }
              if (s === 'half' || s === 'half-day' || s === 'halfday') {
                if (emp) halfDayEmployees.push(emp);
                return;
              }
            }
            if (rec.isPresent !== undefined) {
              if (rec.isPresent === true) { if (emp) presentEmployees.push(emp); return; }
              if (rec.isPresent === false) { /* leave for absent computation */ return; }
            }
          });

          if (type === 'Present Today' && presentEmployees.length > 0) {
            setModalEmployees(presentEmployees);
            return;
          }

          if (type === 'Half Day' && halfDayEmployees.length > 0) {
            setModalEmployees(halfDayEmployees);
            return;
          }

          // For Absent: compute absent list by excluding present/permission/half-day/leave employees from all employees
          if (type === 'Absent') {
            try {
              // helper to normalize id values (strings)
              const getId = (e) => {
                if (!e) return undefined;
                if (typeof e === 'string') return e;
                if (e._id) return String(e._id);
                if (e.id) return String(e.id);
                if (e.email) return String(e.email);
                return undefined;
              };

              // present IDs from attendance (if available) or from embedded arrays
              const presentArr = (presentEmployees && presentEmployees.length > 0) ? presentEmployees : (findArrayForType('Present Today') || []);
              const presentIds = new Set(presentArr.map(e => getId(e)).filter(Boolean));

              // with-permission employees
              const withPermArr = findArrayForType('With Permission') || (permissionStats?.recentPermissions?.map(p => p.employee).filter(Boolean)) || [];
              const withPermIds = new Set(withPermArr.map(e => getId(e)).filter(Boolean));

              // half-day employees (include attendance-derived halfDayEmployees)
              const halfArr = (findArrayForType('Half Day') || []).concat(halfDayEmployees || []);
              const halfIds = new Set(halfArr.map(e => getId(e)).filter(Boolean));

              // recent leaves
              const leaveArr = data?.recentLeaves?.map(l => l.employee).filter(Boolean) || [];
              const leaveIds = new Set(leaveArr.map(e => getId(e)).filter(Boolean));

              // ensure we have an employee list to filter; fallback to dashboard-embedded lists if API returned empty
              const allEmployees = (Array.isArray(all) && all.length > 0)
                ? all
                : (data.employees || data.employeeList || data.allEmployees || data.employee_list || []);

              // compute absent IDs by scanning allEmployees (if available) or using present/perm/half/leave sets
              const absentIds = new Set();
              if (allEmployees && allEmployees.length > 0) {
                allEmployees.forEach((emp) => {
                  const id = getId(emp);
                  if (!id) return;
                  if (presentIds.has(id)) return;
                  if (withPermIds.has(id)) return;
                  if (halfIds.has(id)) return;
                  if (leaveIds.has(id)) return;
                  absentIds.add(id);
                });
              }

              // debug info to help trace why modal may be empty
              console.debug('Dashboard modal debug', {
                type: 'Absent',
                allEmployeesCount: (allEmployees || []).length,
                presentCount: presentIds.size,
                withPermCount: withPermIds.size,
                halfCount: halfIds.size,
                leaveCount: leaveIds.size,
                absentIdsCount: absentIds.size,
                employeesFromAttendanceCount: presentEmployees.length
              });

              // If we have full employee objects in allEmployees, map IDs to objects
              if (allEmployees && allEmployees.length > 0) {
                const absentList = allEmployees.filter((emp) => {
                  const id = getId(emp);
                  return id && absentIds.has(id);
                });
                if (absentList.length > 0) {
                  setModalEmployees(absentList);
                  return;
                }
              }

              // If we only have IDs (or no allEmployees), try fetching individual employees by id
              if (absentIds.size > 0) {
                try {
                  const ids = Array.from(absentIds);
                  const fetched = await Promise.all(ids.map(id => employeeService.getById(id).catch(err => { console.warn('Failed to fetch employee', id, err); return null; })));
                  const valid = fetched.filter(Boolean);
                  if (valid.length > 0) {
                    setModalEmployees(valid);
                    return;
                  }
                } catch (err) {
                  console.error('Failed to fetch absent employees by id:', err);
                }
              }

              // nothing found
              setModalEmployees([]);
              return;
            } catch (err) {
              console.error('Failed to compute absent list:', err);
            }
          }
        } catch (err) {
          console.error('Failed to fetch attendance entries for modal:', err);
        }
      }

      // Heuristic filter using employee fields as a fallback (do not show everyone)
      const filtered = all.filter((e) => {
        const s = (e.attendanceStatus || e.status || e.currentStatus || '') + '';
        const lowered = s.toLowerCase();
        if (type === 'Absent') return lowered.includes('absent') || e.isPresent === false || e.present === false;
        if (type === 'With Permission') return lowered.includes('permission') || e.onPermission === true || e.hasPermission === true;
        if (type === 'Half Day') return lowered.includes('half') || e.halfDay === true || e.half_day === true;
        if (type === 'Present Today' || type === 'Attendance Rate') return lowered.includes('present') || e.isPresent === true || e.present === true;
        return false;
      });

      if (filtered.length > 0) {
        setModalEmployees(filtered);
      } else {
        setModalEmployees([]);
      }
    } catch (err) {
      console.error('Failed to load employees for modal:', err);
      setModalEmployees([]);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Fixed refresh button in top-right corner */}
      <div className="fixed right-4 z-60" style={{ top: '4.5rem' }}>
        <Button
          variant="outline"
          onClick={handleRefresh}
          loading={refreshing}
          aria-label="Refresh dashboard"
          className="p-2 w-10 h-10 flex items-center justify-center rounded-full shadow-sm"
        >
          <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4.5">
        <StatCard
          title="Total Employees"
          value={data.totalEmployees}
          change={5}
          icon={<PeopleIcon className="text-2xl" />}
          color="bg-blue-50 text-blue-600"
          loading={loading}
          onDoubleClick={() => openCardModal('Total Employees', 'Total Employees')}
        />
        <StatCard
          title="Present Today"
          value={displayedPresent}
          change={2}
          icon={<AccessTimeIcon className="text-2xl" />}
          color="bg-green-50 text-green-600"
          loading={loading}
          onDoubleClick={() => openCardModal('Present Today', 'Present Today')}
        />
        <StatCard
          title="Half Day"
          value={displayedHalf}
          icon={<ScheduleIcon className="text-2xl" />}
          color="bg-pink-50 text-pink-600"
          loading={loading}
          onDoubleClick={() => openCardModal('Half Day', 'Half Day')}
        />
        <StatCard
          title="With Permission"
          value={withPermission}
          icon={<ScheduleSendIcon className="text-2xl" />}
          color="bg-yellow-50 text-yellow-600"
          loading={loading}
          onDoubleClick={() => openCardModal('With Permission', 'With Permission')}
        />
        <StatCard
          title="Absent"
          value={displayedAbsent}
          icon={<LockIcon className="text-2xl" />}
          color="bg-gray-50 text-gray-600"
          loading={loading}
          onDoubleClick={() => openCardModal('Absent', 'Absent')}
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={<AnalyticsIcon className="text-2xl" />}
          color="bg-indigo-50 text-indigo-600"
          loading={loading}
        />
        <StatCard
          title="Pending Permissions"
          value={permissionStats?.pendingPermissions || 0}
          icon={<PendingActionsIcon className="text-2xl" />}
          color="bg-orange-50 text-orange-600"
          loading={loading}
          onDoubleClick={() => openCardModal('Pending Permissions', 'Pending Permissions')}
        />
        <StatCard
          title="Pending Leaves"
          value={data.pendingLeaves}
          change={-3}
          icon={<EventIcon className="text-2xl" />}
          color="bg-red-50 text-red-600"
          loading={loading}
          onDoubleClick={() => openCardModal('Pending Leaves', 'Pending Leaves')}
        />
      </div>

      {/* Employee Present/Absent Charts */}
      <div className="mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Employee Attendance Trend</h3>
              <p className="text-sm text-gray-600">Present and Absent percentage per employee</p>
            </div>
            <div className="flex items-center space-x-2">
              {[
                { key: '1d', label: '1 Day' },
                { key: '1w', label: '1 Week' },
                { key: '1m', label: '1 Month' },
                { key: '3m', label: '3 Months' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setChartFilter(f.key)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartFilter === f.key ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setShowAllEmployees(s => !s)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${showAllEmployees ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50'}`}
                title={showAllEmployees ? 'Showing all employees' : 'Show top employees only'}
              >
                {showAllEmployees ? 'Show Top' : 'Show All'}
              </button>
              <div className="flex items-center border-l pl-3 ml-2 space-x-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartType === 'bar' ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50'}`}
                  title="Bar chart"
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartType === 'line' ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50'}`}
                  title="Line chart"
                >
                  Line
                </button>
              </div>

              <div className="ml-3">
                <select
                  value={selectedEmployeeId || ''}
                  onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
                  className="px-3 py-1 rounded-md text-sm border border-gray-200 bg-white text-gray-700"
                  aria-label="Filter by employee"
                >
                  <option value="">All employees</option>
                  {employeesList.map((emp) => (
                    <option key={emp._id || emp.id || emp.email} value={emp._id || emp.id || emp.email}>
                      {emp.name || emp.fullName || emp.firstName || emp.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {chartLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">Present vs Absent — Top Employees</h4>
                    <p className="text-sm text-gray-500">Grouped bar chart showing present and absent percentages for the selected period.</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {!showAllEmployees ? <span>Showing top <strong className="text-gray-800">25</strong></span> : <span>Showing all employees</span>}
                  </div>
                </div>

                <div style={{ height: 420 }}>
                  {chartType === 'bar' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeChartData} margin={{ top: 20, right: 20, left: 0, bottom: 80 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#f3f4f6'} />
                          <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            height={80}
                            axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                            tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                            tick={{ fontSize: 12, fill: isDarkMode ? '#ffffff' : '#111827', fontWeight: 600 }}
                            label={{ value: 'Employee', position: 'bottom', offset: 48, fill: isDarkMode ? '#ffffff' : '#111827', style: { fontSize: 12, fontWeight: 600 } }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tickFormatter={v => `${v}%`}
                            tick={{ fill: isDarkMode ? '#ffffff' : '#111827', fontSize: 12, fontWeight: 600 }}
                            axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                            tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                            label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', offset: -10, fill: isDarkMode ? '#ffffff' : '#111827', style: { textAnchor: 'middle', fontSize: 12, fontWeight: 600 } }}
                          />
                          <Tooltip
                            formatter={(value) => `${value}%`}
                            contentStyle={{ backgroundColor: isDarkMode ? '#0b1220' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                            labelStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827', fontSize: 13, fontWeight: 700 }}
                            itemStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827', fontSize: 12 }}
                          />
                          <Legend verticalAlign="top" wrapperStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827' }} />
                        <Bar dataKey="presentPct" name="Present %" fill="#10b981" radius={[6,6,0,0]} barSize={14} />
                        <Bar dataKey="absentPct" name="Absent %" fill="#ef4444" radius={[6,6,0,0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={employeeChartData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#f3f4f6'} />
                            <XAxis
                              dataKey="name"
                              angle={-35}
                              textAnchor="end"
                              interval={0}
                              height={60}
                              axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              tick={{ fontSize: 12, fill: isDarkMode ? '#ffffff' : '#111827', fontWeight: 600 }}
                              label={{ value: 'Employee', position: 'bottom', offset: 36, fill: isDarkMode ? '#ffffff' : '#111827', style: { fontSize: 12, fontWeight: 600 } }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tickFormatter={v => `${v}%`}
                              tick={{ fill: isDarkMode ? '#ffffff' : '#111827', fontSize: 12, fontWeight: 600 }}
                              axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', offset: -8, fill: isDarkMode ? '#ffffff' : '#111827', style: { textAnchor: 'middle', fontSize: 12, fontWeight: 600 } }}
                            />
                            <Tooltip
                              formatter={(value) => `${value}%`}
                              contentStyle={{ backgroundColor: isDarkMode ? '#0b1220' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                              labelStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827', fontSize: 13, fontWeight: 700 }}
                              itemStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827', fontSize: 12 }}
                            />
                            <Legend verticalAlign="top" wrapperStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827' }} />
                            <Line type="monotone" dataKey="presentPct" name="Present %" stroke="#10b981" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={employeeChartData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#f3f4f6'} />
                            <XAxis
                              dataKey="name"
                              angle={-35}
                              textAnchor="end"
                              interval={0}
                              height={60}
                              axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              tick={{ fontSize: 12, fill: isDarkMode ? '#ffffff' : '#111827', fontWeight: 600 }}
                              label={{ value: 'Employee', position: 'bottom', offset: 36, fill: isDarkMode ? '#ffffff' : '#111827', style: { fontSize: 12, fontWeight: 600 } }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tickFormatter={v => `${v}%`}
                              tick={{ fill: isDarkMode ? '#ffffff' : '#111827', fontSize: 12, fontWeight: 600 }}
                              axisLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              tickLine={{ stroke: isDarkMode ? '#374151' : '#e5e7eb' }}
                              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', offset: -8, fill: isDarkMode ? '#ffffff' : '#111827', style: { textAnchor: 'middle', fontSize: 12, fontWeight: 600 } }}
                            />
                            <Tooltip
                              formatter={(value) => `${value}%`}
                              contentStyle={{ backgroundColor: isDarkMode ? '#0b1220' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                              labelStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827', fontSize: 13, fontWeight: 700 }}
                              itemStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827', fontSize: 12 }}
                            />
                            <Legend verticalAlign="top" wrapperStyle={{ color: isDarkMode ? '#E5E7EB' : '#111827' }} />
                            <Line type="monotone" dataKey="absentPct" name="Absent %" stroke="#ef4444" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-500">Tip: hover a bar to see exact percentages. Use the Show All toggle to display every employee.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <Card.Header className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <Card.Title className="text-lg font-semibold text-gray-900">
              Quick Actions
            </Card.Title>
            <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Most used
            </span>
          </div>
        </Card.Header>
        <Card.Content className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              to="/employees/add"
              title="Add Employee"
              description="Add new team member"
              icon={<AddIcon className="w-6 h-6" />}
              color="bg-primary-50 text-primary-600"
            />
            <QuickActionCard
              to="/attendance/permissions"
              title="Manage Permissions"
              description="Approve permission requests"
              icon={<ApprovalIcon className="w-6 h-6" />}
              color="bg-orange-50 text-orange-600"
            />
            <QuickActionCard
              to="/leaves"
              title="Manage Leaves"
              description="Approve leave requests"
              icon={<CalendarTodayIcon className="w-6 h-6" />}
              color="bg-red-50 text-red-600"
            />
            <QuickActionCard
              to="/payroll/generate"
              title="Generate Payroll"
              description="Process salary payments"
              icon={<AttachMoneyIcon className="w-6 h-6" />}
              color="bg-green-50 text-green-600"
            />
          </div>
        </Card.Content>
      </Card>

      {/* Employees Modal for stat cards */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="lg">
        {modalLoading ? (
          <div className="text-center py-6">
            <LoadingSpinner />
            <p className="text-sm text-gray-500 mt-3">Loading employees...</p>
          </div>
        ) : (
          <div>
            {modalEmployees.length === 0 ? (
              <p className="text-sm text-gray-600">No employee details available for this item.</p>
            ) : (
              <div className="space-y-3">
                {modalEmployees.map((emp, idx) => (
                  <div key={`${emp._id || emp.id || emp.email || 'emp'}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{emp.name || emp.fullName || emp.firstName || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{emp.department || emp.departmentName || emp.dept || '—'}</p>
                    </div>
                    <div className="text-sm text-gray-500">{emp.position || emp.role || ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Recent Activity & Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Leave Requests */}
        <Card>
          <Card.Header className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <Card.Title className="text-lg font-semibold text-gray-900">
                Recent Leave Requests
              </Card.Title>
              <Link 
                to="/leaves" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all
              </Link>
            </div>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              {data?.recentLeaves?.slice(0, 3).map((leave) => (
                <div key={leave._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {leave.employee.name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{leave.employee.name}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {leave.leaveType} • {leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                    Pending
                  </span>
                </div>
              ))}
              {(!data?.recentLeaves || data?.recentLeaves?.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <EventIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No pending leave requests</p>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Recent Permission Requests */}
        <Card>
          <Card.Header className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <Card.Title className="text-lg font-semibold text-gray-900">
                Permission Requests
              </Card.Title>
              <Link 
                to="/attendance/permissions" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all
              </Link>
            </div>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              {permissionStats?.recentPermissions?.map((permission) => (
                <div
                  key={permission._id}
                  className="flex items-center justify-between p-4 rounded-lg transition-colors duration-200 bg-orange-50 hover:bg-orange-100 dark:bg-black dark:hover:bg-orange-900/20 border border-transparent dark:border-transparent"
                >
                  <div className="flex items-center space-x-3 ">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full border border-orange-200 dark:border-orange-700 flex items-center justify-center">
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-300">
                        {permission.employee?.name?.charAt(0) || 'E'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{permission.employee?.name || 'Employee'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {permission.permissionType?.replace('-', ' ')} • {permission.duration}h
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-200">
                    Pending
                  </span>
                </div>
              ))}
              {(!permissionStats?.recentPermissions || permissionStats.recentPermissions.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <PendingActionsIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No pending permission requests</p>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Department Distribution */}
        <Card>
          <Card.Header className="border-b border-gray-200 pb-4">
            <Card.Title className="text-lg font-semibold text-gray-900">
              Department Distribution
            </Card.Title>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              {data.departmentStats?.map((dept) => {
                const percentage = ((dept.count / data.totalEmployees) * 100).toFixed(1);
                return (
                  <div key={dept._id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{dept._id}</span>
                      <span className="text-gray-900 font-semibold">
                        {dept.count} <span className="text-gray-500 text-xs">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Employees</span>
                <span className="font-semibold text-gray-900">{data.totalEmployees}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Departments</span>
                <span className="font-semibold text-gray-900">{data.departmentStats?.length || 0}</span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;