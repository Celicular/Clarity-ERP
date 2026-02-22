/* ─────────────────────────────────────────────────────────────────────────────
   app/hooks/useWebRTCCall.js
   WebRTC hook — auto-join model (no accept/decline), mesh topology, trickle ICE
── */
"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/* ── Audio level analyser (speaking indicator) ── */
export function useAudioLevel(stream) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!stream) { setLevel(0); return; }
    if (typeof AudioContext === "undefined" && typeof webkitAudioContext === "undefined") return;
    let ctx, analyser, source;
    try {
      ctx      = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source   = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setLevel(Math.min(100, (avg / 128) * 100));
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch { setLevel(0); }
    return () => {
      cancelAnimationFrame(rafRef.current);
      source?.disconnect();
      ctx?.close();
    };
  }, [stream]);
  return level;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function useWebRTCCall({ wsRef, user }) {
  const [callId,        setCallId]       = useState(null);
  const [callRoomId,    setCallRoomId]   = useState(null);
  const [callRoomName,  setCallRoomName] = useState(null);
  const [callStatus,    setCallStatus]   = useState("idle");
  const [localStream,   setLocalStream]  = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants,  setParticipants] = useState([]);
  const [isMuted,       setIsMuted]      = useState(false);
  const [isCameraOff,   setIsCameraOff]  = useState(false);
  const [screenStream,  setScreenStream] = useState(null);

  const peersRef       = useRef({});
  const localStreamRef = useRef(null);
  const iceBufRef      = useRef({});  // buffer ICE before setRemoteDescription

  function send(obj) {
    if (wsRef.current?.readyState === 1) {
      console.log("[WebRTC] send:", obj.type, "to", obj.targetUserId || "server");
      wsRef.current.send(JSON.stringify(obj));
    } else {
      console.warn("[WebRTC] send DROPPED (WS state:", wsRef.current?.readyState, "):", obj.type);
    }
  }

  /* ── Create/retrieve RTCPeerConnection ── */
  function getPeer(remoteUserId) {
    if (peersRef.current[remoteUserId]) return peersRef.current[remoteUserId];

    /* No bundlePolicy override — browser default is fine and avoids m-line mismatch issues */
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    /* Add local tracks immediately so they're included in the SDP offer */
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: "ice-candidate", targetUserId: remoteUserId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        console.log(`[WebRTC] got remote track from ${remoteUserId}`);
        setRemoteStreams(prev => ({ ...prev, [remoteUserId]: streams[0] }));
      }
    };

    pc.onconnectionstatechange = () =>
      console.log(`[WebRTC] ${remoteUserId} → ${pc.connectionState}`);
    pc.oniceconnectionstatechange = () =>
      console.log(`[WebRTC] ICE ${remoteUserId} → ${pc.iceConnectionState}`);

    peersRef.current[remoteUserId] = pc;
    return pc;
  }

  /* Flush buffered ICE candidates once remote description is set */
  async function flushIce(remoteUserId, pc) {
    const buf = iceBufRef.current[remoteUserId] || [];
    delete iceBufRef.current[remoteUserId];
    for (const c of buf) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e =>
        console.warn("[WebRTC] buffered ICE error:", e.message)
      );
    }
  }

  /* ── Open microphone (audio-only — no video m-line to mismatch) ── */
  async function openMedia() {
    if (localStreamRef.current) return localStreamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("[WebRTC] getUserMedia not available — need HTTPS or localhost");
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
        video: false,
      });
      console.log("[WebRTC] mic opened, tracks:", stream.getTracks().map(t => `${t.kind}:${t.label}`));
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraOff(true); // always, since audio-only
      return stream;
    } catch (err) {
      console.error("[WebRTC] getUserMedia failed:", err.name, err.message);
      return null;
    }
  }

  function closeMedia() {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    screenStream?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
  }

  function closeAllPeers() {
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    iceBufRef.current = {};
    setRemoteStreams({});
    setParticipants([]);
  }

  /* ── Start/join call ── */
  async function startCall(roomId, roomName) {
    await openMedia();
    setCallRoomId(roomId);
    setCallRoomName(roomName);
    send({ type: "start-call", roomId });
  }

  function leaveCall() {
    if (callId) send({ type: "leave-call", callId });
    closeAllPeers();
    closeMedia();
    setCallId(null); setCallRoomId(null); setCallRoomName(null);
    setCallStatus("idle");
  }

  function endCall() {
    if (callId) send({ type: "end-call", callId });
    closeAllPeers();
    closeMedia();
    setCallId(null); setCallRoomId(null); setCallRoomName(null);
    setCallStatus("idle");
  }

  function toggleMute() {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
  }
  function toggleCamera() {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsCameraOff(!t.enabled); }
  }

  async function toggleScreenShare() {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam) {
        cam.enabled = true;
        for (const pc of Object.values(peersRef.current)) {
          const s = pc.getSenders().find(x => x.track?.kind === "video");
          if (s) s.replaceTrack(cam);
        }
      }
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const vt = ss.getVideoTracks()[0];
        setScreenStream(ss);
        for (const pc of Object.values(peersRef.current)) {
          const s = pc.getSenders().find(x => x.track?.kind === "video");
          if (s) s.replaceTrack(vt);
        }
        vt.onended = () => toggleScreenShare();
      } catch {}
    }
  }

  async function changeMic(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const ns = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
    });
    const newTrack = ns.getAudioTracks()[0];
    for (const pc of Object.values(peersRef.current)) {
      const s = pc.getSenders().find(x => x.track?.kind === "audio");
      if (s) s.replaceTrack(newTrack);
    }
    localStreamRef.current?.getAudioTracks().forEach(t => t.stop());
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => localStreamRef.current.removeTrack(t));
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(localStreamRef.current);
    }
  }

  /* ── All call/RTC events from the WS ── */
  const handleCallEvent = useCallback(async (data) => {
    console.log("[WebRTC] event:", data.type, data);
    switch (data.type) {

      /* ── call-joined: open mic + set state. No offers yet — wait for others to reach out. ── */
      case "call-joined": {
        await openMedia();
        console.log("[WebRTC] call-joined — mic open, waiting. tracks:",
          localStreamRef.current?.getTracks().map(t => `${t.kind}:${t.readyState}`) ?? "NONE");
        setCallStatus("active");
        if (data.callId) setCallId(data.callId);
        if (data.roomId) setCallRoomId(data.roomId);
        setParticipants(data.participants || []);
        /* Existing participants will send us offers via call-participant-joined on their side */
        break;
      }

      /* incoming-call / call-already-active removed — Discord model: no push ringing */

      /* ── Someone new joined — WE are already in, so WE offer to them ── */
      case "call-participant-joined": {
        setParticipants(prev =>
          prev.find(p => p.userId === data.userId) ? prev
            : [...prev, { userId: data.userId, userName: data.userName }]
        );
        /* Only offer if we already have media open (i.e. we're in the call) */
        if (localStreamRef.current) {
          console.log("[WebRTC] new joiner", data.userId, "— sending offer as existing participant");
          const pc    = getPeer(data.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: "offer", targetUserId: data.userId, sdp: pc.localDescription });
        }
        break;
      }

      case "call-participant-left": {
        const pc = peersRef.current[data.userId];
        if (pc) { pc.close(); delete peersRef.current[data.userId]; }
        setRemoteStreams(prev => { const n = { ...prev }; delete n[data.userId]; return n; });
        setParticipants(prev => prev.filter(p => p.userId !== data.userId));
        break;
      }

      case "call-ended":
        closeAllPeers();
        closeMedia();
        setCallId(null); setCallRoomId(null); setCallRoomName(null);
        setCallStatus("ended");
        setTimeout(() => setCallStatus("idle"), 2500);
        break;

      /* ── WebRTC signalling ── */
      case "offer": {
        console.log("[WebRTC] received offer from", data.fromUserId);
        try {
          const stream = await openMedia();
          if (!stream) {
            console.error("[WebRTC] offer handler: mic unavailable, cannot answer");
            break;
          }
          const pc = getPeer(data.fromUserId);
          console.log("[WebRTC] answering, senders:", pc.getSenders().length,
            "tracks:", stream.getTracks().map(t => `${t.kind}:${t.readyState}`));
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushIce(data.fromUserId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("[WebRTC] answer sending to", data.fromUserId);
          send({ type: "answer", targetUserId: data.fromUserId, sdp: pc.localDescription });
          setParticipants(prev =>
            prev.find(p => p.userId === data.fromUserId) ? prev
              : [...prev, { userId: data.fromUserId, userName: data.fromUserName || "User" }]
          );
        } catch (err) {
          console.error("[WebRTC] offer handler FAILED:", err.name, err.message, err);
        }
        break;
      }

      case "answer": {
        console.log("[WebRTC] received answer from", data.fromUserId);
        const pc = peersRef.current[data.fromUserId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch(e =>
            console.warn("[WebRTC] setRemoteDescription(answer) error:", e.message)
          );
          await flushIce(data.fromUserId, pc);
          console.log("[WebRTC] answer applied, ICE state:", pc.iceConnectionState);
        } else {
          console.warn("[WebRTC] answer: no peer for", data.fromUserId);
        }
        break;
      }

      case "ice-candidate": {
        const pc = peersRef.current[data.fromUserId];
        if (!pc || !data.candidate) break;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e =>
            console.warn("[WebRTC] addIceCandidate error:", e.message)
          );
        } else {
          /* Buffer until setRemoteDescription completes */
          if (!iceBufRef.current[data.fromUserId]) iceBufRef.current[data.fromUserId] = [];
          iceBufRef.current[data.fromUserId].push(data.candidate);
        }
        break;
      }
    }
  /* No state deps needed — all handlers read from `data.*`, not from closed-over state.
     Stable callback = no stale-ref window where an incoming offer gets dropped. */
  }, []);

  return {
    callId, callRoomId, callRoomName, callStatus,
    localStream, remoteStreams, participants,
    isMuted, isCameraOff, screenStream,
    startCall, leaveCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare, changeMic,
    handleCallEvent,
  };
}
