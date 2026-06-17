"use client";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "אישור", danger = true }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 w-80 text-right shadow-xl"
        style={{ background: "var(--cream)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm mb-5" style={{ color: "var(--text)" }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: danger ? "var(--maroon)" : "var(--text)", color: "#fff" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
