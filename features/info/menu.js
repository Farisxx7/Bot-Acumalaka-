import { config } from '../../config.js';

export default {
    command: ['menu', 'help'],
    // Kita ambil 'realSender' untuk info user, dan 'sender' untuk tujuan kirim pesan
    execute: async (sock, m, { sender, realSender, isOwner }) => {
        
        const statusUser = isOwner ? '👑 Owner (Super Admin)' : '⚔️ User (Pengguna Gratis)';
        const sapaan = isOwner ? 'Halo Bos Faris! 👋' : 'Halo Kak! 👋';
        
        const text = `
🌸 *I N F O   U S E R* 🌸
────────────────────
🍩 *Nama  : ${m.pushName || 'Tanpa Nama'}*
📱 *Nomor : ${realSender.split('@')[0]}*
🧁 *Status: ${statusUser}*
⏰ *Jam   : ${new Date().toLocaleTimeString('id-ID')}*

${sapaan}

🤖 *D A F T A R   F I T U R*
────────────────────
👇 *Media & Tools* 👇

1. *.sticker* / *.s*
   (Gambar/Video ➡️ Sticker)

2. *.download* / *.dl* <link>
   (YouTube/IG/TT ➡️ Video MP4)

3. *.audio* / *.mp3* <link>
   (YouTube ➡️ Lagu MP3)

4. *.setpp*
   (Ganti PP Bot - Khusus Owner)

5. *.neofetch* / *.neo*
   (Info Server)

6. *.ping*
   (Cek Speed)

7. *.menu*
   (Daftar Menu)

────────────────────
${config.footer}
`;
        await sock.sendMessage(sender, { text: text }, { quoted: m });
    }
};
