import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { payrollService,companyService } from '../../services/auth';
import {
  Schedule as ScheduleIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  Check as CheckIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

const PayrollList = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payslipModal, setPayslipModal] = useState({ isOpen: false, payroll: null });

  useEffect(() => {
    loadPayrolls();
  }, [selectedYear]);

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getMyPayroll();
      // Filter by selected year if needed, or use backend filtering
      const filteredData = data.filter(payroll => payroll.year === selectedYear);
      setPayrolls(filteredData);
    } catch (error) {
      console.error('Failed to load payroll:', error);
      setError('Failed to load payroll records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', 
        label: 'Pending',
        icon: <ScheduleIcon className="w-3 h-3" />
      },
      processed: { 
        color: 'bg-blue-100 text-blue-800 border border-blue-200', 
        label: 'Processed',
        icon: <BuildIcon className="w-3 h-3" />
      },
      paid: { 
        color: 'bg-green-100 text-green-800 border border-green-200', 
        label: 'Paid',
        icon: <CheckCircleIcon className="w-3 h-3" />
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1.5">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getMonthName = (monthNumber) => {
    return new Date(2000, monthNumber - 1).toLocaleString('default', { month: 'long' });
  };

  const calculateStatistics = () => {
    if (payrolls.length === 0) return null;

    const paidPayrolls = payrolls.filter(p => p.status === 'paid');
    const totalEarned = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const highestSalary = Math.max(...payrolls.map(p => p.netSalary || 0));
    const averageSalary = totalEarned / payrolls.length;

    return {
      totalEarned,
      highestSalary,
      averageSalary,
      paidMonths: paidPayrolls.length,
      totalMonths: payrolls.length
    };
  };

  const downloadPayslip = async (payroll) => {
  try {
    // Fetch company info from database
    const companyInfo = await companyService.getPublicCompanyInfo();
    const companyName = companyInfo.name || 'YOUR COMPANY NAME';
    
    // Create a printable payslip in receipt format
    const payslipWindow = window.open('', '_blank');
    const employee = payroll.employee || {};
    
    payslipWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${getMonthName(payroll.month)} ${payroll.year}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif; 
            background: white; 
            color: #1f2937; 
            line-height: 1.6;
            padding: 20px;
          }
          .payslip-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .company-name {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .document-title {
            font-size: 18px;
            font-weight: 500;
            opacity: 0.9;
          }
          .content {
            padding: 30px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .info-item {
            margin-bottom: 12px;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            margin-top: 4px;
          }
          .salary-breakdown {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .salary-breakdown th {
            background: #f8fafc;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
          }
          .salary-breakdown td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          .amount {
            text-align: right;
            font-weight: 600;
          }
          .earnings { color: #059669; }
          .deductions { color: #dc2626; }
          .total-row {
            background: #f0f9ff;
            font-weight: 700;
          }
          .total-row td {
            border-top: 2px solid #3b82f6;
            border-bottom: none;
            color: #1e40af;
          }
          .footer {
            text-align: center;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
          }
          .signature-area {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-line {
            border-top: 1px solid #d1d5db;
            margin-top: 60px;
            padding-top: 8px;
            font-size: 12px;
            color: #6b7280;
          }
          .watermark {
            opacity: 0.1;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            font-weight: 900;
            color: #3b82f6;
            pointer-events: none;
          }
          @media print {
            body { padding: 0; }
            .payslip-container { border: none; box-shadow: none; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="watermark">PAYSLIP</div>
        <div class="payslip-container">
          <div class="header">
            <div class="company-name">${companyName}</div>
            <div class="document-title">SALARY PAYSLIP</div>
          </div>
          
          <div class="content">
            <!-- Employee & Company Info -->
            <div class="section">
              <div class="grid-2">
                <div>
                  <div class="section-title">Employee Information</div>
                  <div class="info-item">
                    <div class="info-label">Employee Name</div>
                    <div class="info-value">${employee.name || 'N/A'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Employee ID</div>
                    <div class="info-value">${employee.employeeId || 'N/A'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Department</div>
                    <div class="info-value">${employee.department || 'N/A'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Position</div>
                    <div class="info-value">${employee.position || 'N/A'}</div>
                  </div>
                </div>
                
                <div>
                  <div class="section-title">Payroll Information</div>
                  <div class="info-item">
                    <div class="info-label">Pay Period</div>
                    <div class="info-value">${getMonthName(payroll.month)} ${payroll.year}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Payment Date</div>
                    <div class="info-value">${payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'Pending'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value" style="color: ${
                      payroll.status === 'paid' ? '#059669' : 
                      payroll.status === 'pending' ? '#d97706' : '#dc2626'
                    }">${payroll.status.toUpperCase()}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Payslip ID</div>
                    <div class="info-value">${payroll._id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Attendance Summary -->
            <div class="section">
              <div class="section-title">Attendance Summary</div>
              <div class="grid-2">
                <div class="info-item">
                  <div class="info-label">Working Days</div>
                  <div class="info-value">${payroll.workingDays || 0}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Present Days</div>
                  <div class="info-value">${payroll.presentDays || 0}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Leave Days</div>
                  <div class="info-value">${payroll.leaveDays || 0}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Attendance Rate</div>
                  <div class="info-value">${payroll.workingDays ? Math.round((payroll.presentDays / payroll.workingDays) * 100) : 0}%</div>
                </div>
              </div>
            </div>

            <!-- Salary Breakdown -->
            <div class="section">
              <div class="section-title">Salary Breakdown</div>
              <table class="salary-breakdown">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Salary</td>
                    <td class="amount">${(payroll.basicSalary || 0).toLocaleString()}</td>
                  </tr>
                  ${payroll.allowances > 0 ? `
                  <tr>
                    <td>Allowances & Bonuses</td>
                    <td class="amount earnings">+ ${(payroll.allowances || 0).toLocaleString()}</td>
                  </tr>
                  ` : ''}
                  ${payroll.deductions > 0 ? `
                  <tr>
                    <td>Deductions</td>
                    <td class="amount deductions">- ${(payroll.deductions || 0).toLocaleString()}</td>
                  </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td><strong>NET SALARY</strong></td>
                    <td class="amount"><strong>₹${(payroll.netSalary || 0).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Payment Details -->
            <div class="section">
              <div class="section-title">Payment Details</div>
              <div class="grid-2">
                <div class="info-item">
                  <div class="info-label">Payment Method</div>
                  <div class="info-value">Bank Transfer</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Account Number</div>
                  <div class="info-value">•••• ${employee.bankDetails?.accountNumber?.slice(-4) || 'XXXX'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Bank Name</div>
                  <div class="info-value">${employee.bankDetails?.bankName || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">IFSC Code</div>
                  <div class="info-value">${employee.bankDetails?.ifscCode || 'N/A'}</div>
                </div>
              </div>
            </div>

            <!-- Signatures -->
            <div class="signature-area">
              <div>
                <div class="signature-line">Employee Signature</div>
              </div>
              <div>
                <div class="signature-line">Authorized Signatory</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer-generated document and does not require a physical signature.</p>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin-right: 10px;
          ">
            Print Payslip
          </button>
          <button onclick="window.close()" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">
            Close
          </button>
        </div>

        <script>
          window.onload = function() {
            // Auto-print if needed
            // window.print();
          };
        </script>
      </body>
      </html>
    `);
    
    payslipWindow.document.close();
  } catch (error) {
    console.error('Error fetching company info:', error);
    // Fallback to hardcoded name if API fails
    downloadPayslipWithFallback(payroll, 'YOUR COMPANY NAME');
  }
};

// Fallback function in case company API fails
const downloadPayslipWithFallback = (payroll, companyName = 'YOUR COMPANY NAME') => {
  const payslipWindow = window.open('', '_blank');
  const employee = payroll.employee || {};
  
  payslipWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payslip - ${getMonthName(payroll.month)} ${payroll.year}</title>
      <style>
        /* ... same styles as above ... */
      </style>
    </head>
    <body>
      <div class="watermark">PAYSLIP</div>
      <div class="payslip-container">
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="document-title">SALARY PAYSLIP</div>
        </div>
        <!-- ... rest of the HTML content same as above ... -->
      </div>
    </body>
    </html>
  `);
  
  payslipWindow.document.close();
};

  const viewPayslip = (payroll) => {
    setPayslipModal({ isOpen: true, payroll });
  };

  const stats = calculateStatistics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your payroll records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payroll</h1>
          <p className="text-gray-600 mt-1">
            View your salary history and download payslips
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-primary-500 dark:focus:border-primary-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <ErrorIcon className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                ₹{stats.totalEarned?.toLocaleString()}
              </div>
              <p className="text-sm font-medium text-blue-700">Total Earned</p>
              <p className="text-xs text-blue-600 mt-1">{stats.totalMonths} months</p>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-green-600 mb-1">
                ₹{stats.highestSalary?.toLocaleString()}
              </div>
              <p className="text-sm font-medium text-green-700">Highest Salary</p>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                ₹{Math.round(stats.averageSalary)?.toLocaleString()}
              </div>
              <p className="text-sm font-medium text-purple-700">Average Monthly</p>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {stats.paidMonths}/{stats.totalMonths}
              </div>
              <p className="text-sm font-medium text-orange-700">Paid Months</p>
              <p className="text-xs text-orange-600 mt-1">
                {Math.round((stats.paidMonths / stats.totalMonths) * 100)}% completion
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Payroll Records */}
      <Card>
        <Card.Header className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <Card.Title className="text-lg font-semibold text-gray-900">
              Salary History {selectedYear && `- ${selectedYear}`}
            </Card.Title>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {payrolls.length} {payrolls.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-hidden">
            {payrolls.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {payrolls.map((payroll) => (
                  <div key={payroll._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Month and Basic Info */}
                      <div className="flex items-center space-x-4">
                          <div className="text-center min-w-16">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 bg-primary-50 dark:bg-transparent rounded-lg py-2 px-3">
                            {payroll.month}
                          </div>
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-300 mt-1 uppercase tracking-wide">
                            {getMonthName(payroll.month).slice(0, 3)}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                              ₹{payroll.netSalary?.toLocaleString()}
                            </h3>
                            {getStatusBadge(payroll.status)}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <span className="flex items-center">
                              <CalendarTodayIcon className="w-4 h-4 mr-1 text-gray-400" />
                              {payroll.year}
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <AccessTimeIcon className="w-4 h-4 mr-1 text-gray-400" />
                              {payroll.workingDays} days
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <CheckIcon className="w-4 h-4 mr-1 text-green-400" />
                              {payroll.presentDays} present
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Salary Breakdown and Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start lg:items-end xl:items-center gap-4">
                        {/* Salary Breakdown */}
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                            <span className="text-blue-700 font-medium">Basic: </span>
                            <span className="text-blue-900">₹{payroll.basicSalary?.toLocaleString()}</span>
                          </div>
                          {payroll.allowances > 0 && (
                            <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                              <span className="text-green-700 font-medium">Allowances: </span>
                              <span className="text-green-900">+₹{payroll.allowances?.toLocaleString()}</span>
                            </div>
                          )}
                          {payroll.deductions > 0 && (
                            <div className="bg-red-50 px-3 py-1.5 rounded-lg">
                              <span className="text-red-700 font-medium">Deductions: </span>
                              <span className="text-red-900">-₹{payroll.deductions?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end space-y-2 min-w-32">
                          {payroll.paymentDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-300 text-right">
                              Paid on {new Date(payroll.paymentDate).toLocaleDateString()}
                            </p>
                          )}
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewPayslip(payroll)}
                            >
                              <ReceiptIcon className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => downloadPayslip(payroll)}
                            >
                              <DownloadIcon className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <InfoIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll records found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {selectedYear === new Date().getFullYear() 
                    ? "You don't have any payroll records for this year yet."
                    : `No payroll records found for ${selectedYear}.`
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => setSelectedYear(new Date().getFullYear())}
                    variant="primary"
                    size="sm"
                  >
                    View Current Year
                  </Button>
                  <Button
                    onClick={loadPayrolls}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshIcon className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Payslip Preview Modal */}
      <Modal
        isOpen={payslipModal.isOpen}
        onClose={() => setPayslipModal({ isOpen: false, payroll: null })}
        title="Payslip Preview"
        size="xl"
      >
        {payslipModal.payroll && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">
                    {getMonthName(payslipModal.payroll.month)} {payslipModal.payroll.year} Payslip
                  </h4>
                  <p className="text-blue-700 text-sm">
                    Ready to download or print professional receipt format
                  </p>
                </div>
                <Button
                  onClick={() => downloadPayslip(payslipModal.payroll)}
                  variant="primary"
                  size="sm"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download Payslip
                </Button>
              </div>
            </div>

            {/* Quick Preview */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Employee Details</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Salary:</span>
                      <span className="font-semibold text-green-600">
                        ₹{payslipModal.payroll.netSalary?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span>{getStatusBadge(payslipModal.payroll.status)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Salary Breakdown</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Salary:</span>
                      <span>₹{payslipModal.payroll.basicSalary?.toLocaleString()}</span>
                    </div>
                    {payslipModal.payroll.allowances > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Allowances:</span>
                        <span className="text-green-600">+₹{payslipModal.payroll.allowances?.toLocaleString()}</span>
                      </div>
                    )}
                    {payslipModal.payroll.deductions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deductions:</span>
                        <span className="text-red-600">-₹{payslipModal.payroll.deductions?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-center text-gray-500 text-sm">
                <ReceiptIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Click "Download Payslip" to get the complete professional receipt format</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Help Section */}
      {payrolls.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <Card.Content className="p-4">
            <div className="flex items-start">
              <InfoIcon className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-1">Professional Payslip Receipts</h4>
                <p className="text-sm text-blue-700">
                  Download professional receipt-style payslips with complete salary breakdown, 
                  company branding, and official format suitable for documentation.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default PayrollList;