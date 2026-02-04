import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    command: ['setpp'],
    ownerOnly: true, 
    execute: async (sock, m, { sender }) => {
        const msgType = Object.keys(m.message)[0];
        if (msgType !== 'imageMessage') return sock.sendMessage(sender, { text: 'Kirim gambar dengan caption .setpp' });

        try {
            const stream = await downloadContentFromMessage(m.message[msgType], 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.updateProfilePicture(sock.user.id, buffer);
            sock.sendMessage(sender, { text: '✅ Foto profil bot berhasil diubah!' }, { quoted: m });
        } catch (e) {
            console.error(e);
            sock.sendMessage(sender, { text: '❌ Gagal mengganti foto profil.' });
        }
    }
};
