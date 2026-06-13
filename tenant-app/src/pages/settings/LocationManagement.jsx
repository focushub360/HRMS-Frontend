import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { locationService } from '../../services/auth';
import { showError, showSuccess } from '../../utils/toast';

import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const emptyForm = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radius: 100,
  description: ''
};

const LocationManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await locationService.adminGetAll();
      setLocations(data || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
      showError(error.response?.data?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const openCreateModal = () => {
    setEditingLocation(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (location) => {
    setEditingLocation(location);
    setForm({
      name: location.name || '',
      address: location.address || '',
      latitude: location.latitude !== null && location.latitude !== undefined ? String(location.latitude) : '',
      longitude: location.longitude !== null && location.longitude !== undefined ? String(location.longitude) : '',
      radius: location.radius || 100,
      description: location.description || ''
    });
    setModalOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = () => {
    const payload = {
      name: (form.name || '').trim(),
      address: (form.address || '').trim(),
      description: (form.description || '').trim(),
      radius: Number(form.radius) || 100
    };

    if (form.latitude !== '' && form.latitude !== undefined && form.latitude !== null) {
      payload.latitude = Number(form.latitude);
    }
    if (form.longitude !== '' && form.longitude !== undefined && form.longitude !== null) {
      payload.longitude = Number(form.longitude);
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();

    if (!payload.name) {
      showError('Location name is required');
      return;
    }

    try {
      setSaving(true);
      if (editingLocation) {
        await locationService.adminUpdate(editingLocation._id, payload);
        showSuccess('Location updated successfully');
      } else {
        await locationService.adminCreate(payload);
        showSuccess('Location created successfully');
      }
      setModalOpen(false);
      setEditingLocation(null);
      await loadLocations();
    } catch (error) {
      console.error('Failed to save location:', error);
      showError(error.response?.data?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (location) => {
    if (!window.confirm(`Delete ${location.name}? Employees will no longer see it in the attendance dropdown.`)) {
      return;
    }

    try {
      setDeletingId(location._id);
      await locationService.adminDelete(location._id);
      showSuccess('Location deleted successfully');
      await loadLocations();
    } catch (error) {
      console.error('Failed to delete location:', error);
      showError(error.response?.data?.message || 'Failed to delete location');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Location Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage the office locations employees can select during attendance.</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <AddLocationAltIcon className="w-4 h-4" />
          Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <Card className="text-center py-12">
          <LocationOnIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No locations yet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Create the first location for employee check-in.</p>
          <Button onClick={openCreateModal}>Create Location</Button>
        </Card>
      ) : (
        <Card className="shadow-sm" padding="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {locations.map((location) => (
                  <tr key={location._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                          <LocationOnIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{location.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(location)}
                          className="flex items-center gap-1"
                        >
                          <EditIcon className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(location)}
                          loading={deletingId === location._id}
                          className="flex items-center gap-1"
                        >
                          <DeleteIcon className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Name *</label>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Main Office"
              required
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Full office address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Radius (m)</label>
              <input
                type="number"
                min="1"
                value={form.radius}
                onChange={(e) => handleChange('radius', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional note"
            />
          </div> */}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Location
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LocationManagement;
