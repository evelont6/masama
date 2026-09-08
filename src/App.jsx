import { calculateBill, assignedPeople } from "./billing.js";
import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Plus,
  X,
  Trash2,
  Settings,
  Check,
  Copy,
  Share2,
  MessageCircle,
  Send,
  Mail,
  Smartphone,
  CreditCard,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useSavedState } from "./storage.js";
import MobileSupport from "./MobileSupport.jsx";
import ReceiptReview from "./ReceiptReview.jsx";
import { scanReceipt } from "./ocr.js";

const COLORS = {
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  border: "#E3E3E6",
  text: "#16171A",
  textSecondary: "#62636B",
  accent: "#0E7C5A",
  accentSoft: "#E4F3EE",
  danger: "#C0392B",
  dangerSoft: "#FDEDEC",
};

const AVATAR_COLORS = ["#0E7C5A", "#4C5FD5", "#C9862B", "#C15B6E", "#2A9D8F", "#5B6472"];

const STEPS = [
  { key: "items", label: "Struk" },
  { key: "people", label: "Orang" },
  { key: "assign", label: "Bagi" },
  { key: "summary", label: "Selesai" },
];

const STORAGE_KEY = "masama-payment-settings";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function initials(name) {
  const clean = (name || "?").trim();
  if (!clean) return "?";
  return clean
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatRp(n) {
  if (n == null || isNaN(n)) return "Rp0";
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

function Avatar({ name, color, size = 32 }) {
  return (
    <div
      style={{ width: size, height: size, background: color, color: "#fff" }}
      className="rounded-full flex items-center justify-center flex-shrink-0"
    >
      <span style={{ fontSize: Math.round(size * 0.4), fontWeight: 600 }}>{initials(name)}</span>
    </div>
  );
}

function ChargeRow({ label, mode, setMode, value, setValue }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: COLORS.textSecondary }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="flex rounded-full p-0.5" style={{ background: COLORS.bg }}>
          <button
            type="button"
            aria-pressed={mode === "percent"} onClick={() => setMode("percent")}
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={mode === "percent" ? { background: COLORS.accent, color: "#fff" } : { color: COLORS.textSecondary }}
          >
            %
          </button>
          <button
            type="button"
            aria-pressed={mode === "amount"} onClick={() => setMode("amount")}
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={mode === "amount" ? { background: COLORS.accent, color: "#fff" } : { color: COLORS.textSecondary }}
          >
            Rp
          </button>
        </div>
        <input
          type="number"
          aria-label={label + (mode === "percent" ? " persen" : " rupiah")}
          value={value || ""}
          onChange={(e) => setValue(Math.min(1000000000, Math.max(0, Number(e.target.value) || 0)))}
          placeholder="0"
          className="w-16 bg-transparent text-sm text-right outline-none tabular-nums"
        />
      </div>
    </div>
  );
}

function ShareButton({ icon: Icon, label, onClick, tone = "default" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="share-option flex flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center"
      style={{
        background: tone === "accent" ? COLORS.accentSoft : COLORS.bg,
        color: tone === "accent" ? COLORS.accent : COLORS.text,
        border: `1px solid ${tone === "accent" ? "#BCE4D5" : COLORS.border}`,
      }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: tone === "accent" ? COLORS.accent : COLORS.surface, color: tone === "accent" ? "#fff" : COLORS.accent }}>
        <Icon size={19} />
      </span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </button>
  );
}

