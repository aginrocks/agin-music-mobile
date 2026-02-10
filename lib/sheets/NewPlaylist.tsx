import { StyledActionSheet } from '@/lib/components/StyledActionSheet';
import { Platform, StyleSheet, View } from 'react-native';
import { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi, useColors, useMemoryCache } from '../hooks';
import { useCallback, useMemo, useState } from 'react';
import Title from '../components/Title';
import Button from '../components/Button';
import { Input } from '../components/Input';

function NewPlaylsitSheet({ sheetId, payload }: SheetProps<'newPlaylist'>) {
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const cache = useMemoryCache();
    const api = useApi();

    const [name, setName] = useState<string>(payload?.initialName ?? '');
    const [loading, setLoading] = useState<boolean>(false);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            padding: 15,
            paddingBottom: Platform.OS == 'ios' ? 5 : 15,
        },
        subtitle: {
            marginTop: 5,
            marginBottom: 20,
        },
        button: {
            marginBottom: 5,
            marginTop: 15,
        }
    }), []);

    const save = useCallback(async () => {
        if (!cache || !api || !name) return;
        setLoading(true);

        try {
            const params = payload?.editId ? { playlistId: payload.editId, name } : { name };

            const res = await api.get('/createPlaylist', { params });
            const playlistId = res.data?.['subsonic-response']?.playlist?.id as string;
            console.log({ res, params });

            await cache.refreshPlaylists();

            SheetManager.hide(sheetId, { payload: { created: true, id: playlistId, name } });
        } catch (error) {
            console.log(error);

        }
        setLoading(false);
    }, [cache, api, name, payload?.editId]);

    const isEdit = !!payload?.editId;

    return (
        <StyledActionSheet
            gestureEnabled={true}
            safeAreaInsets={insets}
            isModal={Platform.OS == 'android' ? false : true}
        >
            <View style={styles.container}>
                <Title size={20} align="center" fontFamily="Poppins-Bold">{isEdit ? 'Rename Playlist' : 'Create Playlist'}</Title>
                <View style={styles.subtitle}>
                    <Title size={14} align="center" fontFamily="Poppins-Regular" color={colors.text[1]}>Choose a name for your playlist</Title>
                </View>
                <Input placeholder='Choose a name...' value={name} onChangeText={setName} autoFocus />
                <View style={styles.button}>
                    <Button variant='primary' onPress={save} disabled={name.length == 0 || loading}>{isEdit ? 'Save' : 'Create'}</Button>
                </View>
                <Button variant='subtle' onPress={() => SheetManager.hide(sheetId, { payload: { created: false } })}>Cancel</Button>
            </View>
        </StyledActionSheet>
    );
}

export default NewPlaylsitSheet;