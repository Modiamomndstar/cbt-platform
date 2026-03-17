import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsAPI } from '@/services/api';

/**
 * TrafficTracker Component
 * Automatically records page hits on the landing/public pages.
 * Should be placed inside a Router context.
 */
export default function TrafficTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only track specific public-facing paths or all paths?
    // User requested landing page/price page specifically.
    const publicPaths = ['/', '/pricing', '/register-school', '/login'];
    
    if (publicPaths.includes(location.pathname)) {
        recordHit();
    }
  }, [location.pathname]);

  const recordHit = async () => {
    try {
      await analyticsAPI.trackTraffic({
        path: location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType()
      });
    } catch (error) {
      // Fail silently to avoid interrupting user session
    }
  };

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  };

  return null; // This component doesn't render anything
}
