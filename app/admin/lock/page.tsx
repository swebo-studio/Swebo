"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import ConfirmModal from "@/components/ConfirmModal";
import { EMPTY_SITE_LOCK, parseSiteLock, isLockActive, type SiteLock } from "@/lib/siteLock";

/** ISO (UTC) -> the "YYYY-MM-DDTHH:mm" local value a datetime-local input wants. */
function toLocalInput(iso: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  if (!value) return "";
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? "" : new Date(ms).toISOString();
}

export default function AdminLockPage() {
  const [lock, setLock] = useState<SiteLock>(EMPTY_SITE_LOCK);
  const [reopenLocal, setReopenLocal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((cfg: Record<string, string>) => {
        const parsed = parseSiteLock(cfg);
        setLock(parsed);
        setReopenLocal(toLocalInput(parsed.reopenAt));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setLock((l) => ({ ...l, imagePath: data.url }));
    setUploading(false);
  }

  async function persist(next: SiteLock) {
    setSaving(true);
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "siteLock.enabled": next.enabled ? "true" : "false",
        "siteLock.imagePath": next.imagePath,
        "siteLock.tagline1": next.tagline1,
        "siteLock.tagline2": next.tagline2,
        "siteLock.reopenAt": next.reopenAt,
        "siteLock.autoReopen": next.autoReopen ? "true" : "false",
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSave() {
    // Closing the storefront is visible to every visitor the moment it saves,
    // so it gets a confirmation the way deletions elsewhere in the admin do.
    if (lock.enabled) setConfirmOpen(true);
    else void persist({ ...lock, reopenAt: fromLocalInput(reopenLocal) });
  }

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };
  const pending: SiteLock = { ...lock, reopenAt: fromLocalInput(reopenLocal) };
  const liveNow = isLockActive(pending);
  const countdownPassed =
    pending.enabled && pending.reopenAt && Date.parse(pending.reopenAt) <= Date.now();

  if (loading) {
    return <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>טוען...</p>;
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-2 text-right" style={{ color: "var(--text)" }}>נעילת האתר</h1>
        <p className="text-sm mb-8 text-right" style={{ color: "var(--text-muted)" }}>
          סוגר את החנות לגולשים ומציג במקומה עמוד המתנה. מנהלים מחוברים ממשיכים לראות את האתר כרגיל.
        </p>

        {/* ── The switch ── */}
        <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={lock.enabled}
              onChange={(e) => setLock((l) => ({ ...l, enabled: e.target.checked }))}
              className="w-5 h-5 flex-shrink-0"
            />
            <div className="text-right">
              <span className="text-sm font-bold block" style={{ color: "var(--text)" }}>סגור את האתר לציבור</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                כל עמודי החנות, העגלה והתשלום יוחלפו בעמוד ההמתנה
              </span>
            </div>
          </label>

          <div
            className="mt-5 rounded-xl px-4 py-3 text-right text-sm font-medium"
            style={{
              background: "var(--cream-dark)",
              color: liveNow ? "var(--maroon)" : "var(--green)",
            }}
          >
            {liveNow
              ? "מצב נוכחי: האתר סגור לגולשים"
              : countdownPassed
                ? "מצב נוכחי: האתר פתוח — מועד הפתיחה עבר והאתר נפתח אוטומטית"
                : "מצב נוכחי: האתר פתוח"}
          </div>
        </section>

        {/* ── Holding-page image ── */}
        <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold mb-1 text-right" style={{ color: "var(--text)" }}>תמונת &quot;אנחנו סגורים&quot;</h2>
          <p className="text-xs text-right mb-4" style={{ color: "var(--text-muted)" }}>
            אם לא תעלה תמונה, יוצג הלוגו של החנות.
          </p>

          {lock.imagePath && (
            <div className="mb-4 flex justify-end">
              <div className="relative">
                <Image
                  src={lock.imagePath}
                  alt="תצוגה מקדימה"
                  width={200}
                  height={200}
                  className="rounded-xl object-contain border"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={() => setLock((l) => ({ ...l, imagePath: "" }))}
                  className="absolute top-2 left-2 text-xs px-2 py-1 rounded-lg font-bold"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                >
                  הסר
                </button>
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            ref={imageRef}
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) void uploadImage(e.target.files[0]); }}
          />
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            disabled={uploading}
            className="text-sm px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            {uploading ? "מעלה..." : lock.imagePath ? "החלף תמונה" : "העלה תמונה"}
          </button>
        </section>

        {/* ── Taglines ── */}
        <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold mb-4 text-right" style={{ color: "var(--text)" }}>כותרות</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="tagline1" className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                כותרת ראשית
              </label>
              <input
                id="tagline1"
                value={lock.tagline1}
                onChange={(e) => setLock((l) => ({ ...l, tagline1: e.target.value }))}
                placeholder="אנחנו סגורים כרגע"
                className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="tagline2" className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                כותרת משנה
              </label>
              <input
                id="tagline2"
                value={lock.tagline2}
                onChange={(e) => setLock((l) => ({ ...l, tagline2: e.target.value }))}
                placeholder="חוזרים בקרוב עם קולקציה חדשה"
                className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* ── Countdown ── */}
        <section className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-bold mb-1 text-right" style={{ color: "var(--text)" }}>ספירה לאחור</h2>
          <p className="text-xs text-right mb-4" style={{ color: "var(--text-muted)" }}>
            מועד הפתיחה מחדש. השאר ריק כדי להציג את עמוד ההמתנה בלי ספירה לאחור.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="reopenAt" className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
              נפתחים מחדש ב־
            </label>
            <input
              id="reopenAt"
              type="datetime-local"
              value={reopenLocal}
              onChange={(e) => setReopenLocal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm"
              style={inputStyle}
            />
          </div>

          <label className="flex items-center justify-end gap-3 mt-4 cursor-pointer">
            <span className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
              פתח את האתר אוטומטית כשהספירה מסתיימת
            </span>
            <input
              type="checkbox"
              checked={lock.autoReopen}
              onChange={(e) => setLock((l) => ({ ...l, autoReopen: e.target.checked }))}
              className="w-4 h-4 flex-shrink-0"
            />
          </label>
          {!lock.autoReopen && reopenLocal && (
            <p className="text-xs mt-2 text-right" style={{ color: "var(--text-muted)" }}>
              כשהספירה תסתיים היא תיעלם מעמוד ההמתנה, אך האתר יישאר סגור עד שתפתח אותו כאן.
            </p>
          )}
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-50"
          style={{ background: saved ? "var(--green)" : "var(--text)", color: "var(--cream)" }}
        >
          {saved ? "נשמר!" : saving ? "שומר..." : "שמור"}
        </button>
      </div>

      {confirmOpen && (
        <ConfirmModal
          message="לסגור את האתר לכל הגולשים? החנות תוחלף בעמוד ההמתנה עד שתפתח אותה מחדש."
          confirmLabel="סגור את האתר"
          danger
          onConfirm={() => {
            setConfirmOpen(false);
            void persist({ ...lock, reopenAt: fromLocalInput(reopenLocal) });
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
