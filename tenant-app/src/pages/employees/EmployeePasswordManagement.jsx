import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { authService, employeeService } from '../../services/auth';

const EmployeePasswordManagement = ({ employee, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('change');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [employee]);

  const loadUserData = async () => {
    try {
      // Get the user ID associated with this employee
      const employeeDetails = await employeeService.getById(employee._id);
      if (employeeDetails.user && employeeDetails.user._id) {
        setUserData(employeeDetails.user);
      } else {
        // If user data is not populated, we'll use the employee ID to find the user
        // This is a fallback approach
        console.log('User data not populated, using employee ID:', employee._id);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // Use employee._id directly since our backend can handle both employee ID and user ID
      const response = await authService.changeEmployeePassword(employee._id, formData.newPassword);
      setResult({
        type: 'success',
        message: response.message,
        details: `Password changed successfully for ${employee.name}. They will be logged out from all sessions.`
      });
      setFormData({ newPassword: '', confirmPassword: '' });
      // Notify parent and close
      if (onSuccess) onSuccess(response.message || 'Password changed successfully');
    } catch (error) {
      console.error('Password change error:', error);
      setResult({
        type: 'error',
        message: 'Failed to change password',
        details: error.response?.data?.message || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      // Use employee._id directly
      const response = await authService.resetEmployeePassword(employee._id);
      const msg = response.message || 'Password reset successfully';
      setResult({
        type: 'success',
        message: msg,
        details: `Password reset successfully for ${employee.name}. New password: ${response.newPassword}`,
        newPassword: response.newPassword
      });
        // Notify parent (do not automatically close so the admin can copy/view the new password)
        if (onSuccess) onSuccess(msg);
    } catch (error) {
      console.error('Password reset error:', error);
      setResult({
        type: 'error',
        message: 'Failed to reset password',
        details: error.response?.data?.message || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Password copied to clipboard!');
  };

  // This component renders the password management form content
  // It is intended to be used inside a parent `Modal` so it does not render its own Modal wrapper.
  return (
    <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('change')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'change'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('reset')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reset'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reset Password
            </button>
          </nav>
        </div>

       

        {/* Result Message */}
        {result && (
          <div className={`p-4 rounded-lg ${
            result.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {result.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  result.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
                <p className={`text-sm mt-1 ${
                  result.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.details}
                </p>
                
                {result.newPassword && (
                  <div className="mt-3 p-3 bg-green-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">
                        New Password: 
                        <span className="font-mono ml-2">{result.newPassword}</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(result.newPassword)}
                        className="ml-2 text-green-600 hover:text-green-800 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Please provide this password to the employee securely
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Change Password Form */}
        {activeTab === 'change' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={!formData.newPassword || !formData.confirmPassword}
              >
                Change Password
              </Button>
            </div>
          </form>
        )}

        {/* Reset Password Section */}
        {activeTab === 'reset' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Password Reset
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This will generate a new random password for {employee.name}. 
                      They will be logged out from all active sessions and will need to 
                      use the new password to login.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                loading={loading}
                variant="danger"
              >
                Reset Password
              </Button>
            </div>
          </div>
        )}
      </div>
  );
};

export default EmployeePasswordManagement;