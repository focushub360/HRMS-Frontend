import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { authService, employeeService } from '../../services/auth';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const profile = await employeeService.getById(user.employee._id);
      setProfileData({
        phone: profile.phone || '',
        address: profile.address || {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        }
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await employeeService.update(profileData, true);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully. You will be logged out shortly.' });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Logout user after password change as per backend implementation
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      console.error('Password change error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password' });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: <PersonIcon className="w-5 h-5" /> },
    { id: 'security', name: 'Security', icon: <LockIcon className="w-5 h-5" /> }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your account settings</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab Navigation - compact pill/underline tabs instead of a bulky sidebar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-2 sm:gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div>
        {activeTab === 'profile' && (
          <Card>
            <Card.Header>
              <Card.Title>Profile Information</Card.Title>
            </Card.Header>
            <Card.Content>
              <form onSubmit={handleProfileUpdate}>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <PersonIcon className="w-6 h-6 text-primary-600 dark:text-primary-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.employee?.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300 truncate">{user?.employee?.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {user?.role} • {user?.employee?.department}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Personal Information</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          value={user?.employee?.employeeId || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Employment Details</h4>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Department</dt>
                          <dd className="text-sm text-gray-900 dark:text-gray-100">{user?.employee?.department}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Position</dt>
                          <dd className="text-sm text-gray-900 dark:text-gray-100">{user?.employee?.position}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Employment Type</dt>
                          <dd className="text-sm text-gray-900 dark:text-gray-100 capitalize">{user?.employee?.employmentType}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 dark:text-gray-400">Joining Date</dt>
                          <dd className="text-sm text-gray-900 dark:text-gray-100">
                            {user?.employee?.joiningDate ? new Date(user.employee.joiningDate).toLocaleDateString() : 'N/A'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">Address Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Street Address
                        </label>
                        <input
                          type="text"
                          name="address.street"
                          value={profileData.address?.street || ''}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="Street address"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="address.city"
                          value={profileData.address?.city || ''}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="City"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          name="address.state"
                          value={profileData.address?.state || ''}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="State"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          name="address.zipCode"
                          value={profileData.address?.zipCode || ''}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="ZIP code"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          name="address.country"
                          value={profileData.address?.country || ''}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" loading={saving} className="w-full sm:w-auto">
                      Update Profile
                    </Button>
                  </div>
                </div>
              </form>
            </Card.Content>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card>
            <Card.Header>
              <Card.Title>Security Settings</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-6">
                {/* Change Password */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Change Password</h4>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showPassword.current ? (
                            <VisibilityIcon className="h-5 w-5" />
                          ) : (
                            <VisibilityOffIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showPassword.new ? (
                            <VisibilityIcon className="h-5 w-5" />
                          ) : (
                            <VisibilityOffIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showPassword.confirm ? (
                            <VisibilityIcon className="h-5 w-5" />
                          ) : (
                            <VisibilityOffIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={saving}
                        disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                        className="w-full sm:w-auto"
                      >
                        Update Password
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Session Management */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Session Management</h4>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Current Session</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Started {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={logout} className="w-full sm:w-auto flex items-center justify-center">
                        <LogoutIcon className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Settings;