import axios from 'axios';
import * as cheerio from 'cheerio';

// Headers Samaran (Chrome PC) agar tidak ditolak server Kusonime
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://kusonime.com/'
};

// Fungsi Scrape Langsung Kusonime
async function kusonimeSearch(query) {
    try {
        // Search langsung ke endpoint search kusonime
        const url = `https://kusonime.com/?s=${encodeURIComponent(query)}&post_type=post`;
        
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        const results = [];

        // Kusonime biasanya menampilkan hasil dalam div class "kover"
        $('.kover').each((i, el) => {
            const content = $(el).find('.content');
            const thumb = $(el).find('.thumbz, .thumb'); // Class gambar bisa berubah-ubah
            
            const title = content.find('h2 a').text().trim();
            const link = content.find('h2 a').attr('href');
            const posted = content.find('p').first().text().replace('Posted on ', '').trim();
            
            // Ambil Gambar
            let img = thumb.find('img').attr('src');
            if (!img) img = thumb.find('img').attr('data-src');

            // Validasi
            if (title && link) {
                results.push({
                    title: title,
                    link: link,
                    posted: posted,
                    image: img || 'https://kusonime.com/wp-content/uploads/2017/02/Kusonime-Logo-Baru-1.png'
                });
            }
        });

        return results;

    } catch (e) {
        console.error("Error Kusonime Direct:", e.message);
        return [];
    }
}

export default {
    command: ['kusonime', 'kuso'],
    execute: async (sock, m, { q, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Masukkan judul anime!\nContoh: .kuso frieren' }, { quoted: m });

        await sock.sendMessage(sender, { text: '🔍 Mencari langsung di Kusonime...' }, { quoted: m });

        try {
            const results = await kusonimeSearch(q);

            if (results.length === 0) {
                return sock.sendMessage(sender, { text: '❌ Anime tidak ditemukan (Mungkin salah ketik atau judul belum tersedia).' }, { quoted: m });
            }

            // Ambil hasil teratas
            const topResult = results[0];
            const firstImage = topResult.image;

            // Batasi 5 hasil
            const limit = results.slice(0, 5);
            
            let text = `⛩️ *KUSONIME SEARCH* ⛩️\n🔎 Query: ${q}\n────────────────────\n`;

            limit.forEach((item, index) => {
                text += `\n${index + 1}. *${item.title}*`;
                text += `\n📅 ${item.posted}`;
                text += `\n🔗 Link: ${item.link}\n`;
            });

            text += `\n────────────────────\nCreated by FarisBot`;

            // --- PENGIRIMAN PESAN (FIXED) ---
            // Mengirim sebagai TEXT, bukan IMAGE
            // Gambar hanya ditaruh di thumbnail contextInfo agar tidak muncul 2x
            await sock.sendMessage(sender, { 
                text: text, 
                contextInfo: {
                    externalAdReply: {
                        title: topResult.title,
                        body: "Klik untuk download Batch",
                        thumbnailUrl: firstImage, 
                        sourceUrl: topResult.link,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (e) {
            console.error("Handler Error:", e);
            sock.sendMessage(sender, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: m });
        }
    }
};
