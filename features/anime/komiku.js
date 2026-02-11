import axios from 'axios';
import * as cheerio from 'cheerio';

// --- FUNGSI SEARCH KOMIKU ---
async function komikuSearch(query) {
    try {
        const { data } = await axios.get(`https://data.komiku.id/cari/?post_type=manga&s=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const firstResult = $('.bge').first();

        if (!firstResult.length) return null;

        // Ambil Data
        const title = firstResult.find('h3').text().trim();
        const link = firstResult.find('a').attr('href');
        
        // --- PERBAIKAN 1: BERSIHKAN URL GAMBAR ---
        // Ambil src, lalu hapus query string (?resize=...) agar dapat gambar asli
        let thumb = firstResult.find('img').attr('data-src') || firstResult.find('img').attr('src');
        if (thumb && thumb.includes('?')) {
            thumb = thumb.split('?')[0]; // Hapus parameter resize yang bikin error 404
        }
        // -----------------------------------------

        const desc = firstResult.find('.judul2').text().trim();
        const type = firstResult.find('.tpe1_inf b').text().trim();
        const update = firstResult.find('.up').text().trim();

        // Ambil status (Optional)
        let status = '-';
        try {
            const { data: detailData } = await axios.get(link);
            const $$ = cheerio.load(detailData);
            status = $$('.inftable tr').filter((i, el) => $$(el).text().includes('Status')).find('td:nth-child(2)').text().trim();
        } catch (e) {}

        return { title, link, thumb, desc, type, update, status };

    } catch (e) {
        console.error("Komiku Scraper Error:", e.message);
        return null;
    }
}

// --- COMMAND HANDLER ---
export default {
    command: ['komiku', 'manga', 'komik'], 
    execute: async (sock, m, { q, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Masukkan judul komik!' }, { quoted: m });

        await sock.sendMessage(sender, { text: '⏳ Sedang mencari...' }, { quoted: m });

        try {
            const result = await komikuSearch(q);

            if (!result) {
                return sock.sendMessage(sender, { text: '❌ Komik tidak ditemukan.' }, { quoted: m });
            }

            // Format Caption
            let captionText = `📚 *KOMIKU SEARCH*\n`;
            captionText += `────────────────────\n`;
            captionText += `📖 *Judul:* ${result.title}\n`;
            captionText += `🇯🇵 *Tipe:* ${result.type}\n`;
            captionText += `📝 *Status:* ${result.status}\n`;
            captionText += `⏱️ *Update:* ${result.update}\n`;
            captionText += `📜 *Sinopsis:* ${result.desc}\n`;
            captionText += `🔗 *Link:* ${result.link}\n`;
            captionText += `────────────────────\n`;
            captionText += `Created by Faris Suka Mie Ayam`;

            // --- PERBAIKAN 2: SAFETY SENDING ---
            // Coba kirim gambar dulu, jika 404/gagal, kirim teks saja.
            try {
                // Download buffer gambar manual agar bisa ditangkap errornya
                const { data: imgBuffer } = await axios.get(result.thumb, { responseType: 'arraybuffer' });
                
                await sock.sendMessage(sender, { 
                    image: imgBuffer, 
                    caption: captionText 
                }, { quoted: m });

            } catch (imgError) {
                console.log(`Gagal kirim gambar (${imgError.message}), kirim teks saja.`);
                // Fallback: Kirim teks jika gambar rusak
                await sock.sendMessage(sender, { 
                    text: captionText 
                }, { quoted: m });
            }

        } catch (error) {
            console.error("Handler Error:", error);
            sock.sendMessage(sender, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: m });
        }
    }
};
