import { registerSheet, SheetDefinition } from 'react-native-actions-sheet';
import PlaybackSheet from './playback';
import ConfirmSheet from './Confirm';
import NewPlaylsitSheet from './NewPlaylist';
import { AlbumID3, Child, Playlist, PlaylistWithSongs } from '@lib/types';
import TrackSheet from './Track';
import PlaylistSheet from './Playlist';
import AlbumSheet from './Album';
import UserMenuSheet from './UserMenu';
import { SettingSelectOption } from '@lib/components/Setting';
import { Icon } from '@tabler/icons-react-native';
import SettingSelectSheet from './SettingSelect';
import AddToPlaylistSheet from './AddToPlaylist';

registerSheet('playback', PlaybackSheet);
registerSheet('confirm', ConfirmSheet);
registerSheet('newPlaylist', NewPlaylsitSheet);
registerSheet('track', TrackSheet);
registerSheet('playlist', PlaylistSheet);
registerSheet('album', AlbumSheet);
registerSheet('userMenu', UserMenuSheet);
registerSheet('settingSelect', SettingSelectSheet);
registerSheet('addToPlaylist', AddToPlaylistSheet);

// We extend some of the types here to give us great intellisense
// across the app for all registered sheets.
declare module 'react-native-actions-sheet' {
    interface Sheets {
        'playback': SheetDefinition<{}>;
        'userMenu': SheetDefinition<{}>;
        'confirm': SheetDefinition<{
            payload: {
                title: string;
                message: string;
                confirmText?: string;
                cancelText?: string;
                variant?: 'default' | 'danger';
                withCancel?: boolean;
            },
            returnValue: boolean;
        }>;
        'newPlaylist': SheetDefinition<{
            payload: {
                editId?: string;
                initialName?: string;
            },
            returnValue: {
                created: boolean;
                id?: string;
                name?: string;
            };
        }>;
        'track': SheetDefinition<{
            payload: {
                id: string;
                data?: Child;
                context?: 'home' | 'playlist' | 'album' | 'nowPlaying' | 'search';
                contextId?: string;
            },
            returnValue: {
                shouldCloseSheet?: boolean;
                hasPlayed?: boolean;
            }
        }>;
        'playlist': SheetDefinition<{
            payload: {
                id: string;
                data?: PlaylistWithSongs;
                context?: 'home' | 'playlist';
            },
        }>;
        'album': SheetDefinition<{
            payload: {
                id: string;
                data?: AlbumID3;
                context?: 'home' | 'search' | 'album';
                hasPlayed?: boolean;
            },
        }>;
        'settingSelect': SheetDefinition<{
            payload: {
                setting: {
                    label?: string;
                    description?: string;
                    icon?: Icon;
                },
                options: SettingSelectOption[];
                value: string;
            },
            returnValue: {
                value: string;
            }
        }>;
        'addToPlaylist': SheetDefinition<{
            payload: {
                idList: string[];
            },
            returnValue: {
                added?: boolean;
                playlistId?: string;
            }
        }>;
    }
}

export { };