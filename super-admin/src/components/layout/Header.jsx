import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();

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
      '/tenants': 'Company Management',
      '/tenants/add': 'Add Company',
      '/tenants/edit': 'Edit Company',
      '/subscriptions': 'Subscription Management',
      '/analytics': 'System Analytics',
      '/settings': 'System Settings'
    };

    // Handle dynamic routes like /tenants/:id
    if (path.startsWith('/tenants/') && path !== '/tenants/add') {
      if (path.includes('/edit/')) return 'Edit Company';
      return 'Company Details';
    }

    return titles[path] || 'Super Admin Portal';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 lg:border-l dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Menu button and breadcrumb */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors duration-200 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb and page info */}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getPageTitle()}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}</span>
              <span className="text-gray-300">•</span>
              <span>
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - User profile and actions */}
        <div className="flex items-center space-x-3">
          {/* Theme toggle */}
          <div className="mr-2">
            <ThemeToggle />
          </div>
          {/* Quick stats for admin */}
          {user?.role === 'admin' && (
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="text-right">
                <div className="font-medium text-gray-900">Super Admin</div>
                <div className="text-gray-500">Management Console</div>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
            </div>
          )}

          {/* User profile dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="group flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
              </div>
              
              <div className="hidden lg:block text-left cursor-pointer">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">
                  {user?.role} • Super Admin
                </p>
              </div>

              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                } group-hover:text-gray-500 dark:group-hover:text-gray-300`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.name || 'Admin User'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || 'admin@system.com'}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                      {user?.role || 'admin'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      Super Admin
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  <Link
                    to="/profile"
                    className="group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4 mr-3 text-current text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>

                  <Link
                    to="/settings"
                    className="group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4 mr-3 text-current text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>

                {/* Logout section */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-700 transition-colors duration-150 group"
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