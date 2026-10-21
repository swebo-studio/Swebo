"use client";
import type { PatchDraft, PromotionDraft } from "./types";
import { Switch } from "./controls";
import BadgeFields from "./BadgeFields";
import { defaultBadgeText } from "@/lib/promotionBadges";

/** The tag this promotion puts on the product cards it covers. */
export default function BadgeEditor({ draft, patch }: { draft: PromotionDraft; patch: PatchDraft }) {
  const autoText = defaultBadgeText(draft);

  return (
    <div className="p-3 rounded-xl border mb-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
          {draft.badgeEnabled ? "מוצגת תגית על המוצרים" : "בלי תגית על המוצרים"}
        </span>
        <Switch on={draft.badgeEnabled} onToggle={() => patch({ badgeEnabled: !draft.badgeEnabled })} label="תגית על המוצרים" />
      </div>
      <p className="text-xs text-right mt-1.5" style={{ color: "var(--text-muted)" }}>
        {draft.kind === "rules"
          ? "התגית תופיע על המוצרים שבהנחה, או על כל המוצרים כשההטבה היא על כל הסל."
          : "התגית תופיע על כל מוצר שנכלל במבצע."}
      </p>

      {draft.badgeEnabled && (
        <div className="mt-4">
          <BadgeFields
            value={{ text: draft.badgeText, color: draft.badgeColor, size: draft.badgeSize, position: draft.badgePosition }}
            onChange={(v) => patch({
              ...(v.text !== undefined && { badgeText: v.text }),
              ...(v.color !== undefined && { badgeColor: v.color }),
              ...(v.size !== undefined && { badgeSize: v.size }),
              ...(v.position !== undefined && { badgePosition: v.position }),
            })}
            autoText={autoText}
            hint={draft.badgeText.trim() ? undefined : `ריק = "${autoText}", לפי המבצע`}
          />
        </div>
      )}
    </div>
  );
}
