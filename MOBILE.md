# Masama PWA

Android: buka situs di Chrome, pilih **Pasang Masama di HP** atau menu Instal aplikasi.
iPhone: buka di Safari, pilih Bagikan → Tambah ke Layar Utama.

Buka sekali saat online dan tunggu aplikasi selesai dimuat sebelum offline. Tagihan manual, pembagian, ringkasan, dan draft lokal bisa dipakai offline. Scan AI memerlukan backend online.

Draft dan rekening tersimpan di browser perangkat ini. Menghapus data browser akan menghapusnya. Tombol **Mulai split baru** meminta konfirmasi; rekening tetap disimpan.

Pembaruan PWA aktif setelah semua jendela aplikasi lama ditutup lalu dibuka kembali. Worker hanya menyimpan aset aplikasi, bukan respons API atau informasi rekening.

Jalankan `npm test` untuk build dan tes perhitungan, pemulihan draft rusak, ikon, endpoint, serta navigasi offline. Instalasi fisik Android/iPhone dan scan Gemini sungguhan masih perlu diuji pada perangkat dan backend yang sudah dikonfigurasi.
