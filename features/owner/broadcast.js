import { downloadContentFromMessage } from '@whiskeysockets/baileys';

// Helper: Sleep (Jeda)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Download Media
async function downloadMedia(msg, type) {
    const stream = await downloadContentFromMessage(msg, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

export default {
    command: ['bc', 'broadcast', 'bcgroup'],
    execute: async (sock, m, { q, isOwner }) => {
        // 1. Cek Permission
        if (!isOwner) return sock.sendMessage(m.chat, { text: '❌ Fitur ini khusus Owner!' }, { quoted: m });

        // 2. Deteksi Konten
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const isImage = /image/.test(mime);
        const isVideo = /video/.test(mime);
        const textToBroadcast = q || (quoted.text ? quoted.text : '');

        if (!textToBroadcast && !isImage && !isVideo) {
            return sock.sendMessage(m.chat, { text: '❌ Masukkan pesan atau reply media!' }, { quoted: m });
        }

        // 3. Ambil Group & Filter ID (CRITICAL STEP)
        let groupIds = [];
        try {
            const groups = await sock.groupFetchAllParticipating();
            // Filter: Buang ID yang undefined, null, atau tidak berakhiran @g.us
            groupIds = Object.keys(groups).filter(id => id && typeof id === 'string' && id.endsWith('@g.us'));
        } catch (e) {
            console.error("Gagal fetch group:", e);
            return sock.sendMessage(m.chat, { text: '❌ Gagal mengambil data grup.' }, { quoted: m });
        }

        if (groupIds.length === 0) {
            return sock.sendMessage(m.chat, { text: '❌ Tidak ada grup yang valid untuk dibroadcast.' }, { quoted: m });
        }

        await sock.sendMessage(m.chat, { text: `📢 Memulai Broadcast ke ${groupIds.length} grup...\n⏳ Jeda: 2 detik` }, { quoted: m });

        // 4. Download Media
        let mediaBuffer = null;
        let mediaType = null;
        if (isImage || isVideo) {
            try {
                const streamType = isImage ? 'image' : 'video';
                const messageContent = m.quoted ? m.quoted.msg : m.msg;
                mediaBuffer = await downloadMedia(messageContent, streamType);
                mediaType = streamType;
            } catch (e) {
                return sock.sendMessage(m.chat, { text: '❌ Gagal download media source.' }, { quoted: m });
            }
        }

        // 5. Eksekusi Broadcast (DENGAN TRY-CATCH PER ITEM)
        let success = 0;
        let fail = 0;

        for (let id of groupIds) {
            // SAFEGUARD: Jangan pernah kirim jika ID mencurigakan
            if (!id || id === 'undefined' || id === 'null') {
                console.log(`[BC SKIP] ID Invalid ditemukan: ${id}`);
                continue;
            }

            try {
                await sleep(2000); // Jeda Anti-Banned

                // Kirim sesuai tipe (dibungkus try-catch agar tidak crash)
                if (mediaType === 'image') {
                    await sock.sendMessage(id, { 
                        image: mediaBuffer, 
                        caption: textToBroadcast,
                        contextInfo: { forwardingScore: 999, isForwarded: true } 
                    });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(id, { 
                        video: mediaBuffer, 
                        caption: textToBroadcast,
                        contextInfo: { forwardingScore: 999, isForwarded: true } 
                    });
                } else {
                    await sock.sendMessage(id, { 
                        text: `📢 *BROADCAST*\n────────────────\n${textToBroadcast}`,
                        contextInfo: { forwardingScore: 999, isForwarded: true }
                    });
                }
                success++;
            } catch (e) {
                // HANYA LOG ERROR, JANGAN CRASH
                console.error(`[BC FAIL] Gagal kirim ke ${id}:`, e.message);
                fail++;
            }
        }

        // 6. Laporan
        await sock.sendMessage(m.chat, { text: `✅ *Broadcast Selesai*\n🟢 Sukses: ${success}\n🔴 Gagal: ${fail}` }, { quoted: m });
    }
};
