/* ─────────────────────────────────────────────────────────────────────────────
   app/components/CallManager.js
   Auto-join model — no accept/decline. CallManager owns its own global WS.
── */
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useWebRTCCall, useAudioLevel } from "../hooks/useWebRTCCall";

/* Primary: always try localhost first (works when this machine IS the server).
   Fallback: NEXT_PUBLIC_WS_FALLBACK_URL (set in .env.local, e.g. ws://192.168.x.x:3001)
   for LAN clients who can't reach localhost but can reach the server's LAN IP. */
const WS_PRIMARY  = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
const WS_FALLBACK = process.env.NEXT_PUBLIC_WS_FALLBACK_URL
  || (typeof window !== "undefined" ? `ws://${window.location.hostname}:3001` : "ws://localhost:3001");

/* ═══════════════════════════════════════════════════════════
   Participant card — glows green when speaking
═══════════════════════════════════════════════════════════ */
function ParticipantCard({ stream, label, isLocal, isMuted, noCam }) {
  const vidRef    = useRef(null);
  const audioRef  = useRef(null);
  const level     = useAudioLevel(isLocal ? null : stream);
  const isSpeaking = level > 14;

  /* Set srcObject the instant the video element mounts */
  const assignVideo = useCallback((el) => {
    vidRef.current = el;
    if (el && stream) { el.srcObject = stream; el.muted = true; }
  }, [stream]);

  useEffect(() => {
    if (vidRef.current && stream) { vidRef.current.srcObject = stream; vidRef.current.muted = true; }
  }, [stream, noCam]);

  /* Dedicated audio element for remote participants (bypasses autoplay mute policy) */
  useEffect(() => {
    if (audioRef.current && stream && !isLocal) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(e => console.warn("[Audio] play failed:", e.message));
    }
  }, [stream, isLocal]);

  return (
    <div
      style={{ aspectRatio: "16/9" }}
      className={`relative rounded-2xl overflow-hidden bg-[#131313] flex items-center justify-center
        transition-all duration-100
        ${isSpeaking
          ? "ring-2 ring-green-400 shadow-[0_0_20px_4px_rgba(74,222,128,0.22)] scale-[1.02]"
          : "ring-1 ring-white/5"}`}
    >
      {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />}

      {stream && !noCam ? (
        <video ref={assignVideo} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className={`size-16 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-all
            ${isSpeaking ? "border-green-400 bg-green-500/10 scale-110" : "border-zinc-700 bg-zinc-800"}`}>
            <span className="text-white">{label?.[0]?.toUpperCase() || "?"}</span>
          </div>
          <span className="text-xs text-zinc-400">{label}</span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-white/90 bg-black/40 rounded-full px-2 py-0.5">
          {isLocal ? "You" : label}
        </span>
        {isMuted && (
          <span className="size-5 rounded-full bg-red-500/80 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[11px]">mic_off</span>
          </span>
        )}
        {isSpeaking && !isMuted && (
          <span className="size-5 rounded-full bg-green-500/70 flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-white text-[11px]">graphic_eq</span>
          </span>
        )}
      </div>
      {isLocal && <div className="absolute top-2 right-2 size-2 rounded-full bg-green-400 animate-pulse" />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Mic device picker
═══════════════════════════════════════════════════════════ */
function MicPicker({ onSelect }) {
  const [devices, setDevices] = useState([]);
  const [open, setOpen]       = useState(false);
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(ds =>
      setDevices(ds.filter(d => d.kind === "audioinput"))
    );
  }, []);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="size-12 rounded-full bg-[#252525] hover:bg-[#333] text-zinc-300 hover:text-white flex items-center justify-center transition-all"
        title="Change microphone">
        <span className="material-symbols-outlined text-xl">settings_voice</span>
      </button>
      {open && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-20 min-w-60 max-h-48 overflow-y-auto">
          {devices.map(d => (
            <button key={d.deviceId} onClick={() => { onSelect(d.deviceId); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-all truncate">
              {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
            </button>
          ))}
          {!devices.length && <div className="px-4 py-3 text-xs text-zinc-600">No devices found</div>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Active call modal — Google Meet grid
═══════════════════════════════════════════════════════════ */
function ActiveCallModal({ callRoomName, user, participants, localStream, remoteStreams,
  screenStream, isMuted, isCameraOff, onLeave, onToggleMute, onToggleCamera, onToggleScreen, onChangeMic }) {
  const [page, setPage] = useState(0);
  const PAGE = 8;

  const allCards = [
    { userId: user?.id, userName: user?.name, isLocal: true },
    ...participants,
  ];
  const totalPages = Math.ceil(allCards.length / PAGE);
  const visible    = allCards.slice(page * PAGE, (page + 1) * PAGE);
  const count      = visible.length;

  const grid = count === 1 ? "grid-cols-1"
    : count === 2          ? "grid-cols-1 md:grid-cols-2"
    : count <= 4           ? "grid-cols-2"
    : count <= 6           ? "grid-cols-2 md:grid-cols-3"
    : "grid-cols-2 md:grid-cols-4";

  return (
    <div className="fixed inset-0 z-[600] bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
        <div className="size-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-semibold text-white flex-1 text-sm">{callRoomName || "Group Call"}</span>
        <span className="text-xs text-zinc-500">{allCards.length} participant{allCards.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Participant grid */}
      <div className={`flex-1 overflow-auto min-h-0 p-3 md:p-4 grid ${grid} gap-3 content-start`}
        style={{ gridAutoRows: count <= 2 ? "1fr" : "auto" }}>
        {visible.map(card => (
          <ParticipantCard
            key={card.userId}
            stream={card.isLocal ? (screenStream || localStream) : remoteStreams[card.userId]}
            label={card.userName}
            isLocal={card.isLocal}
            isMuted={card.isLocal ? isMuted : false}
            noCam={card.isLocal ? (isCameraOff && !screenStream) : !remoteStreams[card.userId]}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-1.5 shrink-0">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="size-7 rounded-full bg-white/5 text-zinc-400 flex items-center justify-center disabled:opacity-30 hover:bg-white/10">
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <span className="text-xs text-zinc-500">{page + 1} / {totalPages}</span>
          <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="size-7 rounded-full bg-white/5 text-zinc-400 flex items-center justify-center disabled:opacity-30 hover:bg-white/10">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-3 md:gap-5 py-4 border-t border-white/5">
        <button onClick={onToggleMute}
          className={`size-12 rounded-full flex items-center justify-center transition-all
            ${isMuted ? "bg-red-500 text-white" : "bg-[#252525] text-zinc-300 hover:bg-[#333] hover:text-white"}`}
          title={isMuted ? "Unmute" : "Mute"}>
          <span className="material-symbols-outlined text-xl">{isMuted ? "mic_off" : "mic"}</span>
        </button>

        <MicPicker onSelect={onChangeMic} />

        <button onClick={onToggleCamera}
          className={`size-12 rounded-full flex items-center justify-center transition-all
            ${isCameraOff ? "bg-red-500 text-white" : "bg-[#252525] text-zinc-300 hover:bg-[#333] hover:text-white"}`}
          title={isCameraOff ? "Camera on" : "Camera off"}>
          <span className="material-symbols-outlined text-xl">{isCameraOff ? "videocam_off" : "videocam"}</span>
        </button>

        <button onClick={onToggleScreen}
          className={`size-12 rounded-full flex items-center justify-center transition-all
            ${screenStream ? "bg-orange-500 text-white" : "bg-[#252525] text-zinc-300 hover:bg-[#333] hover:text-white"}`}
          title={screenStream ? "Stop sharing" : "Share screen"}>
          <span className="material-symbols-outlined text-xl">{screenStream ? "cancel_presentation" : "present_to_all"}</span>
        </button>

        <button onClick={onLeave}
          className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center gap-2 transition-all">
          <span className="material-symbols-outlined text-xl">call_end</span>
          <span className="hidden md:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main export — mount once in DashboardShell
═══════════════════════════════════════════════════════════ */
export default function CallManager({ user }) {
  const ownWsRef = useRef(null);

  const {
    callId, callRoomId, callRoomName, callStatus,
    localStream, remoteStreams, participants, screenStream,
    isMuted, isCameraOff,
    startCall, leaveCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare, changeMic,
    handleCallEvent,
  } = useWebRTCCall({ wsRef: ownWsRef, user });

  /* Always call the LATEST handleCallEvent (avoids stale closure) */
  const handleCallEventRef = useRef(handleCallEvent);
  useEffect(() => { handleCallEventRef.current = handleCallEvent; }, [handleCallEvent]);

  /* ── Own global WS — tries localhost first, falls back to WS_FALLBACK on error ── */
  useEffect(() => {
    let ws, retry;
    async function connect(url = WS_PRIMARY) {
      try {
        const res = await fetch("/api/chat/ws-ticket");
        if (!res.ok) return;
        const { token } = await res.json();
        if (!token) return;
        ws = new WebSocket(`${url}?room=global&token=${encodeURIComponent(token)}`);
        ws.onopen  = () => { ownWsRef.current = ws; console.log("[CallManager] WS connected to", url); };
        ws.onclose = () => { ownWsRef.current = null; retry = setTimeout(() => connect(url), 3000); };
        ws.onerror = () => {
          /* Primary failed — try fallback once, then let onclose handle retries */
          if (url === WS_PRIMARY && WS_FALLBACK !== WS_PRIMARY) {
            console.warn("[CallManager] localhost WS failed, trying fallback:", WS_FALLBACK);
            ws.close();
            connect(WS_FALLBACK);
          }
        };
        ws.onmessage = (e) => {
          let d;
          try { d = JSON.parse(e.data); } catch { return; }
          console.log("[CallManager] WS msg:", d.type, d);
          const CALL_TYPES = new Set([
            "call-joined",
            "call-participant-joined", "call-participant-left",
            "call-ended", "offer", "answer", "ice-candidate",
          ]);
          if (CALL_TYPES.has(d.type)) {
            handleCallEventRef.current(d).catch(err =>
              console.error("[CallManager] handleCallEvent error:", err)
            );
          }
        };
      } catch (err) {
        console.error("[CallManager] connect error:", err);
      }
    }
    connect();
    return () => { clearTimeout(retry); ws?.close(); };
  }, []);

  /* Expose trigger for ChatView call button — instant join, no confirm dialog */
  useEffect(() => {
    window.__callManager = {
      /* Immediately start or join the voice room — Discord style */
      requestCall: (roomId, roomName) => startCall(roomId, roomName),
    };
    return () => { delete window.__callManager; };
  }, [startCall]);

  return (
    <>

      {/* Active call grid */}
      {callStatus === "active" && (
        <ActiveCallModal
          callRoomName={callRoomName}
          user={user}
          participants={participants}
          localStream={localStream}
          remoteStreams={remoteStreams}
          screenStream={screenStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onLeave={leaveCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreen={toggleScreenShare}
          onChangeMic={changeMic}
        />
      )}

      {/* Call ended toast */}
      {callStatus === "ended" && (
        <div className="fixed bottom-6 right-6 z-[800] bg-[#111] border border-zinc-800 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-zinc-500 text-lg">call_end</span>
          <span className="text-sm text-zinc-400 font-medium">Call ended</span>
        </div>
      )}
    </>
  );
}
