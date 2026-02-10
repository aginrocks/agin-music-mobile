import { useEffect, useRef } from 'react';
import { TrackPlayer } from 'react-native-nitro-player';

async function setupPlayer() {
    TrackPlayer.configure({
        androidAutoEnabled: false,
        carPlayEnabled: false,
        showInNotification: true,
    });
    TrackPlayer.setRepeatMode('off');
}

export type useSetupPlayerProps = {
    onLoad?: () => void;
}

export function useSetupPlayer({ onLoad }: useSetupPlayerProps) {
    const isInitialized = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                await setupPlayer();
                isInitialized.current = true;
                onLoad?.();
            } catch (error) {
                console.log(error);
                isInitialized.current = false;
            }
        })();
    }, [onLoad]);
}
