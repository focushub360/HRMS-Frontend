import React, { useEffect } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';

export default function TenantApp() {
  const { tenantId } = useParams();
  const location = useLocation();

  useEffect(() => {
    if (tenantId) {
      try {
        localStorage.setItem('tenant', tenantId);
        localStorage.setItem('tenantSubdomain', tenantId);
        console.log('TenantApp: tenant set to', tenantId);
      } catch (e) {
        console.warn('TenantApp: failed to set tenant', e);
      }
    }
  }, [tenantId]);

  // Remove the /hrm/:tenantId prefix and navigate into the existing app routes.
  // This is intentionally a non-invasive approach: it preserves existing route
  // structure while enabling path-based tenant URLs and setting the tenant header.
  const candidates = [`/hrm/${tenantId}`, `/${tenantId}`];
  let rest = location.pathname;
  for (const prefix of candidates) {
    if (location.pathname.startsWith(prefix)) {
      rest = location.pathname.slice(prefix.length) || '/';
      break;
    }
  }

  return <Navigate to={rest + location.search} replace />;
}
