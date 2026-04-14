import { PlaybackHistoryRecord } from '@lib/hooks/usePlaybackHistory';

export type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

export interface GroupedHistory {
    today: PlaybackHistoryRecord[];
    yesterday: PlaybackHistoryRecord[];
    thisWeek: PlaybackHistoryRecord[];
    earlier: PlaybackHistoryRecord[];
}

/**
 * Groups playback history records by date categories
 * @param records - Array of playback history records to group
 * @returns GroupedHistory object with records organized by date
 */
export function groupHistoryByDate(records: PlaybackHistoryRecord[]): GroupedHistory {
    const now = new Date();
    
    // Calculate date boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000); // 24 hours in ms
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000); // 7 days in ms
    
    const grouped: GroupedHistory = {
        today: [],
        yesterday: [],
        thisWeek: [],
        earlier: [],
    };
    
    for (const record of records) {
        const playedAt = record.playedAt;
        const playedAtTime = playedAt.getTime();
        
        if (playedAtTime >= todayStart.getTime()) {
            grouped.today.push(record);
        } else if (playedAtTime >= yesterdayStart.getTime()) {
            grouped.yesterday.push(record);
        } else if (playedAtTime >= weekStart.getTime()) {
            grouped.thisWeek.push(record);
        } else {
            grouped.earlier.push(record);
        }
    }
    
    return grouped;
}

/**
 * Formats a playback timestamp into a human-readable string
 * @param date - The date to format
 * @returns Human-readable time string (e.g., "2 hours ago", "Yesterday", "Jan 15")
 */
export function formatPlaybackTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Format as "Jan 15" for older dates
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
