import axios from 'axios';

// Menggunakan Jikan API (Gratis & No Key)
async function searchMal(query) {
    try {
        // Cari Anime
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        
        const results = response.data.data;
        if (!results || results.length === 0) return null;

        // Ambil hasil teratas
        return results[0];
    } catch (e) {
        console.error("Error Jikan API:", e.message);
        return null;
    }
}

export default {
    command: ['mal', 'myanimelist'],
    execute: async (sock, m, { q, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Masukkan judul anime!\nContoh: .mal naruto' }, { quoted: m });

        await sock.sendMessage(sender, { text: '🔍 Mencari data di MyAnimeList...' }, { quoted: m });

        try {
            const anime = await searchMal(q);

            if (!anime) {
                return sock.sendMessage(sender, { text: '❌ Anime tidak ditemukan di MyAnimeList.' }, { quoted: m });
            }

            // Siapkan Data
            const title = anime.title; // Judul Utama
            const titleEn = anime.title_english || '-'; // Judul Inggris
            const score = anime.score || 'N/A';
            const episodes = anime.episodes || '?';
            const status = anime.status;
            const type = anime.type;
            const duration = anime.duration;
            const rank = anime.rank;
            const synopsis = anime.synopsis ? anime.synopsis.replace('[Written by MAL Rewrite]', '').trim() : 'Tidak ada sinopsis.';
            const url = anime.url;
            const imageUrl = anime.images.jpg.large_image_url;

            // Format Pesan
            let text = `📚 *MYANIMELIST SEARCH* 📚\n`;
            text += `────────────────────\n`;
            text += `🌟 *Title:* ${title}\n`;
            text += `🇺🇸 *English:* ${titleEn}\n`;
            text += `⭐ *Score:* ${score} (Rank #${rank})\n`;
            text += `📺 *Type:* ${type} (${episodes} Eps)\n`;
            text += `🟢 *Status:* ${status}\n`;
            text += `⏳ *Duration:* ${duration}\n`;
            text += `────────────────────\n`;
            text += `📝 *Synopsis:*\n${synopsis.slice(0, 500)}... (baca selengkapnya di web)\n`;
            text += `────────────────────\n`;
            text += `🔗 *Link:* ${url}\n`;

            // Kirim Gambar + Caption
            await sock.sendMessage(sender, { 
                image: { url: imageUrl }, 
                caption: text 
            }, { quoted: m });

        } catch (e) {
            console.error("Handler Error:", e);
            sock.sendMessage(sender, { text: '❌ Terjadi kesalahan saat mengambil data.' }, { quoted: m });
        }
    }
};