export default function App() {
  const [step, setStep] = useSavedState("step", "items");

  const [items, setItems] = useSavedState("items", []);
  const [taxMode, setTaxMode] = useSavedState("taxMode", "percent");
  const [taxValue, setTaxValue] = useSavedState("taxValue", 0);
  const [serviceMode, setServiceMode] = useSavedState("serviceMode", "percent");
  const [serviceValue, setServiceValue] = useSavedState("serviceValue", 0);
  const [discountValue, setDiscountValue] = useSavedState("discountValue", 0);

  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const scanController = useRef(null);
  useEffect(() => () => scanController.current?.abort(), []);
  const [receiptError, setReceiptError] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [people, setPeople] = useSavedState("people", []);
  const [newPersonName, setNewPersonName] = useState("");

  const [assignments, setAssignments] = useSavedState("assignments", {});

  const [expandedPerson, setExpandedPerson] = useState(null);
  const [copyState, setCopyState] = useState("idle");
  const [shareOpen, setShareOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [yourName, setYourName] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [yourNameDraft, setYourNameDraft] = useState("");
  const [methodsDraft, setMethodsDraft] = useState([]);

  useEffect(() => {
    if (step !== "items" && items.length === 0) setStep("items");
    else if ((step === "assign" || step === "summary") && people.length === 0) setStep("people");
  }, [step, items.length, people.length, setStep]);

  useEffect(() => {
    if (!settingsOpen && !shareOpen) return;
    const previous = document.activeElement;
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;
    const controls = () => [...dialog.querySelectorAll('button:not(:disabled), input')];
    controls()[0]?.focus();
    const keydown = event => {
      if (event.key === "Escape") {
        if (shareOpen) setShareOpen(false);
        else setSettingsOpen(false);
      }
      if (event.key !== "Tab") return;
      const list = controls();
      const first = list[0], last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [settingsOpen, shareOpen]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setYourName(typeof parsed?.yourName === "string" ? parsed.yourName : "");
        setPaymentMethods(Array.isArray(parsed?.methods) ? parsed.methods.filter(m => m && typeof m.id === "string" && typeof m.label === "string" && typeof m.detail === "string") : []);
      }
    } catch (e) {
      // belum ada pengaturan tersimpan
    }
  }, []);

  function openSettings() {
    setYourNameDraft(yourName);
    setMethodsDraft(paymentMethods);
    setSettingsOpen(true);
  }

  function handleSaveSettings() {
    const cleanMethods = methodsDraft.filter(m => m.label.trim() && m.detail.trim()).map(m => ({ ...m, label: m.label.trim(), detail: m.detail.trim() }));
    setYourName(yourNameDraft.trim());
    setPaymentMethods(cleanMethods);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ yourName: yourNameDraft.trim(), methods: cleanMethods }));
    } catch (e) {
      window.dispatchEvent(new Event("masama-storage-error"));
    }
    setSettingsOpen(false);
  }

  function addMethodDraft() {
    setMethodsDraft((prev) => [...prev, { id: uid(), label: "", detail: "" }]);
  }
  function updateMethodDraft(id, patch) {
    setMethodsDraft((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeMethodDraft(id) {
    setMethodsDraft((prev) => prev.filter((m) => m.id !== id));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: uid(), name: "", price: 0 }]);
  }
  function updateItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function scanReceiptFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
      setReceiptError("Pilih foto JPG, PNG, atau WebP maksimal 20 MB."); return;
    }
    setLoadingReceipt(true);
    setReceiptError(null);
    setScanProgress("Menyiapkan foto...");
    const controller = new AbortController();
    scanController.current = controller;
    try {
      const parsed = await scanReceipt(file, setScanProgress, controller.signal);
      if (!controller.signal.aborted) setPendingReceipt(parsed);
    } catch (error) {
      if (!controller.signal.aborted) setReceiptError(navigator.onLine
        ? "Foto belum berhasil dibaca. Gunakan foto jelas berformat JPG/PNG/WebP atau isi manual."
        : "Pembaca struk belum siap offline. Sambungkan internet untuk scan pertama, atau isi manual.");
    } finally {
      scanController.current = null;
      setLoadingReceipt(false);
    }
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    void scanReceiptFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    void scanReceiptFile(e.dataTransfer.files?.[0]);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }

  function useScannedReceipt() {
    setItems(pendingReceipt.items.map(item => ({ ...item, id: uid() })));
    setAssignments({});
    setTaxMode("amount");
    setServiceMode("amount");
    setTaxValue(pendingReceipt.tax_amount || 0);
    setServiceValue(pendingReceipt.service_amount || 0);
    setDiscountValue(pendingReceipt.discount_amount || 0);
    setPendingReceipt(null);
  }

  function handleAddPerson() {
    const name = newPersonName.trim();
    if (!name || people.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    const color = AVATAR_COLORS[people.length % AVATAR_COLORS.length];
    setPeople((prev) => [...prev, { id: uid(), name, color }]);
    setNewPersonName("");
  }
  function removePerson(id) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setAssignments((prev) => {
      const next = {};
      Object.entries(prev).forEach(([itemId, ids]) => {
        const remaining = ids.filter((pid) => pid !== id);
        if (remaining.length) next[itemId] = remaining;
      });
      return next;
    });
  }

  function getAssigned(itemId) {
    return assignedPeople(itemId, assignments, people);
  }
  function toggleAssignment(itemId, personId) {
    setAssignments((prev) => {
      const current = assignedPeople(itemId, prev, people);
      if (current.includes(personId)) {
        if (current.length === 1) return prev;
        return { ...prev, [itemId]: current.filter((id) => id !== personId) };
      }
      return { ...prev, [itemId]: [...current, personId] };
    });
  }

  function handleReset() {
    if (!window.confirm("Mulai tagihan baru? Tagihan saat ini akan dihapus. Info pembayaran tetap tersimpan.")) return;
    setItems([]);
    setPeople([]);
    setAssignments({});
    setTaxMode("percent");
    setTaxValue(0);
    setServiceMode("percent");
    setServiceValue(0);
    setDiscountValue(0);
    setReceiptError(null);
    setPendingReceipt(null);
    setExpandedPerson(null);
    setStep("items");
  }

  const { computedSubtotal, taxAmount, serviceAmount, discount, grandTotal, perPerson } = calculateBill({ items, people, assignments, taxMode, taxValue, serviceMode, serviceValue, discountValue });

  function buildSummaryText() {
    const lines = ["Masama — Ringkasan tagihan", ""];

    perPerson.forEach((p) => {
      lines.push(`${p.name}: ${formatRp(p.amount)}`);
      p.breakdown.forEach((item) => {
        lines.push(`  • ${item.name}: ${formatRp(item.share)} (dari ${formatRp(item.totalPrice)}, dibagi ${item.splitCount} orang)`);
      });
      if (p.taxShare) lines.push(`  • Pajak: ${formatRp(p.taxShare)}`);
      if (p.serviceShare) lines.push(`  • Service: ${formatRp(p.serviceShare)}`);
      if (p.discountShare) lines.push(`  • Diskon: -${formatRp(p.discountShare)}`);
      lines.push("");
    });
    lines.push(`Total tagihan: ${formatRp(grandTotal)}`);
    if (paymentMethods.length > 0) {
      lines.push("", "Transfer ke:");
      paymentMethods.forEach((m) => {
        lines.push(`${m.label} ${m.detail}${yourName ? " a.n. " + yourName : ""}`);
      });
    }
    return lines.join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (e) {
      setCopyState("error");
    }
  }
  function openShareUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleNativeShare() {
    const text = buildSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ringkasan tagihan Masama", text });
      } catch (e) {
        if (e.name !== "AbortError") setCopyState("error");
      }
    } else {
      await handleCopy();
    }
  }

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        color: COLORS.text,
      }}
      className="app-page"
    >
      <div className="app-shell">
      <div className="app-content">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold tracking-tight">Masama</h1>
          <button
            type="button"
            onClick={openSettings}
            className="p-2 rounded-full"
            style={{ color: COLORS.textSecondary }}
            aria-label="Pengaturan"
          >
            <Settings size={20} />
          </button>
        </div>

        <MobileSupport />
        {step === "items" && <section className="mb-6 rounded-3xl bg-emerald-900 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Bagi tagihan, tetap nyaman</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Bareng-bareng.<br />Hitungnya gampang.</h2>
          <p className="mt-3 text-sm text-emerald-100">Isi tagihan, tambah teman, lalu bagikan hasilnya. Draft tersimpan otomatis di perangkat ini.</p>
        </section>}
        <div className="flex items-center gap-1.5 mb-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div className="h-1 rounded-full" style={{ background: i <= stepIdx ? COLORS.accent : COLORS.border }} />
            </div>
          ))}
        </div>
        <p className="text-sm font-medium mb-2" aria-live="polite">Langkah {stepIdx + 1} dari 4 · {STEPS[stepIdx].label}</p>
        <p className="text-sm mb-5" style={{ color: COLORS.textSecondary }}>{({ items: "Masukkan harga total setiap item, termasuk jumlah pesanannya.", people: "Tambahkan semua yang ikut, termasuk kamu.", assign: "Awalnya dibagi rata ke semua. Ketuk nama untuk mengubah siapa yang membayar tiap item.", summary: "Cek hasilnya, lalu salin atau bagikan ke teman." })[step]}</p>

        {step === "items" && (
          <div>
            {pendingReceipt && <ReceiptReview receipt={pendingReceipt} onUse={useScannedReceipt} onCancel={() => setPendingReceipt(null)} />}
            {receiptError && (
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: COLORS.dangerSoft }}>
                <AlertCircle size={16} style={{ color: COLORS.danger, marginTop: 2, flexShrink: 0 }} />
                <span className="text-sm" style={{ color: COLORS.danger }}>
                  {receiptError}
                </span>
              </div>
            )}

            {loadingReceipt && (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="animate-spin" size={24} style={{ color: COLORS.accent }} />
                <span role="status" aria-live="polite" className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {scanProgress}
                </span>
                <button className="text-sm text-emerald-800" onClick={() => scanController.current?.abort()}>Batalkan scan</button>
              </div>
            )}

            {!loadingReceipt && !pendingReceipt && items.length === 0 && (
              <div
                className={`upload-zone ${isDragging ? "is-dragging" : ""}`}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragging(true); }}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                  className="upload-zone-action w-full flex flex-col items-center justify-center gap-2 py-10 rounded-2xl"
                  style={{ border: `1.5px dashed ${isDragging ? COLORS.accent : COLORS.border}`, background: COLORS.surface }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: COLORS.accentSoft, color: COLORS.accent }}
                  >
                    <Camera size={22} />
                  </div>
                  <span className="text-sm font-medium">Ambil foto struk</span>
                  <span className="text-xs" style={{ color: COLORS.textSecondary }}>
                    Gratis, dibaca di perangkat. Foto tidak dikirim ke server.
                  </span>
                </button>
                <p className="upload-hint text-center text-xs" style={{ color: isDragging ? COLORS.accent : COLORS.textSecondary }}>
                  {isDragging ? "Lepaskan foto struk di sini" : "Di komputer, tarik foto ke kotak ini atau pilih file"}
                </p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                    className="text-sm font-medium py-2"
                    style={{ color: COLORS.accent }}
                  >
                    Pilih dari galeri / file
                  </button>
                  <span style={{ color: COLORS.border }}>|</span>
                  <button
                    type="button"
                    onClick={() => setItems([{ id: uid(), name: "", price: 0 }])}
                    className="text-sm font-medium py-2 px-5 rounded-full"
                    style={{ background: COLORS.accent, color: "#fff" }}
                  >
                    Isi manual
                  </button>
                </div>
              </div>
            )}

            {!loadingReceipt && !pendingReceipt && items.length > 0 && (
              <div>
                <div className="rounded-xl overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                  <div className="px-3.5">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-2 py-2.5"
                        style={{ borderBottom: `1px solid ${COLORS.border}` }}
                      >
                        <input
                          value={it.name}
                          onChange={(e) => updateItem(it.id, { name: e.target.value })}
                          aria-label="Nama item"
                          maxLength={120}
                          placeholder="Nama item"
                          className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-sm" style={{ color: COLORS.textSecondary }}>
                            Rp
                          </span>
                          <input
                            type="number"
                            aria-label={"Harga " + (it.name || "item")}
                            min="0"
                            max="1000000000"
                            value={it.price || ""}
                            onChange={(e) => updateItem(it.id, { price: Math.min(1000000000, Math.max(0, Number(e.target.value) || 0)) })}
                            placeholder="0"
                            className="w-20 bg-transparent text-sm text-right outline-none tabular-nums"
                          />
                        </div>
                        <button
                          type="button"
                          aria-label={"Hapus " + (it.name || "item")}
                          onClick={() => removeItem(it.id)}
                          className="p-1 flex-shrink-0"
                          style={{ color: COLORS.textSecondary }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium mt-2 mb-5"
                  style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.accent }}
                >
                  <Plus size={15} /> Tambah item
                </button>

                <div className="rounded-xl p-3.5 space-y-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                  <ChargeRow label="Pajak" mode={taxMode} setMode={setTaxMode} value={taxValue} setValue={setTaxValue} />
                  <ChargeRow
                    label="Service"
                    mode={serviceMode}
                    setMode={setServiceMode}
                    value={serviceValue}
                    setValue={setServiceValue}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: COLORS.textSecondary }}>
                      Diskon
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: COLORS.textSecondary }}>
                        Rp
                      </span>
                      <input
                        type="number"
                        aria-label="Diskon rupiah"
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Math.min(1000000000, Math.max(0, Number(e.target.value) || 0)))}
                        placeholder="0"
                        className="w-20 bg-transparent text-sm text-right outline-none tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <div className="flex justify-between text-sm mb-1" style={{ color: COLORS.textSecondary }}>
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatRp(computedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatRp(grandTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("people")}
                  disabled={computedSubtotal <= 0 || items.some(it => !it.name.trim())}
                  className="w-full py-3.5 rounded-full font-medium text-sm mt-5"
                  style={{
                    background: computedSubtotal <= 0 ? COLORS.border : COLORS.accent,
                    color: computedSubtotal <= 0 ? COLORS.textSecondary : "#fff",
                  }}
                >
                  Lanjut: tambah teman
                </button>
              </div>
            )}
          </div>
        )}

        {step === "people" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPerson();
                }}
                aria-label="Nama teman"
                maxLength={60}
                placeholder="Nama teman"
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              />
              <button
                type="button"
                aria-label="Tambah teman"
                disabled={!newPersonName.trim() || people.some(p => p.name.toLocaleLowerCase() === newPersonName.trim().toLocaleLowerCase())}
                onClick={handleAddPerson}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: COLORS.accent, color: "#fff" }}
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {people.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                >
                  <Avatar name={p.name} color={p.color} size={36} />
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <button type="button" aria-label={"Hapus " + p.name} onClick={() => removePerson(p.id)} style={{ color: COLORS.textSecondary }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
              {people.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: COLORS.textSecondary }}>
                  Belum ada orang, tambahin dulu yuk
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("items")}
                className="flex-1 py-3.5 rounded-full font-medium text-sm"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep("assign")}
                disabled={people.length < 1}
                className="flex-1 py-3.5 rounded-full font-medium text-sm"
                style={{
                  background: people.length < 1 ? COLORS.border : COLORS.accent,
                  color: people.length < 1 ? COLORS.textSecondary : "#fff",
                }}
              >
                Lanjut: bagi item
              </button>
            </div>
          </div>
        )}

        {step === "assign" && (
          <div>
            <div className="space-y-3 mb-5">
              {items.map((it) => {
                const assigned = getAssigned(it.id);
                return (
                  <div
                    key={it.id}
                    className="p-3.5 rounded-xl"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="flex justify-between items-baseline mb-2.5">
                      <span className="text-sm font-medium">{it.name || "Item"}</span>
                      <span className="text-sm tabular-nums" style={{ color: COLORS.textSecondary }}>
                        {formatRp(it.price)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {people.map((p) => {
                        const on = assigned.includes(p.id);
                        return (
                          <button
                            type="button"
                            key={p.id}
                            aria-pressed={on}
                            onClick={() => toggleAssignment(it.id, p.id)}
                            className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-medium"
                            style={
                              on
                                ? { background: COLORS.accentSoft, border: `1px solid ${COLORS.accent}`, color: COLORS.accent }
                                : { background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }
                            }
                          >
                            <Avatar name={p.name} color={p.color} size={18} />
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("people")}
                className="flex-1 py-3.5 rounded-full font-medium text-sm"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep("summary")}
                className="flex-1 py-3.5 rounded-full font-medium text-sm"
                style={{ background: COLORS.accent, color: "#fff" }}
              >
                Lihat Ringkasan
              </button>
            </div>
          </div>
        )}

        {step === "summary" && (
          <div>
            <div className="text-center mb-6 py-2">
              <p className="text-sm mb-1" style={{ color: COLORS.textSecondary }}>
                Total tagihan
              </p>
              <p className="text-3xl font-semibold tabular-nums">{formatRp(grandTotal)}</p>
            </div>

            <div className="space-y-2 mb-5">
              {perPerson.map((p) => {
                const expanded = expandedPerson === p.id;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl overflow-hidden"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedPerson(expanded ? null : p.id)}
                      className="w-full flex items-center gap-3 p-3.5"
                    >
                      <Avatar name={p.name} color={p.color} size={34} />
                      <span className="flex-1 text-sm font-medium text-left">{p.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatRp(p.amount)}</span>
                      {expanded ? (
                        <ChevronUp size={16} style={{ color: COLORS.textSecondary }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: COLORS.textSecondary }} />
                      )}
                    </button>
                    {expanded && (
                      <div className="person-breakdown px-3.5 pb-4">
                        <div className="flex items-center justify-between mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textSecondary }}>
                          <span>Rincian harga</span>
                          <span>Bagian {p.name}</span>
                        </div>
                        <div className="space-y-2">
                          {p.breakdown.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                                  {formatRp(item.totalPrice)} dibagi {item.splitCount} orang
                                </p>
                              </div>
                              <span className="shrink-0 font-medium tabular-nums">{formatRp(item.share)}</span>
                            </div>
                          ))}
                          {p.taxShare > 0 && (
                            <div className="flex justify-between gap-3 text-sm" style={{ color: COLORS.textSecondary }}>
                              <span>Pajak</span><span className="tabular-nums">{formatRp(p.taxShare)}</span>
                            </div>
                          )}
                          {p.serviceShare > 0 && (
                            <div className="flex justify-between gap-3 text-sm" style={{ color: COLORS.textSecondary }}>
                              <span>Service</span><span className="tabular-nums">{formatRp(p.serviceShare)}</span>
                            </div>
                          )}
                          {p.discountShare > 0 && (
                            <div className="flex justify-between gap-3 text-sm" style={{ color: COLORS.danger }}>
                              <span>Diskon</span><span className="tabular-nums">-{formatRp(p.discountShare)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between gap-3 mt-3 pt-2 text-sm font-semibold" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                          <span>Total {p.name}</span><span className="tabular-nums">{formatRp(p.amount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl p-4 mb-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} style={{ color: COLORS.accent }} />
                <span className="text-sm font-medium">Info pembayaran</span>
              </div>
              {paymentMethods.length > 0 ? (
                <div className="space-y-2">
                  {paymentMethods.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm">
                      <span style={{ color: COLORS.textSecondary }}>{m.label}</span>
                      <span className="font-medium tabular-nums">{m.detail}</span>
                    </div>
                  ))}
                  {yourName && (
                    <div className="flex justify-between text-xs mt-1" style={{ color: COLORS.textSecondary }}>
                      <span>Atas nama</span>
                      <span>{yourName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={openSettings} className="text-xs text-left" style={{ color: COLORS.accent }}>
                  Tambahin rekening/e-wallet kamu di pengaturan biar otomatis muncul di sini
                </button>
              )}
            </div>

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-3.5 rounded-full font-medium text-sm flex items-center justify-center gap-1.5"
                style={{ border: `1px solid ${COLORS.border}` }}
              >
                {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
                {copyState === "copied" ? "Tersalin" : copyState === "error" ? "Gagal, coba salin lagi" : "Salin"}
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex-1 py-3.5 rounded-full font-medium text-sm flex items-center justify-center gap-1.5"
                style={{ background: COLORS.accent, color: "#fff" }}
              >
                <Share2 size={16} /> Bagikan
              </button>
            </div>
            <button type="button" onClick={() => setStep("assign")} className="w-full text-sm py-2 text-emerald-800">Ubah pembagian</button>
            <button type="button" onClick={handleReset} className="w-full text-center text-sm py-2" style={{ color: COLORS.textSecondary }}>
              Mulai split baru
            </button>
          </div>
        )}
      </div>

        {settingsOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center z-50"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Pengaturan pembayaran"
            className="w-full max-w-md rounded-t-3xl p-5 overflow-y-auto"
            style={{ background: COLORS.surface, maxHeight: "85vh" }}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold">Pengaturan</h2>
              <button aria-label="Tutup pengaturan" type="button" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.textSecondary }}>
              Nama kamu
            </label>
            <input
              value={yourNameDraft}
              onChange={(e) => setYourNameDraft(e.target.value)}
              aria-label="Nama pemilik rekening" placeholder="Nama kamu"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-5"
              style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}
            />

            <label className="text-xs font-medium block mb-2" style={{ color: COLORS.textSecondary }}>
              Metode pembayaran
            </label>
            <div className="space-y-2 mb-3">
              {methodsDraft.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: COLORS.bg }}>
                  <input
                    value={m.label}
                    onChange={(e) => updateMethodDraft(m.id, { label: e.target.value })}
                    aria-label="Bank atau e-wallet" placeholder="BCA / GoPay"
                    className="w-24 bg-transparent text-sm outline-none flex-shrink-0"
                  />
                  <input
                    value={m.detail}
                    onChange={(e) => updateMethodDraft(m.id, { detail: e.target.value })}
                    aria-label="Nomor rekening atau e-wallet" placeholder="Nomor / detail"
                    className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                  />
                  <button type="button" aria-label="Hapus metode pembayaran" onClick={() => removeMethodDraft(m.id)} style={{ color: COLORS.textSecondary }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMethodDraft}
              className="flex items-center gap-1.5 text-sm font-medium mb-6"
              style={{ color: COLORS.accent }}
            >
              <Plus size={16} /> Tambah metode
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="w-full py-3.5 rounded-full font-medium text-sm"
              style={{ background: COLORS.accent, color: "#fff" }}
            >
              Simpan
            </button>
          </div>
        </div>
      )}
      {shareOpen && (
        <div
          className="share-overlay fixed inset-0 flex items-end justify-center z-50"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setShareOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Bagikan ringkasan tagihan"
            className="share-sheet w-full max-w-2xl rounded-t-3xl p-5 overflow-y-auto"
            style={{ background: COLORS.surface, maxHeight: "92vh" }}
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-lg font-semibold">Bagikan tagihan</h2>
                <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>Pilih aplikasi atau salin pesan lengkapnya.</p>
              </div>
              <button aria-label="Tutup bagikan" type="button" onClick={() => setShareOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <pre className="share-preview whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-relaxed" aria-label="Pratinjau pesan yang dibagikan">{buildSummaryText()}</pre>

            <div className="share-grid grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
              <ShareButton icon={MessageCircle} label="WhatsApp" onClick={() => openShareUrl(`https://wa.me/?text=${encodeURIComponent(buildSummaryText())}`)} tone="accent" />
              <ShareButton icon={Send} label="Telegram" onClick={() => openShareUrl(`https://t.me/share/url?url=&text=${encodeURIComponent(buildSummaryText())}`)} />
              <ShareButton icon={Mail} label="Email" onClick={() => openShareUrl(`mailto:?subject=${encodeURIComponent("Ringkasan tagihan Masama")}&body=${encodeURIComponent(buildSummaryText())}`)} />
              <ShareButton icon={Copy} label={copyState === "copied" ? "Tersalin" : "Salin pesan"} onClick={handleCopy} />
              <ShareButton icon={Smartphone} label="Aplikasi lainnya" onClick={handleNativeShare} />
            </div>
            <p className="text-center text-xs mt-3" style={{ color: COLORS.textSecondary }}>Aplikasi lainnya memakai share sheet bawaan perangkat jika tersedia.</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
