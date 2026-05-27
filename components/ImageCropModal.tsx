"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE = 800; // canvas export px

export default function ImageCropModal({ file, onConfirm, onCancel }: Props) {
  const [imgSrc, setImgSrc] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState(400);
  const [minScale, setMinScale] = useState(1);
  const [ready, setReady] = useState(false);

  const naturalW = useRef(0);
  const naturalH = useRef(0);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    // Responsive frame size
    const size = Math.min(400, window.innerWidth - 64);
    setFrameSize(size);
  }, []);

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    naturalW.current = img.naturalWidth;
    naturalH.current = img.naturalHeight;
    const fs = frameRef.current?.offsetWidth ?? frameSize;
    const min = Math.max(fs / img.naturalWidth, fs / img.naturalHeight);
    const initialScale = min;
    const scaledW = img.naturalWidth * initialScale;
    const scaledH = img.naturalHeight * initialScale;
    setMinScale(min);
    setScale(initialScale);
    setOffset({ x: -(scaledW - fs) / 2, y: -(scaledH - fs) / 2 });
    setReady(true);
  }

  function clamp(ox: number, oy: number, s: number) {
    const fs = frameRef.current?.offsetWidth ?? frameSize;
    const w = naturalW.current * s;
    const h = naturalH.current * s;
    return {
      x: Math.min(0, Math.max(fs - w, ox)),
      y: Math.min(0, Math.max(fs - h, oy)),
    };
  }

  // Mouse
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy, scale));
  }
  function onMouseUp() { dragging.current = false; }

  // Touch
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragging.current = true;
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: offset.x, oy: offset.y };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.mx;
    const dy = t.clientY - dragStart.current.my;
    setOffset(clamp(dragStart.current.ox + dx, dragStart.current.oy + dy, scale));
  }
  function onTouchEnd() { dragging.current = false; }

  function onZoomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = frameRef.current?.offsetWidth ?? frameSize;
    const newScale = Number(e.target.value);
    // Keep the center of the frame anchored while zooming
    const centerX = fs / 2 - offset.x;
    const centerY = fs / 2 - offset.y;
    const ratioX = centerX / (naturalW.current * scale);
    const ratioY = centerY / (naturalH.current * scale);
    const newOx = fs / 2 - ratioX * (naturalW.current * newScale);
    const newOy = fs / 2 - ratioY * (naturalH.current * newScale);
    setScale(newScale);
    setOffset(clamp(newOx, newOy, newScale));
  }

  async function handleConfirm() {
    const fs = frameRef.current?.offsetWidth ?? frameSize;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d")!;
    const img = new window.Image();
    img.src = imgSrc;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = fs / scale;
    const sh = fs / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob((blob) => { if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div
        className="rounded-2xl overflow-hidden flex flex-col w-full"
        style={{ background: "var(--cream)", maxWidth: 480 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onCancel}
            className="text-sm px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            ביטול
          </button>
          <span className="font-bold text-sm" style={{ color: "var(--text)" }}>בחר אזור תצוגה</span>
          <button
            onClick={handleConfirm}
            disabled={!ready}
            className="text-sm px-3 py-1.5 rounded-lg font-bold transition-opacity disabled:opacity-40"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            אישור ✓
          </button>
        </div>

        {/* Crop frame */}
        <div className="flex justify-center p-4 pb-2">
          <div
            ref={frameRef}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              overflow: "hidden",
              position: "relative",
              cursor: dragging.current ? "grabbing" : "grab",
              userSelect: "none",
              borderRadius: 12,
              background: "#e0e0e0",
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {imgSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt="crop preview"
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: naturalW.current * scale,
                  height: naturalH.current * scale,
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Frame border hint */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "2px solid rgba(255,255,255,0.6)",
                borderRadius: 12,
                pointerEvents: "none",
              }}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                טוען...
              </div>
            )}
          </div>
        </div>

        {/* Zoom + hint */}
        <div className="px-6 pb-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>A</span>
            <input
              type="range"
              min={minScale}
              max={minScale * 4}
              step={0.001}
              value={scale}
              onChange={onZoomChange}
              disabled={!ready}
              className="flex-1"
            />
            <span className="text-base" style={{ color: "var(--text-muted)" }}>A</span>
          </div>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            גרור כדי לבחור אזור · הגדל עם הסליידר
          </p>
        </div>
      </div>
    </div>
  );
}
