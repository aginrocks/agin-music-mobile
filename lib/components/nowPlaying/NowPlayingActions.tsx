import { useContext, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ActionIcon from '../ActionIcon';
import { IconCircleCheck, IconDots, IconDownload, IconHeart, IconHeartFilled } from '@tabler/icons-react-native';
import { useApiHelpers, useDownloads, useQueue } from '@/lib/hooks';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';
import { IdContext } from '@lib/sheets/playback';

export default function NowPlayingActions() {
    const { nowPlaying, toggleStar } = useQueue();
    const helpers = useApiHelpers();
    const downloads = useDownloads();
    const isDownloaded = downloads.isTrackDownloaded(nowPlaying.id);

    const sheetId = useContext(IdContext);

    const styles = useMemo(() => StyleSheet.create({
        actions: {
            flexDirection: 'row',
            gap: 10,
        }
    }), []);

    return (
        <View style={styles.actions}>
            {/* FIXME */}
            <ActionIcon variant={nowPlaying.starred ? 'secondaryFilled' : 'secondary'} icon={nowPlaying.starred ? IconHeartFilled : IconHeart} size={16} onPress={toggleStar} isFilled={!!nowPlaying.starred} />
            <ActionIcon
                variant={isDownloaded ? 'secondaryFilled' : 'secondary'}
                icon={isDownloaded ? IconCircleCheck : IconDownload}
                size={16}
                isFilled={isDownloaded}
                onPress={async () => {
                    if (!nowPlaying.id) return;
                    if (isDownloaded) return;
                    await downloads.downloadTrackById(nowPlaying.id);
                }}
            />
            <ActionIcon variant='secondary' icon={IconDots} size={16} onPress={async () => {
                Haptics.selectionAsync();
                const data = await SheetManager.show('track', {
                    payload: {
                        id: nowPlaying.id,
                        data: nowPlaying,
                        context: 'nowPlaying'
                    }
                });
                if (data.shouldCloseSheet) SheetManager.hide(sheetId);
            }} />
        </View>
    )
}