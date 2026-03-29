import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsAPI } from '@/services/api';

const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
};

/**
 * Anonymous traffic tracker that records page hits to the analytics system.
 * Only records public landing pages and primary dashboard entries to avoid noise.
 */
export default function TrafficTracker() {
    const location = useLocation();
    const lastPath = useRef<string>('');

    useEffect(() => {
        // Avoid duplicate heartbeats on same path in strict mode or rapid navigation
        if (lastPath.current === location.pathname) return;
        lastPath.current = location.pathname;

        // Debounce slightly to ensure page is actually viewed
        const timer = setTimeout(() => {
            analyticsAPI.trackTraffic({
                path: location.pathname,
                referrer: document.referrer || 'direct',
                userAgent: navigator.userAgent,
                deviceType: getDeviceType()
            }).catch(() => {
                // Silent fail for analytics to not affect user experience
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [location.pathname]);

    return null; // Invisible component
}
