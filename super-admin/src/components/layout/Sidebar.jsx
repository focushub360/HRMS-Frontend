import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Material-UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [companyInfo] = useState({
    name: 'Super Admin Pro',
    logo: null
  });

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon className="w-5 h-5" />,
      children: []
    },
    {
      title: 'Companies',
      path: '/tenants',
      icon: <BusinessIcon className="w-5 h-5" />,
      children: [
        { title: 'All Companies', path: '/tenants' },
        { title: 'Add Company', path: '/tenants/add' }
      ]
    },
    {
      title: 'Locations',
      path: '/locations',
      icon: <LocationOnIcon className="w-5 h-5" />,
      children: []
    },
    {
      title: 'Subscriptions',
      path: '/subscriptions',
      icon: <AttachMoneyIcon className="w-5 h-5" />,
      children: []
    },
    {
      title: 'Analytics',
      path: '/analytics',
      icon: <AnalyticsIcon className="w-5 h-5" />,
      children: []
    },
    {
      title: 'Settings',
      path: '/profile',
      icon: <SettingsIcon className="w-5 h-5" />,
      children: []
    }
  ];

  useEffect(() => {
    // Load company info if needed
  }, []);

  const toggleExpand = (title) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Child items must match the current path exactly so that only one
  // sub-item (e.g. "Add Company") is highlighted at a time, instead of
  // every sibling whose path is a prefix of the current pathname
  // (e.g. "All Companies" -> '/tenants' also matching '/tenants/add').
  const isChildActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderMenuItems = (items, level = 0) => {
    return items.map((item, index) => {
      const isItemActive = isActive(item.path);
      const hasChildren = item.children && item.children.length > 0;
      
      return (
        <div key={index} className="mb-1">
          <div
            className={`
              group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
              ${isItemActive 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 shadow-sm dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              }
              ${level > 0 ? 'pl-8' : ''}
            `}
            onClick={() => {
              if (hasChildren) {
                toggleExpand(item.title);
              } else {
                navigate(item.path);
                onClose && onClose();
              }
            }}
          >
            <div className="flex items-center flex-1">
              <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                isItemActive 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-gray-700 dark:group-hover:text-gray-100'
              }`}>
                {item.icon}
              </div>
              <span className="ml-3 flex-1 font-medium">{item.title}</span>
            </div>
            
            {hasChildren && (
              <ChevronRightIcon 
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedItems[item.title] 
                    ? 'rotate-90 text-gray-600 dark:text-gray-300' 
                    : 'text-gray-400 dark:text-gray-500'
                } ${isItemActive ? 'text-blue-600 dark:text-blue-300' : ''}`}
              />
            )}
          </div>

          {hasChildren && expandedItems[item.title] && (
            <div className="mt-1 ml-2 space-y-1 border-l border-gray-200 dark:border-gray-700">
              {item.children.map((child, childIndex) => {
                const childActive = isChildActive(child.path);
                
                return (
                  <div
                    key={childIndex}
                    className={`
                      flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
                      ${childActive 
                        ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-500 -ml-px dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                      }
                      ml-4
                    `}
                    onClick={() => {
                      navigate(child.path);
                      onClose && onClose();
                    }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mr-3 ${
                      childActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className="flex-1">{child.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        dark:bg-gray-900 dark:shadow-none dark:border-gray-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 dark:border-gray-800">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <AdminPanelSettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-[120px] dark:text-gray-100">
                {companyInfo.name}
              </h1>
              <p className="text-xs text-gray-500 font-medium dark:text-gray-400">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        {/* <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
                <span className="text-blue-700 font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.toLowerCase() || 'administrator'}
              </p>
            </div>
          </div>
        </div> */}

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-500">
              Navigation
            </p>
          </div>
          {renderMenuItems(menuItems)}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:text-red-600 hover:shadow-sm border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400 dark:hover:border-gray-700"
          >
            <div className="p-1.5 rounded-lg bg-gray-200 text-gray-600 mr-3 transition-colors duration-200 group-hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-gray-700">
              <LogoutIcon className="w-4 h-4" />
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-100">Sign Out</span>
          </button>

          {/* Version Info */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-400 text-center dark:text-gray-500">
              Admin Pro v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;