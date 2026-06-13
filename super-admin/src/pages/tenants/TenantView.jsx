import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tenantService } from '../../services/auth';
import { showSuccess, showError } from '../../utils/toast';

// Material-UI Icons
const PersonIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const GlobeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EmailIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const BanIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const BuildingIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// Inline UI Components
const Card = ({ children, className = '', padding = 'p-6', ...props }) => {
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        dark:bg-gray-800 dark:border-gray-700 dark:shadow-none
        ${padding}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  className = '',
  as = 'button',
  href,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-600',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:border-blue-300 disabled:text-blue-300 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-gray-800'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  if (as === 'a' && href) {
    return (
      <a 
        href={href}
        className={classes}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </a>
    );
  }

  return (
    <button 
      className={classes} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizes[size]} dark:border-gray-700 dark:border-t-blue-500`}></div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.keyCode === 27) onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* backdrop: semi-opaque so modal stands out in both light/dark */}
      <div
        className="fixed inset-0 backdrop-blur-[2px] transition-opacity duration-300 bg-white/60 dark:bg-black/60"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-xl shadow-2xl w-full ${sizes[size]} transform transition-all duration-300 scale-100 opacity-100 border border-blue-100 dark:bg-gray-900 dark:border-gray-700`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="px-6 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const TenantView = () => {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createAdminModal, setCreateAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [tenantAdmins, setTenantAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [updatingPermissionId, setUpdatingPermissionId] = useState(null);

  const loadTenant = useCallback(async () => {
    setLoading(true);
    try {
      const tenantData = await tenantService.getById(id);
      setTenant(tenantData);
    } catch (error) {
      console.error('Failed to load tenant:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTenantAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const admins = await tenantService.getAdmins(id);
      setTenantAdmins(Array.isArray(admins) ? admins : []);
    } catch (error) {
      console.error('Failed to load tenant admins:', error);
      setTenantAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTenant();
    loadTenantAdmins();
  }, [loadTenant, loadTenantAdmins]);

  const computePortalDisplay = (t) => {
    if (!t) return '';
    try {
      // prefer explicit portalUrl if present
      if (t.portalUrl) return t.portalUrl.replace(/\/+$/,'');
      // fallback to path-based tenant portal: https://hrm.focusengineeringapp.com/{tenant}
      const tenantName = String(t.subdomain || t.name || '').trim();
      if (!tenantName) return '';
      return `https://hrm.focusengineeringapp.com/${encodeURIComponent(tenantName)}`;
    } catch {
      return t.portalUrl || (t.subdomain ? `https://hrm.focusengineeringapp.com/${encodeURIComponent(t.subdomain)}` : '');
    }
  };

  const handleCopyPortal = async () => {
    if (!tenant) return;
    const url = computePortalDisplay(tenant);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPortal(true);
      setTimeout(() => setCopiedPortal(false), 2500);
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopiedPortal(true);
        setTimeout(() => setCopiedPortal(false), 2500);
      } catch {
        console.warn('Copy to clipboard failed');
      }
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);

    try {
      await tenantService.createAdmin(id, adminForm);
      setCreateAdminModal(false);
      setAdminForm({ name: '', email: '', password: '' });
      showSuccess('Admin created successfully');
      // reload tenant details to show new admin if applicable
      await loadTenant();
      await loadTenantAdmins();
    } catch (error) {
      console.error('Failed to create admin:', error.response?.data || error.message || error);
      const backendMsg = error?.response?.data?.message || error?.message || 'Failed to create admin';
      showError(typeof backendMsg === 'string' ? backendMsg : JSON.stringify(backendMsg));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleAttendancePermissionChange = async (admin, canEditAttendanceTime) => {
    setUpdatingPermissionId(admin._id);
    try {
      const updatedAdmin = await tenantService.updateAdminAttendancePermission(
        id,
        admin._id,
        canEditAttendanceTime
      );
      setTenantAdmins((prev) => prev.map((item) => (
        item._id === admin._id ? { ...item, ...updatedAdmin } : item
      )));
      showSuccess('Attendance edit permission updated');
    } catch (error) {
      console.error('Failed to update attendance edit permission:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to update permission';
      showError(message);
    } finally {
      setUpdatingPermissionId(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!tenant) return;

    const isCurrentlyActive = tenant.isActive && tenant.subscription?.status !== 'suspended';
    const action = isCurrentlyActive ? 'suspend' : 'activate';
    const confirmation = window.confirm(`Are you sure you want to ${action} ${tenant.companyName}?`);
    if (!confirmation) return;

    setTogglingStatus(true);
    try {
      const updatedTenant = await tenantService.update(tenant._id, {
        isActive: !isCurrentlyActive,
        subscription: {
          ...(tenant.subscription || {}),
          status: isCurrentlyActive ? 'suspended' : 'active'
        }
      });

      setTenant(updatedTenant);
      showSuccess(`Company ${isCurrentlyActive ? 'suspended' : 'activated'} successfully`);
    } catch (error) {
      console.error('Failed to update tenant status:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to update company status';
      showError(message);
    } finally {
      setTogglingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 border border-green-200', label: 'Active' },
      inactive: { color: 'bg-red-100 text-red-800 border border-red-200', label: 'Inactive' },
      trial: { color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', label: 'Trial' },
      suspended: { color: 'bg-gray-100 text-gray-800 border border-gray-200', label: 'Suspended' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const planConfig = {
      free: { color: 'bg-gray-100 text-gray-800 border border-gray-200', label: 'Free' },
      basic: { color: 'bg-blue-100 text-blue-800 border border-blue-200', label: 'Basic' },
      premium: { color: 'bg-purple-100 text-purple-800 border border-purple-200', label: 'Premium' },
      enterprise: { color: 'bg-green-100 text-green-800 border border-green-200', label: 'Enterprise' }
    };

    const config = planConfig[plan] || planConfig.free;
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
          <BuildingIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-4">Company not found</p>
        <Link to="/tenants">
          <Button>Back to Companies</Button>
        </Link>
      </div>
    );
  }

  const isTenantActive = tenant.isActive && tenant.subscription?.status !== 'suspended';
  const portalDisplay = computePortalDisplay(tenant);

  return (
    <div className="space-y-6">
            {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.companyName}</h1>
          <p className="text-gray-600">Company details and management</p>
          <div className="text-sm text-gray-500 mt-1">{tenant.subdomain ? `${tenant.subdomain}` : ''}</div>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => setCreateAdminModal(true)}
            className="flex items-center space-x-2"
          >
            <PersonIcon className="w-4 h-4" />
            <span>Create Admin</span>
          </Button>
          <Link to={`/tenants/edit/${tenant._id}`}>
            <Button className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Company</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Portal preview - prominent and easy to copy */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">Portal</div>
          <div className="mt-1 flex items-center space-x-3">
            <code className="font-mono text-sm text-blue-600 dark:text-blue-400 truncate">{computePortalDisplay(tenant)}</code>
            {copiedPortal && <span className="text-sm text-green-600">Copied!</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button type="button" variant="outline" onClick={handleCopyPortal} disabled={!tenant}>Copy</Button>
          <Button as="a" href={computePortalDisplay(tenant) || '#'} target="_blank">Open</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center space-x-2">
                <BuildingIcon className="w-5 h-5 text-blue-600" />
                <span>Company Information</span>
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Basic Details</h4>
                  <div className="space-y-4">
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Company Name</dt>
                      <dd className="text-sm font-medium text-gray-900">{tenant.companyName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Portal URL</dt>
                      <dd className="text-sm text-gray-900 font-mono">
                        {portalDisplay ? (
                          <a href={portalDisplay} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {portalDisplay}
                          </a>
                        ) : (
                          <span>Not configured</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Contact Email</dt>
                      <dd className="text-sm text-gray-900">{tenant.contactEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Phone</dt>
                      <dd className="text-sm text-gray-900">{tenant.phone || 'Not provided'}</dd>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Business Details</h4>
                  <div className="space-y-4">
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Industry</dt>
                      <dd className="text-sm text-gray-900">{tenant.industry || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Company Size</dt>
                      <dd className="text-sm text-gray-900">{tenant.size} employees</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Description</dt>
                      <dd className="text-sm text-gray-900 leading-relaxed">{tenant.description || 'No description provided'}</dd>
                    </div>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Address Information */}
          {tenant.address && (tenant.address.street || tenant.address.city) && (
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Address Information</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tenant.address.street && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Street</dt>
                      <dd className="text-sm text-gray-900">{tenant.address.street}</dd>
                    </div>
                  )}
                  {tenant.address.city && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">City</dt>
                      <dd className="text-sm text-gray-900">{tenant.address.city}</dd>
                    </div>
                  )}
                  {tenant.address.state && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">State</dt>
                      <dd className="text-sm text-gray-900">{tenant.address.state}</dd>
                    </div>
                  )}
                  {tenant.address.zipCode && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">ZIP Code</dt>
                      <dd className="text-sm text-gray-900">{tenant.address.zipCode}</dd>
                    </div>
                  )}
                  {tenant.address.country && (
                    <div>
                      <dt className="text-xs text-gray-500 mb-1">Country</dt>
                      <dd className="text-sm text-gray-900">{tenant.address.country}</dd>
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>
          )}

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center space-x-2">
                <PersonIcon className="w-5 h-5 text-blue-600" />
                <span>Tenant Admin Permissions</span>
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant Admin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Can Edit Attendance Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tenantAdmins.map((admin) => (
                      <tr key={admin._id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {admin.employee?.name || 'Admin'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {admin.email || admin.employee?.email || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={Boolean(admin.canEditAttendanceTime)}
                              disabled={updatingPermissionId === admin._id}
                              onChange={(e) => handleAttendancePermissionChange(admin, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Can Edit Attendance Time</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!adminsLoading && tenantAdmins.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-500">No tenant admins found.</p>
              )}
              {adminsLoading && <LoadingSpinner size="sm" className="py-6" />}
            </Card.Content>
          </Card>
        </div>

        {/* Sidebar - Subscription & Actions */}
        <div className="space-y-6">
          {/* Subscription Card */}
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 6v1m0 1v1m6-13h2a2 2 0 012 2v2a2 2 0 01-2 2h-2m-6 0H6a2 2 0 01-2-2V6a2 2 0 012-2h2m6 0h6" />
                </svg>
                <span>Subscription</span>
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Plan</span>
                {getPlanBadge(tenant.subscription?.plan)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                {getStatusBadge(tenant.subscription?.status)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Max Employees</span>
                <span className="text-sm text-gray-900 font-medium">{tenant.subscription?.maxEmployees || 10}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Start Date</span>
                <span className="text-sm text-gray-900">
                  {tenant.subscription?.startDate ? new Date(tenant.subscription.startDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              
              {tenant.subscription?.endDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">End Date</span>
                  <span className="text-sm text-gray-900">
                    {new Date(tenant.subscription.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Card.Header>
              <Card.Title>Quick Actions</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setCreateAdminModal(true)}
              >
                <PersonIcon className="w-4 h-4 mr-2" />
                Create Admin User
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                as="a"
                href={portalDisplay || '#'}
                target="_blank"
                rel="noreferrer"
              >
                <GlobeIcon className="w-4 h-4 mr-2" />
                Visit Company Portal
              </Button>
              
              {/* <Button 
                variant="outline" 
                className="w-full justify-start"
              >
                <EmailIcon className="w-4 h-4 mr-2" />
                Send Welcome Email
              </Button> */}
              
              <Button 
                variant="outline" 
                className={`w-full justify-start ${isTenantActive
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                }`}
                onClick={handleToggleStatus}
                disabled={togglingStatus}
              >
                <BanIcon className="w-4 h-4 mr-2" />
                {isTenantActive ? 'Suspend Account' : 'Activate Account'}
              </Button>
            </Card.Content>
          </Card>

          {/* System Information */}
          <Card>
            <Card.Header>
              <Card.Title>System Information</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900 font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-gray-900 font-medium">{new Date(tenant.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Database</span>
                <span className="text-gray-900 font-mono font-medium">hrm_{tenant.subdomain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created By</span>
                <span className="text-gray-900 font-medium">{tenant.createdBy?.name || 'System'}</span>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Modal
        isOpen={createAdminModal}
        onClose={() => setCreateAdminModal(false)}
        title="Create Admin User"
        size="sm"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Admin Name *
            </label>
            <input
              type="text"
              value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-100"
              placeholder="Enter admin name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-100"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-100"
              placeholder="Enter password"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateAdminModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={creatingAdmin}
            >
              Create Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenantView;
