import { config } from './config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = new Map();
const featurePath = path.join(__dirname, 'features');

if (fs.existsSync(featurePath)) {
    const featureFolders = fs.readdirSync(featurePath);
    for (const folder of featureFolders) {
        const folderPath = path.join(featurePath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of files) {
                const module = await import(`./features/${folder}/${file}`);
                if (module.default && module.default.command) {
                    module.default.command.forEach(cmd => commands.set(cmd, module.default));
                }
            }
        }
    }
}

export async function handler(sock, m) {
    try {
        if (!m.message) return;
        
        const msgType = Object.keys(m.message)[0];
        const body = m.message.conversation || m.message[msgType]?.caption || m.message[msgType]?.text || '';
        
        const isCmd = body.startsWith('.');
        const command = isCmd ? body.slice(1).split(' ')[0].toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        
        // --- LOGIKA PENGIRIM VS TUJUAN BALASAN ---
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        
        // 1. Siapa yang mengetik pesan? (Untuk cek Owner)
        const user = isGroup ? m.key.participant : m.key.remoteJid;
        
        // 2. Kemana bot harus membalas? (Grup atau Private)
        const chatId = m.key.remoteJid;
        
        // Cek Owner
        const userNum = user.split('@')[0];
        const ownerNum = config.ownerNumber.split('@')[0];
        const isOwner = userNum === ownerNum;
        // ------------------------------------------

        if (isCmd && commands.has(command)) {
            const feature = commands.get(command);
            
            if (feature.ownerOnly && !isOwner) {
                return sock.sendMessage(chatId, { text: '❌ Fitur ini khusus Owner!' }, { quoted: m });
            }

            console.log(`[CMD] ${command} dari ${userNum} di ${isGroup ? 'Grup' : 'Private'} (Owner: ${isOwner})`);
            
            // TRICK: Kita kirim 'chatId' sebagai 'sender' agar fitur (dl, sticker, dll) otomatis balas ke Grup
            // Kita kirim 'user' sebagai 'realSender' jika ada fitur yang butuh info personal
            await feature.execute(sock, m, { args, q, isOwner, sender: chatId, realSender: user });
        }
    } catch (e) {
        console.error("Error di Handler:", e);
    }
}
