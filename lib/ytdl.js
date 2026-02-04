import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const ytdl = (url, type = 'video') => {
    return new Promise((resolve, reject) => {
        const outputName = `temp_${Date.now()}`;
        const outputFile = path.resolve(`./${outputName}.${type === 'audio' ? 'mp3' : 'mp4'}`);

        let args = '';
        
        // --- TEKNIK ANTI BLOKIR (USER AGENT SPOOFING) ---
        // Kita menyamar sebagai Browser Chrome di Windows 10 agar tidak ditolak Instagram
        const fakeBrowser = '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';

        if (type === 'video') {
            // Prioritas:
            // 1. "best": Video+Audio menyatu (Paling aman buat IG/FB)
            // 2. "bestvideo+bestaudio": Gabung manual jika terpisah
            args = `-f "best/bestvideo+bestaudio" --merge-output-format mp4 --no-mtime ${fakeBrowser}`;
        
        } else {
            // Audio Mode
            args = `-x --audio-format mp3 --audio-quality 0 ${fakeBrowser}`;
        }

        const command = `yt-dlp ${args} -o "${outputFile}" "${url}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                // Deteksi Error Khusus
                if (stderr.includes('429') || error.message.includes('429')) {
                    console.error("⚠️ IP VPS DIBLOKIR SEMENTARA OLEH INSTAGRAM (Error 429). Tunggu beberapa saat.");
                } else {
                    console.error(`Error YT-DLP: ${error.message}`);
                }
                reject(error);
                return;
            }
            if (fs.existsSync(outputFile)) {
                resolve(outputFile);
            } else {
                reject(new Error('File tidak ditemukan (Gagal download).'));
            }
        });
    });
};
