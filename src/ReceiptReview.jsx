import React from 'react';
import { useLocale } from './Locale.jsx';
import { formatMoney, currencyDigits } from './currency.js';

export default function ReceiptReview({ receipt, onUse, onCancel, currency = 'IDR' }) {
  const { language, t } = useLocale();
  const rp = value => formatMoney(value, currency, language);
  const scale = 10 ** currencyDigits(currency);
  const sum = receipt.items.reduce((total, item) => total + item.price, 0) + (receipt.tax_amount || 0) + (receipt.service_amount || 0) - (receipt.discount_amount || 0);
  const mismatch = receipt.total != null && Math.round(sum * scale) !== Math.round(receipt.total * scale);
  return <section className="rounded-2xl bg-white border border-gray-200 p-4 mb-5" aria-label={t("Periksa hasil scan")}>
    <h2 className="text-lg font-semibold">{t("Periksa hasil scan")}</h2>
    <p className="text-sm text-gray-600 mt-2 mb-4">{t("Cocokkan dengan foto struk. OCR bisa salah membaca angka atau melewatkan item. Semua hasil bisa kamu edit setelah dipakai.")}</p>
    {receipt.items.length === 0 ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">{t("Belum ada item yang terbaca. Coba foto lebih jelas, atau isi manual.")}</p> : <ul className="divide-y divide-gray-100">
      {receipt.items.map((item, index) => <li key={index} className="flex justify-between gap-3 py-2 text-sm"><span>{item.name}</span><span className="shrink-0 tabular-nums">{rp(item.price)}</span></li>)}
    </ul>}
    {[[t("Pajak"),receipt.tax_amount],['Service',receipt.service_amount],[t("Diskon"),receipt.discount_amount],[t("Total tercetak"),receipt.total]].filter(([,value]) => value != null).map(([label,value]) => <p key={label} className="flex justify-between gap-3 text-sm py-1"><span>{label}</span><span>{rp(value)}</span></p>)}
    {mismatch && <p role="alert" className="mt-3 rounded-xl bg-amber-100 p-3 text-sm">{t("Jumlah terbaca")} {rp(sum)} {t("berbeda dari total struk")} {rp(receipt.total)}{t(". Periksa item dan biaya tambahan sebelum membagi tagihan.")}</p>}
    <details className="mt-3 text-sm"><summary className="cursor-pointer py-2 text-emerald-800">{t("Lihat teks yang terbaca")}</summary><pre className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 max-h-60 overflow-auto">{receipt.text || t("Tidak ada teks yang terbaca.")}</pre></details>
    <div className="flex gap-2 mt-4">
      <button onClick={onCancel} className="flex-1 rounded-full border border-gray-200 p-3 text-sm">{t("Foto ulang / manual")}</button>
      <button disabled={!receipt.items.length} onClick={onUse} className="flex-1 rounded-full bg-emerald-800 text-white p-3 text-sm">{t("Pakai hasil & edit")}</button>
    </div>
  </section>;
}
