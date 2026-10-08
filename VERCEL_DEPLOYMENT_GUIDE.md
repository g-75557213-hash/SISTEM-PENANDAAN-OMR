# Panduan Pelancaran Awam ke Vercel (Vercel Deployment Guide)

Sistem **Penanda OMR Pintar AI** ini telah dikonfigurasi sepenuhnya untuk pelancaran percuma ke **Vercel** dengan sokongan *Vite SPA Frontend* dan *Vercel Serverless Function (`/api/grade-omr`)*.

---

## ⚡ Ringkasan Fail & Konfigurasi Yang Telah Disediakan:
1. `vercel.json` – Konfigurasi binaan automatik Vite (`dist`), haluan API (`/api/grade-omr`), dan routing SPA.
2. `api/grade-omr.ts` – Fungsi Serverless Vercel (Edge/Node.js) untuk memproses imej OMR, OCR nama murid, dan penilaian markah secara pantas.
3. `src/utils/imageOptimizer.ts` – Pemampatan imej automatik pada pelayar web (kamera telefon & muat naik fail) agar saiz muatan kekal di bawah had 4.5MB Vercel tanpa mengorbankan ketajaman imbasan.

---

## 🚀 Langkah-langkah Pelancaran ke Vercel (Mudah & Percuma):

### Langkah 1: Simpan Kod ke GitHub (atau GitLab / Bitbucket)
1. Buka [GitHub.com](https://github.com) dan cipta repositori baru (contoh: `penanda-omr-pintar`).
2. Muat naik atau push kod projek ini ke repositori tersebut:
   ```bash
   git init
   git add .
   git commit -m "Persediaan Vercel untuk Penanda OMR Pintar AI"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/penanda-omr-pintar.git
   git push -u origin main
   ```

### Langkah 2: Sambungkan ke Vercel
1. Layari [Vercel.com](https://vercel.com) dan log masuk menggunakan akaun GitHub anda.
2. Klik butang **"Add New..."** ➔ **"Project"**.
3. Pilih repositori `penanda-omr-pintar` yang baru anda cipta dan klik **"Import"**.

### Langkah 3: Tetapkan Environment Variables (Kunci API)
1. Di bahagian **Configure Project**:
   * **Framework Preset**: Vercel akan mengesan secara automatik sebagai **Vite**.
   * **Root Directory**: Biarkan `./` (default).
2. Kembangkan bahagian **"Environment Variables"**:
   * Nama (**Key**): `GEMINI_API_KEY`
   * Nilai (**Value**): Masukkan kunci API Google Gemini anda (Boleh didapati percuma dari [Google AI Studio](https://aistudio.google.com/app/apikey)).
3. Klik **"Add"**.

### Langkah 4: Klik Deploy!
1. Tekan butang **"Deploy"**.
2. Tunggu sekitar 1 minit untuk proses binaan selesai.
3. Anda akan menerima domain awam percuma seperti:
   👉 `https://penanda-omr-pintar.vercel.app`

---

## 📱 Petua untuk Guru & Pelajar:
* **Jadikan Aplikasi Mudah Alih (PWA / Web App)**:
  * Pada telefon pintar (Chrome/Safari), buka pautan Vercel anda.
  * Tekan menu pelayar ➔ **"Add to Home Screen"** (*Tambah ke Skrin Utama*).
  * Aplikasi kini boleh diakses seperti aplikasi Play Store / App Store pada bila-bila masa!
* **Akses Awam**: Pautan Vercel ini boleh diakses secara terbuka oleh sesiapa sahaja tanpa sekatan gerbang keselamatan dalaman.
