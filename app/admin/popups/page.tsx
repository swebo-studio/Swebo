"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ConfirmModal from "@/components/ConfirmModal";
import { PopupDialog } from "@/components/SitePopups";
import { POPUP_FREQUENCIES, popupStatus, type PopupFrequency, type PopupStatus } from "@/lib/popups";

interface Popup {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  image: string | null;
  active: boolean;
  frequency: PopupFrequency;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
  createdAt: string;
}

const STATUS: Record<PopupStatus, { label: string; color: string; bg: string }> = {
  live: { label: "מוצגת עכשיו", color: "var(--green)", bg: "#e8f5e9" },
  scheduled: { label: "מתוזמנת", color: "#b08c00", bg: "#fff8e1" },
  ended: { label: "הסתיימה", color: "#888", bg: "#f0f0f0" },
  off: { label: "כבויה", color: "#888", bg: "#f0f0f0" },
};

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  text: "",
  image: "",
  active: true,
  frequency: "visit" as PopupFrequency,
  startsAt: "",
  endsAt: "",
  showAgain: false,
};

/** ISO → the "YYYY-MM-DDTHH:mm" a datetime-local input takes, in this browser's time */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function scheduleLabel(p: Popup): string {
  if (!p.startsAt && !p.endsAt) return "ללא הגבלת זמן — עד כיבוי ידני";
  if (p.startsAt && p.endsAt) return `${fmt(p.startsAt)} – ${fmt(p.endsAt)}`;
  if (p.startsAt) return `מ-${fmt(p.startsAt)}, עד כיבוי ידני`;
  return `עד ${fmt(p.endsAt!)}`;
}

