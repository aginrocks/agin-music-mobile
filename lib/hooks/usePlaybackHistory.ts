import { Child } from '@lib/types/OpenSubsonic';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

export interface PlaybackHistoryRecord {
    id: number;
    trackId: string;
    title: string;
    artist?: string;
    album?: string;
    coverArt?: string;
    duration?: number;
    playedAt: Date;
}

export interface UsePlaybackHistoryReturn {

    addRecord: (track: Child) => Promise<void>;
    
    fetchHistory: (offset?: number, limit?: number) => Promise<PlaybackHistoryRecord[]>;
    
    clearHistory: () => Promise<void>;
    
    getCount: () => Promise<number>;
    
    hasTrack: (trackId: string) => Promise<boolean>;
}

export function usePlaybackHistory(): UsePlaybackHistoryReturn {
    const db = useSQLiteContext();

    const addRecord = useCallback(async (track: Child) => {
        try {
            await db.runAsync(
                `INSERT INTO playbackHistory (trackId, title, artist, album, coverArt, duration, playedAt) 
                 VALUES ($trackId, $title, $artist, $album, $coverArt, $duration, $playedAt)`,
                {
                    $trackId: track.id,
                    $title: track.title,
                    $artist: track.artist || null,
                    $album: track.album || null,
                    $coverArt: track.coverArt || null,
                    $duration: track.duration || null,
                    $playedAt: Date.now(),
                }
            );

            //maximum 1000 records by deleting oldest records
            const count = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM playbackHistory'
            );
            
            if (count && count.count > 1000) {
                const excessCount = count.count - 1000;
                await db.runAsync(
                    `DELETE FROM playbackHistory 
                     WHERE id IN (
                         SELECT id FROM playbackHistory 
                         ORDER BY playedAt ASC 
                         LIMIT $limit
                     )`,
                    { $limit: excessCount }
                );
            }
        } catch (error) {
            console.error('Failed to add playback history record:', error);
        }
    }, [db]);

    const fetchHistory = useCallback(async (offset: number = 0, limit: number = 50): Promise<PlaybackHistoryRecord[]> => {
        try {
            const records = await db.getAllAsync<Omit<PlaybackHistoryRecord, 'playedAt'> & { playedAt: number }>(
                `SELECT id, trackId, title, artist, album, coverArt, duration, playedAt 
                 FROM playbackHistory 
                 ORDER BY playedAt DESC 
                 LIMIT $limit OFFSET $offset`,
                { $limit: limit, $offset: offset }
            );
            return records.map(record => ({
                ...record,
                playedAt: new Date(record.playedAt),
            }));
        } catch (error) {
            console.error('Failed to fetch playback history:', error);
            return [];
        }
    }, [db]);

    const clearHistory = useCallback(async () => {
        try {
            await db.runAsync('DELETE FROM playbackHistory');
        } catch (error) {
            console.error('Failed to clear playback history:', error);
        }
    }, [db]);

    const getCount = useCallback(async (): Promise<number> => {
        try {
            const result = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM playbackHistory'
            );
            return result?.count || 0;
        } catch (error) {
            console.error('Failed to get playback history count:', error);
            return 0;
        }
    }, [db]);

    const hasTrack = useCallback(async (trackId: string): Promise<boolean> => {
        try {
            const result = await db.getFirstAsync<{ exists: number }>(
                'SELECT EXISTS(SELECT 1 FROM playbackHistory WHERE trackId = $trackId) as exists',
                { $trackId: trackId }
            );
            return result?.exists === 1;
        } catch (error) {
            console.error('Failed to check if track exists in history:', error);
            return false;
        }
    }, [db]);

    return {
        addRecord,
        fetchHistory,
        clearHistory,
        getCount,
        hasTrack,
    };
}
