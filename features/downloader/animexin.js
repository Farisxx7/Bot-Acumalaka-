import axios from 'axios';
import * as cheerio from 'cheerio';

// Fungsi Scraper Animexin (Update: Ambil Gambar)
async function animexinSearch(query) {
    try {
        const url = `https://animexin.dev/?s=${encodeURIComponent(query)}`;
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://animexin.dev/'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.bsx').each((i, el) => {
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.tt').text().trim();
            const ep = $(el).find('.epx').text().trim();
            const type = $(el).find('.typez').text().trim();
            const status = $(el).find('.sb').text().trim();
            
            // --- UPDATE: AMBIL GAMBAR ---
            // Cari tag img di dalam elemen .bsx, ambil atribut src
            let img = $(el).find('img').attr('src');
            
            // Kadang gambar ada di atribut 'data-src' (lazy load), jadi kita cek juga
            if (!img) img = $(el).find('img').attr('data-src');

            if (title && link) {
                results.push({
                    title: title,
                    episode: ep || 'Unknown',
                    type: type || 'Anime',
                    status: status || '-',
                    link: link,
                    image: img || 'https://animexin.dev/wp-content/uploads/2022/07/animexin-logo.png' // Fallback jika tidak ada gambar
                });
            }
        });

        return results;

    } catch (e) {
        console.error("Error Animexin:", e.message);
        return [];
    }
}

export default {
    command: ['animexin', 'anime'],
    execute: async (sock, m, { q, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Masukkan judul anime!\nContoh: .anime naruto' }, { quoted: m });

        await sock.sendMessage(sender, { text: '🔍 Sedang mencari & mengambil gambar...' }, { quoted: m });

        try {
            const results = await animexinSearch(q);

            if (results.length === 0) {
                return sock.sendMessage(sender, { text: '❌ Anime tidak ditemukan.' }, { quoted: m });
            }

            // Batasi 5 hasil
            const limit = results.slice(0, 5);
            
            // Ambil gambar dari hasil PERTAMA untuk dijadikan cover pesan
            const firstImage = limit[0].image;

            let text = `⛩️ *ANIMEXIN SEARCH* ⛩️\n🔎 Query: ${q}\n────────────────────\n`;

            limit.forEach((item, index) => {
                text += `\n${index + 1}. *${item.title}*`;
                text += `\n📺 Ep: ${item.episode} | Type: ${item.type}`;
                text += `\n🏷️ Info: ${item.status}`;
                text += `\n🔗 Link: ${item.link}\n`;
            });

            text += `\n────────────────────\nCreated by Faris Suka Mie Ayam`;

            // --- UPDATE: KIRIM SEBAGAI IMAGE ---
            // Kita kirim gambar hasil pertama, lalu list hasil lainnya ditaruh di CAPTION
            await sock.sendMessage(sender, { 
                image: { url: firstImage }, 
                caption: text
            }, { quoted: m });

        } catch (e) {
            console.error("Handler Error:", e);
            sock.sendMessage(sender, { text: '❌ Terjadi kesalahan saat mencari anime.' }, { quoted: m });
        }
    }
};