export default function AdminPopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ id: string; title: string; subtitle: string; text: string; image: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Popup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/admin/popups")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPopups(data); })
      .finally(() => setLoading(false));
    // Keeps the "מוצגת עכשיו / מתוזמנת" pills honest while the page stays open
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setFormOpen(true);
  }

  function openEdit(p: Popup) {
    setForm({
      title: p.title,
      subtitle: p.subtitle,
      text: p.text,
      image: p.image ?? "",
      active: p.active,
      frequency: p.frequency,
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
      showAgain: false,
    });
    setEditingId(p.id);
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  /** What the form would save */
  function payload() {
    return {
      title: form.title,
      subtitle: form.subtitle,
      text: form.text,
      image: form.image || null,
      active: form.active,
      frequency: form.frequency,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      showAgain: form.showAgain,
    };
  }

  function validate(): string {
    if (!form.title.trim() && !form.text.trim() && !form.image) return "יש להזין כותרת או טקסט, או להעלות תמונה";
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return "מועד הסיום חייב להיות אחרי מועד ההתחלה";
    return "";
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      setForm((f) => ({ ...f, image: data.url }));
    } catch {
      setError("העלאת התמונה נכשלה");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError("");
    const res = await fetch(editingId ? `/api/admin/popups/${editingId}` : "/api/admin/popups", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "השמירה נכשלה"); return; }
    setPopups((list) => editingId ? list.map((p) => (p.id === editingId ? data : p)) : [data, ...list]);
    closeForm();
  }

  async function toggle(p: Popup) {
    setPopups((list) => list.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    const res = await fetch(`/api/admin/popups/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (!res.ok) setPopups((list) => list.map((x) => (x.id === p.id ? { ...x, active: p.active } : x)));
  }

  async function remove(p: Popup) {
    setConfirmDelete(null);
    await fetch(`/api/admin/popups/${p.id}`, { method: "DELETE" });
    setPopups((list) => list.filter((x) => x.id !== p.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>הודעות קופצות</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          + הודעה חדשה
        </button>
      </div>
      <p className="text-sm text-right mb-6" style={{ color: "var(--text-muted)" }}>
        הודעות שמופיעות ללקוחות במרכז המסך כשהם נכנסים לאתר. כדי להמשיך לגלוש הלקוח חייב ללחוץ על ״קראתי ואני מאשר״.
        כשכמה הודעות פעילות יחד, הן מוצגות אחת אחרי השנייה.
      </p>

      {loading ? (
        <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>טוען…</p>
      ) : popups.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          עדיין אין הודעות. לחצו על ״הודעה חדשה״ כדי ליצור את הראשונה.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {popups.map((p) => {
            const status = STATUS[popupStatus({ active: p.active, startsAt: p.startsAt ? new Date(p.startsAt) : null, endsAt: p.endsAt ? new Date(p.endsAt) : null }, now)];
            return (
              <div key={p.id} className="rounded-2xl border p-4 flex gap-4 items-start" style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}>
                {p.image && (
                  <Image src={p.image} alt="" width={120} height={120} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold truncate" dir="auto" style={{ color: "var(--text)" }}>
                      {p.title || p.subtitle || (p.text ? p.text.split("\n")[0] : "הודעת תמונה")}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.bg }}>{status.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {POPUP_FREQUENCIES.find((f) => f.key === p.frequency)?.label} · {scheduleLabel(p)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.active}
                    aria-label={p.active ? "כבה הודעה" : "הפעל הודעה"}
                    onClick={() => toggle(p)}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{ background: p.active ? "var(--green)" : "var(--border)" }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                      style={{ right: 0, transform: p.active ? "translateX(-24px)" : "translateX(-4px)" }}
                    />
                  </button>
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => setPreview(p)} className="underline underline-offset-2 hover:opacity-70" style={{ color: "var(--text-muted)" }}>תצוגה</button>
                    <button onClick={() => openEdit(p)} className="underline underline-offset-2 hover:opacity-70" style={{ color: "var(--text)" }}>עריכה</button>
                    <button onClick={() => setConfirmDelete(p)} className="underline underline-offset-2 hover:opacity-70" style={{ color: "var(--maroon)" }}>מחיקה</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col" style={{ background: "var(--cream)", maxHeight: "calc(100dvh - 2rem)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-extrabold text-lg" style={{ color: "var(--text)" }}>{editingId ? "עריכת הודעה" : "הודעה חדשה"}</h2>
              <button onClick={closeForm} aria-label="סגור" className="text-xl opacity-60 hover:opacity-100">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5 text-right">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>כותרת</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={120}
                  placeholder="לדוגמה: הוראות כביסה"
                  className="px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>תת כותרת</span>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  maxLength={200}
                  placeholder="לדוגמה: נא לקרוא את הוראות הכביסה לפני המשך הקנייה"
                  className="px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
                  style={inputStyle}
                />
              </label>

              <div>
                <p className="text-sm font-bold mb-2" style={{ color: "var(--text)" }}>תמונה</p>
                {form.image && (
                  <div className="relative w-40 mb-2 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                    <Image src={form.image} alt="תמונת ההודעה" width={300} height={400} className="w-full h-auto" />
                  </div>
                )}
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                  e.target.value = "";
                }} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 rounded-xl border text-sm disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    {uploading ? "מעלה..." : form.image ? "החלף תמונה" : "+ העלה תמונה"}
                  </button>
                  {form.image && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: "var(--maroon)", color: "var(--maroon)" }}>
                      הסר תמונה
                    </button>
                  )}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>טקסט נוסף <span className="font-normal opacity-60">(לא חובה — מוצג מתחת לתמונה)</span></span>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  rows={4}
                  maxLength={5000}
                  className="px-4 py-2.5 rounded-xl border text-right outline-none text-sm resize-y"
                  style={inputStyle}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>להודעה בלי תמונה. ירידות שורה נשמרות, וטקסט ארוך נגלל בתוך החלונית.</span>
              </label>

              {/* Frequency */}
              <fieldset>
                <legend className="text-sm font-bold mb-2 w-full text-right" style={{ color: "var(--text)" }}>תדירות הצגה</legend>
                <div className="flex flex-col gap-2 items-start">
                  {POPUP_FREQUENCIES.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
                      <input type="radio" name="frequency" checked={form.frequency === f.key} onChange={() => setForm((x) => ({ ...x, frequency: f.key }))} />
                      {f.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Schedule */}
              <fieldset>
                <legend className="text-sm font-bold mb-1 w-full text-right" style={{ color: "var(--text)" }}>תזמון</legend>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>השאירו ריק כדי שההודעה תוצג מיד ועד שתכבו אותה ידנית.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([["startsAt", "התחלה"], ["endsAt", "סיום"]] as const).map(([key, label]) => (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
                      <div className="flex gap-2">
                        <input
                          type="datetime-local"
                          value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="flex-1 min-w-0 px-3 py-2 rounded-xl border outline-none text-sm"
                          style={inputStyle}
                        />
                        {form[key] && (
                          <button type="button" onClick={() => setForm((f) => ({ ...f, [key]: "" }))} aria-label={`נקה ${label}`} className="px-2 text-sm opacity-60 hover:opacity-100">✕</button>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                הודעה פעילה
              </label>

              {editingId && (
                <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
                  <input type="checkbox" className="mt-1" checked={form.showAgain} onChange={(e) => setForm((f) => ({ ...f, showAgain: e.target.checked }))} />
                  <span className="text-right">
                    הצג שוב לכל הלקוחות
                    <span className="block text-xs" style={{ color: "var(--text-muted)" }}>גם ללקוחות שכבר אישרו את ההודעה. בלי הסימון, שינוי ההודעה לא יוצג למי שכבר אישר אותה.</span>
                  </span>
                </label>
              )}

              {error && <p role="alert" className="text-sm" style={{ color: "var(--maroon)" }}>{error}</p>}
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => {
                  const problem = validate();
                  if (problem) { setError(problem); return; }
                  const d = payload();
                  setPreview({ id: "preview", title: d.title, subtitle: d.subtitle, text: d.text, image: d.image });
                }}
                className="px-4 py-3 rounded-xl border font-bold text-sm"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                תצוגה מקדימה
              </button>
              <button
                onClick={save}
                disabled={saving || uploading}
                className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ background: "var(--text)", color: "var(--cream)" }}
              >
                {saving ? "שומר..." : "שמור הודעה"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && <PopupDialog popup={preview} onConfirm={() => setPreview(null)} />}

      {confirmDelete && (
        <ConfirmModal
          message="למחוק את ההודעה? לא ניתן לשחזר אותה."
          confirmLabel="מחיקה"
          onConfirm={() => remove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
