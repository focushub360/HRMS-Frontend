import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { tenantService } from '../../services/auth';
import { showSuccess, showError } from '../../utils/toast';

// Icons
const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const PencilIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronLeftIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const BuildingIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const TenantList = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    plan: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tenantService.getAll(
        pagination.page, 
        pagination.limit, 
        filters.search,
        filters.status,
        filters.plan
      );
      setTenants(data.tenants || []);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }));
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.plan, filters.search, filters.status, pagination.limit, pagination.page]);

  const computePortalDisplay = (t) => {
    if (!t) return '';
    try {
      if (t.portalUrl) return String(t.portalUrl).replace(/\/+$/,'');
      const tenantName = String(t.subdomain || t.name || '').trim();
      if (!tenantName) return '';
      return `https://hrm.focusengineeringapp.com/${encodeURIComponent(tenantName)}`;
    } catch {
      return t.portalUrl || (t.subdomain ? `https://hrm.focusengineeringapp.com/${encodeURIComponent(t.subdomain)}` : '');
    }
  };

  const computeHostDisplay = (t) => {
    const urlStr = computePortalDisplay(t) || (t && (t.portalUrl || t.subdomain || t.name));
    if (!urlStr) return '';
    try {
      const u = new URL(String(urlStr));
      return u.host; // includes port when present
    } catch {
      // Fallback: strip protocol and path
      const s = String(urlStr).trim();
      const m = s.match(/^(?:https?:\/\/)?([^/]+)/i);
      return m ? m[1] : s;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTenants();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadTenants]);

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ status: '', plan: '', search: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (tenant) => {
    const status = tenant.isActive ? (tenant.subscription?.status || 'active') : 'inactive';
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-800', 
        label: 'Active'
      },
      inactive: { 
        color: 'bg-gray-100 text-gray-800', 
        label: 'Inactive'
      },
      trial: { 
        color: 'bg-blue-100 text-blue-800', 
        label: 'Trial'
      },
      suspended: { 
        color: 'bg-red-100 text-red-800', 
        label: 'Suspended'
      }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    // dark-mode fallbacks for badge surfaces
    const darkSafe = {
      'bg-green-100': 'dark:bg-green-900 dark:text-green-200',
      'bg-gray-100': 'dark:bg-gray-700 dark:text-gray-100',
      'bg-blue-100': 'dark:bg-blue-900 dark:text-blue-200',
      'bg-red-100': 'dark:bg-red-900 dark:text-red-200'
    };
    const mainColorClass = config.color.split(' ')[0];
    const extra = darkSafe[mainColorClass] || '';
    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${config.color} ${extra}`}>
        {config.label}
      </span>
    );
  };

  const getToggleButtonClasses = (tenant) => {
    const base = 'flex items-center gap-2 transition-colors';
    if (tenant.isActive) {
      return `${base} !border-red-500 !text-red-600 hover:!bg-red-50 hover:!text-red-700 focus-visible:!ring-red-500`;
    }
    return `${base} !bg-green-600 !text-white !border-transparent hover:!bg-green-700 focus-visible:!ring-green-500`;
  };

  const handleToggleStatus = async (tenant) => {
    const { _id: tenantId, companyName, isActive, subscription } = tenant;
    const action = isActive ? 'suspend' : 'activate';
    const confirmation = window.confirm(`Are you sure you want to ${action} ${companyName || 'this company'}?`);
    if (!confirmation) return;

    try {
      setUpdatingId(tenantId);
      if (isActive) {
        await tenantService.delete(tenantId);
        showSuccess('Company suspended successfully');
      } else {
        await tenantService.update(tenantId, {
          isActive: true,
          subscription: {
            ...(subscription || {}),
            status: 'active'
          }
        });
        showSuccess('Company reactivated successfully');
      }
      await loadTenants();
    } catch (error) {
      console.error('Failed to update tenant status:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update company status';
      showError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getPlanBadge = (plan) => {
    const planConfig = {
      free: { 
        color: 'bg-gray-100 text-gray-800', 
        label: 'Free' 
      },
      basic: { 
        color: 'bg-blue-100 text-blue-800', 
        label: 'Basic' 
      },
      premium: { 
        color: 'bg-purple-100 text-purple-800', 
        label: 'Premium' 
      },
      enterprise: { 
        color: 'bg-green-100 text-green-800', 
        label: 'Enterprise' 
      }
    };

    const config = planConfig[plan] || planConfig.free;
    const darkSafe = {
      'bg-gray-100': 'dark:bg-gray-700 dark:text-gray-100',
      'bg-blue-100': 'dark:bg-blue-900 dark:text-blue-200',
      'bg-purple-100': 'dark:bg-purple-900 dark:text-purple-200',
      'bg-green-100': 'dark:bg-green-900 dark:text-green-200'
    };
    const mainColorClass = config.color.split(' ')[0];
    const extra = darkSafe[mainColorClass] || '';
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${config.color} ${extra}`}>
        {config.label}
      </span>
    );
  };

  const hasActiveFilters = useMemo(() => {
    return filters.status || filters.plan || filters.search;
  }, [filters]);

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BuildingIcon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No companies found</h3>
      <p className="text-gray-500 mb-6">
        {hasActiveFilters 
          ? "Try adjusting your filters to see more results" 
          : "Get started by adding your first company"
        }
      </p>
      {hasActiveFilters ? (
        <Button variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : (
        <Link to="/tenants/add">
          <Button>Add Company</Button>
        </Link>
      )}
    </div>
  );

  const SkeletonLoader = () => (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Companies</h1>
              <p className="text-gray-600 mt-1 dark:text-gray-400">Manage all companies using your HRM platform</p>
            </div>
            <Link to="/tenants/add">
              <Button>
                Add Company
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={filters.search}
                    onChange={handleSearch}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>

                <select
                  value={filters.plan}
                  onChange={(e) => handleFilterChange('plan', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">All Plans</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="p-4">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900">
                    <BuildingIcon className="w-6 h-6 text-blue-600 dark:text-blue-200" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Companies</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{pagination.total}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card className="dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                All Companies
                <span className="text-gray-500 font-normal ml-2 dark:text-gray-400">({pagination.total})</span>
              </h3>
              {hasActiveFilters && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {tenants.length} of {pagination.total} shown
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <SkeletonLoader />
            ) : tenants.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subdomain
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {tenants.map((tenant) => (
                      <tr key={tenant._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900">
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-200">
                                {tenant.companyName?.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {tenant.companyName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {tenant.contactEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <a
                            href={computePortalDisplay(tenant) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-sm text-blue-600 dark:text-blue-400 truncate block max-w-[220px] hover:underline"
                          >
                            {computeHostDisplay(tenant) || tenant.subdomain || '—'}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          {getPlanBadge(tenant.subscription?.plan)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(tenant)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <Link
                              to={`/tenants/${tenant._id}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/tenants/edit/${tenant._id}`}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`${getToggleButtonClasses(tenant)} ${updatingId === tenant._id ? 'opacity-60 cursor-not-allowed' : ''}`}
                              onClick={() => handleToggleStatus(tenant)}
                              disabled={updatingId === tenant._id}
                            >
                              {tenant.isActive ? 'Suspend' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-semibold">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className="font-semibold">{pagination.total}</span> companies
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeftIcon />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TenantList;