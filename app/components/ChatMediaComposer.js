/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ChatMediaComposer.js
   Two exports:
     • MediaComposer  — pre-send editor (crop, doodle, quality, caption)
     • MediaLightbox  — in-chat viewer for images / video / PDF / files
   Pure HTML5 Canvas — no external libraries.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useRef } from "react";

/* ── tiny helpers ── */
const isImg = (url) => /\.(png|jpe?g|gif|webp|svg)$/i.test(url || "");
const isVid = (url) => /\.(mp4|webm|ogg|mov|avi)$/i.test(url || "");
const isPDF = (url) => /\.pdf$/i.test(url || "");

/* ── time formatter mm:ss ── */
function fmtTime(s) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CustomVideoPlayer
   Props:
     src        string — video URL or object URL
     className  string — extra CSS on the outer wrapper
═══════════════════════════════════════════════════════════════════════════*/
function CustomVideoPlayer({ src, className = "" }) {
  const vidRef     = useRef(null);
  const [playing,  setPlaying]  = useState(false);
  const [muted,    setMuted]    = useState(false);
  const [progress, setProgress] = useState(0);   // 0-100
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCtrl, setShowCtrl] = useState(true);
  const hideTimer = useRef(null);

  /* Auto-hide controls while playing */
  function poke() {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 2800);
  }

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function togglePlay() {
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
    poke();
  }

  function toggleMute() {
    const v = vidRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    poke();
  }

  function onTimeUpdate() {
    const v = vidRef.current;
    if (!v || !v.duration) return;
    setCurrent(v.currentTime);
    setProgress((v.currentTime / v.duration) * 100);
  }

  function onLoadedMeta() {
    setDuration(vidRef.current?.duration || 0);
  }

  function onEnded() { setPlaying(false); setShowCtrl(true); }

  function scrub(e) {
    const v = vidRef.current;
    if (!v || !v.duration) return;
    const val = Number(e.target.value);
    v.currentTime = (val / 100) * v.duration;
    setProgress(val);
    poke();
  }

  function goFullscreen() {
    const v = vidRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
  }

  return (
    <div
      className={`relative select-none overflow-hidden rounded-2xl bg-black ${className}`}
      onMouseMove={poke}
      onClick={togglePlay}
      style={{ cursor: "pointer" }}
    >
      {/* The video element — no native controls */}
      <video
        ref={vidRef}
        src={src}
        className="w-full h-full object-contain block"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMeta}
        onEnded={onEnded}
        onPlay={() => { setPlaying(true); poke(); }}
        onPause={() => setPlaying(false)}
      />

      {/* Dark gradient overlay — bottom controls area */}
      <div className={`absolute inset-0 flex flex-col justify-between pointer-events-none transition-opacity duration-300 ${showCtrl ? "opacity-100" : "opacity-0"}`}>
        {/* Top fade */}
        <div className="h-16 bg-gradient-to-b from-black/50 to-transparent" />
        {/* Bottom controls */}
        <div
          className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-8 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="relative flex items-center gap-2 mb-2">
            <span className="text-[11px] text-white/60 shrink-0 tabular-nums">{fmtTime(current)}</span>
            <div className="relative flex-1 group">
              {/* Track BG */}
              <div className="absolute inset-y-0 my-auto h-1 w-full rounded-full bg-white/20" />
              {/* Filled */}
              <div
                className="absolute inset-y-0 my-auto h-1 rounded-full bg-orange-500 transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Thumb — styled range input */}
              <input
                type="range" min={0} max={100} step={0.1}
                value={progress}
                onChange={scrub}
                className="relative w-full opacity-0 h-4 cursor-pointer"
                style={{ accentColor: "#f97316" }}
              />
            </div>
            <span className="text-[11px] text-white/60 shrink-0 tabular-nums">{fmtTime(duration)}</span>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="size-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-orange-500/70 transition-all text-white"
            >
              <span className="material-symbols-outlined text-[18px]">{playing ? "pause" : "play_arrow"}</span>
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="size-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/70 hover:text-white"
            >
              <span className="material-symbols-outlined text-[17px]">{muted ? "volume_off" : "volume_up"}</span>
            </button>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={goFullscreen}
              className="size-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/70 hover:text-white"
            >
              <span className="material-symbols-outlined text-[17px]">fullscreen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Big center play button when paused */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="size-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-4xl text-white ml-1">play_arrow</span>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function canvasPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width)  * canvas.width,
    y: ((e.clientY - r.top)  / r.height) * canvas.height,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MediaComposer
   Props:
     file     File object chosen by user
     onSend   (blob_or_file, filename, caption) => void
     onCancel () => void
