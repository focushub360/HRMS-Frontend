// tenantInit.js
// tenantInit.js
// Detect and store tenant from path-based URLs.
// Supports both `/hrm/:tenantId` and `/:tenantId` (for local/dev or deployed roots).
;(function () {
  try {
    if (typeof window === 'undefined') return;
    const path = (window.location.pathname || '/').replace(/\/+$|\/$/g, '/');

    // Reserved top-level routes which should NOT be treated as tenant ids
    const reserved = new Set([
      'login', 'dashboard', 'employees', 'attendance', 'leaves', 'projects', 'tasks', 'payroll', 'settings', 'api', 'hrm', 'select-company'
    ]);

    // Try to match /hrm/:tenantId first
    let match = path.match(/^\/hrm\/([^\/\?#]+)(?:[\/\?#]|$)/i);
    let tenantId = null;

    if (match && match[1]) {
      tenantId = decodeURIComponent(match[1]);
    } else {
      // Fallback: match top-level /:tenantId but skip reserved paths
      const m2 = path.match(/^\/([^\/\?#]+)(?:[\/\?#]|$)/i);
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
        // keep backward compatibility with subdomain-based header key
        localStorage.setItem('tenantSubdomain', tenantId);
        // console.log('tenantInit: set tenant =>', tenantId);
      } catch (e) {
        console.warn('tenantInit: failed to set tenant in localStorage', e);
      }
    }
  } catch (e) {
    // silent
    console.warn('tenantInit error', e);
  }
})();
