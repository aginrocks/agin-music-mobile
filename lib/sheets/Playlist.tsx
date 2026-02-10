import { StyledActionSheet } from '@lib/components/StyledActionSheet';
import { Alert, Platform } from 'react-native';
import { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApiHelpers, useCoverBuilder, useMemoryCache, usePins, useQueue, useSetting } from '@lib/hooks';
import { useEffect } from 'react';
import SheetTrackHeader from '@lib/components/sheet/SheetTrackHeader';
import SheetOption from '@lib/components/sheet/SheetOption';
import { IconArrowsShuffle, IconArrowsSort, IconCirclePlus, IconCopy, IconDownload, IconPencil, IconPin, IconPinnedOff, IconPlayerPlay, IconTrash } from '@tabler/icons-react-native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import showToast from '@lib/showToast';

function PlaylistSheet({ sheetId, payload }: SheetProps<'playlist'>) {
    const insets = useSafeAreaInsets();
    const memoryCache = useMemoryCache();
    const cover = useCoverBuilder();
    const helpers = useApiHelpers();
    const queue = useQueue();

    const copyIdEnabled = useSetting('developer.copyId');

    const pins = usePins();
    const isPinned = pins.isPinned(payload?.id ?? '');

    const data = memoryCache.cache.playlists[payload?.id ?? ''];

    useEffect(() => {
        (async () => {
            if (!payload?.id) return;
            await memoryCache.refreshPlaylist(payload?.id);
        })();
    }, [payload?.id, memoryCache.refreshPlaylist]);

    return (
        <StyledActionSheet
            gestureEnabled={true}
            safeAreaInsets={insets}
            isModal={Platform.OS == 'android' ? false : true}
        >
            <SheetTrackHeader
                cover={{ uri: cover.generateUrl(data?.coverArt ?? '', { size: 128 }) }}
                coverCacheKey={`${data?.coverArt}-128x128`}
                title={data?.name}
                artist={`${data?.songCount} songs • edited ${data?.changed ? formatDistanceToNow(new Date(data?.changed), { addSuffix: true }) : ''}`}
            />
            {payload?.context != 'playlist' && <SheetOption
                icon={IconPlayerPlay}
                label='Play'
                onPress={async () => {
                    SheetManager.hide(sheetId);
                    const newQueue = data.entry;
                    if (!newQueue) return;

                    queue.replace(newQueue, {
                        initialIndex: 0,
                        source: {
                            source: 'playlist',
                            sourceId: data.id,
                            sourceName: data.name,
                        }
                    });
                }}
            />}
            {payload?.context != 'playlist' && <SheetOption
                icon={IconArrowsShuffle}
                label='Shuffle'
                onPress={async () => {
                    SheetManager.hide(sheetId);
                    const newQueue = data.entry;
                    if (!newQueue) return;

                    queue.replace(newQueue, {
                        initialIndex: 0,
                        source: {
                            source: 'playlist',
                            sourceId: data.id,
                            sourceName: data.name,
                        },
                        shuffle: true,
                    });
                }}
            />}
            <SheetOption
                icon={IconPencil}
                label='Rename'
                onPress={async () => {
                    SheetManager.hide(sheetId);
                    const result = await SheetManager.show('newPlaylist', {
                        payload: {
                            editId: payload?.id,
                            initialName: data?.name ?? '',
                        }
                    });
                    if (result?.created) {
                        await memoryCache.refreshPlaylists();
                        if (payload?.id) await memoryCache.refreshPlaylist(payload.id);
                    }
                }}
            />
            {/* <SheetOption
                icon={IconArrowsSort}
                label='Sort By'
                description='Playlist Order'
                onPress={() => {
                    SheetManager.hide(sheetId);
                }}
            /> */}
            {payload?.context != 'playlist' && <SheetOption
                icon={IconDownload}
                label='Download'
                onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    await SheetManager.show('confirm', {
                        payload: {
                            title: 'Sorry!',
                            message: 'Downloads feature will be avalibale soon. Stay tuned!',
                            withCancel: false,
                            confirmText: 'OK',
                        }
                    });
                    SheetManager.hide(sheetId);
                }}
            />}
            <SheetOption
                icon={isPinned ? IconPinnedOff : IconPin}
                label={isPinned ? 'Unpin Playlist' : 'Pin Playlist'}
                onPress={async () => {
                    if (!payload?.id) return;
                    if (isPinned) await pins.removePin(payload?.id);
                    else await pins.addPin({
                        id: payload?.id,
                        name: data?.name ?? '',
                        description: '',
                        type: 'playlist',
                        coverArt: data?.coverArt ?? '',
                    });
                    SheetManager.hide(sheetId);
                }}
            />
            {copyIdEnabled && <SheetOption
                icon={IconCopy}
                label='Copy ID'
                onPress={async () => {
                    await Clipboard.setStringAsync(payload?.id ?? '');
                    await showToast({
                        title: 'Copied ID',
                        subtitle: payload?.id,
                        icon: IconCopy,
                    });
                    SheetManager.hide(sheetId);
                }}
            />}
            <SheetOption
                icon={IconCirclePlus}
                label='Add to a Playlist'
                onPress={async () => {
                    if (!data.entry) return;
                    const { added } = await SheetManager.show('addToPlaylist', {
                        payload: {
                            idList: data.entry.map(x => x.id),
                        }
                    });
                    if (!added) return;
                    SheetManager.hide(sheetId);
                }}
            />
            <SheetOption
                icon={IconTrash}
                label='Remove Playlist'
                variant='destructive'
                onPress={async () => {
                    if (!payload?.id) return;

                    const removed = await helpers.removePlaylistConfirm(payload?.id);
                    if (!removed) return;

                    await showToast({
                        title: 'Playlist Removed',
                        subtitle: data?.name,
                        icon: IconTrash,
                    });

                    SheetManager.hide(sheetId);
                    router.back();
                    await memoryCache.refreshPlaylists();
                }}
            />
        </StyledActionSheet>
    );
}

export default PlaylistSheet;