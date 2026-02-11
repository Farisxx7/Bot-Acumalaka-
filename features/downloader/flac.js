import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// --- KONFIGURASI DOMAIN ---
const API_DOMAINS = [
    "https://tidal.kinoplus.online",
    "https://triton.squid.wtf",
    "https://wolf.qqdl.site",
    "https://maus.qqdl.site",
    "https://vogel.qqdl.site",
    "https://katze.qqdl.site",
    "https://hund.qqdl.site",
    "https://tidal-api.binimum.org"
];

const LYRICS_DOMAINS = [
    "https://lyricsplus.prjktla.workers.dev",
    "https://lyrics-plus-backend.vercel.app"
];

const HEADERS = {
    "accept": "*/*",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://tidal.squid.wtf/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
};

// --- HELPER FUNCTIONS ---

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9\-_]/gi, '_').trim();
}

function msToLrcTimestamp(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((totalSeconds % 1) * 100);
    return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
}

async function downloadChunk(url) {
    try {
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    } catch (error) {
        return null;
    }
}

async function fetchWithFailover(endpointPath) {
    let lastError = null;
    for (const domain of API_DOMAINS) {
        const url = `${domain}${endpointPath}`;
        try {
            const response = await fetch(url, { headers: HEADERS });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            
            if (text.trim().startsWith('<') && !text.includes('MPD')) {
                throw new Error("Response is XML ErrorPage");
            }
            return JSON.parse(text);
        } catch (e) {
            lastError = e.message;
            continue;
        }
    }
    throw new Error(`Server Tidal Sibuk: ${lastError}`);
}

async function fetchLyrics(meta) {
    const params = new URLSearchParams({
        title: meta.title, artist: meta.artist, album: meta.album, duration: meta.duration || 0,
        source: "apple,lyricsplus,musixmatch,spotify"
    });

    for (const domain of LYRICS_DOMAINS) {
        try {
            const res = await fetch(`${domain}/v2/lyrics/get?${params}`, { headers: HEADERS });
            if (!res.ok) continue;
            const text = await res.text();
            if (text.startsWith('<')) continue;
            
            const json = JSON.parse(text);
            if (!json.lyrics?.length) continue;

            return json.lyrics.map(line => {
                if (!line || !line.text) return '';
                const ts = msToLrcTimestamp(line.time);
                return `${ts}${line.text.trim()}`;
            }).filter(Boolean).join("\n");
        } catch { continue; }
    }
    return null;
}

// --- CORE DOWNLOADER ---

