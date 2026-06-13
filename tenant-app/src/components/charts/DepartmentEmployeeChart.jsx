import React from 'react';
import {
  BarChart,
  Bar,
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

const DepartmentEmployeeChart = ({ data }) => {
  if (!data || !data.departmentAnalytics || data.departmentAnalytics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">🏢</div>
          <p>No department data available</p>
        </div>
      </div>
    );
  }

  const { departmentAnalytics, departmentDistribution, overallAvgSalary } = data;

  // Prepare data for charts
  const departmentData = departmentAnalytics.map(dept => ({
    name: dept.department,
    employees: dept.employeeCount,
    attendance: dept.avgAttendanceRate,
    salary: dept.avgSalary
  }));

  // Group gender counts by department so we can render grouped bars
  const genderData = departmentAnalytics.map(dept => ({
    name: dept.department,
    male: Number(dept.genderDistribution?.male || 0),
    female: Number(dept.genderDistribution?.female || 0),
    other: Number(dept.genderDistribution?.other || 0)
  }));

  // Custom tooltip for department chart
  const DepartmentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dept = departmentAnalytics.find(d => d.department === label);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            Employees: <strong>{payload[0].value}</strong>
          </p>
          <p className="text-sm text-green-600">
            Avg Attendance: <strong>{dept?.avgAttendanceRate}%</strong>
          </p>
          <p className="text-sm text-purple-600">
            Avg Salary: <strong>₹{dept?.avgSalary?.toLocaleString()}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Team Size: <strong>{dept?.teamStrength}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for gender chart
  const GenderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.color }}>
            {payload[0].payload.gender}: <strong>{payload[0].value}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Professional color palette (kept consistent across charts)
  const departmentColors = [
    '#2563eb', '#ef4444', '#059669', '#d97706', '#7c3aed',
    '#db2777', '#0891b2', '#84cc16', '#f97316', '#4f46e5'
  ];

  return (
    <div className="space-y-6">
      {/* Department Employee Distribution */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={departmentData} margin={{ top: 12, right: 30, left: 20, bottom: 60 }} barCategoryGap={20}>
            {/* subtle horizontal grid for readability, no vertical lines */}
            <CartesianGrid vertical={false} stroke="#eef2f6" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11 }}
            />
            <YAxis />
            <Tooltip content={<DepartmentTooltip />} />
            <Legend />
            <Bar 
              dataKey="employees" 
              name="Employee Count"
              fill={departmentColors[0]}
              radius={[6, 6, 4, 4]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gender Distribution */}
      <div className="h-64">
        <div className="text-center mb-4">
          <h4 className="font-semibold text-gray-900">Gender Distribution</h4>
          <p className="text-sm text-gray-600">Across Departments</p>
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={genderData} margin={{ top: 12, right: 12, left: 6, bottom: 60 }} barCategoryGap={12}>
            <CartesianGrid vertical={false} stroke="#eef2f6" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11 }}
            />
            <YAxis />
            <Tooltip content={<GenderTooltip />} />
            <Legend verticalAlign="top" align="right" />
            {/* Grouped bars: male / female / other */}
            <Bar dataKey="male" name="Male" fill="#2563eb" radius={[6, 6, 4, 4]} />
            <Bar dataKey="female" name="Female" fill="#db2777" radius={[6, 6, 4, 4]} />
            <Bar dataKey="other" name="Other" fill="#6b7280" radius={[6, 6, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {departmentAnalytics.length}
            </div>
            <div className="text-sm text-blue-700">Total Departments</div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {departmentAnalytics.reduce((max, dept) => 
                dept.employeeCount > max.employeeCount ? dept : max
              ).department}
            </div>
            <div className="text-sm text-green-700">Largest Department</div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              ₹{overallAvgSalary?.toLocaleString()}
            </div>
            <div className="text-sm text-purple-700">Avg Salary</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentEmployeeChart;