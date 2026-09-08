import React, { useEffect, useState } from "react";
import { useLocale } from './Locale.jsx';

export default function MobileSupport() {
  const { t } = useLocale();
  const [online, setOnline] = useState(navigator.onLine);
  const [prompt, setPrompt] = useState(null);
  const [help, setHelp] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [installed, setInstalled] = useState(window.matchMedia("(display-mode: standalone)").matches || navigator.standalone);
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine);
    const install = (event) => { event.preventDefault(); setPrompt(event); };
    const done = () => { setInstalled(true); setPrompt(null); };
    const storage = () => setStorageError(true);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", done);
    window.addEventListener("masama-storage-error", storage);
    return () => {
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("masama-storage-error", storage);
    };
  }, []);
  async function install() {
    if (!prompt) { setHelp(!help); return; }
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setHelp(true); }
    finally { setPrompt(null); }
  }
  return <aside className="mb-5 text-sm space-y-2">
    {!online && <p role="status" className="rounded-xl bg-amber-100 p-3">{t("Sedang offline. Isi dan bagi tagihan tetap bisa. Scan bisa digunakan jika file OCR sudah tersimpan dari scan sebelumnya.")}</p>}
    {storageError && <p role="alert" className="rounded-xl bg-amber-100 p-3">{t("Draft tidak bisa disimpan di browser ini. Jangan tutup aplikasi sebelum menyalin ringkasan.")}</p>}
    {!installed && <button onClick={install} className="text-emerald-800 font-medium">{t("Pasang Masama")} <span aria-hidden="true">↗</span></button>}
    {help && !installed && <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-2">
      <p><strong>iPhone:</strong> {t("buka di Safari, pilih Bagikan → Tambah ke Layar Utama. Aktifkan Buka sebagai App jika tersedia.")}</p>
      <p><strong>Android:</strong> {t("buka menu Chrome → Instal aplikasi / Tambahkan ke layar utama.")}</p>
      <p>{t("Buka sekali dengan internet sebelum dipakai offline.")}</p>
      <p><strong>{t("Komputer:")}</strong> {t("Pilih ikon instal di bilah alamat Chrome atau Edge, lalu Instal.")}</p>
    </div>}
  </aside>;
}
