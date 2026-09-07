// Conservative text parsing: every result is reviewed before entering the bill.
export function parseMoney(token) {
  const value = token.replace(/\s|Rp|IDR/gi, '');
  if (/^\d+$/.test(value)) return Number(value);
  if (/^\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?$/.test(value)) {
    const decimal = /[.,]\d{2}$/.test(value);
    return Number(decimal ? value.slice(0, -3).replace(/[.,]/g, '') + '.' + value.slice(-2) : value.replace(/[.,]/g, ''));
  }
  if (/^\d+[.,]\d{2}$/.test(value)) return Number(value.replace(',', '.'));
  return null;
}

export function parseReceiptText(text) {
  const result = { items: [], tax_amount: null, service_amount: null, discount_amount: null, total: null, text };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, ' ');
    if (!line || /%\s*$/.test(line)) continue;
    const match = line.match(/^(.*?)\s+(?:Rp\.?\s*|IDR\s*)?(-?\d[\d.,]*)(?:\s*(?:Rp|IDR))?$/i);
    if (!match) continue;
    const label = match[1].replace(/\s*(?:Rp\.?|IDR)\s*$/i, '').trim();
    const price = parseMoney(match[2]);
    if (price == null || price < 0 || price > 1_000_000_000 || !/[a-z]/i.test(label)) continue;
    if (/^(?:sub\s*total|subtotal|jumlah item|total item|qty)\b/i.test(label)) continue;
    if (/^(?:grand\s*total|total(?:\s+(?:akhir|bayar|tagihan|belanja|due))?|jumlah(?:\s+bayar)?)\s*[:=]?$/i.test(label)) { result.total = price; continue; }
    if (/^(?:pajak|ppn|pb1|pbjt|tax)\b/i.test(label)) { result.tax_amount = (result.tax_amount || 0) + price; continue; }
    if (/^(?:service|servis|layanan)\b/i.test(label)) { result.service_amount = (result.service_amount || 0) + price; continue; }
    if (/^(?:diskon|discount|disc|potongan)\b/i.test(label)) { result.discount_amount = (result.discount_amount || 0) + price; continue; }
    if (/\b(?:tunai|cash|kembali|kembalian|change|debit|kredit|credit|qris|visa|mastercard|bayar|payment|paid|saldo|poin|point|telp|telepon|phone|npwp|kasir|cashier|tanggal|date|waktu|time|meja|table|invoice|receipt|no\.?\s*(?:struk|transaksi)|transaksi|order|pesanan|total)\b/i.test(label)) continue;
    // A unit-price column may precede the final line total. Keep quantity in the name.
    const name = label.replace(/\s+(?:@\s*)?\d[\d.,]*\s*$/, '').trim();
    result.items.push({ name: name || label, price });
  }
  result.items = result.items.slice(0, 200);
  return result;
}
