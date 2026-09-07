# Masama

Aplikasi split bill berbahasa Indonesia: masukkan item, tambah teman, tentukan siapa membayar, lalu bagikan ringkasan. Pajak, service, dan diskon dibagi proporsional; hasil pembulatan tetap sesuai total. Draft disimpan otomatis di perangkat.

## Jalankan lokal

Gunakan Node 22.12 atau lebih baru.

```sh
npm ci
npm run dev
npm test
```

## GitHub Pages

Workflow `.github/workflows/deploy.yml` menguji aplikasi lalu menerbitkan `dist` saat perubahan masuk ke `main`. Atur Settings → Pages → Source ke **GitHub Actions**. Alamat yang dituju: https://evelont6.github.io/masama/.

Build Pages memakai `VITE_BASE_PATH=/masama/` dan `VITE_STATIC_HOST=true`. Scan AI ditandai belum tersedia jika backend belum dikonfigurasi. Semua fitur split manual dan PWA tetap tersedia.

## Backend scan opsional

`api/parse-receipt.js` adalah fungsi Vercel. Impor repo ke Vercel lalu set secret server `GEMINI_API_KEY`. Frontend dan backend pada domain Vercel yang sama menggunakan `/api/parse-receipt`. Jangan menaruh API key dalam variabel `VITE_*` atau GitHub.

Untuk frontend Pages, set repository variable `VITE_RECEIPT_API_URL` ke endpoint HTTPS backend yang mengizinkan origin Pages melalui CORS. Workflow perlu dijalankan ulang setelah variabel berubah. Tanpa backend ini, gunakan input manual.

## PWA

Lihat [panduan instalasi](MOBILE.md). Manifest, ikon, dan service worker ikut dibangun. Offline tersedia setelah kunjungan online pertama. Pembaruan aktif setelah semua jendela versi lama ditutup.

Dokumentasi deployment: [Vite](https://vite.dev/guide/static-deploy), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
