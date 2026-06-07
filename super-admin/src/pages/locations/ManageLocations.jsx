import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { tenantService } from '../../services/auth';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../services/api';

// Icons
const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MapPinIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Modal Component
const LocationModal = ({ isOpen, location, onClose, onSave, isLoading }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(location?.name || '');
      setError('');
    }
  }, [isOpen, location]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Location name is required');
      return;
    }

    onSave({ name: name.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          {location ? 'Edit Location' : 'Add New Location'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Main Office, Branch 1"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Main Component
const ManageLocations = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [locations, setLocations] = useState([]);
  
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Load tenants on mount
  useEffect(() => {
    loadTenants();
  }, []);

  // Load locations when tenant changes
  useEffect(() => {
    if (selectedTenantId) {
      loadLocations();
    }
  }, [selectedTenantId]);

  const loadTenants = async () => {
    try {
      setTenantsLoading(true);
      const response = await tenantService.getAll(1, 100);
      const activeTenants = (response.tenants || []).filter(t => t.isActive);
      setTenants(activeTenants);
      
      if (activeTenants.length > 0 && !selectedTenantId) {
        setSelectedTenantId(activeTenants[0]._id);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      showError('Failed to load companies');
    } finally {
      setTenantsLoading(false);
    }
  };

  const loadLocations = async () => {
    if (!selectedTenantId) return;
    
    try {
      setLocationsLoading(true);
      const response = await api.get('/super-admin/locations', {
        params: { tenantId: selectedTenantId }
      });
      setLocations(response.data.data || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
      showError(error.response?.data?.message || 'Failed to load locations');
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleAddLocation = () => {
    if (!selectedTenantId) {
      showError('Please select a company first');
      return;
    }
    setSelectedLocation(null);
    setIsModalOpen(true);
  };

  const handleEditLocation = (location) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
  };

  const handleSaveLocation = async (formData) => {
    try {
      if (!selectedTenantId) {
        showError('Please select a company first');
        return;
      }

      setIsSaving(true);

      if (selectedLocation) {
        // Update
        await api.put(`/super-admin/locations/${selectedLocation._id}`, {
          ...formData,
          tenantId: selectedTenantId
        });
        showSuccess('Location updated successfully');
      } else {
        // Create
        await api.post('/super-admin/locations', {
          ...formData,
          tenantId: selectedTenantId
        });
        showSuccess('Location created successfully');
      }

      setIsModalOpen(false);
      setSelectedLocation(null);
      await loadLocations();
    } catch (error) {
      console.error('Failed to save location:', error);
      showError(error.response?.data?.message || 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;

    try {
      setDeletingId(id);
      await api.delete(`/super-admin/locations/${id}`, {
        params: { tenantId: selectedTenantId }
      });
      showSuccess('Location deleted successfully');
      await loadLocations();
    } catch (error) {
      console.error('Failed to delete location:', error);
      showError(error.response?.data?.message || 'Failed to delete location');
    } finally {
      setDeletingId(null);
    }
  };

  if (tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  const selectedTenant = tenants.find(t => t._id === selectedTenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MapPinIcon /> Manage Locations
          </h1>
          <p className="text-gray-600 mt-1">
            Add and manage office locations for check-in
            {selectedTenant ? ` for ${selectedTenant.companyName}` : ''}
          </p>
        </div>
        <Button
          onClick={handleAddLocation}
          variant="primary"
          className="flex items-center gap-2 w-fit"
        >
          <PlusIcon className="w-5 h-5" /> Add Location
        </Button>
      </div>

      {/* Company Selector */}
      {tenants.length > 0 && (
        <Card className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Company
          </label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select a company --</option>
            {tenants.map(tenant => (
              <option key={tenant._id} value={tenant._id}>
                {tenant.companyName}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Locations Grid */}
      {locationsLoading ? (
        <Card className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading locations...</p>
        </Card>
      ) : locations.length === 0 ? (
        <Card className="text-center py-12">
          <MapPinIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Locations Yet</h3>
          <p className="text-gray-600 mb-6">Start by adding your first office location</p>
          <Button
            onClick={handleAddLocation}
            variant="primary"
            className="inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" /> Create First Location
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(location => (
            <Card key={location._id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <MapPinIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {location.name}
                </h3>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditLocation(location)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteLocation(location._id)}
                  disabled={deletingId === location._id}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <LocationModal
        isOpen={isModalOpen}
        location={selectedLocation}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLocation(null);
        }}
        onSave={handleSaveLocation}
        isLoading={isSaving}
      />
    </div>
  );
};

export default ManageLocations;
