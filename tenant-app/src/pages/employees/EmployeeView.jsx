import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { employeeService } from '../../services/auth';

const EmployeeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    try {
      const data = await employeeService.getById(id);
      setEmployee(data);
    } catch (error) {
      console.error('Failed to load employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive) => (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
      isActive 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const getWorkModeBadge = (workMode) => {
    const config = {
      wfo: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Work From Office', icon: '🏢' },
      wfh: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Work From Home', icon: '🏠' },
      hybrid: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Hybrid', icon: '🔀' }
    };
    
    const modeConfig = config[workMode] || config.wfo;
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${modeConfig.color}`}>
        {modeConfig.icon} {modeConfig.label}
      </span>
    );
  };

  const getEmploymentTypeColor = (type) => {
    const colors = {
      'full-time': 'bg-blue-50 text-blue-700 border-blue-200',
      'part-time': 'bg-orange-50 text-orange-700 border-orange-200',
      'contract': 'bg-purple-50 text-purple-700 border-purple-200',
      'intern': 'bg-green-50 text-green-700 border-green-200'
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const calculateEmploymentYears = () => {
    if (!employee?.joiningDate) return 0;
    
    const joiningDate = new Date(employee.joiningDate);
    const today = new Date();
    const diffTime = Math.abs(today - joiningDate);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    return diffYears;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Employee Not Found</h2>
        <p className="text-gray-600 mb-4">The employee you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/employees')}>
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/employees')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
              <p className="text-gray-600">View comprehensive employee information</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/employees')}
            className="cursor-pointer"
          >
            Back to List
          </Button>
          <Link to={`/employees/edit/${employee._id}`}>
            <Button className="cursor-pointer">
              Edit Employee
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Profile Card */}
        <Card className="lg:col-span-1">
          <Card.Content className="text-center p-6">
            <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
              <span className="text-3xl font-bold text-primary-600">
                {employee.name?.charAt(0)}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{employee.name}</h2>
            <p className="text-gray-600 mb-4">{employee.email}</p>
            
            <div className="flex flex-col space-y-3 mb-6">
              <div>{getStatusBadge(employee.isActive)}</div>
              <div>{getWorkModeBadge(employee.workMode)}</div>
            </div>
            
            <div className="space-y-4 text-left bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Employee ID</span>
                <p className="text-gray-900 font-semibold">{employee.employeeId}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Phone</span>
                <p className="text-gray-900">{employee.phone || 'Not provided'}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Date of Birth</span>
                <p className="text-gray-900">
                  {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'Not provided'}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Gender</span>
                <p className="text-gray-900 capitalize">{employee.gender || 'Not provided'}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Employment Details */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              Employment Information
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500 block mb-2">Department</span>
                  <p className="text-xl font-semibold text-gray-900">{employee.department}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500 block mb-2">Position</span>
                  <p className="text-xl font-semibold text-gray-900">{employee.position}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-500 block mb-2">Employment Type</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEmploymentTypeColor(employee.employmentType)}`}>
                    {employee.employmentType?.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm font-medium text-green-600 block mb-2">Annual Salary</span>
                  <p className="text-3xl font-bold text-green-700">
                    ₹{employee.salary?.toLocaleString()}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-600 block mb-2">Joining Date</span>
                  <p className="text-lg font-semibold text-blue-900">
                    {new Date(employee.joiningDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {calculateEmploymentYears() > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {calculateEmploymentYears()} year{calculateEmploymentYears() !== 1 ? 's' : ''} of service
                    </p>
                  )}
                </div>
                
                {employee.terminationDate && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-sm font-medium text-red-600 block mb-2">Termination Date</span>
                    <p className="text-lg font-semibold text-red-900">
                      {new Date(employee.terminationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Work Mode Details */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 dark:from-blue-900 dark:to-indigo-900 dark:bg-none dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Work Mode</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {employee.workMode === 'wfo' && 'Employee works primarily from the office location'}
                    {employee.workMode === 'wfh' && 'Employee works primarily from home or remote location'}
                    {employee.workMode === 'hybrid' && 'Employee splits time between office and remote work'}
                  </p>
                </div>
                <div className="text-right">
                  {getWorkModeBadge(employee.workMode)}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Address Information */}
        {employee.address && Object.values(employee.address).some(val => val) && (
          <Card className="lg:col-span-3">
            <Card.Header>
              <Card.Title className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address Information
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {employee.address.street && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 block mb-2">Street Address</span>
                    <p className="text-gray-900 font-medium">{employee.address.street}</p>
                  </div>
                )}
                {employee.address.city && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 block mb-2">City</span>
                    <p className="text-gray-900 font-medium">{employee.address.city}</p>
                  </div>
                )}
                {employee.address.state && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 block mb-2">State</span>
                    <p className="text-gray-900 font-medium">{employee.address.state}</p>
                  </div>
                )}
                {employee.address.zipCode && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 block mb-2">ZIP Code</span>
                    <p className="text-gray-900 font-medium">{employee.address.zipCode}</p>
                  </div>
                )}
                {employee.address.country && (
                  <div className="p-4 bg-gray-50 rounded-lg md:col-span-2 lg:col-span-4">
                    <span className="text-sm font-medium text-gray-500 block mb-2">Country</span>
                    <p className="text-gray-900 font-medium">{employee.address.country}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Emergency Contact */}
        {employee.emergencyContact && Object.values(employee.emergencyContact).some(val => val) && (
          <Card className="lg:col-span-3">
            <Card.Header>
              <Card.Title className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Emergency Contact
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {employee.emergencyContact.name && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-600 block mb-2">Contact Name</span>
                    <p className="text-gray-900 font-semibold">{employee.emergencyContact.name}</p>
                  </div>
                )}
                {employee.emergencyContact.relationship && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-600 block mb-2">Relationship</span>
                    <p className="text-gray-900 font-semibold">{employee.emergencyContact.relationship}</p>
                  </div>
                )}
                {employee.emergencyContact.phone && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-600 block mb-2">Phone</span>
                    <p className="text-gray-900 font-semibold">{employee.emergencyContact.phone}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Bank Details */}
        {employee.bankDetails && Object.values(employee.bankDetails).some(val => val) && (
          <Card className="lg:col-span-3">
            <Card.Header>
              <Card.Title className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Bank Details
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {employee.bankDetails.accountNumber && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-600 block mb-2">Account Number</span>
                    <p className="text-gray-900 font-mono font-semibold">{employee.bankDetails.accountNumber}</p>
                  </div>
                )}
                {employee.bankDetails.bankName && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-600 block mb-2">Bank Name</span>
                    <p className="text-gray-900 font-semibold">{employee.bankDetails.bankName}</p>
                  </div>
                )}
                {employee.bankDetails.branch && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-600 block mb-2">Branch</span>
                    <p className="text-gray-900 font-semibold">{employee.bankDetails.branch}</p>
                  </div>
                )}
                {employee.bankDetails.ifscCode && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-600 block mb-2">IFSC Code</span>
                    <p className="text-gray-900 font-mono font-semibold">{employee.bankDetails.ifscCode}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmployeeView;