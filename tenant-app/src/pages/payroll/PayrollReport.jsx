import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { payrollService, employeeService } from '../../services/auth';

// Material-UI Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaidIcon from '@mui/icons-material/Paid';
import InfoIcon from '@mui/icons-material/Info';
import CheckIcon from '@mui/icons-material/Check';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

const PayrollReport = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    allowances: 0,
    deductions: 0
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payrollData, employeesData] = await Promise.all([
        payrollService.getAllPayroll(selectedMonth, selectedYear),
        employeeService.getAll()
      ]);
      setPayrolls(payrollData || []);
      setEmployees((employeesData || []).filter(emp => emp.isActive));
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.employeeId) {
      setError('Please select an employee');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      await payrollService.generate(formData);
      await loadData();
      setGenerateModal(false);
      setFormData({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        allowances: 0,
        deductions: 0
      });
      setSuccessMessage('Payroll generated successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Failed to generate payroll:', error);
      setError(error.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  // ✅ FIXED: Update payroll status
  const updatePayrollStatus = async (payrollId, status) => {
    try {
      await payrollService.updateStatus(payrollId, { status });
      await loadData();
      setSuccessMessage(`Payroll marked as ${status}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update payroll status:', error);
      setError(error.response?.data?.message || 'Failed to update payroll status');
    }
  };

  // ✅ FIXED: View payroll details
  const viewPayrollDetails = async (payrollId) => {
    try {
      const payroll = await payrollService.getById(payrollId);
      console.log('Payroll details:', payroll);
      // You can open a modal or navigate to a details page here
      alert(`Payroll Details:\nEmployee: ${payroll.employee?.name}\nNet Salary: ₹${payroll.netSalary?.toLocaleString()}\nStatus: ${payroll.status}`);
    } catch (error) {
      console.error('Failed to load payroll details:', error);
      setError('Failed to load payroll details');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        label: 'Pending',
        icon: <AccessTimeIcon className="w-3 h-3" />
      },
      processed: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        label: 'Processed',
        icon: <BuildIcon className="w-3 h-3" />
      },
      paid: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        label: 'Paid',
        icon: <CheckCircleIcon className="w-3 h-3" />
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-full border ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getDepartmentColor = (department) => {
    const colors = {
      'Engineering': 'bg-blue-100 text-blue-800 border-blue-200',
      'Human Resources': 'bg-purple-100 text-purple-800 border-purple-200',
      'Marketing': 'bg-pink-100 text-pink-800 border-pink-200',
      'Sales': 'bg-green-100 text-green-800 border-green-200',
      'Finance': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Operations': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Customer Support': 'bg-orange-100 text-orange-800 border-orange-200',
      'Design': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Product': 'bg-lime-100 text-lime-800 border-lime-200'
    };
    return colors[department] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const calculateTotalPayout = () => {
    return payrolls.reduce((sum, payroll) => sum + (payroll.netSalary || 0), 0);
  };

  const calculateAverageSalary = () => {
    return payrolls.length > 0 ? calculateTotalPayout() / payrolls.length : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">
            Manage employee payroll and generate salary reports
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          
          <Button 
            onClick={() => setGenerateModal(true)}
            className="whitespace-nowrap"
          >
            <AddIcon className="w-4 h-4 mr-2" />
            Generate Payroll
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
          <p className="text-green-700 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <ErrorIcon className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Payroll List - Updated action buttons */}
      <Card>
        <Card.Header className="border-b border-gray-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <PaidIcon className="w-5 h-5 mr-2 text-gray-600" />
              Payroll for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Card.Title>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {payrolls.length} {payrolls.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Basic Salary
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Allowances
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {payrolls.map((payroll) => (
                  <tr key={payroll._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-sm font-semibold text-white">
                            {payroll.employee?.name?.charAt(0)?.toUpperCase() || 'E'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {payroll.employee?.name || 'Unknown Employee'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300">
                            {payroll.employee?.position || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(payroll.employee?.department)}`}>
                        {payroll.employee?.department || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      ₹{(payroll.basicSalary || 0)?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-300 font-medium">
                      +₹{(payroll.allowances || 0)?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-300 font-medium">
                      -₹{(payroll.deductions || 0)?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        ₹{(payroll.netSalary || 0)?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payroll.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {payroll.status !== 'paid' && (
                          <button
                            onClick={() => updatePayrollStatus(payroll._id, 'paid')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                            title="Mark as paid"
                          >
                            <CheckIcon className="w-3 h-3 mr-1" />
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => viewPayrollDetails(payroll._id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:focus:ring-primary-500"
                          title="View details"
                        >
                          <VisibilityIcon className="w-3 h-3 mr-1" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payrolls.length === 0 && (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <PaidIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll records found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  No payroll data available for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}.
                </p>
                <Button onClick={() => setGenerateModal(true)}>
                  Generate First Payroll
                </Button>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={generateModal}
        onClose={() => setGenerateModal(false)}
        title="Generate Payroll"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.department} (₹{(emp.salary || 0)?.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowances (₹)
              </label>
              <input
                type="number"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deductions (₹)
              </label>
              <input
                type="number"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setGenerateModal(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!formData.employeeId}
              className="min-w-32"
            >
              Generate Payroll
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollReport;