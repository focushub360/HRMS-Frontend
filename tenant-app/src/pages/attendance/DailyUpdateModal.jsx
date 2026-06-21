import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { dailyUpdateService } from '../../services/auth';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockClockIcon from '@mui/icons-material/LockClock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Default fields with the asterisk directly in the title text
// Only these two are mandatory; users can add up to 8 more custom rows (10 total)
const DEFAULT_ROWS = [
  { 
    title: 'Key Updates *', 
    content: '', 
    placeholder: 'Summarize your main tasks and key achievements for today.', 
    required: true 
  },
  { 
    title: 'Status *', 
    content: '', 
    placeholder: 'Indicate the current status (e.g., Completed, In Progress, Blocked).', 
    required: true 
  }
];

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

const DailyUpdateModal = ({ isOpen, onClose, attendanceId, requireBeforeCheckout = false, onSubmitted }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [updateMeta, setUpdateMeta] = useState(null);

  useEffect(() => {
    if (isOpen) loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadToday = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dailyUpdateService.getToday();
      if (data?.exists && data?.update) {
        const existingRows = Array.isArray(data.update.rows) && data.update.rows.length > 0
          ? data.update.rows.map((r, i) => ({
              title: r.title || '',
              content: r.content || '',
              placeholder: r.placeholder || (i === 0 ? DEFAULT_ROWS[0].placeholder : i === 1 ? DEFAULT_ROWS[1].placeholder : 'Enter details here...'),
              required: i < 2 // Preserve mandatory status for the first two rows
            }))
          : DEFAULT_ROWS;
        setRows(existingRows);
        setUpdateMeta({
          isSubmitted: Boolean(data.update.isSubmitted),
          isUserEditable: data.update.isUserEditable !== false,
          submittedAt: data.update.submittedAt
        });
      } else {
        setRows(DEFAULT_ROWS);
        setUpdateMeta(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load today\'s update.');
    } finally {
      setLoading(false);
    }
  };

  const locked = Boolean(updateMeta?.isSubmitted && updateMeta?.isUserEditable === false);

  const addRow = () => {
    if (locked || rows.length >= 10) return;
    setRows((prev) => [...prev, { title: '', content: '', placeholder: 'Enter details here...', required: false }]);
  };

  const removeRow = (index) => {
    if (locked) return;
    if (rows[index]?.required) return; // Prevent deleting mandatory fields
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateRow = (index, field, value) => {
    if (locked) return;
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const validateRows = () => {
    // Check if mandatory fields (Key Updates & Status) have content
    const missingRequired = rows.filter((r) => r.required).some((r) => !r.content.trim());
    if (missingRequired) {
      setError('Key Updates and Status are mandatory and must be filled out.');
      return false;
    }
    
    // Check if any row has an empty title
    const hasEmptyTitle = rows.some((row) => !row.title.trim());
    if (hasEmptyTitle) {
      setError('Every row needs a title before you can save.');
      return false;
    }
    return true;
  };

  const handleSave = async (submit) => {
    if (locked) return;
    if (submit && !validateRows()) return;
    if (!attendanceId) {
      setError('You need to be checked in before logging a daily update.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        rows: rows.map((row) => ({ 
          title: row.title.trim(), 
          content: row.content.trim(),
          placeholder: row.placeholder 
        })),
        isSubmitted: Boolean(submit),
        attendanceId
      };
      const response = await dailyUpdateService.save(payload);
      const updated = response?.update;
      setUpdateMeta({
        isSubmitted: Boolean(updated?.isSubmitted),
        isUserEditable: updated?.isUserEditable !== false,
        submittedAt: updated?.submittedAt
      });
      onSubmitted?.(Boolean(updated?.isSubmitted));
      if (submit) onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your daily update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Updates" size="xl">
      <div className="space-y-4">
        {requireBeforeCheckout && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800">
            <WarningAmberIcon className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-100">
              Please log a summary of today's work before checking out. Once submitted, you can still
              make edits for 24 hours.
            </p>
          </div>
        )}

        {locked && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <LockClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The 24-hour edit window for this entry has passed, so it's now read-only.
            </p>
          </div>
        )}

        {updateMeta?.isSubmitted && !locked && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-300 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-100">
              Submitted for today. You can still edit these entries until the 24-hour window closes.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
          <span className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
            {todayLabel()}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full min-w-[520px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/3">
                      Title
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Update
                    </th>
                    {!locked && (
                      <th className="px-2 py-2 w-10" />
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 align-top">
                        {/* Asterisk is now part of the text string itself, no separate span needed */}
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => updateRow(index, 'title', e.target.value)}
                          disabled={locked}
                          placeholder="e.g. Task"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          value={row.content}
                          onChange={(e) => updateRow(index, 'content', e.target.value)}
                          disabled={locked}
                          rows={2}
                          placeholder={row.placeholder || 'Enter details here...'}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                        />
                      </td>
                      {!locked && (
                        <td className="px-2 py-2 align-top text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={rows.length <= 1 || row.required}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={row.required ? "Mandatory field cannot be removed" : "Remove row"}
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button - Hidden when max limit (10) is reached */}
            {!locked && rows.length < 10 && (
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-100"
              >
                <AddIcon className="w-4 h-4" />
                Add row
              </button>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
                Close
              </Button>
              {!locked && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave(false)}
                    loading={saving}
                    className="w-full sm:w-auto"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave(true)}
                    loading={saving}
                    className="w-full sm:w-auto"
                  >
                    {requireBeforeCheckout ? 'Submit & Allow Checkout' : 'Submit Update'}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default DailyUpdateModal;