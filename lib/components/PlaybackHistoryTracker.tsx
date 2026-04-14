import React, { useEffect, useRef, useState } from 'react';
import { useOnPlaybackProgressChange } from 'react-native-nitro-player';
import { useQueue } from '@lib/hooks';
import { usePlaybackHistory } from '@lib/hooks/usePlaybackHistory';

export interface PlaybackHistoryTrackerProps {
    children?: React.ReactNode;
}


export function PlaybackHistoryTracker({ children }: PlaybackHistoryTrackerProps) {
    const { position: playbackPosition } = useOnPlaybackProgressChange();
    const { nowPlaying } = useQueue();
    const { addRecord } = usePlaybackHistory();
    
    const [hasRecorded, setHasRecorded] = useState(false);
    const currentTrackIdRef = useRef<string>('');

    useEffect(() => {
        if (nowPlaying.id !== currentTrackIdRef.current) {
            currentTrackIdRef.current = nowPlaying.id;
            setHasRecorded(false);
        }
    }, [nowPlaying.id]);

    useEffect(() => {

        if (hasRecorded || !nowPlaying.id) {
            return;
        }

        const duration = nowPlaying.duration ?? 0;
        const threshold = Math.min(30, duration * 0.5);

        if (playbackPosition >= threshold) {
            addRecord(nowPlaying).catch(error => {
                console.error('Failed to record playback history:', error);
            });
            setHasRecorded(true);
        }
    }, [playbackPosition, nowPlaying, hasRecorded, addRecord]);

    return <>{children}</>;
}
