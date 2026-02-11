import axios from 'axios';

// --- FUNGSI DOWNLOADER (VIA TIKWM API) ---
async function tiktokDl(url) {
    try {
        const response = await axios.post('https://www.tikwm.com/api/', 
            new URLSearchParams({
                url: url,
                count: 12,
                cursor: 0,
                web: 1,
                hd: 1
            }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                }
            }
        );

        const res = response.data;

        // Cek status API (0 = sukses)
        if (res.code !== 0) return null;

        const data = res.data;

        // --- PERBAIKAN: FIX URL RELATIVE ---
        // Jika link diawali '/', tambahkan domain di depannya
        let videoUrl = data.play;
        if (videoUrl && !videoUrl.startsWith('http')) {
            videoUrl = `https://www.tikwm.com${videoUrl}`;
        }

        let audioUrl = data.music;
        if (audioUrl && !audioUrl.startsWith('http')) {
            audioUrl = `https://www.tikwm.com${audioUrl}`;
        }
        // ----------------------------------

        return {
            author: data.author.nickname,
            unique_id: data.author.unique_id,
            caption: data.title,
            views: data.play_count,
            likes: data.digg_count,
            video: videoUrl, // Sudah difix
            audio: audioUrl  // Sudah difix
        };

    } catch (e) {
        console.error("Error TikWM:", e.message);
        return null;
    }
}

// --- COMMAND HANDLER ---
export default {
    command: ['tiktok', 'tt', 'vt'],
    execute: async (sock, m, { q, sender }) => {
        if (!q) return sock.sendMessage(sender, { text: '❌ Masukkan Link TikTok!\nContoh: .tt https://vt.tiktok.com/xxxx' }, { quoted: m });

        await sock.sendMessage(sender, { text: '⏳ Sedang mengambil data...' }, { quoted: m });

        try {
            const data = await tiktokDl(q);

            if (!data) {
                return sock.sendMessage(sender, { text: '❌ Gagal. Pastikan link valid dan tidak diprivate.' }, { quoted: m });
            }

            // Format Caption
            let captionText = `🎵 *TIKTOK DOWNLOADER*\n`;
            captionText += `────────────────────\n`;
            captionText += `👤 *User:* ${data.author} (@${data.unique_id})\n`;
            captionText += `📝 *Desc:* ${data.caption}\n`;
            captionText += `👀 *Views:* ${data.views} | ❤️ *Likes:* ${data.likes}\n`;
            captionText += `────────────────────\n`;
            captionText += `Created by FarisBot`;

            // Kirim Video
            await sock.sendMessage(sender, { 
                video: { url: data.video }, 
                caption: captionText 
            }, { quoted: m });

        } catch (e) {
            console.error("Handler Error:", e);
            sock.sendMessage(sender, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: m });
        }
    }
};
