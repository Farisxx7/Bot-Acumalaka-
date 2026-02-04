import { ytdl } from '../../lib/ytdl.js';
import fs from 'fs';

export default {
    command: ['download', 'dl', 'audio', 'mp3'],
    execute: async (sock, m, { q, args, sender }) => {
        // --- BAGIAN PERBAIKAN ---
        // Kita ambil teks dengan aman dari berbagai tipe pesan (Extended/Image/Simple)
        const msgType = Object.keys(m.message)[0];
        const body = m.message.conversation || m.message[msgType]?.caption || m.message[msgType]?.text || '';

        // Deteksi apakah user minta audio berdasarkan perintah yang diketik
        const isAudio = body.toLowerCase().includes('audio') || body.toLowerCase().includes('mp3');
        // ------------------------

        if (!q) return sock.sendMessage(sender, { text: 'Mana link nya?' }, { quoted: m });

        await sock.sendMessage(sender, { text: '⏳ Sedang memproses... mohon tunggu.' }, { quoted: m });

        let filePath = null;

        try {
            // 1. Download File
            filePath = await ytdl(q, isAudio ? 'audio' : 'video');

            // 2. Kirim ke WhatsApp
            if (isAudio) {
                await sock.sendMessage(sender, { 
                    audio: { url: filePath }, 
                    mimetype: 'audio/mpeg',
                    ptt: false 
                }, { quoted: m });
            } else {
                await sock.sendMessage(sender, { 
                    video: { url: filePath }, 
                    caption: '✅ Sukses Download (File akan dihapus dari server)',
                    mimetype: 'video/mp4' 
                }, { quoted: m });
            }

        } catch (e) {
            console.error("Error Download:", e);
            sock.sendMessage(sender, { text: '❌ Gagal. Link mungkin tidak support atau private.' }, { quoted: m });
        } finally {
            // 3. Hapus File Sampah (Wajib)
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Sampah dihapus: ${filePath}`);
            }
        }
    }
};
