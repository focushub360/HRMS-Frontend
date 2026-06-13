import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tenantService } from '../../services/auth';
import { COMPANY_SIZES, INDUSTRIES, SUBSCRIPTION_PLANS } from '../../utils/constants';
import { showError } from '../../utils/toast';

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

// Fallback UI Components
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:shadow-none ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  loading, 
  disabled, 
  variant = 'primary', 
  type = 'button',
  onClick,
  className = '',
  ...props 
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

const LoadingSpinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizes[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin dark:border-gray-700 dark:border-t-blue-500`}></div>
  );
};

const TenantForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    companyName: '',
    portalBase: 'https://hrm.focusengineeringapp.com',
    adminEmail: '',
    adminPassword: '',
    description: '',
    contactEmail: '',
    phone: '',
    industry: '',
    size: '1-10',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    subscription: {
      plan: 'free',
      maxEmployees: 10
    }
  });

  const loadTenant = useCallback(async () => {
    setLoading(true);
    try {
      const tenant = await tenantService.getById(id);
      // Normalize portalBase by removing any '/hrm' segment and stripping the subdomain
      let portalBase = 'https://hrm.focusengineeringapp.com';
      if (tenant.portalUrl) {
        try {
          const u = new URL(tenant.portalUrl);
          const parts = u.pathname.split('/').filter(Boolean);
          // remove trailing subdomain if present
          if (parts.length && parts[parts.length - 1] === tenant.subdomain) parts.pop();
          // remove any 'hrm' segments
          const filtered = parts.filter(p => p.toLowerCase() !== 'hrm');
          const path = filtered.length ? '/' + filtered.join('/') : '';
          portalBase = `${u.protocol}//${u.host}${path}`;
          } catch {
            portalBase = String(tenant.portalUrl).replace(/\/+hrm(\/+)?/gi, '/').replace(/\/+$/,'').replace(new RegExp(`/${tenant.subdomain}$`), '') || 'https://hrm.focusengineeringapp.com';
          }
      }

      setFormData({
        name: tenant.name || '',
        subdomain: tenant.subdomain || '',
        portalBase,
        companyName: tenant.companyName || '',
        adminEmail: tenant.adminEmail || '',
        adminPassword: '',
        description: tenant.description || '',
        contactEmail: tenant.contactEmail || '',
        phone: tenant.phone || '',
        industry: tenant.industry || '',
        size: tenant.size || '1-10',
        address: tenant.address || {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        },
        subscription: tenant.subscription
          ? {
              ...tenant.subscription,
              plan: tenant.subscription.plan?.toLowerCase?.() || 'free'
            }
          : {
              plan: 'free',
              maxEmployees: 10
            }
      });
    } catch (error) {
      console.error('Failed to load tenant:', error);
      showError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      loadTenant();
    }
  }, [isEdit, loadTenant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // compute normalized portal preview from portalBase + subdomain (strips any '/hrm')
  const computePortalPreview = (base, sub) => {
    if (!base || !sub) return '';
    try {
      const u = new URL(base);
      const parts = u.pathname.split('/').filter(Boolean).filter(p => p.toLowerCase() !== 'hrm');
      const path = parts.length ? '/' + parts.join('/') : '';
      return `${u.protocol}//${u.host}${path}/${sub}`.replace(/\/+$/,'');
    } catch {
      const cleaned = String(base).replace(/\/+hrm(\/+)?/gi, '/').replace(/\/+$/,'');
      return `${cleaned}/${sub}`;
    }
  };

  const handleCopyPortal = async () => {
    const url = computePortalPreview(formData.portalBase, formData.subdomain);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select and prompt
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { console.warn('copy fallback failed'); }
      document.body.removeChild(el);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Client-side validation for required fields to avoid 400 from server
    const missing = [];
    if (!formData.companyName || !String(formData.companyName).trim()) missing.push('Company Name');
    if (!formData.subdomain || !String(formData.subdomain).trim()) missing.push('Subdomain');
    if (!formData.contactEmail || !String(formData.contactEmail).trim()) missing.push('Contact Email');
    if (missing.length) {
      setSaving(false);
      return showError(`Missing required fields: ${missing.join(', ')}`);
    }

    try {
      if (isEdit) {
        const payload = { ...formData };
        // sanitize portalBase and compute portalUrl without any '/hrm' path segment
        const normalizePortalBase = (base) => {
          try {
            const u = new URL(base);
            const parts = u.pathname.split('/').filter(Boolean).filter(p => p.toLowerCase() !== 'hrm');
            const path = parts.length ? '/' + parts.join('/') : '';
            return `${u.protocol}//${u.host}${path}`;
              } catch {
                return String(base).replace(/\/+hrm(\/+)?/gi, '/').replace(/\/+$/,'');
              }
        };

        if (payload.portalBase && payload.subdomain) {
          const base = normalizePortalBase(payload.portalBase);
          payload.portalUrl = `${String(base).replace(/\/+$/, '')}/${payload.subdomain}`;
        }
        // sanitize subdomain
        if (payload.subdomain) payload.subdomain = String(payload.subdomain).trim().toLowerCase();
        // if adminEmail provided but no adminPassword, generate one (server expects password when adminEmail provided)
        if (payload.adminEmail && !payload.adminPassword) {
          payload.adminPassword = Math.random().toString(36).slice(-8) + 'A1!';
        }
        await tenantService.update(id, payload);
      } else {
        const payload = { ...formData };
        const normalizePortalBase = (base) => {
          try {
            const u = new URL(base);
            const parts = u.pathname.split('/').filter(Boolean).filter(p => p.toLowerCase() !== 'hrm');
            const path = parts.length ? '/' + parts.join('/') : '';
            return `${u.protocol}//${u.host}${path}`;
              } catch {
                return String(base).replace(/\/+hrm(\/+)?/gi, '/').replace(/\/+$/,'');
              }
        };

        if (payload.portalBase && payload.subdomain) {
          const base = normalizePortalBase(payload.portalBase);
          payload.portalUrl = `${String(base).replace(/\/+$/, '')}/${payload.subdomain}`;
        }
        if (payload.subdomain) payload.subdomain = String(payload.subdomain).trim().toLowerCase();
        if (payload.adminEmail && !payload.adminPassword) {
          payload.adminPassword = Math.random().toString(36).slice(-8) + 'A1!';
        }
        await tenantService.create(payload);
      }
      
      navigate('/tenants');
    } catch (error) {
      // Log full response for debugging and show backend message if present
      console.error('Failed to save tenant:', error.response?.data || error.message || error);
      const backendMsg = error?.response?.data?.message || error?.response?.data || error?.message;
      const msg = backendMsg || 'Failed to save company';
      showError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Company' : 'Add New Company'}
        </h1>
        <p className="text-gray-600">
          {isEdit ? 'Update company information' : 'Create a new company account'}
        </p>
      </div>

      {/* Portal preview panel (prominent, easy copy) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">Portal Link Preview</div>
          <div className="mt-2 flex items-center space-x-3">
            <code className="font-mono text-sm text-blue-600 dark:text-blue-400 truncate">
              {computePortalPreview(formData.portalBase, formData.subdomain) || 'Preview will appear here after you enter base and subdomain'}
            </code>
            {copied && (
              <span className="text-sm text-green-600">Copied!</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <Button type="button" variant="outline" onClick={handleCopyPortal} disabled={!formData.portalBase || !formData.subdomain}>
            Copy Link
          </Button>
          <Button as="a" href={computePortalPreview(formData.portalBase, formData.subdomain) || '#'} target="_blank" className="ml-2">
            Open
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdomain *
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="subdomain"
                    value={formData.subdomain}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="company-name"
                  />
                  <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-lg">
                    {/* show portal preview (normalized, strips any '/hrm') */}
                    {(() => {
                      const normalizePortalBase = (base) => {
                        try {
                          const u = new URL(base);
                          const parts = u.pathname.split('/').filter(Boolean).filter(p => p.toLowerCase() !== 'hrm');
                          const path = parts.length ? '/' + parts.join('/') : '';
                          return `${u.protocol}//${u.host}${path}`;
                          } catch {
                          return String(base).replace(/\/+hrm(\/+)?/gi, '/').replace(/\/+$/,'');
                        }
                      };
                      const base = formData.portalBase ? normalizePortalBase(formData.portalBase) : '';
                      return base ? `${base.replace(/\/+$/, '')}/${formData.subdomain || 'subdomain'}` : '.hrmportal.com';
                    })()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This will be the URL for the company's HRM portal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portal Base URL
                </label>
                <input
                  type="text"
                  name="portalBase"
                  value={formData.portalBase}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://hrm.focusengineeringapp.com"
                />
                  <p className="text-xs text-gray-500 mt-1">
                  Base URL used to build the company portal link. Full portal URL preview: <code>{(() => { try { const u = new URL(formData.portalBase); const parts = u.pathname.split('/').filter(Boolean).filter(p => p.toLowerCase() !== 'hrm'); const path = parts.length ? '/' + parts.join('/') : ''; return `${u.protocol}//${u.host}${path}/${formData.subdomain || '<subdomain>'}`; } catch { return `${String(formData.portalBase).replace(/\/+hrm(\/+)?/gi, '/').replace(/\/+$/,'')}/${formData.subdomain || '<subdomain>'}` } })()}</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contact@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@company.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: create initial admin account. If left blank, an admin will be created using the contact email.
                </p>
              </div>

              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave blank to auto-generate"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Size
                  </label>
                  <select
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {COMPANY_SIZES.map(size => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of the company..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Subscription & Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Plan *
                </label>
                <select
                  name="subscription.plan"
                  value={formData.subscription.plan}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                    <option key={key} value={key}>
                      {plan.name} - {plan.price === 0 ? 'Free' : `${INR_FORMATTER.format(plan.price)}/month`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Max employees: {SUBSCRIPTION_PLANS[formData.subscription.plan]?.maxEmployees || 10}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Address Fields */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                
                <div>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ZIP Code"
                  />
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/tenants')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saving}
          >
            {isEdit ? 'Update Company' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TenantForm;