import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { employeeService, departmentSettingService } from '../../services/auth';
import { showSuccess, showError } from '../../utils/toast';

// Material-UI Icons
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';

const DepartmentShiftSettings = () => {
  const [departments, setDepartments] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get all employees to extract unique departments
      const employeesRes = await employeeService.getAll();
      const employees = Array.isArray(employeesRes) ? employeesRes : (employeesRes?.data || []);
      const uniqueDepts = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
      setDepartments(uniqueDepts);
      
      // Get existing department settings
      try {
        const settingsRes = await departmentSettingService.getAll();
        const settingsMap = {};
        (settingsRes?.data || settingsRes || []).forEach(setting => {
          settingsMap[setting.departmentName] = setting;
        });
        setSettings(settingsMap);
      } catch (err) {
        console.log('No existing settings found');
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
      showError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const toggleShiftRequirement = async (departmentName, currentValue) => {
    setUpdating(prev => ({ ...prev, [departmentName]: true }));
    try {
      const newValue = !currentValue;
      await departmentSettingService.update(departmentName, { shiftRequired: newValue });
      
      setSettings(prev => ({
        ...prev,
        [departmentName]: { 
          ...prev[departmentName], 
          departmentName, 
          shiftRequired: newValue 
        }
      }));
      
      showSuccess(`${departmentName}: Shift requirement ${newValue ? 'ENABLED' : 'DISABLED'}`);
    } catch (error) {
      console.error('Failed to update department setting:', error);
      showError(error.response?.data?.message || 'Failed to update setting');
    } finally {
      setUpdating(prev => ({ ...prev, [departmentName]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Department Shift Requirements</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure which departments require mandatory shift assignment
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700">
        <Card.Content className="p-4">
          <div className="flex items-start space-x-3">
            <WarningIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">How it works</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Departments marked as <strong>Shift Required</strong> will force employees to have a shift assigned.
                Employees without a shift will be <strong>blocked from checking in</strong>.
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Departments <strong>not required</strong> allow employees to check in anytime without restrictions.
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Departments List */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <BusinessIcon className="w-5 h-5 mr-2 text-gray-600" />
            Departments ({Array.isArray(departments) ? departments.length : 0})
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {!Array.isArray(departments) || departments.length === 0 ? (
            <div className="text-center py-8">
              <BusinessIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No departments found</p>
              <p className="text-sm text-gray-400 mt-1">
                Add employees with departments to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(departments) && departments.map((dept) => {
                const setting = settings[dept];
                const shiftRequired = setting?.shiftRequired || false;
                const isUpdating = updating[dept];
                
                return (
                  <div 
                    key={dept} 
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      shiftRequired 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        shiftRequired 
                          ? 'bg-red-100 dark:bg-red-800' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        <BusinessIcon className={`w-5 h-5 ${
                          shiftRequired 
                            ? 'text-red-600 dark:text-red-300' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{dept}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {shiftRequired 
                            ? '⚠️ Shift assignment required - Check-in will be blocked without shift'
                            : '✓ No shift required - Check-in allowed anytime'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant={shiftRequired ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => toggleShiftRequirement(dept, shiftRequired)}
                      loading={isUpdating}
                      className="min-w-32"
                    >
                      {shiftRequired ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Shift Required (ON)
                        </>
                      ) : (
                        <>
                          <SettingsIcon className="w-4 h-4 mr-1" />
                          Shift Required (OFF)
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Summary Card */}
      {Array.isArray(departments) && departments.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Summary</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Array.isArray(departments) ? departments.length : 0}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Departments</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Array.isArray(departments) ? departments.filter(d => settings[d]?.shiftRequired).length : 0}
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">Shift Required</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Array.isArray(departments) ? departments.filter(d => !settings[d]?.shiftRequired).length : 0}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">No Restriction</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default DepartmentShiftSettings;