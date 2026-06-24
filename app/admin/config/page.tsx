"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import ConfirmModal from "@/components/ConfirmModal";

interface SizeRow { size: string; chest: number; waist: number; length: number }
interface Category { id: string; nameHe: string; sortOrder: number }
interface AdminPhone { id: string; phone: string; label: string | null }

const DEFAULT_SIZES: SizeRow[] = [
  { size: "S",  chest: 96,  waist: 80,  length: 68 },
  { size: "M",  chest: 100, waist: 84,  length: 70 },
  { size: "L",  chest: 108, waist: 92,  length: 72 },
  { size: "XL", chest: 116, waist: 100, length: 74 },
];

export default function AdminConfigPage() {
  const [hero, setHero] = useState({ slogan: "", catalogName: "", imagePath: "", videoPath: "" });
  const [contact, setContact] = useState({ whatsapp: "", instagram: "", tiktok: "", email: "" });
  const [sizes, setSizes] = useState<SizeRow[]>(DEFAULT_SIZES);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [announcementItems, setAnnouncementItems] = useState<{ text: string; url: string }[]>([]);
  const [sizeGuideImages, setSizeGuideImages] = useState<string[]>([]);
  const [showSizeChart, setShowSizeChart] = useState(true);
  const [phones, setPhones] = useState<AdminPhone[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [legal, setLegal] = useState({ privacy: "", terms: "" });
  const [shippingInfo, setShippingInfo] = useState({ deliveryText: "₪40", paymentText: "HYP – מאובטח" });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<"image" | "video" | "sizeGuide" | null>(null);
  const heroImageRef = useRef<HTMLInputElement>(null);
  const heroVideoRef = useRef<HTMLInputElement>(null);
  const sizeGuideRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/config").then((r) => r.json()).then((cfg) => {
      setHero({
        slogan: cfg["hero.slogan"] || "",
        catalogName: cfg["hero.catalogName"] || "",
        imagePath: cfg["hero.imagePath"] || "",
        videoPath: cfg["hero.videoPath"] || "",
      });
      setContact({
        whatsapp: cfg["contact.whatsapp"] || "",
        instagram: cfg["contact.instagram"] || "",
        tiktok: cfg["contact.tiktok"] || "",
        email: cfg["contact.email"] || "",
      });
      if (cfg["sizeChart"]) {
        try { setSizes(JSON.parse(cfg["sizeChart"])); } catch {}
      }
      const raw: string = cfg["announcement.items"] || "";
      setAnnouncementItems(
        raw.split("\n").map(s => s.trim()).filter(Boolean).map(s => {
          const pipe = s.indexOf("|");
          return pipe === -1 ? { text: s, url: "" } : { text: s.slice(0, pipe).trim(), url: s.slice(pipe + 1).trim() };
        })
      );
      try {
        const paths = cfg["sizeGuide.imagePaths"] ? JSON.parse(cfg["sizeGuide.imagePaths"]) : null;
        if (Array.isArray(paths) && paths.length > 0) {
          setSizeGuideImages(paths);
        } else if (cfg["sizeGuide.imagePath"]) {
          setSizeGuideImages([cfg["sizeGuide.imagePath"]]);
        }
      } catch { if (cfg["sizeGuide.imagePath"]) setSizeGuideImages([cfg["sizeGuide.imagePath"]]); }
      setShowSizeChart(cfg["sizeChart.showTable"] !== "false");
      setLegal({ privacy: cfg["legal.privacy"] || "", terms: cfg["legal.terms"] || "" });
      setShippingInfo({
        deliveryText: cfg["shippingInfo.deliveryText"] || "₪40",
        paymentText: cfg["shippingInfo.paymentText"] || "HYP – מאובטח",
      });
    });
    fetchCategories();
    fetchPhones();
  }, []);

  function fetchCategories() {
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }

  function fetchPhones() {
    fetch("/api/admin/phones").then((r) => r.json()).then(setPhones).catch(() => {});
  }

  async function addPhone() {
    setPhoneError("");
    if (!newPhone.trim()) return;
    const res = await fetch("/api/admin/phones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: newPhone.trim(), label: newLabel.trim() || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPhoneError(data.error || "שגיאה בהוספת מספר");
      return;
    }
    setNewPhone("");
    setNewLabel("");
    fetchPhones();
  }

  async function deletePhone(id: string) {
    setConfirmState({ message: "להסיר את המספר הזה מרשימת המנהלים?", onConfirm: async () => {
      setConfirmState(null);
      await fetch("/api/admin/phones", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      fetchPhones();
    }});
  }

  async function uploadFile(file: File, type: "image" | "video" | "sizeGuide") {
    setUploading(type);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (type === "image") setHero((h) => ({ ...h, imagePath: data.url, videoPath: "" }));
    else if (type === "video") setHero((h) => ({ ...h, videoPath: data.url, imagePath: "" }));
    else setSizeGuideImages((prev) => [...prev, data.url]);
    setUploading(null);
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "hero.slogan": hero.slogan,
        "hero.catalogName": hero.catalogName,
        "hero.imagePath": hero.imagePath,
        "hero.videoPath": hero.videoPath,
        "sizeChart": JSON.stringify(sizes),
        "sizeChart.showTable": showSizeChart ? "true" : "false",
        "sizeGuide.imagePaths": JSON.stringify(sizeGuideImages),
        "sizeGuide.imagePath": sizeGuideImages[0] ?? "",
        "contact.whatsapp": contact.whatsapp,
        "contact.instagram": contact.instagram,
        "contact.tiktok": contact.tiktok,
        "contact.email": contact.email,
        "announcement.items": announcementItems
          .filter(i => i.text.trim())
          .map(i => i.url.trim() ? `${i.text}|${i.url}` : i.text)
          .join("\n"),
        "legal.privacy": legal.privacy,
        "legal.terms": legal.terms,
        "shippingInfo.deliveryText": shippingInfo.deliveryText,
        "shippingInfo.paymentText": shippingInfo.paymentText,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameHe: newCatName.trim(), sortOrder: categories.length }),
    });
    setNewCatName("");
    fetchCategories();
  }

  async function deleteCategory(id: string) {
    setConfirmState({ message: "למחוק קטגוריה זו? המוצרים שלה יישארו ללא קטגוריה.", onConfirm: async () => {
      setConfirmState(null);
      await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      fetchCategories();
    }});
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === categories.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = categories.map((c, i) => {
      if (i === idx) return { ...c, sortOrder: categories[swapIdx].sortOrder };
      if (i === swapIdx) return { ...c, sortOrder: categories[idx].sortOrder };
      return c;
    });
    setCategories([...updated].sort((a, b) => a.sortOrder - b.sortOrder));
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { id: updated[idx].id, sortOrder: updated[idx].sortOrder },
        { id: updated[swapIdx].id, sortOrder: updated[swapIdx].sortOrder },
      ]),
    });
  }

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <>
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-8 text-right" style={{ color: "var(--text)" }}>הגדרות אתר</h1>

      {/* ── Announcement bar ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setAnnouncementItems(prev => [...prev, { text: "", url: "" }])}
            className="text-sm px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-80"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            + הוסף הודעה
          </button>
          <h2 className="font-bold text-lg text-right" style={{ color: "var(--text)" }}>פס הודעות עליון</h2>
        </div>
        {announcementItems.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>אין הודעות — הפס יוסתר</p>
        )}
        <div className="flex flex-col gap-3">
          {announcementItems.map((item, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnnouncementItems(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-xs px-2 py-1 rounded-lg border flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}
                >
                  הסר
                </button>
                <input
                  type="text"
                  value={item.text}
                  onChange={e => setAnnouncementItems(prev => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                  placeholder="טקסט ההודעה"
                  className="flex-1 px-3 py-2 rounded-lg border text-right outline-none text-sm"
                  style={{ background: "var(--cream)", borderColor: "var(--border)", color: "var(--text)" }}
                  dir="rtl"
                />
              </div>
              <input
                type="text"
                value={item.url}
                onChange={e => setAnnouncementItems(prev => prev.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))}
                placeholder="קישור (אופציונלי) — /catalog או https://..."
                className="w-full px-3 py-2 rounded-lg border text-right outline-none text-sm"
                style={{ background: "var(--cream)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                dir="ltr"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Hero section ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-4 text-right" style={{ color: "var(--text)" }}>Hero – מסך פתיחה</h2>
        <div className="flex flex-col gap-3">
          {[
            { key: "slogan",      label: "סלוגן (שורה גדולה)" },
            { key: "catalogName", label: "שם קטלוג (שורה קטנה מעל הסלוגן)" },
          ].map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-sm text-right" style={{ color: "var(--text-muted)" }}>{f.label}</label>
              <input
                type="text"
                value={hero[f.key as keyof typeof hero]}
                onChange={(e) => setHero((h) => ({ ...h, [f.key]: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
                style={inputStyle}
              />
            </div>
          ))}

          {/* Media: image or video — mutually exclusive */}
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-sm text-right font-medium" style={{ color: "var(--text-muted)" }}>
              מדיה לרקע (תמונה או וידאו — אחד בלבד)
            </p>

            {/* Preview */}
            {hero.videoPath && (
              <video src={hero.videoPath} muted loop autoPlay playsInline className="w-full h-40 object-cover rounded-xl border" style={{ borderColor: "var(--border)" }} />
            )}
            {hero.imagePath && !hero.videoPath && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <Image src={hero.imagePath} alt="hero preview" fill className="object-cover" />
              </div>
            )}

            <div className="flex gap-2 flex-wrap justify-end">
              <input type="file" accept="image/*" ref={heroImageRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0], "image"); }} />
              <input type="file" accept="video/mp4,video/webm" ref={heroVideoRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0], "video"); }} />

              <button
                onClick={() => heroImageRef.current?.click()}
                disabled={uploading !== null}
                className="px-4 py-2 rounded-xl border text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {uploading === "image" ? "מעלה..." : "העלה תמונה"}
              </button>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => heroVideoRef.current?.click()}
                  disabled={uploading !== null}
                  className="px-4 py-2 rounded-xl border text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {uploading === "video" ? "מעלה..." : "העלה וידאו"}
                </button>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>MP4 בלבד (לא MOV)</span>
              </div>
              {(hero.imagePath || hero.videoPath) && (
                <button
                  onClick={() => setHero((h) => ({ ...h, imagePath: "", videoPath: "" }))}
                  className="px-4 py-2 rounded-xl border text-sm transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--maroon)", color: "var(--maroon)" }}
                >
                  הסר
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-4 text-right" style={{ color: "var(--text)" }}>קטגוריות</h2>

        <div className="flex flex-col gap-2 mb-4">
          {categories.length === 0 && (
            <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>אין קטגוריות עדיין</p>
          )}
          {categories.map((cat, idx) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteCategory(cat.id)} className="text-xs hover:opacity-70" style={{ color: "var(--maroon)" }}>מחק</button>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveCategory(cat.id, "up")}
                    disabled={idx === 0}
                    className="text-xs leading-none px-1 hover:opacity-70 disabled:opacity-20"
                    style={{ color: "var(--text)" }}
                  ><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>
                  <button
                    onClick={() => moveCategory(cat.id, "down")}
                    disabled={idx === categories.length - 1}
                    className="text-xs leading-none px-1 hover:opacity-70 disabled:opacity-20"
                    style={{ color: "var(--text)" }}
                  ><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
                </div>
              </div>
              <span className="font-medium text-right" style={{ color: "var(--text)" }}>{cat.nameHe}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={addCategory}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            הוסף
          </button>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
            placeholder="שם קטגוריה חדשה..."
            className="flex-1 px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
            style={inputStyle}
          />
        </div>
      </section>

      {/* ── Contact links ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-4 text-right" style={{ color: "var(--text)" }}>קישורי צור קשר</h2>
        <div className="flex flex-col gap-3">
          {[
            { key: "whatsapp",  label: "מספר WhatsApp",        placeholder: "972501234567",                 hint: "ספרות בלבד, כולל קידומת מדינה (ללא +)" },
            { key: "instagram", label: "קישור Instagram",       placeholder: "https://instagram.com/...",    hint: "" },
            { key: "tiktok",    label: "קישור TikTok",          placeholder: "https://tiktok.com/@...",      hint: "" },
            { key: "email",     label: "כתובת אימייל",          placeholder: "contact@example.com",         hint: "" },
          ].map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                {f.label}
                {f.hint && <span className="text-xs mr-2 opacity-60">{f.hint}</span>}
              </label>
              <input
                type="text"
                value={contact[f.key as keyof typeof contact]}
                onChange={(e) => setContact((c) => ({ ...c, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 text-right" style={{ color: "var(--text-muted)" }}>
          השאר ריק כדי להסתיר כפתור מסוים
        </p>
      </section>

      {/* ── Size guide images ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-1 text-right" style={{ color: "var(--text)" }}>תמונות מדריך מידות</h2>
        <p className="text-xs text-right mb-4" style={{ color: "var(--text-muted)" }}>
          ניתן להוסיף מספר תמונות — יוצגו בחלון מדריך המידות עם אפשרות ניווט ביניהן
        </p>

        {sizeGuideImages.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {sizeGuideImages.map((url, i) => (
              <div key={i} className="relative w-28 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "#fff" }}>
                <Image src={url} alt={`מדריך מידות ${i + 1}`} width={200} height={300} className="w-full h-auto" />
                <button
                  onClick={() => setSizeGuideImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--maroon)", color: "#fff" }}
                  title="הסר תמונה"
                >
                  ✕
                </button>
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                    {i + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <input type="file" accept="image/*" ref={sizeGuideRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0], "sizeGuide"); }} />

        <div className="flex gap-2 justify-end">
          {sizeGuideImages.length > 0 && (
            <button
              onClick={() => setSizeGuideImages([])}
              className="px-4 py-2 rounded-xl border text-sm transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--maroon)", color: "var(--maroon)" }}
            >
              נקה הכל
            </button>
          )}
          <button
            onClick={() => sizeGuideRef.current?.click()}
            disabled={uploading !== null}
            className="px-4 py-2 rounded-xl border text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            {uploading === "sizeGuide" ? "מעלה..." : "+ הוסף תמונה"}
          </button>
        </div>
      </section>

      {/* ── Size chart ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: showSizeChart ? "var(--green)" : "var(--border)" }}
              onClick={() => setShowSizeChart(v => !v)}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                style={{ transform: showSizeChart ? "translateX(-24px)" : "translateX(-4px)" }}
              />
            </div>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {showSizeChart ? "מוצגת בעמוד המוצר" : "מוסתרת מעמוד המוצר"}
            </span>
          </label>
          <h2 className="font-bold text-lg text-right" style={{ color: "var(--text)" }}>טבלת מידות (ס&quot;מ)</h2>
        </div>
        <table className="w-full text-sm text-center">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="py-2">מידה</th>
              <th className="py-2">חזה</th>
              <th className="py-2">מותן</th>
              <th className="py-2">אורך</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((row, i) => (
              <tr key={row.size} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 font-bold" style={{ color: "var(--text)" }}>{row.size}</td>
                {(["chest", "waist", "length"] as const).map((col) => (
                  <td key={col} className="py-2">
                    <input
                      type="number"
                      value={sizes[i][col]}
                      onChange={(e) => setSizes((prev) => prev.map((r, j) => j === i ? { ...r, [col]: Number(e.target.value) } : r))}
                      className="w-16 px-2 py-1 rounded-lg border text-center outline-none text-sm"
                      style={inputStyle}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Shipping / payment info box (shown on product page) ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-1 text-right" style={{ color: "var(--text)" }}>תיבת משלוח ותשלום</h2>
        <p className="text-xs text-right mb-4" style={{ color: "var(--text-muted)" }}>
          הטקסט המוצג בתיבה מתחת לכפתורי הקנייה בעמוד המוצר
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>משלוח</label>
            <textarea
              value={shippingInfo.deliveryText}
              onChange={(e) => setShippingInfo((s) => ({ ...s, deliveryText: e.target.value }))}
              placeholder="₪40"
              rows={2}
              className="px-4 py-3 rounded-xl border text-right outline-none resize-none"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>תשלום</label>
            <textarea
              value={shippingInfo.paymentText}
              onChange={(e) => setShippingInfo((s) => ({ ...s, paymentText: e.target.value }))}
              placeholder="HYP – מאובטח"
              rows={2}
              className="px-4 py-3 rounded-xl border text-right outline-none resize-none"
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      {/* ── Admin phone numbers ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-1 text-right" style={{ color: "var(--text)" }}>מספרי טלפון למנהלים</h2>
        <p className="text-xs text-right mb-4" style={{ color: "var(--text-muted)" }}>
          מספרים אלו יכולים להתחבר לניהול האתר באמצעות קוד חד-פעמי שיישלח ב-SMS
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {phones.length === 0 && (
            <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>אין מספרים נוספים עדיין</p>
          )}
          {phones.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => deletePhone(p.id)} className="text-xs hover:opacity-70" style={{ color: "var(--maroon)" }}>מחק</button>
              <span className="font-medium text-right" style={{ color: "var(--text)" }}>
                {p.phone}{p.label ? ` — ${p.label}` : ""}
              </span>
            </div>
          ))}
        </div>

        {phoneError && (
          <p className="text-sm text-right mb-2" style={{ color: "var(--maroon)" }}>{phoneError}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={addPhone}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            הוסף
          </button>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            className="w-32 px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
            style={inputStyle}
          />
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addPhone(); }}
            placeholder="מספר טלפון חדש..."
            className="flex-1 px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
            style={inputStyle}
          />
        </div>
      </section>

      {/* ── Legal pages ── */}
      <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg mb-4 text-right" style={{ color: "var(--text)" }}>דפים משפטיים</h2>
        <p className="text-xs text-right mb-4" style={{ color: "var(--text-muted)" }}>
          השאר ריק להצגת תוכן ברירת המחדל. שמור כדי לעדכן את הדפים.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>
              מדיניות פרטיות — <a href="/privacy" target="_blank" className="underline hover:opacity-70">/privacy</a>
            </label>
            <textarea
              value={legal.privacy}
              onChange={(e) => setLegal((l) => ({ ...l, privacy: e.target.value }))}
              placeholder="השאר ריק להצגת תוכן ברירת המחדל..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm resize-y"
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>
              תנאי שימוש — <a href="/terms" target="_blank" className="underline hover:opacity-70">/terms</a>
            </label>
            <textarea
              value={legal.terms}
              onChange={(e) => setLegal((l) => ({ ...l, terms: e.target.value }))}
              placeholder="השאר ריק להצגת תוכן ברירת המחדל..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm resize-y"
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-50"
        style={{ background: saved ? "var(--green)" : "var(--text)", color: "var(--cream)" }}
      >
        {saved ? "נשמר!" : saving ? "שומר..." : "שמור הגדרות"}
      </button>
    </div>
    {confirmState && (
      <ConfirmModal
        message={confirmState.message}
        confirmLabel={confirmState.message.includes("מחק") ? "מחק" : "הסר"}
        danger
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    )}
    </>
  );
}
