import { exec } from 'child_process';
import fs from 'fs';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    command: ['sticker', 's'],
    execute: async (sock, m, { sender }) => {
        // Cek apakah user me-reply pesan (Quoted Message)
        const isQuoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
        
        let targetMessage = null;
        let type = null;

        if (isQuoted) {
            // --- LOGIKA REPLY ---
            // Ambil pesan yang di-reply oleh user
            const quoted = m.message.extendedTextMessage.contextInfo.quotedMessage;
            
            if (quoted.imageMessage) {
                targetMessage = quoted.imageMessage;
                type = 'image';
            } else if (quoted.videoMessage) {
                targetMessage = quoted.videoMessage;
                type = 'video';
            }
        } else {
            // --- LOGIKA KIRIM LANGSUNG ---
            // Ambil pesan langsung dari user (jika dia kirim gambar + caption)
            if (m.message.imageMessage) {
                targetMessage = m.message.imageMessage;
                type = 'image';
            } else if (m.message.videoMessage) {
                targetMessage = m.message.videoMessage;
                type = 'video';
            }
        }

        // Jika tidak ada gambar/video sama sekali
        if (!targetMessage) {
            return sock.sendMessage(sender, { text: '❌ Cara pakai: Reply foto/video orang lain ketik .sticker (Atau kirim foto langsung pakai caption .sticker)' }, { quoted: m });
        }

        let input = null;
        let output = null;

        try {
            // 1. Download Media (Dari target yang sudah ditentukan di atas)
            const stream = await downloadContentFromMessage(targetMessage, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            input = `./temp_in_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`;
            output = `./temp_out_${Date.now()}.webp`;
            fs.writeFileSync(input, buffer);

            // 2. Convert FFmpeg
            await new Promise((resolve, reject) => {
                exec(`ffmpeg -i ${input} -vcodec libwebp -vf "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse" ${output}`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // 3. Kirim Sticker
            await sock.sendMessage(sender, { sticker: { url: output } }, { quoted: m });

        } catch (e) {
            console.error("Error Sticker:", e);
            sock.sendMessage(sender, { text: '❌ Gagal. Pastikan yang di-reply adalah Foto/Video.' }, { quoted: m });
        } finally {
            // 4. Bersih-bersih
            if (input && fs.existsSync(input)) fs.unlinkSync(input);
            if (output && fs.existsSync(output)) fs.unlinkSync(output);
        }
    }
};
