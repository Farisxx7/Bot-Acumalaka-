import fs from 'fs';

// Helper: Menghitung Runtime
function runtime(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor(seconds % (3600 * 24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);
	return (d > 0 ? d + "d " : "") + (h > 0 ? h + "h " : "") + (m > 0 ? m + "m " : "") + s + "s";
}

export default {
    command: ['menu', 'help', 'list'],
    execute: async (sock, m, { q, sender, pushName, isOwner }) => {
        
        // --- 1. FIX: ID CHAT AMAN ---
        const chatId = m.chat || m.key.remoteJid;
        if (!chatId) return;

        // --- 2. DATA USER ---
        const timeWIB = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
        const senderNumber = sender.split('@')[0];
        const status = isOwner ? '👑 Owner (God Mode)' : '⚔️ User';
        const botRuntime = runtime(process.uptime());

        // --- 3. ISI MENU ---
        let menuText = `
🌸 *I N F O   U S E R* 🌸
────────────────────
🍩 *Nama  :* ${pushName || 'Tanpa Nama'}
📱 *Nomor :* ${senderNumber}
🎟️ *Status:* ${status}
⏰ *Jam   :* ${timeWIB}
⏱️ *Uptime:* ${botRuntime}

Halo Bos! 👋

🤖 *D A F T A R   F I T U R*
────────────────────

📥 *D O W N L O A D E R*
1.  *.ig* <link>
    (Instagram Video/Reel/Post)
2.  *.tt* <link>
    (TikTok No Watermark)
3.  *.mf* <link>
    (MediaFire Downloader)
4.  *.mp3* <link>
    (YouTube to MP3)
5.  *.flac* <judul>
    (Download Lagu Hi-Res FLAC)

🎨 *M E D I A  &  T O O L S*
6.  *.sticker*
    (Gambar/Video ➡️ Sticker)

⛩️ *A N I M E  &  M A N G A*
7.  *.komiku* <judul>
    (Cari/Baca Manga Indo)
8.  *.animexin* <judul>
    (Cari Anime Terbaru)
9.  *.kusonime* <judul>
    (Download Anime Batch)
10. *.mal* <judul>
    (Info Detail MyAnimeList)

⚙️ *S Y S T E M  &  O W N E R*
11. *.ping*
    (Cek Kecepatan Respon Bot)
12. *.neofetch*
    (Cek Info Spesifikasi VPS)
13. *.setpp*
    (Ganti Foto Profil Bot)

────────────────────
Created By Faris Suka Mie Ayam🔥🚀
`;

        // --- 4. CONFIG GAMBAR BARU ---
        const imageUrl = 'https://files.catbox.moe/2txmah.jpg'; 

        try {
            await sock.sendMessage(chatId, { 
                image: { url: imageUrl }, 
                caption: menuText
            }, { quoted: m });

        } catch (error) {
            console.log("⚠️ Gambar error, kirim teks saja.");
            await sock.sendMessage(chatId, { text: menuText });
        }
    }
};
