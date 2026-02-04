import { exec } from 'child_process';

export default {
    command: ['neofetch', 'neo'],
    execute: async (sock, m, { sender }) => {
        exec('neofetch --stdout', (err, stdout) => {
            if (err) return sock.sendMessage(sender, { text: 'Gagal menjalankan neofetch' });
            sock.sendMessage(sender, { text: stdout }, { quoted: m });
        });
    }
};
