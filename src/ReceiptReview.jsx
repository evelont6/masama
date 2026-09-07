import React from 'react';

const rp = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
export default function ReceiptReview({ receipt, onUse, onCancel }) {
  const sum = receipt.items.reduce((total, item) => total + item.price, 0) + (receipt.tax_amount || 0) + (receipt.service_amount || 0) - (receipt.discount_amount || 0);
  const mismatch = receipt.total != null && Math.round(sum) !== Math.round(receipt.total);
  return <section className="rounded-2xl bg-white border border-gray-200 p-4 mb-5" aria-label="Periksa hasil scan">
    <h2 className="text-lg font-semibold">Periksa hasil scan</h2>
    <p className="text-sm text-gray-600 mt-2 mb-4">Cocokkan dengan foto struk. OCR bisa salah membaca angka atau melewatkan item. Semua hasil bisa kamu edit setelah dipakai.</p>
    {receipt.items.length === 0 ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">Belum ada item yang terbaca. Coba foto lebih jelas, atau isi manual.</p> : <ul className="divide-y divide-gray-100">
      {receipt.items.map((item, index) => <li key={index} className="flex justify-between gap-3 py-2 text-sm"><span>{item.name}</span><span className="shrink-0 tabular-nums">{rp(item.price)}</span></li>)}
    </ul>}
    {[['Pajak',receipt.tax_amount],['Service',receipt.service_amount],['Diskon',receipt.discount_amount],['Total tercetak',receipt.total]].filter(([,value]) => value != null).map(([label,value]) => <p key={label} className="flex justify-between gap-3 text-sm py-1"><span>{label}</span><span>{rp(value)}</span></p>)}
    {mismatch && <p role="alert" className="mt-3 rounded-xl bg-amber-100 p-3 text-sm">Jumlah terbaca {rp(sum)} berbeda dari total struk {rp(receipt.total)}. Periksa item dan biaya tambahan sebelum membagi tagihan.</p>}
    <details className="mt-3 text-sm"><summary className="cursor-pointer py-2 text-emerald-800">Lihat teks yang terbaca</summary><pre className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 max-h-60 overflow-auto">{receipt.text || 'Tidak ada teks yang terbaca.'}</pre></details>
    <div className="flex gap-2 mt-4">
      <button onClick={onCancel} className="flex-1 rounded-full border border-gray-200 p-3 text-sm">Foto ulang / manual</button>
      <button disabled={!receipt.items.length} onClick={onUse} className="flex-1 rounded-full bg-emerald-800 text-white p-3 text-sm">Pakai hasil &amp; edit</button>
    </div>
  </section>;
}
