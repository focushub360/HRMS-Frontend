import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { locationService } from '../../services/auth';

// ─── Icons ────────────────────────────────────────────────────────────────────
const MapPinIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PlusIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── Location Form Modal ───────────────────────────────────────────────────────
const LocationFormModal = ({ isOpen, location, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: location?.name || '',
        address: location?.address || '',
        description: location?.description || '',
      });
      setErrors({});
    }
  }, [isOpen, location]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Location name is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  const field = (key, label, placeholder, required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={form[key]}
        onChange={e => { setForm(p => ({ ...p, [key]: e.target.value })); if (errors[key]) setErrors(p => ({ ...p, [key]: '' })); }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
          dark:bg-gray-700 dark:text-white dark:border-gray-600
          ${errors[key] ? 'border-red-500' : 'border-gray-300'}`}
      />
      {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={location ? 'Edit Location' : 'Add New Location'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('name', 'Location Name', 'e.g. Main Office, Branch A', true)}
        {field('address', 'Address', 'e.g. 123 Main Street, City')}
        {field('description', 'Description', 'Optional notes about this location')}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            {location ? 'Update Location' : 'Add Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const ManageLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await locationService.adminGetAll();
      setLocations(data);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLocations(); }, []);

  const handleAdd = () => { setEditingLocation(null); setModalOpen(true); };
  const handleEdit = (loc) => { setEditingLocation(loc); setModalOpen(true); };

  const handleSave = async (formData) => {
    try {
      setIsSaving(true);
      if (editingLocation) {
        await locationService.adminUpdate(editingLocation._id, formData);
        showToast('Location updated successfully');
      } else {
        await locationService.adminCreate(formData);
        showToast('Location added successfully');
      }
      setModalOpen(false);
      setEditingLocation(null);
      await loadLocations();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save location', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete location "${name}"? This cannot be undone.`)) return;
    try {
      setDeletingId(id);
      await locationService.adminDelete(id);
      showToast('Location deleted');
      await loadLocations();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete location', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPinIcon className="w-7 h-7 text-blue-600" />
            Manage Locations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Office locations used for employee check-in / check-out
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2 w-fit">
          <PlusIcon className="w-4 h-4" /> Add Location
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <Card>
          <Card.Content>
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-500">Loading locations…</span>
            </div>
          </Card.Content>
        </Card>
      ) : locations.length === 0 ? (
        <Card>
          <Card.Content>
            <div className="text-center py-16">
              <MapPinIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Locations Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Add your first office location so employees can select it when checking in.
              </p>
              <Button onClick={handleAdd} className="inline-flex items-center gap-2">
                <PlusIcon className="w-4 h-4" /> Add First Location
              </Button>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <Card key={loc._id} className="hover:shadow-md transition-shadow">
              <Card.Content>
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {loc.name}
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id={`edit-location-${loc._id}`}
                    onClick={() => handleEdit(loc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium
                      bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <PencilIcon /> Edit
                  </button>
                  <button
                    id={`delete-location-${loc._id}`}
                    onClick={() => handleDelete(loc._id, loc.name)}
                    disabled={deletingId === loc._id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium
                      bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {deletingId === loc._id
                      ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500 inline-block" />
                      : <TrashIcon />}
                    {deletingId === loc._id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <LocationFormModal
        isOpen={modalOpen}
        location={editingLocation}
        onClose={() => { setModalOpen(false); setEditingLocation(null); }}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
};

export default ManageLocations;
