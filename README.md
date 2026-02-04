# 🤖 Bot Acumalaka - WhatsApp Bot Multi Device

Bot WhatsApp sederhana namun canggih menggunakan library `@whiskeysockets/baileys`.
Dibuat untuk kebutuhan download media, sticker, dan manajemen grup.

## 🔥 Fitur Unggulan
- **Downloader:** YouTube (Video/MP3), Instagram (Reels/Post), Facebook, TikTok (No WM).
- **Sticker:** Convert Gambar/Video ke Sticker (Support Reply & Caption).
- **Anti-Lag:** Menggunakan logika download cerdas & User Agent Spoofing (Anti 429 Error).
- **Multi-Device:** Koneksi stabil menggunakan Pairing Code atau QR.

## 🛠️ Syarat Sistem (Requirements)
Sebelum install, pastikan VPS/PC sudah terinstall:
- Node.js (v18 atau v20+)
- FFmpeg (Wajib untuk sticker & konversi video)
- Python & YT-DLP (Wajib untuk downloader)

## 🚀 Cara Install

### 1. Clone Repository
```bash
git clone https://github.com/Farisxx7/Bot-Acumalaka-.git
cd Bot-Acumalaka-
```
### 2. Install Dependensi Sistem
Jalankan perintah ini di terminal (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg -y
sudo apt install python3-pip -y
sudo pip3 install -U yt-dlp --break-system-packages
```
### 3. Install Module Bot
```bash
npm install
```
### 4. Konfigurasi Owner
Edit file config.js untuk mengganti Nomor Owner:
```bash
nano config.js
```
### 5. Jalankan Bot
```bash
npm start
```
Scan QR Code yang muncul atau tunggu Pairing Code (jika diaktifkan).

⚙️ Menjalankan 24 Jam (PM2)
Agar bot tetap jalan walau terminal ditutup:
```bash
sudo npm install -g pm2
pm2 start index.js --name "Bot-Acumalaka"
pm2 save
pm2 startup
```
📝 Daftar Perintah (Menu)
Ketik .menu di WhatsApp untuk melihat semua fitur.
Created with ❤️ by Farisxx7
