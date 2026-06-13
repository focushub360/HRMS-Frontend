// Simple device detection util used to block mobile browsers.
// Returns true for most phones/tablets or small viewports. Honor
// an override query parameter `?desktop=1` to allow testing on mobile.
export function isMobileDevice() {
  try {
    if (typeof window === 'undefined') return false;

    // Query string override to allow viewing on mobile during testing.
    const params = new URLSearchParams(window.location.search);
    if (params.get('desktop') === '1') return false;

    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isUaMobile = mobileUa.test(ua);

    // Also treat narrow viewports as mobile-sized.
    const isSmallScreen = window.innerWidth && window.innerWidth < 768;

    return !!(isUaMobile || isSmallScreen);
  } catch (e) {
    return false;
  }
}

export default isMobileDevice;
