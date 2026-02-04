import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { handler } from './handler.js';

async function startBot() {
    // 1. Ambil versi WA terbaru agar tidak ditolak server
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan WA v${version.join('.')}, isLatest: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState('session_auth');
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Kita handle manual pakai qrcode-terminal
        auth: state,
        // Browser ini biasanya lebih ampuh memancing QR keluar di VPS
        browser: ["FarisBot", "Safari", "3.0"], 
        generateHighQualityLinkPreview: true,
        // Konfigurasi Timeout agar tidak cepat putus
        connectTimeoutMs: 60000, 
        keepAliveIntervalMs: 10000, 
        emitOwnEvents: true,
        retryRequestDelayMs: 2000,
        syncFullHistory: false // Matikan history full biar enteng saat scan
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // --- PAKSA MUNCULKAN QR ---
        if (qr) {
            console.log('\n✅ SCAN QR CODE DI BAWAH INI SEGERA:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(`⚠️ Koneksi Terputus! Kode: ${reason}`);

            // 401: Logout -> Hapus Sesi
            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ Sesi Logout/Invalid. Silakan hapus folder session_auth.');
            } 
            // 408/515: Timeout/Restart -> Reconnect
            else if (reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut || reason === DisconnectReason.connectionLost) {
                console.log('🔄 Restarting...');
                startBot();
            } 
            // Lainnya -> Coba lagi
            else {
                console.log('🔄 Reconnecting...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot Terhubung ke WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
            await handler(sock, messages[0]);
        }
    });
}

startBot();
