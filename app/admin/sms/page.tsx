"use client";
import { useState, useEffect, useRef } from "react";
import { SMS_TEMPLATES, SMS_LOW_BALANCE_THRESHOLD, renderSmsTemplate, smsCost, type SmsTemplateDef } from "@/lib/smsTemplates";
import type { SmsBalance, OrderSmsEstimate } from "@/lib/notify";

// Credits are bought under "חשבון" once logged in — ActiveTrail has no public deep link
const ACTIVETRAIL_APP_URL = "https://app.activetrail.com/";

type BalanceState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; balance: SmsBalance; estimate: OrderSmsEstimate | null };

const formatNumber = (n: number) => n.toLocaleString("he-IL");
const creditsLabel = (n: number) => (n === 1 ? "קרדיט אחד" : `${formatNumber(n)} קרדיטים`);

const PREVIEW_VARS: Record<string, Record<string, string>> = {
  "sms.couponSignup": { code: "SWEBO-AB12CD" },
  "sms.couponReminder": { code: "SWEBO-AB12CD" },
  "sms.orderConfirmation": {
    name: "ישראל ישראלי",
    orderId: "A1B2C3",
    items: 'חולצה ירוקה (M) x1, מכנס שחור (L) x2',
    total: "249.00",
  },
  "sms.collabOrder": { code: "ORI5", name: "ישראל ישראלי", amount: "400", commission: "20" },
  "sms.stagePacked": { name: "ישראל ישראלי", orderId: "A1B2C3" },
  "sms.stageShipped": { name: "ישראל ישראלי", orderId: "A1B2C3", shipment: "12345678" },
  "sms.stageDone": { name: "ישראל ישראלי", orderId: "A1B2C3" },
  "sms.stagePackedEpost": { name: "ישראל ישראלי", orderId: "A1B2C3", pudo: "סופר פארם דיזנגוף" },
  "sms.stageShippedEpost": { name: "ישראל ישראלי", orderId: "A1B2C3", pudo: "סופר פארם דיזנגוף", shipment: "12345678" },
  "sms.stageDoneEpost": { name: "ישראל ישראלי", orderId: "A1B2C3", pudo: "סופר פארם דיזנגוף" },
  "sms.stagePackedPickup": { name: "ישראל ישראלי", orderId: "A1B2C3" },
  "sms.stageShippedPickup": { name: "ישראל ישראלי", orderId: "A1B2C3" },
  "sms.stageDonePickup": { name: "ישראל ישראלי", orderId: "A1B2C3" },
};

/** Templates in declaration order, bucketed under their group heading. */
const GROUPED_TEMPLATES: { group: string; entries: [string, SmsTemplateDef][] }[] =
  Object.entries(SMS_TEMPLATES).reduce((groups, entry) => {
    const group = entry[1].group ?? "";
    const bucket = groups.find((g) => g.group === group);
    if (bucket) bucket.entries.push(entry);
    else groups.push({ group, entries: [entry] });
    return groups;
  }, [] as { group: string; entries: [string, SmsTemplateDef][] }[]);

