export default {
    command: ['ping'],
    execute: async (sock, m, { sender }) => {
        const start = Date.now();
        await sock.sendMessage(sender, { text: 'Pong!' }, { quoted: m });
        const latensi = Date.now() - start;
        await sock.sendMessage(sender, { text: `Kecepatan respon: ${latensi}ms` });
    }
};
