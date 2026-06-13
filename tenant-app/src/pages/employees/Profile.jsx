import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { employeeService } from '../../services/auth';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await employeeService.getById(user.employee._id);
      setProfile(profileData);
      setFormData({
        phone: profileData.phone || '',
        address: profileData.address || {},
        emergencyContact: profileData.emergencyContact || {}
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await employeeService.update(formData, true);
      await loadProfile();
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your personal information</p>
        </div>
        <Button
          variant={editing ? 'secondary' : 'primary'}
          onClick={() => setEditing(!editing)}
          className="w-full sm:w-auto"
        >
          {editing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <Card.Header>
              <Card.Title>Personal Information</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-semibold text-primary-600 dark:text-primary-200">
                    {profile.name?.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{profile.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 truncate">{profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Employee ID</label>
                  <p className="text-gray-900 dark:text-gray-100">{profile.employeeId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                  <p className="text-gray-900 dark:text-gray-100">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</label>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">{profile.gender || 'Not provided'}</p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Employment Information */}
          <Card>
            <Card.Header>
              <Card.Title>Employment Information</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</label>
                  <p className="text-gray-900 dark:text-gray-100">{profile.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Position</label>
                  <p className="text-gray-900 dark:text-gray-100">{profile.position}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Employment Type</label>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">{profile.employmentType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Joining Date</label>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(profile.joiningDate).toLocaleDateString()}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Salary</label>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    ${profile.salary?.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Address */}
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title>Address Information</Card.Title>
            </Card.Header>
            <Card.Content>
              {profile.address?.street ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Street</label>
                    <p className="text-gray-900 dark:text-gray-100">{profile.address.street}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                    <p className="text-gray-900 dark:text-gray-100">{profile.address.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">State</label>
                    <p className="text-gray-900 dark:text-gray-100">{profile.address.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ZIP Code</label>
                    <p className="text-gray-900 dark:text-gray-100">{profile.address.zipCode}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Country</label>
                    <p className="text-gray-900 dark:text-gray-100">{profile.address.country}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No address information provided</p>
              )}
            </Card.Content>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editable Personal Information */}
            <Card>
              <Card.Header>
                <Card.Title>Update Personal Information</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContact.name"
                    value={formData.emergencyContact?.name || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact.phone"
                    value={formData.emergencyContact?.phone || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Emergency contact phone"
                  />
                </div>
              </Card.Content>
            </Card>

            {/* Editable Address */}
            <Card>
              <Card.Header>
                <Card.Title>Update Address</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address?.street || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address?.city || ''}
                      onChange={handleChange}
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
                      value={formData.address?.state || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      placeholder="State"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.address?.zipCode || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      placeholder="ZIP code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address?.country || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Profile;