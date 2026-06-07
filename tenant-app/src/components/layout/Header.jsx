import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import ThemeToggle from '../ui/ThemeToggle';

// Material-UI Icons
import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent('admin-refresh'));
    setTimeout(() => setIsRefreshing(false), 1200);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      '/dashboard': 'Dashboard',
      '/employees': 'Employee Management',
      '/employees/add': 'Add Employee',
      '/employees/edit': 'Edit Employee',
      '/attendance': 'Attendance',
      '/attendance/report': 'Attendance Report',
      '/leaves': 'Leave Management',
      '/leaves/apply': 'Apply for Leave',
      '/payroll': 'Payroll',
      '/tasks/progress': 'Task Progress',
      '/analytics': 'Analytics Dashboard',
      '/profile': 'My Profile',
      '/settings': 'Settings',
      '/projects': 'Project Management',
      '/projects/board': 'Task Board',
      '/projects/create': 'Create Project'
    };

    // Handle dynamic routes
    if (path.startsWith('/employees/') && path !== '/employees/add') {
      if (path.includes('/edit/')) return 'Edit Employee';
      return 'Employee Details';
    }
    if (path.startsWith('/projects/') && !['/projects', '/projects/board', '/projects/create'].includes(path)) {
      if (path.includes('/edit/')) return 'Edit Project';
      return 'Project Details';
    }

    return titles[path] || 'HRM System';
  };

  // Update document title when location changes
  useEffect(() => {
    try {
      const title = getPageTitle();
      if (title) {
        document.title = `${title} - HRM System`;
      }
    } catch (err) {
      // fail silently
    }
  }, [location]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white z-50">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Menu button, page info, and search */}
        <div className="flex items-center space-x-4 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 lg:hidden dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
            aria-label="Toggle menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Page title and subtitle */}
          <div className="hidden md:block">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getPageTitle()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getGreeting()}{user?.employee?.name ? `, ${user.employee.name}` : user?.name ? `, ${user.name}` : ''}
            </div>
          </div>

        </div>

        {/* Right side - Notifications and user profile */}
        <div className="flex items-center space-x-3">
            {/* Theme Toggle - ADD THIS */}
        <ThemeToggle />
          {/* Notifications */}
          <NotificationBell />


          {/* Refresh button for admin */}
          {user?.role === 'admin' && (
            <button
              onClick={handleRefresh}
              title="Refresh data"
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200 dark:text-gray-400 dark:hover:text-primary-300 dark:hover:bg-gray-800"
            >
              <RefreshIcon className={`w-5 h-5 transition-transform duration-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Quick stats for admin - Hidden on mobile */}
          {user?.role === 'admin' && (
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-gray-100">Admin Panel</div>
                <div className="text-gray-500 dark:text-gray-400">Management Console</div>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            </div>
          )}

          {/* User profile dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:hover:bg-gray-800"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {user?.employee?.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-tight truncate max-w-32 dark:text-gray-100">
                  {user?.employee?.name || user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize leading-tight dark:text-gray-400">
                  {user?.role} • {user?.employee?.department || 'General'}
                </p>
              </div>

              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                } dark:text-gray-300`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in-80 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
                    {user?.employee?.name || user?.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                    {user?.employee?.email || user?.email}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 capitalize dark:bg-primary-900 dark:text-primary-300">
                      {user?.role}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {user?.employee?.department || 'General'}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 group dark:text-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500 dark:text-gray-300 dark:group-hover:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>

                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 group dark:text-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500 dark:text-gray-300 dark:group-hover:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>

                {/* Logout section */}
                <div className="border-t border-gray-100 pt-2 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 group dark:text-red-400 dark:hover:bg-red-800"
                  >
                    <svg className="w-4 h-4 mr-3 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;