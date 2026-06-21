import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SIDEBAR_MENU } from '../../utils/constants';

// Material-UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Modal component for editing company info
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { companyService } from '../../services/auth';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [companyInfo, setCompanyInfo] = useState({
    name: 'HRM Software',
    logo: null
  });
  const [editModal, setEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const info = await companyService.getCompanyInfo();
      setCompanyInfo(info);
    } catch (error) {
      console.error('Failed to load company info:', error);
    }
  };

  const toggleExpand = (title) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const menuItems = SIDEBAR_MENU[user?.role] || [];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // MUI Icons mapping
  const getMenuItemIcon = (iconName, isActive = false) => {
    const iconClass = `w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`;
    
    const icons = {
      '📊': <DashboardIcon className={iconClass} />,
      '👥': <PeopleIcon className={iconClass} />,
      '⏰': <ScheduleIcon className={iconClass} />,
      '📅': <CalendarMonthIcon className={iconClass} />,
      '💰': <AttachMoneyIcon className={iconClass} />,
      '📈': <AssessmentIcon className={iconClass} />,
      '👤': <PersonIcon className={iconClass} />,
      '⚙️': <SettingsIcon className={iconClass} />
    };

    return icons[iconName] || <DashboardIcon className={iconClass} />;
  };

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await companyService.updateCompanyInfo(companyInfo);
      setEditModal(false);
    } catch (error) {
      console.error('Failed to update company info:', error);
      alert('Failed to update company information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyInfo(prev => ({
          ...prev,
          logo: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderMenuItems = (items, level = 0) => {
    return items.map((item, index) => {
      const isItemActive = isActive(item.path);
      
      return (
        <div key={index} className="mb-1">
          <div
            className={`
              group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
              ${isItemActive 
                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
              ${level > 0 ? 'pl-8' : ''}
            `}
            onClick={() => {
              if (item.children.length > 0) {
                toggleExpand(item.title);
              } else {
                navigate(item.path);
                onClose();
              }
            }}
          >
            <div className="flex items-center flex-1">
              <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                isItemActive 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
              }`}>
                {getMenuItemIcon(item.icon, isItemActive)}
              </div>
              <span className="ml-3 flex-1 font-medium">{item.title}</span>
            </div>
            
            {item.children.length > 0 && (
              <ChevronRightIcon 
                className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${
                  expandedItems[item.title] ? 'rotate-90 text-gray-600' : ''
                }`}
              />
            )}
          </div>

          {item.children.length > 0 && expandedItems[item.title] && (
            <div className="mt-1 ml-2 space-y-1 border-l border-gray-200">
              {item.children.map((child, childIndex) => {
                const isChildActive = isActive(child.path);
                
                return (
                  <div
                    key={childIndex}
                    className={`
                      flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
                      ${isChildActive 
                        ? 'bg-primary-50 text-primary-600 border-l-2 border-primary-500 -ml-px' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }
                      ml-4
                    `}
                    onClick={() => {
                      navigate(child.path);
                      onClose();
                    }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mr-3 ${
                      isChildActive ? 'bg-primary-500' : 'bg-gray-300'
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
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm">
              {companyInfo.logo ? (
                <img 
                  src={companyInfo.logo} 
                  alt="Company Logo" 
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <BusinessIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-[120px]">
                {companyInfo.name}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Management System</p>
            </div>
          </div>
          
          {/* Edit button for admin only */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setEditModal(true)}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
              title="Edit Company Info"
            >
              <EditIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Main Navigation
            </p>
          </div>
          {renderMenuItems(menuItems)}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg transition-all duration-200 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-gray-200"
          >
            <div className="p-1.5 rounded-lg bg-gray-200 text-gray-600 mr-3">
              <LogoutIcon className="w-4 h-4" />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
          
          {/* Version Info */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              HRM Pro v1.3.0
            </p>
          </div>
        </div>

        {/* Edit Company Info Modal */}
        <Modal
          isOpen={editModal}
          onClose={() => setEditModal(false)}
          title="Edit Company Information"
          size="sm"
        >
          <form onSubmit={handleCompanyUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm flex items-center justify-center">
                    {companyInfo.logo ? (
                      <img 
                        src={companyInfo.logo} 
                        alt="Company Logo" 
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <BusinessIcon className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 64x64px PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

export default Sidebar;
