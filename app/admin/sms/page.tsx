"use client";
import { useState, useEffect, useRef } from "react";
import { SMS_TEMPLATES, renderSmsTemplate } from "@/lib/smsTemplates";

const PREVIEW_VARS: Record<string, Record<string, string>> = {
  "sms.couponSignup": { code: "SWEBO-AB12CD" },
  "sms.couponReminder": { code: "SWEBO-AB12CD" },
  "sms.orderConfirmation": {
    name: "ישראל ישראלי",
    orderId: "A1B2C3",
    items: 'חולצה ירוקה (M) x1, מכנס שחור (L) x2',
    total: "249.00",
  },
};

export default function AdminSmsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function insertAtCursor(key: string, tag: string) {
    const el = textareaRefs.current[key];
    if (!el) {
      setValues((v) => ({ ...v, [key]: (v[key] ?? "") + tag }));
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = values[key] ?? "";
    const next = current.slice(0, start) + tag + current.slice(end);
    setValues((v) => ({ ...v, [key]: next }));
    // Restore cursor after the inserted tag
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  useEffect(() => {
    fetch("/api/admin/config").then((r) => r.json()).then((cfg: Record<string, string>) => {
      const initial: Record<string, string> = {};
      for (const key of Object.keys(SMS_TEMPLATES)) {
        initial[key] = cfg[key] || SMS_TEMPLATES[key].default;
      }
      setValues(initial);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset(key: string) {
    setValues((v) => ({ ...v, [key]: SMS_TEMPLATES[key].default }));
  }

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-2 text-right" style={{ color: "var(--text)" }}>הודעות SMS אוטומטיות</h1>
      <p className="text-sm mb-8 text-right" style={{ color: "var(--text-muted)" }}>
        עריכת תוכן ההודעות שנשלחות אוטומטית ללקוחות דרך ActiveTrail. השתמשו בתגיות בסוגריים מסולסלים כדי להכניס ערכים דינמיים.
      </p>

      {Object.entries(SMS_TEMPLATES).map(([key, def]) => (
        <section key={key} className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => reset(key)}
              className="text-xs underline hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              שחזר ברירת מחדל
            </button>
            <h2 className="font-bold text-lg text-right" style={{ color: "var(--text)" }}>{def.label}</h2>
          </div>
          <p className="text-xs text-right mb-3" style={{ color: "var(--text-muted)" }}>{def.description}</p>

          <textarea
            ref={(el) => { textareaRefs.current[key] = el; }}
            value={values[key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            rows={4}
            dir="rtl"
            className="w-full px-4 py-3 rounded-xl border text-right outline-none resize-none text-sm"
            style={inputStyle}
          />

          {def.placeholders.length > 0 && (
            <div className="mt-3">
              <p className="text-xs mb-2 text-right" style={{ color: "var(--text-muted)" }}>
                לחצו להכנסת ערך דינמי בתוך ההודעה:
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                {def.placeholders.map((p) => (
                  <button
                    key={p.tag}
                    type="button"
                    onClick={() => insertAtCursor(key, p.tag)}
                    className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-70 transition-opacity flex items-center gap-1.5"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>+</span>
                    <span>{p.desc}</span>
                    <span className="font-mono text-[10px] px-1 rounded" style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>{p.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live preview */}
          <div className="mt-4 p-3 rounded-xl text-sm text-right" style={{ background: "var(--cream-dark)", color: "var(--text)" }}>
            <p className="text-xs mb-1 font-bold" style={{ color: "var(--text-muted)" }}>תצוגה מקדימה:</p>
            {renderSmsTemplate(values[key] ?? "", PREVIEW_VARS[key] ?? {})}
          </div>
        </section>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-50"
        style={{ background: saved ? "var(--green)" : "var(--text)", color: "var(--cream)" }}
      >
        {saved ? "נשמר!" : saving ? "שומר..." : "שמור הודעות"}
      </button>
    </div>
  );
}
