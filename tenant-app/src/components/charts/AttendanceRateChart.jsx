import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Material-UI Icons
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const AttendanceRateChart = ({ data }) => {
  const [timeFilter, setTimeFilter] = useState('today'); // today, week, month, year

  if (!data || !data.dailyData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No attendance data available</p>
        </div>
      </div>
    );
  }

  // Filter data based on selected time period
  const getFilteredData = () => {
    switch (timeFilter) {
      case 'today':
        return data.dailyData.slice(-1); // Last entry (today)
      case 'week':
        return data.dailyData.slice(-7); // Last 7 days
      case 'month':
        return data.dailyData.slice(-30); // Last 30 days
      case 'year':
        return data.monthlyTrend || data.dailyData.slice(-365); // Last 12 months
      default:
        return data.dailyData.slice(-7);
    }
  };

  const filteredData = getFilteredData();
  const currentData = data.dailyData[data.dailyData.length - 1] || {};
  const totalEmployeesDisplay = data.totalEmployees || currentData.totalEmployees || 0;
  // Today's present and percentage (use overall totalEmployeesDisplay)
  const presentToday = currentData.presentCount || currentData.present || 0;
  const todayPct = totalEmployeesDisplay > 0 ? (presentToday / totalEmployeesDisplay) * 100 : (currentData.attendanceRate || 0);
  
  // Prepare data for charts (modern trend: attendanceRate % + present count sparkline)
  const chartData = (timeFilter === 'year' ? (data.monthlyTrend || []) : filteredData).map(item => {
    const total = Number(item.totalEmployees ?? totalEmployeesDisplay ?? 0) || 0;
    const present = Number(item.presentCount ?? item.present ?? 0) || 0;

    // Always compute percent from present / total to ensure correctness
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;
    const presentPct = total > 0 ? (present / total) * 100 : 0;

    return {
      label: timeFilter === 'year' ? item.label || item.period : item.date,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      present,
      presentPct: Math.round(presentPct * 100) / 100,
      totalEmployees: total
    };
  });

  // (debug logs removed)

  // Pie chart data for current period (based on overall totalEmployeesDisplay)
  const totalToday = totalEmployeesDisplay;
  const absentToday = Math.max(0, totalToday - presentToday);
  const pieData = [
    { name: 'Present', value: presentToday, color: '#10b981' },
    { name: 'Absent', value: absentToday, color: '#ef4444' }
  ];

  // Custom tooltip for modern chart
  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // payload[0].payload contains the original data object
      const point = payload[0].payload || {};
      const rate = point.attendanceRate ?? 0;
      const present = point.present ?? 0;
      const presentPct = point.presentPct ?? (point.totalEmployees ? (present / point.totalEmployees) * 100 : 0);

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
          <div className="font-semibold text-gray-900 mb-1">{label}</div>
          <div className="flex justify-between">
            <div className="text-gray-600">Attendance Rate</div>
            <div className="font-semibold text-purple-700">{Number(rate).toFixed(1)}%</div>
          </div>
          <div className="flex justify-between mt-1">
            <div className="text-gray-600">Present</div>
            <div className="font-semibold text-green-600">{present} ({Number(presentPct).toFixed(1)}%)</div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = totalToday || pieData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? (data.value / total) * 100 : 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-sm text-gray-600">
            {data.value} employees ({percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const getFilterLabel = () => {
    switch (timeFilter) {
      case 'today': return "Today's Attendance";
      case 'week': return "This Week's Attendance";
      case 'month': return "This Month's Attendance";
      case 'year': return "This Year's Attendance";
      default: return "Attendance Overview";
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Present Today</p>
              <p className="text-2xl font-bold text-green-900">
                {presentToday || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <TodayIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-700">
            {totalEmployeesDisplay > 0 ? `${(todayPct || 0).toFixed(1)}% of total` : 'No data'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Employees</p>
              <p className="text-2xl font-bold text-blue-900">
                {totalEmployeesDisplay || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <PeopleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-700">
            Active workforce
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-900">
                {totalEmployeesDisplay > 0 ? `${(todayPct || 0).toFixed(1)}%` : (currentData.attendanceRate ? `${currentData.attendanceRate}%` : '0%')}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <TrendingUpIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-2 text-xs text-purple-700">
            Current period
          </div>
        </div>
      </div>

      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{getFilterLabel()}</h3>
          <p className="text-sm text-gray-600">
            Real-time attendance monitoring and analytics
          </p>
        </div>
        
        {/* Time Filter Buttons */}
        <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'today', label: 'Today', icon: <TodayIcon className="w-4 h-4" /> },
            { key: 'week', label: 'Week', icon: <DateRangeIcon className="w-4 h-4" /> },
            { key: 'month', label: 'Month', icon: <CalendarMonthIcon className="w-4 h-4" /> },
            { key: 'year', label: 'Year', icon: <TrendingUpIcon className="w-4 h-4" /> }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setTimeFilter(filter.key)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                timeFilter === filter.key
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      
      {/* Charts layout: left = main chart, right = pie + performance (responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left: Main Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 w-full" style={{ height: 420 }}>
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900">
              {timeFilter === 'today' ? "Today's Breakdown" : 
               timeFilter === 'week' ? "Weekly Trend" :
               timeFilter === 'month' ? "Monthly Overview" : "Yearly Performance"}
            </h4>
            <p className="text-sm text-gray-600">
              {timeFilter === 'today' ? "Real-time attendance status" :
               `Attendance pattern over ${timeFilter}`}
            </p>
          </div>

          <div style={{ height: 'calc(100% - 56px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="gradAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  angle={timeFilter === 'today' ? 0 : -45}
                  textAnchor={timeFilter === 'today' ? 'middle' : 'end'}
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" />

                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="attendanceRate"
                  name="Attendance %"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#gradAttendance)"
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="presentPct"
                  name="Present %"
                  yAxisId="left"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Pie and Performance stacked */}
        <div className="flex flex-col gap-6" style={{ height: 420 }}>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
            <h4 className="font-semibold text-gray-900 mb-4">Current Distribution</h4>
            <div className="flex items-start gap-4">
              <div className="w-1/2 flex items-center justify-center">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex-1">
                <div className="space-y-3">
                  {pieData.map((item) => {
                    const pct = totalToday > 0 ? (item.value / totalToday) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <div>
                            <div className="text-gray-700 font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.value} employees</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200 flex-1">
            <h4 className="font-semibold text-orange-900 mb-2">Performance</h4>
            <div className="w-full bg-orange-200 rounded-full h-2 mb-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${todayPct ? todayPct.toFixed(1) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-orange-700">
              <span>Attendance Rate</span>
              <span className="font-semibold">{todayPct ? `${todayPct.toFixed(1)}%` : '0%'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add missing PeopleIcon component
const PeopleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
  </svg>
);

export default AttendanceRateChart;