# Masama

Buka langsung: **https://evelont6.github.io/masama/**

Split bill gratis, tanpa akun, API key, atau backend berbayar. Ambil foto struk atau isi manual, tambah teman, tentukan pembagian, lalu bagikan ringkasan.

## Scan gratis

Tesseract.js membaca foto langsung di browser. Foto tidak dikirim ke server. File OCR diunduh dari situs Masama saat pertama digunakan; proses berikutnya dapat memakai cache browser. File OCR tidak diunduh ketika pengguna hanya mengisi manual.

Setiap scan menampilkan pratinjau untuk diperiksa. OCR dapat salah membaca atau melewatkan baris, terutama foto buram dan format struk yang rumit. Bandingkan total tercetak, lalu gunakan **Pakai hasil & edit** untuk mengoreksi item, pajak, service, dan diskon sebelum membagi. Input manual selalu tersedia.

Tidak ada tagihan API atau biaya per scan. Hosting menggunakan GitHub Pages pada repository publik, mengikuti batas layanan GitHub. Kuota internet perangkat tetap mengikuti operator pengguna.

## Jalankan lokal

Node 22.12+:

```sh
npm ci
npm run dev
npm test
```

`predev` dan `prebuild` menyiapkan aset OCR dari paket npm. `public/ocr/` adalah hasil generate dan tidak perlu masuk Git. `npm test` memeriksa perhitungan, pemulihan draft, parser struk, manifest, dan worker offline.

## Deployment

Settings → Pages → Source: **GitHub Actions**. Workflow `.github/workflows/deploy.yml` menguji dan membangun aplikasi untuk `/masama/`, lalu deploy saat push ke `main`. Tidak ada secret yang perlu dipasang. Endpoint Gemini lama sudah dihapus.

## PWA

Lihat [panduan instalasi dan offline](MOBILE.md). Draft dan rekening hanya tersimpan di browser perangkat ini; belum ada sinkronisasi antarperangkat.

Referensi: [Tesseract.js](https://github.com/naptha/tesseract.js), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [batas hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