function SmsBalanceCard({ state }: { state: BalanceState }) {
  const buyLink = (
    <a
      href={ACTIVETRAIL_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-80 flex-shrink-0"
      style={{ background: "var(--text)", color: "var(--cream)" }}
    >
      רכישת קרדיטים ↗
    </a>
  );

  if (state.status !== "ok") {
    return (
      <section className="rounded-2xl border p-6 mb-8 flex items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
        {buyLink}
        <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
          {state.status === "loading" ? "טוען יתרת SMS…" : "לא ניתן לטעון את יתרת ה-SMS מ-ActiveTrail כרגע"}
        </p>
      </section>
    );
  }

  const { balance, estimate } = state;
  const low = balance.alertType !== "None" || balance.credits <= SMS_LOW_BALANCE_THRESHOLD;
  const barColor = low ? "var(--maroon)" : balance.percent < 25 ? "#c98a1b" : "var(--green)";
  const ordersLeft = estimate && estimate.perOrder > 0 ? Math.floor(balance.credits / estimate.perOrder) : null;

  return (
    <section className="rounded-2xl border p-6 mb-8" style={{ borderColor: low ? "var(--maroon)" : "var(--border)" }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        {buyLink}
        <div className="text-right">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>יתרת SMS</h2>
          <p className="text-3xl font-extrabold leading-tight" style={{ color: "var(--text)" }}>
            {formatNumber(balance.credits)} <span className="text-base font-bold" style={{ color: "var(--text-muted)" }}>קרדיטים</span>
          </p>
        </div>
      </div>

      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--cream-dark)" }}
        role="progressbar"
        aria-label="יתרה מהחבילה הנוכחית"
        aria-valuenow={Math.round(balance.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full mr-0 ml-auto" style={{ width: `${Math.min(100, Math.max(0, balance.percent))}%`, background: barColor }} />
      </div>
      <p className="text-xs text-right mt-1.5" style={{ color: "var(--text-muted)" }}>
        נותרו {Math.round(balance.percent)}% מהחבילה הנוכחית · ב-{SMS_LOW_BALANCE_THRESHOLD} קרדיטים נשלחת למנהלים הודעת SMS לרכישה
      </p>

      {low && (
        <p role="alert" className="text-sm font-bold text-right mt-3" style={{ color: "var(--maroon)" }}>
          היתרה נמוכה — כשהקרדיטים ייגמרו, לקוחות יפסיקו לקבל אישורי הזמנה ועדכונים.
        </p>
      )}

      {ordersLeft !== null && estimate && (
        <div className="mt-4 pt-4 border-t text-right" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            מספיק לכ-{formatNumber(ordersLeft)} הזמנות
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            הזמנה עולה בממוצע {estimate.perOrder} קרדיטים: {estimate.customer} להודעות ללקוח (אישור הזמנה ו-3 עדכוני סטטוס)
            {estimate.admin > 0 && <>, {estimate.admin} להודעת &quot;הזמנה חדשה&quot; למנהלים</>}.
            {" "}מחושב לפי {estimate.sampleSize === 1 ? "ההזמנה האחרונה" : `${estimate.sampleSize} ההזמנות האחרונות`} וההודעות השמורות. הרשמות לניוזלטר ותזכורות קופון אינן כלולות.
          </p>
        </div>
      )}
    </section>
  );
}

export default function AdminSmsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [balance, setBalance] = useState<BalanceState>({ status: "loading" });
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function loadBalance() {
    fetch("/api/admin/sms/balance")
      .then((r) => r.json())
      .then((data) => setBalance(data.balance ? { status: "ok", balance: data.balance, estimate: data.estimate } : { status: "error" }))
      .catch(() => setBalance({ status: "error" }));
  }

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
    loadBalance();
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
    loadBalance(); // the per-order estimate is built from the saved templates
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

      <SmsBalanceCard state={balance} />

      {GROUPED_TEMPLATES.map(({ group, entries }) => (
        <div key={group}>
          {group && (
            <h2 className="text-sm font-bold mb-3 mt-2 text-right" style={{ color: "var(--text-muted)" }}>{group}</h2>
          )}

          {entries.map(([key, def]) => {
            const preview = renderSmsTemplate(values[key] ?? "", PREVIEW_VARS[key] ?? {});
            const cost = smsCost(preview.trim());
            return (
            <section key={key} className="rounded-2xl border p-6 mb-6" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => reset(key)}
                  className="text-xs underline hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                >
                  שחזר ברירת מחדל
                </button>
                <h3 className="font-bold text-lg text-right" style={{ color: "var(--text)" }}>{def.label}</h3>
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
                {preview}
              </div>
              <p className="text-xs text-right mt-2" style={{ color: "var(--text-muted)" }}>
                {cost.credits === 0
                  ? "הודעה ריקה לא נשלחת"
                  : <>
                      {formatNumber(cost.chars)} תווים · <span style={{ color: cost.credits > 1 ? "var(--text)" : undefined, fontWeight: cost.credits > 1 ? 700 : undefined }}>{creditsLabel(cost.credits)} להודעה</span>
                      {cost.charsToSave > 0 && cost.charsToSave <= 20 && <> · קיצור של {cost.charsToSave} תווים יחסוך קרדיט</>}
                    </>}
              </p>
            </section>
            );
          })}
        </div>
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
