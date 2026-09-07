// Vercel serverless function. Keeps the Gemini API key on the server —
// the browser never sees it. Uses Google's Gemini free tier (no credit
// card needed): https://aistudio.google.com/apikey

const GEMINI_MODEL = "gemini-2.5-flash";

const PROMPT = `Kamu membaca foto struk belanja atau restoran dari Indonesia. Baca semua item yang dibeli beserta harga totalnya (harga baris tersebut, sudah termasuk kuantitas kalau lebih dari 1 — kalau qty>1, sertakan keterangannya di nama item, misalnya "Es Teh Manis (x2)"). Baca juga subtotal, pajak (PPN/PB1), service charge, diskon, dan total akhir kalau tercantum. Balas HANYA dengan JSON valid, tanpa markdown fence, tanpa teks lain, persis struktur ini:
{"items":[{"name":"string","price":number}],"subtotal":number|null,"tax_percent":number|null,"tax_amount":number|null,"service_percent":number|null,"service_amount":number|null,"discount_amount":number|null,"total":number|null}
Semua nilai uang berupa angka polos tanpa "Rp" atau titik/koma ribuan. Isi null kalau informasinya tidak ada di struk.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY belum diset di server" });
    return;
  }

  const { image } = req.body || {};
  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "Gambar tidak ditemukan" });
    return;
  }
  if (image.length > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    res.status(400).json({ error: "Format gambar tidak valid atau terlalu besar." });
    return;
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: "image/jpeg", data: image } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      res.status(502).json({ error: "Gagal menghubungi AI. Coba lagi sebentar." });
      return;
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: "Respons AI kosong, coba foto ulang." });
      return;
    }

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed.items) || parsed.items.length === 0 || parsed.items.length > 200 ||
        parsed.items.some(item => !item || typeof item.name !== "string" || !Number.isFinite(item.price) || item.price < 0)) {
      res.status(502).json({ error: "Item struk tidak valid. Coba foto ulang atau isi manual." });
      return;
    }
    for (const field of ["subtotal", "tax_percent", "tax_amount", "service_percent", "service_amount", "discount_amount", "total"]) {
      if (parsed[field] != null && (!Number.isFinite(parsed[field]) || parsed[field] < 0)) {
        res.status(502).json({ error: "Angka struk tidak valid. Coba foto ulang atau isi manual." });
        return;
      }
    }
    res.status(200).json(parsed);
  } catch (err) {
    console.error("parse-receipt error:", err);
    res.status(500).json({ error: "Gagal memproses struk." });
  }
}
