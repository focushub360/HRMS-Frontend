import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Determine runtime base URL to avoid mixed-content errors in browsers.
let runtimeBase = API_BASE_URL;
if (typeof window !== 'undefined') {
  try {
    const pageProto = window.location.protocol || 'http:';
    if (pageProto === 'https:' && String(API_BASE_URL).startsWith('http://')) {
      // Fallback to relative /api so dev servers can proxy requests and avoid mixed-content blocks
      console.warn('Tenant-app API_BASE_URL uses http while page is https — falling back to relative /api to avoid mixed-content.');
      runtimeBase = '/api';
    }
  } catch (e) {
    runtimeBase = API_BASE_URL;
  }
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: runtimeBase,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout to handle slower endpoints (e.g., cold starts)
  timeout: 30000,
});

// Request interceptor to add auth token and tenant context
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tenantSubdomain = localStorage.getItem('tenantSubdomain');
    const tenant = localStorage.getItem('tenant');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Avoid sending invalid or reserved tenant values that come from client-side parsing
    const RESERVED_TENANTS = new Set(['login','dashboard','employees','attendance','leaves','projects','tasks','payroll','settings','api','hrm','select-company','analytics','profile','auth']);

    const isValidTenant = (val) => {
      if (!val) return false;
      const v = String(val).trim().toLowerCase();
      if (v === 'null' || v === 'undefined' || v.length === 0) return false;
      if (RESERVED_TENANTS.has(v)) return false;
      // prevent numeric route segments being treated as tenant ids
      if (/^\d+$/.test(v)) return false;
      return true;
    };

    // Include tenant headers only when the stored value looks like a real tenant identifier
    if (isValidTenant(tenantSubdomain)) {
      config.headers['X-Tenant-Subdomain'] = tenantSubdomain;
    } else {
      // Clean up invalid entries to avoid repeated incorrect headers
      try { localStorage.removeItem('tenantSubdomain'); } catch (e) { /* ignore */ }
    }

    if (isValidTenant(tenant)) {
      config.headers['x-tenant'] = tenant;
    } else {
      try { localStorage.removeItem('tenant'); } catch (e) { /* ignore */ }
    }

    // console.log('API Request:', {
    //   url: config.url,
    //   method: config.method,
    //   params: config.params,
    //   headers: {
    //     'X-Tenant-Subdomain': config.headers['X-Tenant-Subdomain'],
    //     'x-tenant': config.headers['x-tenant'],
    //     Authorization: config.headers.Authorization ? '<REDACTED>' : undefined
    //   }
    // });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Log a compact summary of the response including data size when possible
    let dataSummary = null;
    try {
      if (Array.isArray(response.data)) dataSummary = `array(${response.data.length})`;
      else if (response.data && typeof response.data === 'object') dataSummary = `object(keys:${Object.keys(response.data).length})`;
      else dataSummary = typeof response.data;
    } catch (e) {
      dataSummary = 'unavailable';
    }

    // console.log('API Response:', {
    //   url: response.config.url,
    //   status: response.status,
    //   params: response.config.params,
    //   data: dataSummary,
    //   tenant: response.config.headers['X-Tenant-Subdomain'] || response.config.headers['x-tenant'] || 'none'
    // });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    // Allow callers to opt-out of hard redirects (e.g. the login flow)
    // by setting the `X-Skip-Auth-Redirect` header on the request.
    const skipRedirect = !!(
      error.config?.headers?.['X-Skip-Auth-Redirect'] ||
      error.config?.headers?.['x-skip-auth-redirect'] ||
      error.config?.headers?.['x-skip-redirect'] ||
      error.config?.headers?.['X-Skip-Redirect']
    );

    if (!skipRedirect) {
      if (error.response?.status === 401) {
        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Keep tenantSubdomain so user is redirected to tenant-scoped login
        const tenant = localStorage.getItem('tenant') || localStorage.getItem('tenantSubdomain');
        if (tenant) {
          window.location.href = `/hrm/${encodeURIComponent(tenant)}`;
        } else {
          window.location.href = '/login';
        }
      } else if (error.response?.status === 404 && error.config?.url?.includes('/auth/login')) {
        // Tenant not found - redirect to tenant path (so tenantInit can set tenant)
        const tenant = localStorage.getItem('tenant') || localStorage.getItem('tenantSubdomain');
        if (tenant) {
          window.location.href = `/hrm/${encodeURIComponent(tenant)}`;
        } else {
          // Fallback to login
          window.location.href = '/login';
        }
      }
    } else {
      // console.log('Skipping auth redirect for this request (login flow handles errors).');
    }

    return Promise.reject(error);
  }
);


export default api;
// import axios from 'axios';
// import { API_BASE_URL } from '../utils/constants';

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Request interceptor to add auth token
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor to handle errors
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;