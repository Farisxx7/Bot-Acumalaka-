import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. FUNGSI SCRAPER MEDIAFIRE ---
async function mediafireDl(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        
        // Cari tombol download utama
        const downloadUrl = $('a#downloadButton').attr('href');
        
        // Cari info file (Nama & Ukuran)
        const fileName = $('div.filename').text().trim();
        const fileSizeText = $('ul.details li span').eq(1).text().trim(); // Biasanya ada di detail list

        if (!downloadUrl) return null;

        return {
            link: downloadUrl,
            name: fileName || 'file.zip',
            size: fileSizeText || 'Unknown'
        };

    } catch (e) {
        console.error("MediaFire Scraper Error:", e.message);
        return null;
    }
}

// --- 2. FUNGSI DOWNLOADER ---
async function downloadFile(url, outputLocation) {
    const writer = fs.createWriteStream(outputLocation);
    try {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'stream',
            timeout: 600000, // 10 menit timeout (karena file MF biasanya besar)
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(true));
            writer.on('error', reject);
        });
    } catch (error) {
        if (fs.existsSync(outputLocation)) fs.unlinkSync(outputLocation);
        throw error;
    }
}

// --- 3. COMMAND HANDLER ---
export default {
    command: ['mediafire', 'mf'],
    execute: async (sock, m, { q, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Linknya mana?\nContoh: .mf https://www.mediafire.com/file/xxxxx' }, { quoted: m });

        // Cek apakah link valid
        if (!q.includes('mediafire.com')) {
            return sock.sendMessage(sender, { text: '❌ Link tidak valid.' }, { quoted: m });
        }

        await sock.sendMessage(sender, { text: '⏳ Sedang memproses file...' }, { quoted: m });

        try {
            // A. Scrape Data
            const result = await mediafireDl(q);
            if (!result) return sock.sendMessage(sender, { text: '❌ Gagal mengambil data. Link mungkin mati atau folder.' }, { quoted: m });

            // B. Cek Ukuran File (Opsional: Batasi agar VPS tidak jebol)
            // Misalnya kita batasi 100MB (Bot WA biasanya limit 100MB untk kirim file)
            if (result.size.includes('GB')) {
                return sock.sendMessage(sender, { text: `❌ File terlalu besar (${result.size}). Bot hanya kuat maksimal 100MB.` }, { quoted: m });
            }

            // Info File
            const captionText = `📦 *MEDIAFIRE DOWNLOADER*\n────────────────────\n📄 *Nama:* ${result.name}\n📊 *Ukuran:* ${result.size}\n────────────────────\n⏳ Sedang mendownload ke server...`;
            await sock.sendMessage(sender, { text: captionText }, { quoted: m });

            // C. Siapkan Temp
            const outputDir = path.join(__dirname, '../../temp_downloads');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const filePath = path.join(outputDir, result.name);

            // D. Download & Kirim
            try {
                await downloadFile(result.link, filePath);

                // Kirim Dokumen
                await sock.sendMessage(sender, { 
                    document: fs.readFileSync(filePath), 
                    mimetype: 'application/octet-stream', // Tipe umum untuk file download
                    fileName: result.name,
                    caption: '✅ Download Selesai.'
                }, { quoted: m });

            } catch (err) {
                console.error("Gagal kirim:", err.message);
                sock.sendMessage(sender, { text: '❌ Gagal mendownload file.' }, { quoted: m });
            } finally {
                // E. Hapus Sampah
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

        } catch (error) {
            console.error("Handler Error:", error);
            sock.sendMessage(sender, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: m });
        }
    }
};
