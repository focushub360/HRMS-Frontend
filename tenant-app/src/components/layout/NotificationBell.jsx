import React, { useState, useEffect, useRef } from 'react';

// Material-UI Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import api from '../../services/api.js';
import {connectSocket, disconnectSocket} from '../../services/socket.js';

// Notifications fetched from backend via notificationService

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const sock = connectSocket();
        if (sock) {
                sock.on('newNotification', (notification) => {
                  setNotifications(prev => [notification, ...prev]);
                  setUnreadCount(prev => prev + 1);

              });
              sock.on('unreadCount', (data) => {
                  setUnreadCount(data.count);

              });
              sock.on('connected', () => {
                      //  console.log('Notifications WebSocket ready');

                   });
               }
                 return () => {
                     if (sock) disconnectSocket();

                 };
             }, []); 

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      const data = response.data?.data || response.data || [];
      const sorted = Array.isArray(data) ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
      setNotifications(sorted);
      setUnreadCount(sorted.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const prevUnreadRef = useRef(0);
  
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      const count = res.data?.data?.count ?? 0;
      if (count > prevUnreadRef.current) {
        //console.log('🔔 New notifications:', count - prevUnreadRef.current);
        // Trigger toast/alert for new
        if (window.showToast) {
          window.showToast(`New notifications (${count})`, 'info');
        }
      }
      setUnreadCount(count);
      prevUnreadRef.current = count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await api.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await api.put('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={async () => {
          const newOpen = !isOpen;
          setIsOpen(newOpen);
          if (newOpen) await loadNotifications();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
      >
        {unreadCount > 0 ? (
          <NotificationsIcon className="w-6 h-6" />
        ) : (
          <NotificationsNoneIcon className="w-6 h-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm dark:bg-red-400">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 dark:text-primary-300 dark:hover:text-primary-200"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div
                    key={notification._id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-700 ${
                      !notification.isRead ? 'bg-blue-50 dark:bg-primary-900' : 'dark:bg-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        !notification.isRead ? 'bg-primary-500 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MarkEmailReadIcon className="w-12 h-12 text-gray-300 dark:text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm dark:text-gray-300">No notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium dark:text-primary-300 dark:hover:text-primary-200">
                View All Notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;