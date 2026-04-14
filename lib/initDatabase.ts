import { SQLiteDatabase } from 'expo-sqlite';

export default async function initDatabase(db: SQLiteDatabase) {
    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');

    await db.execAsync(`CREATE TABLE IF NOT EXISTS childrenCache (
        id TEXT not null,
        data TEXT not null,
        primary key (id)
    )`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS lyricsCache (
        id TEXT not null,
        data TEXT not null,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP not null,
        primary key (id)
    )`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS pins (
        id TEXT not null,
        name TEXT not null,
        description TEXT not null,
        type TEXT not null,
        coverArt TEXT not null,
        pinOrder INT not null,
        primary key (id)
        )`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS searchHistory (
        id TEXT not null,
        name TEXT not null,
        description TEXT not null,
        type TEXT not null,
        coverArt TEXT not null,
        searchedAt DATETIME DEFAULT CURRENT_TIMESTAMP not null,
        primary key (id)
    )`);

    try {
        const tableInfo = await db.getAllAsync<{ name: string, type: string }>(
            `PRAGMA table_info(playbackHistory)`
        );
        const playedAtColumn = tableInfo.find(col => col.name === 'playedAt');
        if (playedAtColumn && playedAtColumn.type === 'DATETIME') {
            await db.execAsync('DROP TABLE IF EXISTS playbackHistory');
        }
    } catch (error) {

    }

    await db.execAsync(`CREATE TABLE IF NOT EXISTS playbackHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trackId TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT,
        album TEXT,
        coverArt TEXT,
        duration INTEGER,
        playedAt INTEGER NOT NULL
    )`);

    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_playbackHistory_playedAt 
        ON playbackHistory(playedAt DESC)`);

    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_playbackHistory_trackId 
        ON playbackHistory(trackId)`);
}