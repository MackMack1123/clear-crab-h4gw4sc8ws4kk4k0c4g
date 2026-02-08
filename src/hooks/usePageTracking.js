import { useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';

function getSessionId() {
    let id = sessionStorage.getItem('fr_session_id');
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('fr_session_id', id);
    }
    return id;
}

export function usePageTracking(page, organizerId) {
    useEffect(() => {
        if (!organizerId) return;
        const dedupKey = `fr_tracked_${page}_${organizerId}`;
        if (sessionStorage.getItem(dedupKey)) return;
        sessionStorage.setItem(dedupKey, '1');
        analyticsService.trackPageView(organizerId, page, getSessionId()).catch(() => {});
    }, [page, organizerId]);
}