async function downloadTrackCore(trackId, meta, outputDir = './temp') {
    if (!fs.existsSync(outputDir)) await fsPromises.mkdir(outputDir, { recursive: true });

    const safeName = sanitizeFilename(`${meta.artist} - ${meta.title}`);
    const tempAudio = path.join(outputDir, `tmp_${trackId}_${Date.now()}.audio`);
    const tempCover = path.join(outputDir, `cover_${trackId}.jpg`);
    const finalFile = path.join(outputDir, `${safeName}.flac`);

    // Download Cover & Lyrics
    if (meta.cover) {
        const coverBuf = await downloadChunk(meta.cover);
        if (coverBuf) await fsPromises.writeFile(tempCover, coverBuf);
    }
    const lyrics = await fetchLyrics(meta);

    // Manifest & Stream
    const manifestJson = await fetchWithFailover(`/track/?id=${trackId}&quality=HI_RES_LOSSLESS`);
    if (!manifestJson.data?.manifest) throw new Error("Gagal mengambil audio manifest.");
    
    const decodedManifest = Buffer.from(manifestJson.data.manifest, 'base64').toString('utf-8');
    const fileStream = fs.createWriteStream(tempAudio);

    if (decodedManifest.trim().startsWith('<')) {
        // DASH XML Logic
        const initMatch = decodedManifest.match(/initialization="([^"]+)"/);
        const mediaMatch = decodedManifest.match(/media="([^"]+)"/);
        if (!initMatch || !mediaMatch) throw new Error("XML Parsing Failed.");

        const initUrl = initMatch[1].replace(/&amp;/g, '&');
        const mediaUrlTemplate = mediaMatch[1].replace(/&amp;/g, '&');

        const initBuf = await downloadChunk(initUrl);
        if (initBuf) fileStream.write(initBuf);

        let segmentIndex = 1;
        let keepDownloading = true;
        while (keepDownloading) {
            const segmentUrl = mediaUrlTemplate.replace('$Number$', segmentIndex);
            const chunk = await downloadChunk(segmentUrl);
            if (chunk && chunk.length > 0) {
                fileStream.write(chunk);
                segmentIndex++;
                if (segmentIndex > 600) keepDownloading = false;
            } else {
                keepDownloading = false;
            }
        }
    } else {
        // JSON BTS Logic
        try {
            const btsData = JSON.parse(decodedManifest);
            if (btsData.urls) {
                for (const url of btsData.urls) {
                    const chunk = await downloadChunk(url);
                    if (chunk) fileStream.write(chunk);
                }
            }
        } catch (e) {
            throw new Error("JSON Manifest Error.");
        }
    }

    fileStream.end();
    await new Promise(r => fileStream.on('finish', r));

    // FFmpeg Merge
    const ffmpegArgs = [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", tempAudio,
        ...(fs.existsSync(tempCover) ? ["-i", tempCover] : []),
        "-map", "0:a",
        ...(fs.existsSync(tempCover) ? ["-map", "1:0", "-disposition:v:0", "attached_pic"] : []),
        "-c:a", "copy",
        "-metadata", `title=${meta.title}`,
        "-metadata", `artist=${meta.artist}`,
        "-metadata", `album=${meta.album}`,
        "-metadata", `date=${meta.date}`,
        ...(lyrics ? ["-metadata", `LYRICS=${lyrics}`, "-metadata", `UNSYNCEDLYRICS=${lyrics}`] : []),
        finalFile
    ];

    await new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", ffmpegArgs);
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg error code: ${code}`)));
    });

    if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
    if (fs.existsSync(tempCover)) fs.unlinkSync(tempCover);

    return finalFile;
}

// --- EXPORT HANDLER ---

export default {
    command: ['flac', 'tidal'],
    execute: async (sock, m, { q, args, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Masukkan Judul Lagu.\nContoh: .flac Nadin Amizah' }, { quoted: m });

        // Jangan kirim "Sedang mencari..." biasa, kita langsung cari metadata dulu
        
        try {
            let trackId = null;
            let meta = null;

            // 1. CARI TRACK ID & METADATA
            const linkMatch = q.match(/tidal\.com\/.*\/track\/(\d+)/);
            
            if (linkMatch) {
                trackId = linkMatch[1];
                // Fetch info khusus ID
                const infoJson = await fetchWithFailover(`/info/?id=${trackId}`);
                if (!infoJson.data) throw new Error("Metadata tidak valid.");
                const data = infoJson.data;
                meta = {
                    title: data.title,
                    artist: data.artists?.map(a => a.name).join(", ") || "Unknown",
                    album: data.album?.title || "Unknown Album",
                    date: data.streamStartDate ? data.streamStartDate.split('T')[0] : new Date().getFullYear().toString(),
                    cover: data.album?.cover ? `https://resources.tidal.com/images/${data.album.cover.replace(/-/g, "/")}/1280x1280.jpg` : 'https://i.imgur.com/3fM7a7B.jpeg',
                    duration: data.duration,
                    url: data.url
                };

            } else {
                const searchRes = await fetchWithFailover(`/search/?s=${encodeURIComponent(q)}`);
                const items = searchRes.data?.items;
                if (!items || items.length === 0) throw new Error("Lagu tidak ditemukan.");
                
                const item = items[0];
                trackId = item.id;
                meta = {
                    title: item.title,
                    artist: item.artists?.map(a => a.name).join(", ") || "Unknown",
                    album: item.album?.title || "Unknown Album",
                    date: new Date().getFullYear().toString(),
                    cover: item.album?.cover ? `https://resources.tidal.com/images/${item.album.cover.replace(/-/g, "/")}/1280x1280.jpg` : 'https://i.imgur.com/3fM7a7B.jpeg',
                    duration: item.duration,
                    url: item.url
                };
            }

            // 2. KIRIM PESAN "FANCY" (Sesuai Screenshot)
            const fancyText = `Tidal Hi-Res lossless FLACs✨\n__________________________\n🎵 Judul: ${meta.title}\n✍️ Artis: ${meta.artist}\n💿 Album: ${meta.album}\n__________________________\n💡 File sedang dikirimkan...`;

            await sock.sendMessage(sender, {
                text: fancyText,
                contextInfo: {
                    externalAdReply: {
                        title: meta.title,
                        body: meta.artist,
                        thumbnailUrl: meta.cover,
                        sourceUrl: meta.url || "https://tidal.com",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            // 3. PROSES DOWNLOAD
            const filePath = await downloadTrackCore(trackId, meta);
            const fileName = path.basename(filePath);

            // 4. KIRIM FILE DOKUMEN
            await sock.sendMessage(sender, { 
                document: { url: filePath }, 
                mimetype: 'audio/flac', 
                fileName: fileName
            }, { quoted: m });

            // Hapus file
            setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);

        } catch (e) {
            console.error("FLAC Error:", e);
            sock.sendMessage(sender, { text: `❌ Gagal: ${e.message}` }, { quoted: m });
        }
    }
};
