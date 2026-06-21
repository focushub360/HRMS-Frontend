import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import { progressService } from '../../services/progress';

import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const TaskProgressHistoryModal = ({ isOpen, onClose, taskId, taskTitle }) => {
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isOpen || !taskId) return;
      setLoading(true);
      try {
        const res = await progressService.getTaskProgress(taskId);
        const data = res.data?.data || res.data || [];
        if (mounted) setUpdates(data.sort((a,b) => new Date(b.date) - new Date(a.date)));
      } catch (err) {
        console.error('Failed to load task progress history:', err);
        if (mounted) setUpdates([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [isOpen, taskId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 rounded-lg shadow-sm">
              <CalendarTodayIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{taskTitle || 'Task'}</h3>
              <div className="text-sm text-gray-500">Progress history — all updates for this task</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setVisibleCount(10)}
                className="ml-2 text-sm px-3 py-1 bg-blue-600 text-white rounded-md"
              >
                Apply
              </button>
              <button
                onClick={() => { setFromDate(''); setToDate(''); setVisibleCount(10); }}
                className="ml-1 text-sm px-3 py-1 bg-white text-gray-700 rounded-md border"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">Showing <span className="font-medium">{Math.min(visibleCount, updates.length)}</span> of <span className="font-medium">{updates.length}</span></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : updates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No history available for this task.</div>
        ) : (
          <div className="space-y-3">
            {(() => {
              // apply date filters client-side
              const filtered = updates.filter(u => {
                if (!fromDate && !toDate) return true;
                const d = new Date(u.date);
                if (fromDate) {
                  const f = new Date(fromDate);
                  f.setHours(0,0,0,0);
                  if (d < f) return false;
                }
                if (toDate) {
                  const t = new Date(toDate);
                  t.setHours(23,59,59,999);
                  if (d > t) return false;
                }
                return true;
              });

              const visible = filtered.slice(0, visibleCount);
              return visible.map(u => {
               const user = u.userId;
               const userLabel = user
                 ? (typeof user === 'string'
                   ? user
                   : (user.name || user.email || user._id || JSON.stringify(user)))
                 : 'Unknown';

              const initials = (() => {
                try {
                  if (!user) return 'U';
                  if (typeof user === 'string') return String(user).slice(0,2).toUpperCase();
                  const name = user.name || user.email || user._id || '';
                  const parts = String(name).split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return 'U';
                  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                } catch { return 'U'; }
              })();

              return (
              <div key={u._id} className="p-4 bg-white rounded-lg shadow-sm border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center justify-center bg-gray-100 rounded-full w-10 h-10 text-sm font-semibold text-gray-700">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{userLabel}</div>
                      <div className="text-xs text-gray-500">{new Date(u.date).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm">{u.progress}%</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100">{u.note}</div>
              </div>
              );
              });
            })()}
            { (() => {
                // show load more if there are more filtered items
                const totalFiltered = updates.filter(u => {
                  if (!fromDate && !toDate) return true;
                  const d = new Date(u.date);
                  if (fromDate) {
                    const f = new Date(fromDate); f.setHours(0,0,0,0); if (d < f) return false;
                  }
                  if (toDate) {
                    const t = new Date(toDate); t.setHours(23,59,59,999); if (d > t) return false;
                  }
                  return true;
                }).length;
                if (visibleCount < totalFiltered) {
                  return (
                    <div className="flex justify-center mt-4">
                      <Button onClick={() => setVisibleCount(prev => prev + 10)} className="px-4 py-2">Load more</Button>
                    </div>
                  );
                }
                return null;
              })() }
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TaskProgressHistoryModal;