══════════════════════════════════════════════════════════════════════════════*/
export function MediaComposer({ file, onSend, onCancel }) {
  const [mode,       setMode]       = useState("preview"); // preview | crop | doodle
  const [quality,    setQuality]    = useState(1.0);
  const [caption,    setCaption]    = useState("");
  const [doodleClr,  setDoodleClr]  = useState("#ff4444");
  const [doodleSize, setDoodleSize] = useState(4);
  const [cropRect,   setCropRect]   = useState(null);   // {x,y,w,h} in canvas coords
  const [hasCrop,    setHasCrop]    = useState(false);  // crop was applied
  const [sending,    setSending]    = useState(false);
  const [objUrl,     setObjUrl]     = useState(null);   // for video / pdf preview

  const baseRef    = useRef(null);   // <canvas> for image base
  const overlayRef = useRef(null);   // <canvas> overlay (crop selector / doodle)
  const imgRef     = useRef(null);   // HTMLImageElement
  const isDropping = useRef(false);  // mousedown tracking (crop)
  const isDrawing  = useRef(false);  // mousedown tracking (doodle)
  const cropStart  = useRef(null);
  const lastPt     = useRef(null);

  const fileIsImg = file?.type.startsWith("image/");
  const fileIsVid = file?.type.startsWith("video/");
  const fileIsPDF = file?.type === "application/pdf";

  /* ObjectURL for video / pdf */
  useEffect(() => {
    if (!fileIsImg && file) {
      const u = URL.createObjectURL(file);
      setObjUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [file]);

  /* Load image → base canvas */
  useEffect(() => {
    if (!fileIsImg || !file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      initCanvas(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file]);

  function initCanvas(img) {
    const base = baseRef.current;
    const ov   = overlayRef.current;
    if (!base || !ov) return;

    /* Scale to fit 680×440 */
    const MAX_W = 680, MAX_H = 440;
    const ratio = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth  * ratio);
    const h = Math.round(img.naturalHeight * ratio);

    base.width  = w;   base.height = h;
    ov.width    = w;   ov.height   = h;
    base.getContext("2d").drawImage(img, 0, 0, w, h);
    ov.getContext("2d").clearRect(0, 0, w, h);
  }

  /* ── Overlay mouse handlers ── */
  function onMouseDown(e) {
    const pos = canvasPos(e, overlayRef.current);
    if (mode === "crop")   { cropStart.current = pos; isDropping.current = true; }
    if (mode === "doodle") { isDrawing.current = true; lastPt.current = pos; }
  }

  function onMouseMove(e) {
    const pos = canvasPos(e, overlayRef.current);
    const ov  = overlayRef.current;
    const ctx = ov.getContext("2d");

    if (mode === "crop" && isDropping.current) {
      const { x: sx, y: sy } = cropStart.current;
      const w = pos.x - sx, h = pos.y - sy;

      ctx.clearRect(0, 0, ov.width, ov.height);

      /* Dark vignette outside selection */
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, ov.width, ov.height);
      ctx.clearRect(sx, sy, w, h);

      /* Dashed selection border */
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        Math.min(sx, pos.x) + 0.5,
        Math.min(sy, pos.y) + 0.5,
        Math.abs(w) - 1,
        Math.abs(h) - 1
      );
      ctx.setLineDash([]);

      setCropRect({ x: sx, y: sy, w, h });
    }

    if (mode === "doodle" && isDrawing.current) {
      ctx.strokeStyle = doodleClr;
      ctx.lineWidth   = doodleSize;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.beginPath();
      ctx.moveTo(lastPt.current.x, lastPt.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPt.current = pos;
    }
  }

  function onMouseUp() {
    isDropping.current = false;
    isDrawing.current  = false;
  }

  /* Apply crop */
  function applyCrop() {
    if (!cropRect) return;
    const { x, y, w, h } = cropRect;
    if (Math.abs(w) < 10 || Math.abs(h) < 10) return;

    const x0 = w < 0 ? x + w : x;
    const y0 = h < 0 ? y + h : y;
    const aw = Math.abs(w), ah = Math.abs(h);

    const base = baseRef.current;
    const srcCtx = base.getContext("2d");
    const imgData = srcCtx.getImageData(x0, y0, aw, ah);

    base.width = aw; base.height = ah;
    base.getContext("2d").putImageData(imgData, 0, 0);

    const ov = overlayRef.current;
    ov.width = aw; ov.height = ah;
    ov.getContext("2d").clearRect(0, 0, aw, ah);

    setCropRect(null);
    setHasCrop(true);
    setMode("preview");
  }

  function resetImage() {
    if (imgRef.current) {
      initCanvas(imgRef.current);
      setCropRect(null);
      setHasCrop(false);
      setMode("preview");
    }
  }

  /* ── Send ── */
  async function handleSend() {
    if (sending) return;
    setSending(true);

    if (fileIsImg) {
      /* Composite: base image + doodle overlay → single canvas → blob */
      const final = document.createElement("canvas");
      const base  = baseRef.current;
      const ov    = overlayRef.current;
      final.width  = base.width;
      final.height = base.height;
      const fCtx = final.getContext("2d");
      fCtx.drawImage(base, 0, 0);
      fCtx.drawImage(ov, 0, 0);

      final.toBlob(
        (blob) => { onSend(blob, file.name, caption); },
        "image/jpeg",
        quality
      );
    } else {
      /* Non-image: send as-is */
      onSend(file, file.name, caption);
    }
  }

  const overlayPointerEvents = mode !== "preview" ? "all" : "none";

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#111] border border-[#272727] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ maxWidth: "740px", width: "100%", maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1e1e1e] shrink-0">
          <span className="material-symbols-outlined text-orange-400 text-base">attachment</span>
          <span className="text-sm font-bold text-white flex-1 truncate">{file.name}</span>
          <span className="text-xs text-zinc-600 shrink-0">{fmtSize(file.size)}</span>
          <button
            onClick={onCancel}
            className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* ── Editing Toolbar (images only) ── */}
        {fileIsImg && (
          <div className="flex items-center flex-wrap gap-1.5 px-4 py-2.5 border-b border-[#1a1a1a] bg-[#0d0d0d] shrink-0">
            {[
              { id: "preview", icon: "visibility", label: "Preview" },
              { id: "crop",    icon: "crop",        label: "Crop"    },
              { id: "doodle",  icon: "brush",       label: "Draw"    },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === t.id
                    ? "bg-orange-500/15 border border-orange-500/30 text-orange-400"
                    : "text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{t.icon}</span>
                {t.label}
              </button>
            ))}

            {/* Doodle sub-toolbar */}
            {mode === "doodle" && (
              <div className="flex items-center gap-2 ml-2 pl-2.5 border-l border-[#252525]">
                {["#ff4444", "#44ff88", "#4488ff", "#ffcc44", "#ff44ee", "#ffffff", "#000000"].map(c => (
                  <button
                    key={c}
                    onClick={() => setDoodleClr(c)}
                    style={{ background: c }}
                    className={`size-5 rounded-full transition-all shrink-0 border border-white/10 ${
                      doodleClr === c ? "ring-2 ring-white ring-offset-1 ring-offset-[#0d0d0d] scale-110" : ""
                    }`}
                  />
                ))}
                <span className="text-[10px] text-zinc-600 ml-1">Size</span>
                <input
                  type="range" min={2} max={24} value={doodleSize}
                  onChange={e => setDoodleSize(Number(e.target.value))}
                  className="w-20 accent-orange-500"
                />
              </div>
            )}

            {/* Apply crop button */}
            {mode === "crop" && cropRect && Math.abs(cropRect.w) > 10 && (
              <button
                onClick={applyCrop}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400
                  bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Apply Crop
              </button>
            )}

            {/* Reset */}
            {hasCrop && (
              <button
                onClick={resetImage}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500
                  hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                Reset
              </button>
            )}
          </div>
        )}

        {/* ── Preview Area ── */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#090909] p-4 min-h-[180px]">
          {fileIsImg && (
            <div className="relative inline-flex" style={{ lineHeight: 0 }}>
              <canvas ref={baseRef} style={{ display: "block", maxWidth: "100%", borderRadius: "0.5rem" }} />
              <canvas
                ref={overlayRef}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  borderRadius: "0.5rem",
                  cursor: mode === "preview" ? "default" : "crosshair",
                  pointerEvents: overlayPointerEvents,
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              />
            </div>
          )}

          {fileIsVid && objUrl && (
            <CustomVideoPlayer src={objUrl} className="max-w-full" style={{ maxHeight: "320px" }} />
          )}

          {fileIsPDF && objUrl && (
            <iframe
              src={objUrl} title={file.name}
              className="w-full rounded-xl border border-[#1e1e1e]"
              style={{ height: "400px" }}
            />
          )}

          {!fileIsImg && !fileIsVid && !fileIsPDF && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="size-20 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-zinc-400">description</span>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">{file.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{fmtSize(file.size)}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-[#1a1a1a] bg-[#0d0d0d] px-5 py-4 flex flex-col gap-3">

          {/* Quality selector — images only */}
          {fileIsImg && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold shrink-0">Quality</span>
              <div className="flex gap-1.5">
                {[
                  { val: 1.0,  label: "Original",  sub: "100%" },
                  { val: 0.70, label: "High",       sub: "70%"  },
                  { val: 0.40, label: "Medium",     sub: "40%"  },
                ].map(q => (
                  <button
                    key={q.val}
                    onClick={() => setQuality(q.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      quality === q.val
                        ? "bg-orange-500/15 border border-orange-500/30 text-orange-400"
                        : "text-zinc-500 hover:text-white bg-[#1a1a1a] border border-[#252525]"
                    }`}
                  >
                    {q.label} <span className="opacity-60">{q.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="flex items-center gap-2 bg-[#151515] border border-[#252525] rounded-xl px-3 py-2.5
            focus-within:border-orange-500/30 transition-all">
            <span className="material-symbols-outlined text-sm text-zinc-600 shrink-0">chat_bubble_outline</span>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              placeholder="Add a caption…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-[#252525] text-zinc-400 text-sm font-semibold
                hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold
                disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              {sending ? "Uploading…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MediaLightbox
   Props:
     msg     { file_url, file_name }
     onClose () => void
══════════════════════════════════════════════════════════════════════════════*/
export function MediaLightbox({ msg, onClose }) {
  const [zoom, setZoom] = useState(1);

  /* Keyboard close */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url  = msg.file_url;
  const name = msg.file_name;
  const isI  = isImg(url);
  const isV  = isVid(url);
  const isP  = isPDF(url);

  function onWheel(e) {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.3, z - e.deltaY * 0.001)));
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-[#050505]/97 backdrop-blur-sm">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
        <span className="material-symbols-outlined text-zinc-500 text-base">
          {isI ? "image" : isV ? "play_circle" : isP ? "picture_as_pdf" : "attachment"}
        </span>
        <span className="text-sm text-zinc-300 truncate flex-1">{name}</span>

        {/* Zoom controls — images only */}
        {isI && (
          <div className="flex items-center gap-0.5">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.25))}
              className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-base">zoom_out</span>
            </button>
            <span className="text-xs text-zinc-600 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}
              className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-base">zoom_in</span>
            </button>
            <button onClick={() => setZoom(1)}
              className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all ml-1">
              <span className="material-symbols-outlined text-base">fit_screen</span>
            </button>
          </div>
        )}

        <a
          href={url} download={name} target="_blank" rel="noreferrer"
          className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          title="Download"
        >
          <span className="material-symbols-outlined text-base">download</span>
        </a>

        <button
          onClick={onClose}
          className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Media content */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={onClose}
      >
        {isI && (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s" }}
            onWheel={onWheel}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={url} alt={name}
              className="max-w-[88vw] max-h-[80vh] rounded-xl object-contain shadow-2xl select-none"
              style={{ display: "block" }}
            />
          </div>
        )}

        {isV && (
          <div className="max-w-[88vw] max-h-[82vh] w-full" style={{ maxWidth: "900px" }} onClick={e => e.stopPropagation()}>
            <CustomVideoPlayer src={url} className="w-full" style={{ maxHeight: "80vh" }} />
          </div>
        )}

        {isP && (
          <iframe
            src={url} title={name}
            className="rounded-xl border border-white/5 shadow-2xl"
            style={{ width: "88vw", height: "84vh" }}
            onClick={e => e.stopPropagation()}
          />
        )}

        {!isI && !isV && !isP && (
          <div className="flex flex-col items-center gap-5" onClick={e => e.stopPropagation()}>
            <div className="size-24 rounded-3xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-zinc-500">description</span>
            </div>
            <div className="text-center">
              <div className="text-base font-semibold text-white mb-3">{name}</div>
              <a
                href={url} download={name} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400
                  text-white text-sm font-bold transition-all"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Tap-to-close hint for images */}
      {isI && (
        <div className="shrink-0 flex justify-center pb-3">
          <span className="text-[10px] text-zinc-700">Scroll to zoom · Click background to close · Esc to close</span>
        </div>
      )}
    </div>
  );
}
