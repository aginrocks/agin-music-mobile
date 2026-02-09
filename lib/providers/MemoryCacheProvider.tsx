import { createContext, useCallback, useEffect, useState } from 'react';
import { AlbumID3, AlbumList2, AlbumWithSongsID3, ArtistID3, ArtistsID3, Child, Playlist, PlaylistWithSongs } from '@lib/types';
import { useApi, useServer, useSetting } from '@lib/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MemoryCache = {
    allPlaylists: Playlist[];
    playlists: Record<string, PlaylistWithSongs>;
    allAlbums: AlbumID3[];
    albums: Record<string, AlbumWithSongsID3>;
    allArtists: ArtistID3[];
    allSongs: Child[];
};

export type MemoryCacheContextType = {
    cache: MemoryCache;
    refreshPlaylists: () => Promise<Playlist[] | void>;
    refreshPlaylist: (id: string) => Promise<PlaylistWithSongs | void>;
    refreshAlbums: () => Promise<AlbumID3[] | void>;
    refreshAlbum: (id: string) => Promise<AlbumWithSongsID3 | void>;
    refreshArtists: () => Promise<ArtistID3[] | void>;
    refreshSongs: () => Promise<Child[] | void>;
    clear: () => void;
}

export const initialCache: MemoryCacheContextType = {
    cache: {
        allPlaylists: [],
        playlists: {},
        allAlbums: [],
        albums: {},
        allArtists: [],
        allSongs: [],
    },
    refreshPlaylists: async () => { },
    refreshPlaylist: async () => { },
    refreshAlbums: async () => { },
    refreshAlbum: async () => { },
    refreshArtists: async () => { },
    refreshSongs: async () => { },
    clear: () => { },
};

export const MemoryCacheContext = createContext<MemoryCacheContextType>(initialCache);

export default function MemoryCacheProvider({ children }: { children?: React.ReactNode }) {
    const [cache, setCache] = useState<MemoryCache>(initialCache.cache);
    const api = useApi();
    const { server } = useServer();
    const HideAutoCreatedPlaylist = useSetting("ui.HideAutoCreatedPlaylist")

    const clear = useCallback(() => {
        setCache(initialCache.cache);
    }, []);

    const refreshPlaylists = useCallback(async () => {
        if (!api) return;

        const playlistsRes = await api.get('/getPlaylists');
        
        // Required to update the playlist after change in settings
        const rawSetting = await AsyncStorage.getItem('settings.ui.HideAutoCreatedPlaylist');
        const HideAutoCreatedPlaylist = rawSetting ? JSON.parse(rawSetting) : false;


        const playlists =
            (playlistsRes.data?.['subsonic-response']?.playlists?.playlist as Playlist[])
                ?.filter(e => !HideAutoCreatedPlaylist || e?.owner !== 'root') ?? [];

        if (!playlists) return;
        
        setCache(c => ({ ...c, allPlaylists: playlists }));


        return playlists;
    }, [api, server.url, HideAutoCreatedPlaylist]);

    const refreshPlaylist = useCallback(async (id: string) => {
        if (!api) return;
        console.log('[MemoryCache] Fetching playlist', id);

        const playlistRes = await api.get('/getPlaylist', { params: { id } });
        const playlist = playlistRes.data?.['subsonic-response']?.playlist as PlaylistWithSongs;
        if (!playlist) return;

        setCache(c => ({ ...c, playlists: { ...c.playlists, [id]: playlist } }));
        return playlist;
    }, [api, server.url]);

    const refreshAlbums = useCallback(async () => {
        // TODO: Add pagination support
        if (!api) return;
        console.log('[MemoryCache] Fetching albums');

        const albumsRes = await api.get('/getAlbumList2', { params: { type: 'newest', size: 500 } });
        const albums = albumsRes.data?.['subsonic-response']?.albumList2?.album as AlbumID3[];
        if (!albums) return;

        setCache(c => ({ ...c, allAlbums: albums }));
        return albums;
    }, [api, server.url]);

    const refreshAlbum = useCallback(async (id: string) => {
        if (!api) return;
        console.log('[MemoryCache] Fetching album');

        const albumRes = await api.get('/getAlbum', { params: { id } });
        const album = albumRes.data?.['subsonic-response']?.album as AlbumWithSongsID3;
        if (!album) return;

        setCache(c => ({ ...c, albums: { ...c.albums, [id]: album } }));
        return album;
    }, [api, server.url]);

    const refreshArtists = useCallback(async () => {
        if (!api) return;
        console.log('[MemoryCache] Fetching artists');

        const artistsRes = await api.get('/getArtists');
        const artistsData = artistsRes.data?.['subsonic-response']?.artists as ArtistsID3;
        if (!artistsData?.index) return;

        const artists: ArtistID3[] = artistsData.index.flatMap(idx => idx.artist ?? []);
        setCache(c => ({ ...c, allArtists: artists }));
        return artists;
    }, [api, server.url]);

    const refreshSongs = useCallback(async () => {
        if (!api) return;
        console.log('[MemoryCache] Fetching songs');

        const songsRes = await api.get('/getRandomSongs', { params: { size: 500 } });
        const songs = songsRes.data?.['subsonic-response']?.randomSongs?.song as Child[];
        if (!songs) return;

        setCache(c => ({ ...c, allSongs: songs }));
        return songs;
    }, [api, server.url]);



    // Prefetch the data
    useEffect(() => {
        if (!api) return;
        (async () => {
            await refreshPlaylists();
            await refreshAlbums();
        })();
    }, [api, server.url, refreshPlaylists, refreshAlbums]);

    return (
        <MemoryCacheContext.Provider value={{ cache, clear, refreshPlaylists, refreshPlaylist, refreshAlbums, refreshAlbum, refreshArtists, refreshSongs }}>
            {children}
        </MemoryCacheContext.Provider>
    )
}
