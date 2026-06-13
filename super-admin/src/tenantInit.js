// tenantInit for super-admin app (keeps parity with tenant-app)
// Detect and store tenant from path-based URLs but avoid touching
// super-admin-specific paths or routes. Supports both `/hrm/:tenantId`
// and `/:tenantId` while skipping reserved names.
;(function () {
  try {
    if (typeof window === 'undefined') return;
    const rawPath = window.location.pathname || '/';
    const path = (rawPath).replace(/\/+$|\/$/g, '/');

    // If this app is mounted under a super-admin base path, do nothing
    // to avoid affecting super-admin pages (explicit guard).
    if (path.toLowerCase().startsWith('/super-admin')) return;

    const reserved = new Set([
      'login', 'dashboard', 'employees', 'attendance', 'leaves', 'projects', 'tasks', 'payroll', 'settings', 'api', 'hrm', 'select-company', 'super-admin'
    ]);

    // Try /hrm/:tenantId first
    let match = path.match(new RegExp('^/hrm/([^/\\?#]+)(?:[\\/\\?#]|$)', 'i'));
    let tenantId = null;

    if (match && match[1]) {
      tenantId = decodeURIComponent(match[1]);
    } else {
      // Fallback: match top-level /:tenantId but skip reserved paths
      const m2 = path.match(new RegExp('^/([^/\\?#]+)(?:[\\/\\?#]|$)', 'i'));
      if (m2 && m2[1]) {
        const candidate = decodeURIComponent(m2[1]);
        if (!reserved.has(candidate.toLowerCase())) {
          tenantId = candidate;
        }
      }
    }

    if (tenantId) {
      try {
        localStorage.setItem('tenant', tenantId);
        localStorage.setItem('tenantSubdomain', tenantId);
        // console.log('tenantInit (super-admin): set tenant =>', tenantId);
      } catch (e) {
        console.warn('tenantInit (super-admin): failed to set tenant in localStorage', e);
      }
    }
  } catch (e) {
    console.warn('tenantInit (super-admin) error', e);
  }
})();
