"use client";
import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { pagePath, slugify } from "@/lib/pages";

/** Text pages shown under "עוד" in the site menu, in this order. */

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  sortOrder: number;
}

const EMPTY = { title: "", slug: "", content: "", published: true };
const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  // null = list only; "new" = adding; an id = editing that page
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  // Until the admin types a URL themselves, it follows the title
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null);

  const load = useCallback(() => {
    fetch("/api/pages?all=1")
      .then((r) => r.json())
      .then((d) => { setPages(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm(EMPTY);
    setSlugTouched(false);
    setError(null);
    setEditing("new");
  }

  function openEdit(p: Page) {
    setForm({ title: p.title, slug: p.slug, content: p.content, published: p.published });
    setSlugTouched(true);
    setError(null);
    setEditing(p.id);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/pages" : `/api/pages/${editing}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) { setError(data?.error ?? "השמירה נכשלה — נסו שוב"); return; }
    setEditing(null);
    load();
  }

  async function move(p: Page, dir: "up" | "down") {
    await fetch(`/api/pages/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ move: dir }) });
    load();
  }

  async function remove(p: Page) {
    setPendingDelete(null);
    await fetch(`/api/pages/${p.id}`, { method: "DELETE" });
    if (editing === p.id) setEditing(null);
    load();
  }

  if (loading) return <p className="text-center py-20" style={{ color: "var(--text-muted)" }}>טוען...</p>;

  return (
    <div className="max-w-2xl">
      {pendingDelete && (
        <ConfirmModal
          message={`למחוק את העמוד "${pendingDelete.title}"? הוא יוסר מהתפריט והקישור אליו יפסיק לעבוד.`}
          confirmLabel="מחק"
          onConfirm={() => remove(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <div className="flex items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>עמודי מידע</h1>
        {editing === null && (
          <button onClick={openNew} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--text)", color: "var(--cream)" }}>
            + עמוד חדש
          </button>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        עמודי טקסט שמופיעים בתפריט האתר תחת ״עוד״, אחרי הצהרת הנגישות, לפי הסדר כאן.
      </p>

      {editing !== null && (
        <div className="flex flex-col gap-4 p-5 rounded-2xl border mb-6" style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}>
          <h2 className="font-bold" style={{ color: "var(--text)" }}>{editing === "new" ? "עמוד חדש" : "עריכת עמוד"}</h2>
          <label className="flex flex-col gap-1 text-right">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>כותרת (כך יופיע בתפריט)</span>
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
              }}
              className="px-3 py-2 rounded-xl border outline-none"
              style={{ ...inputStyle, background: "var(--cream)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-right">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>כתובת העמוד</span>
            <div className="flex items-center gap-2" dir="ltr">
              <span className="text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>swebo.co.il/info/</span>
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border outline-none"
                style={{ ...inputStyle, background: "var(--cream)" }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>אותיות, ספרות ומקפים בלבד. נוצרת אוטומטית מהכותרת.</span>
          </label>
          <label className="flex flex-col gap-1 text-right">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>תוכן</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={14}
              className="px-3 py-2 rounded-xl border outline-none text-sm leading-relaxed"
              style={{ ...inputStyle, background: "var(--cream)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>ירידות שורה נשמרות כמו שהן.</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
            <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="w-4 h-4" />
            מוצג באתר
          </label>
          {error && <p role="alert" className="text-sm" style={{ color: "var(--maroon)" }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setEditing(null)} disabled={saving} className="flex-1 py-3 rounded-xl border font-medium hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        editing === null && <p className="py-10 text-center" style={{ color: "var(--text-muted)" }}>אין עדיין עמודים. לחצו ״+ עמוד חדש״ כדי להוסיף.</p>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          {pages.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col">
                <button onClick={() => move(p, "up")} disabled={i === 0} className="px-1 disabled:opacity-20 hover:opacity-60" aria-label={`הזז את ${p.title} למעלה`} style={{ color: "var(--text)" }}>▲</button>
                <button onClick={() => move(p, "down")} disabled={i === pages.length - 1} className="px-1 disabled:opacity-20 hover:opacity-60" aria-label={`הזז את ${p.title} למטה`} style={{ color: "var(--text)" }}>▼</button>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="font-bold truncate" style={{ color: "var(--text)" }}>{p.title}</p>
                <a href={pagePath(p.slug)} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:opacity-70" dir="ltr" style={{ color: "var(--text-muted)" }}>
                  /info/{p.slug}
                </a>
              </div>
              {!p.published && (
                <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ background: "#f0f0f0", color: "#888" }}>מוסתר</span>
              )}
              <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:opacity-70 flex-shrink-0" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
              <button onClick={() => setPendingDelete(p)} className="text-xs flex-shrink-0 hover:opacity-70" style={{ color: "var(--maroon)" }}>מחיקה</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
