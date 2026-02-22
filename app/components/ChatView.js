/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ChatView.js
   Real-time group chat — dual-sidebar layout
   • Left panel  : channel list (General pinned) + unread badges + pending requests
   • Right panel : messages (with reply quotes) + reply bar + input + file upload
   WebSocket connects to NEXT_PUBLIC_WS_URL (default ws://localhost:3001)
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useRef } from "react";
import { MediaComposer, MediaLightbox } from "./ChatMediaComposer";

/* ── helpers ── */
const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
const isImage = (url) => url && /\.(png|jpe?g|gif|webp|svg)$/i.test(url);

/* ── New Room Request Modal ── */
function NewRoomModal({ onClose, onCreated }) {
  const [name, setName]         = useState("");
  const [agenda, setAgenda]     = useState("");
  const [users, setUsers]       = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch("/api/chat/users").then(r => r.json()).then(d => setUsers(d.users || []));
  }, []);

  const toggle = (uid) =>
    setSelected(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const r = await fetch("/api/chat/rooms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, agenda, member_ids: selected }),
    });
    const d = await r.json();
    setSaving(false);
    if (d.success) { onCreated(d.room); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#141414] border border-[#272727] rounded-2xl w-full max-w-md p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-white">Request New Channel</h2>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Channel Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Project Phoenix"
            className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/40 transition-all" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Agenda / Purpose</label>
          <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={3} placeholder="What's this channel for?"
            className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/40 transition-all resize-none" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Add Members <span className="text-zinc-600 normal-case font-normal">(admins auto-included)</span>
          </label>
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-1">
            {users.length === 0 && <p className="text-xs text-zinc-600 px-1">Loading…</p>}
            {users.map(u => (
              <button key={u.id} onClick={() => toggle(u.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm
                  ${selected.includes(u.id)
                    ? "bg-orange-500/15 border border-orange-500/25 text-white"
                    : "bg-[#181818] border border-transparent text-zinc-400 hover:text-white"}`}>
                <span className={`size-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0
                  ${selected.includes(u.id) ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-400"}`}>
                  {selected.includes(u.id) ? "✓" : u.name[0].toUpperCase()}
                </span>
                <span className="flex-1 truncate">{u.name}</span>
                <span className="text-[10px] text-zinc-600">{u.dept || u.role}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-zinc-400 text-sm font-semibold hover:text-white transition-all">Cancel</button>
          <button onClick={submit} disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all">
            {saving ? "Sending…" : "Send Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Forward Message Modal ── */
function ForwardModal({ msg, rooms, onClose, onForward }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);

  async function submit() {
    if (!selected) return;
    setLoading(true);
    await onForward(msg, selected);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#141414] border border-[#272727] rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-white">Forward Message</h2>
        <div className="text-[11px] text-zinc-400 bg-white/5 p-3 rounded-lg border border-white/5 line-clamp-3">
          {msg.content || msg.file_name || "Attachment"}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Select Chat</label>
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1 pr-1">
            {rooms.length === 0 && <p className="text-xs text-zinc-600 px-1">No chats available</p>}
            {rooms.map(r => (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm
                  ${selected === r.id
                    ? "bg-orange-500/15 border border-orange-500/25 text-white"
                    : "bg-[#181818] border border-transparent text-zinc-400 hover:text-white"}`}>
                <span className="material-symbols-outlined text-[16px] shrink-0">
                  {r.is_default ? "tag" : "forum"}
                </span>
                <span className="flex-1 truncate">{r.name}</span>
                {selected === r.id && <span className="material-symbols-outlined text-sm text-orange-400">check</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-[#2a2a2a] text-zinc-400 text-sm font-semibold hover:text-white transition-all">Cancel</button>
          <button onClick={submit} disabled={!selected || loading}
            className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex justify-center items-center gap-2">
            {loading ? "Forwarding…" : <span><span className="material-symbols-outlined text-sm shrink-0 leading-none mr-1">forward</span>Forward</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reply quote strip inside a bubble ── */
function ReplyQuote({ senderName, content, isMine }) {
  return (
    <div className={`rounded-lg px-3 py-1.5 mb-1 text-[11px] border-l-2 ${
      isMine
        ? "bg-orange-600/30 border-orange-300/50 text-orange-100"
        : "bg-white/5 border-zinc-500/40 text-zinc-400"
    }`}>
      <span className="font-semibold block mb-0.5">{senderName}</span>
      <span className="line-clamp-2 opacity-80">{content}</span>
    </div>
  );
}

/* ── Single message bubble ── */
function Bubble({ msg, isMine, onReply, onMediaClick, isAdmin, onDelete, onForward }) {
  const [hovered, setHovered] = useState(false);
  const isFile   = msg.msg_type === "file";
  const isSystem = msg.msg_type === "system";
  const imgUrl = isFile && /\.(png|jpe?g|gif|webp|svg)$/i.test(msg.file_url || "") && msg.file_url;
  const vidUrl = isFile && /\.(mp4|webm|ogg|mov)$/i.test(msg.file_url || "")    && msg.file_url;

  /* ── System message: render as a centred banner, not a bubble ── */
  if (isSystem) {
    const isCallStart = msg.content?.includes("started a voice call");
    return (
      <div className="flex items-center justify-center gap-3 my-3">
        <div className="flex-1 h-px bg-[#222]" />
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold
          ${isCallStart
            ? "bg-green-500/10 border border-green-500/15 text-green-400"
            : "bg-zinc-800/60 border border-zinc-700/30 text-zinc-500"}`}>
          <span className="material-symbols-outlined text-[13px]">
            {isCallStart ? "call" : "call_end"}
          </span>
          {msg.content}
        </div>
        <div className="flex-1 h-px bg-[#222]" />
      </div>
    );
  }

  return (
    <div className={`group flex gap-2 items-end ${isMine ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Action buttons — show on hover */}
      <div className={`flex flex-col shrink-0 gap-1 transition-all mb-1 ${hovered ? "opacity-100" : "opacity-0"}`}>
        <button onClick={() => onReply(msg)} className="size-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-orange-400 hover:bg-white/5" title="Reply">
          <span className="material-symbols-outlined text-[15px]">reply</span>
        </button>
        <button onClick={() => onForward(msg)} className="size-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-400 hover:bg-white/5" title="Forward">
          <span className="material-symbols-outlined text-[15px]">forward</span>
        </button>
        {(isMine || isAdmin) && (
          <button onClick={() => onDelete(msg)} className="size-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-white/5" title="Delete">
            <span className="material-symbols-outlined text-[15px]">delete</span>
          </button>
        )}
      </div>

      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && <span className="text-[10px] text-zinc-500 px-1">{msg.sender_name}</span>}

        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isMine
            ? "bg-orange-500 text-white rounded-tr-sm"
            : "bg-[#1e1e1e] text-zinc-200 border border-[#2a2a2a] rounded-tl-sm"}`}>
          {/* Reply quote */}
          {msg.reply_to_content && (
            <ReplyQuote senderName={msg.reply_to_sender} content={msg.reply_to_content} isMine={isMine} />
          )}
          {/* Content */}
          {msg.msg_type === "file" ? (
            imgUrl ? (
              /* Clickable image → lightbox */
              <button onClick={() => onMediaClick(msg)} className="block p-0 border-0 bg-transparent cursor-zoom-in">
                <img src={imgUrl} alt={msg.file_name}
                  className="max-w-[220px] max-h-[180px] rounded-xl object-cover hover:opacity-90 transition-opacity" />
              </button>
            ) : vidUrl ? (
              /* Video — click to open lightbox */
              <button onClick={() => onMediaClick(msg)}
                className="relative block rounded-xl overflow-hidden cursor-pointer group/vid">
                <video src={vidUrl} className="max-w-[220px] max-h-[140px] rounded-xl object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/vid:bg-black/50 transition-all">
                  <span className="material-symbols-outlined text-white text-3xl">play_circle</span>
                </div>
              </button>
            ) : (
              /* Other file → download link */
              <button onClick={() => onMediaClick(msg)}
                className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-base">attach_file</span>
                {msg.file_name || "Download file"}
              </button>
            )
          ) : (
            msg.content && msg.content.startsWith(">> Forwarded from ") ? (
              <div className="flex flex-col gap-1">
                <div className={`text-[11px] font-semibold italic opacity-80 border-b pb-1 mb-1 ${isMine ? "border-orange-400/30" : "border-zinc-600/30"}`}>
                  <span className="material-symbols-outlined text-[12px] align-text-bottom mr-1 relative top-[1px]">forward</span>
                  {msg.content.split("\n")[0].replace(">> ", "")}
                </div>
                <span className={`whitespace-pre-wrap break-words italic ${isMine ? "text-orange-100/90" : "text-zinc-300"}`}>
                  {msg.content.split("\n").slice(1).join("\n")}
                </span>
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
            )
          )}
          {/* Caption below file */}
          {isFile && msg.content && (
            <div className="mt-1.5 text-[12px] opacity-80 whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>
        <span className="text-[9px] text-zinc-600 px-1">{fmt(msg.created_at)}</span>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function ChatView({ user, wsRef: sharedWsRef }) {
  const [rooms, setRooms]           = useState([]);
  const [pending, setPending]       = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [typing, setTyping]         = useState([]);
  const [input, setInput]           = useState("");
  const [uploading, setUploading]   = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [composing, setComposing]     = useState(null);  // File being composed before send
  const [lightbox,  setLightbox]      = useState(null);  // msg to show in lightbox
  const [replyTo, setReplyTo]         = useState(null);  // { id, sender_name, content }
  const [forwarding, setForwarding]   = useState(null);  // msg to forward
  const [showSidebar, setShowSidebar] = useState(false); // mobile sidebar toggle

  const wsRef       = useRef(null);
  const globalWsRef = useRef(null);  // background WS for cross-room unread badges
  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const didInitRef  = useRef(false);
  const activeRoomRef = useRef(null); // always reflects latest activeRoom without stale closures

  const isAdminOrHR = user?.role === "ADMIN" || user?.sub_role_dept === "HR";
  /* Primary WS host: localhost (this machine is the server).
     Fallback: NEXT_PUBLIC_WS_FALLBACK_URL for LAN clients opening via IP. */
  const WS_PRIMARY  = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
  const WS_FALLBACK = process.env.NEXT_PUBLIC_WS_FALLBACK_URL
    || (typeof window !== "undefined" ? `ws://${window.location.hostname}:3001` : "ws://localhost:3001");

  /* Keep a ref in sync with activeRoom so the global WS closure never goes stale */
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  /* ── Load rooms list ── */
  async function loadRooms() {
    const r = await fetch("/api/chat/rooms");
    const d = await r.json();
    const roomList = d.rooms || [];
    setRooms(roomList);
    setPending(d.pending || []);
    if (!didInitRef.current && roomList.length) {
      didInitRef.current = true;
      const gen = roomList.find(r => r.id === "general") || roomList[0];
      setActiveRoom(gen);
    }
  }

  useEffect(() => {
    loadRooms();

    /* Open a global WS for cross-room badge updates — try localhost, fallback to env */
    async function connectGlobal(url = WS_PRIMARY) {
      const tRes = await fetch("/api/chat/ws-ticket");
      if (!tRes.ok) return;
      const { token } = await tRes.json();
      if (!token) return;

      const gws = new WebSocket(`${url}?room=global&token=${encodeURIComponent(token)}`);
      globalWsRef.current = gws;
      if (sharedWsRef) sharedWsRef.current = gws;

      gws.onerror = () => {
        if (url === WS_PRIMARY && WS_FALLBACK !== WS_PRIMARY) {
          console.warn("[ChatView] global WS localhost failed, trying fallback:", WS_FALLBACK);
          gws.close();
          connectGlobal(WS_FALLBACK);
        }
      };

      gws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "global_message") {
          const incomingRoom = data.room_id;
          if (activeRoomRef.current?.id === incomingRoom) return;
          setRooms(prev =>
            prev.map(r =>
              r.id === incomingRoom
                ? { ...r, unread_count: (r.unread_count || 0) + 1 }
                : r
            )
          );
        }
      };
    }
    connectGlobal();

    return () => {
      if (globalWsRef.current) { globalWsRef.current.close(); globalWsRef.current = null; }
    };
  }, []);

  /* ── Mark room as read & connect WebSocket ── */
  useEffect(() => {
    if (!activeRoom) return;
    let ws;

    /* Instantly clear the badge in local state */
    setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, unread_count: 0 } : r));

    /* Mark as read in DB */
    fetch(`/api/chat/rooms/${activeRoom.id}/read`, { method: "POST" })
      .then(() => {
        loadRooms();
        window.dispatchEvent(new Event("chat:read"));
      });

    /* Connect to the specific room WS — try localhost first, fallback on error */
    async function connect(url = WS_PRIMARY) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

      const ticketRes = await fetch("/api/chat/ws-ticket");
      if (!ticketRes.ok) return;
      const { token } = await ticketRes.json();
      if (!token) return;

      ws = new WebSocket(`${url}?room=${activeRoom.id}&token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      setMessages([]); setTyping([]);

      ws.onerror = () => {
        if (url === WS_PRIMARY && WS_FALLBACK !== WS_PRIMARY) {
          console.warn("[ChatView] room WS localhost failed, trying fallback:", WS_FALLBACK);
          ws.close();
          connect(WS_FALLBACK);
        }
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "history") {
          setMessages(data.messages);
        } else if (data.type === "message") {
          setMessages(p => [...p, data]);
          /* Auto-mark as read since this room is open */
          fetch(`/api/chat/rooms/${activeRoom.id}/read`, { method: "POST" })
            .then(() => window.dispatchEvent(new Event("chat:read")));
        } else if (data.type === "delete_message") {
          setMessages(p => p.filter(m => m.id !== data.messageId));
        } else if (data.type === "typing") {
          if (data.user_id === user?.id) return;
          setTyping(p => {
            const has = p.find(t => t.user_id === data.user_id);
            return has ? p : [...p, { user_id: data.user_id, user_name: data.user_name }];
          });
          setTimeout(() => setTyping(p => p.filter(t => t.user_id !== data.user_id)), 2500);
        }
      };
    }

    connect();
    return () => { if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } };
  }, [activeRoom?.id]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* ── Send message ── */
  function send() {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: "message",
      roomId: activeRoom.id,
      content: input.trim(),
      reply_to_id: replyTo?.id || undefined,
    }));
    setInput(""); setReplyTo(null);
  }

  /* ── Typing indicator ── */
  function onInputChange(v) {
    setInput(v);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", roomId: activeRoom.id }));
    }
  }

  /* ── Composer send handler ── */
  async function onComposerSend(blobOrFile, filename, caption) {
    setComposing(null);
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    /* Upload the file/blob */
    const fd = new FormData();
    fd.append("file", blobOrFile, filename);
    const r = await fetch(`/api/chat/rooms/${activeRoom.id}/upload`, { method: "POST", body: fd });
    const d = await r.json();
    if (!d.success) return;

    /* Send WS message */
    wsRef.current.send(JSON.stringify({
      type:        "message",
      roomId:      activeRoom.id,
      msg_type:    "file",
      file_url:    d.url,
      file_name:   d.file_name,
      content:     caption || undefined,    // caption as content
      reply_to_id: replyTo?.id || undefined,
    }));
    setReplyTo(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ── File upload (legacy — now goes through composer) ── */
  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`/api/chat/rooms/${activeRoom.id}/upload`, { method: "POST", body: fd });
    const d = await r.json();
    setUploading(false);
    if (d.success && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message", roomId: activeRoom.id,
        msg_type: "file", file_url: d.url, file_name: d.file_name,
        reply_to_id: replyTo?.id || undefined,
      }));
      setReplyTo(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ── Delete message ── */
  function onDeleteMessage(msg) {
    if (!confirm("Delete this message?")) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "delete_message", messageId: msg.id }));
    }
  }

  /* ── Forward message ── */
  async function onForwardSend(msg, targetRoomId) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      let fwdContent = msg.content || "";
      if (fwdContent && !fwdContent.startsWith(">> Forwarded")) {
        fwdContent = `>> Forwarded from ${msg.sender_name}:\n` + fwdContent;
      } else if (!fwdContent) {
        fwdContent = `>> Forwarded from ${msg.sender_name}`;
      }

      wsRef.current.send(JSON.stringify({
        type:        "message",
        roomId:      targetRoomId,
        msg_type:    msg.msg_type,
        file_url:    msg.file_url,
        file_name:   msg.file_name,
        content:     fwdContent
      }));
    }
  }

  /* ── Approve / Reject pending room ── */
  async function handleRequest(rid, action) {
    await fetch(`/api/chat/rooms/${rid}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadRooms();
  }

  /* ── Delete room (admin) ── */
  async function deleteRoom(rid) {
    if (!confirm("Delete this channel? This cannot be undone.")) return;
    await fetch(`/api/chat/rooms/${rid}`, { method: "DELETE" });
    if (activeRoom?.id === rid) setActiveRoom(null);
    await loadRooms();
  }

  /* ── Render messages with date separators ── */
  function renderMessages() {
    let lastDate = null;
    const els = [];
    messages.forEach((m) => {
      const d = fmtDate(m.created_at);
      if (d !== lastDate) {
        lastDate = d;
        els.push(
          <div key={`sep-${m.id}`} className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#232323]" />
            <span className="text-[10px] text-zinc-600">{d}</span>
            <div className="flex-1 h-px bg-[#232323]" />
          </div>
        );
      }
      els.push(
        <Bubble
            key={m.id}
            msg={m}
            isMine={m.sender_id === user?.id}
            isAdmin={user?.role === "ADMIN"}
            onReply={(msg) => setReplyTo({ id: msg.id, sender_name: msg.sender_name, content: msg.content || msg.file_name })}
            onMediaClick={(msg) => setLightbox(msg)}
            onDelete={onDeleteMessage}
            onForward={(msg) => setForwarding(msg)}
          />
      );
    });
    return els;
  }

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#0c0c0c] overflow-hidden md:rounded-xl md:border md:border-[#1e1e1e] relative">

      {/* ── Mobile sidebar backdrop ── */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* ── Left sidebar: channels ── */}
      <aside className={`
        fixed md:relative z-50 md:z-auto
        inset-y-0 left-0 md:inset-auto
        w-72 md:w-60
        border-r border-[#1a1a1a] flex flex-col bg-[#0e0e0e] shrink-0
        transition-transform duration-300
        ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-white tracking-wider">CHANNELS</span>
          <button onClick={() => setShowNew(true)}
            className="size-6 rounded flex items-center justify-center text-zinc-500 hover:text-orange-400 transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
          {rooms.map(r => {
            const isActive  = activeRoom?.id === r.id;
            const hasUnread = !isActive && r.unread_count > 0;
            return (
              <button key={r.id} onClick={() => { setActiveRoom(r); setShowSidebar(false); }}
                className={`group w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all
                  ${isActive
                    ? "bg-orange-500/10 border border-orange-500/20 text-white"
                    : "text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent"}`}>
                <span className="material-symbols-outlined text-sm shrink-0">
                  {r.is_default ? "tag" : "forum"}
                </span>
                <span className={`text-sm truncate flex-1 ${hasUnread ? "font-semibold text-white" : ""}`}>{r.name}</span>
                {/* Unread badge */}
                {hasUnread && (
                  <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {r.unread_count > 99 ? "99+" : r.unread_count}
                  </span>
                )}
                {/* Delete (admin, non-general) */}
                {!r.is_default && user?.role === "ADMIN" && (
                  <button onClick={e => { e.stopPropagation(); deleteRoom(r.id); }}
                    className={`text-zinc-700 hover:text-red-400 transition-all ${hasUnread ? "hidden group-hover:flex" : "opacity-0 group-hover:opacity-100"}`}>
                    <span className="material-symbols-outlined text-xs">delete</span>
                  </button>
                )}
              </button>
            );
          })}

          {/* Pending requests (admin/HR only) */}
          {isAdminOrHR && pending.length > 0 && (
            <div className="mt-3">
              <div className="px-3 py-1 flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">Requests</span>
                <span className="size-4 rounded-full bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {pending.length}
                </span>
              </div>
              {pending.map(r => (
                <div key={r.id} className="mx-1 bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 mb-1.5">
                  <div className="text-xs font-semibold text-white truncate mb-0.5">{r.name}</div>
                  <div className="text-[10px] text-zinc-600 mb-1">{r.created_by_name}</div>
                  {r.agenda && <div className="text-[10px] text-zinc-500 mb-2 line-clamp-2">{r.agenda}</div>}
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRequest(r.id, "approve")}
                      className="flex-1 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-all">
                      Approve
                    </button>
                    <button onClick={() => handleRequest(r.id, "reject")}
                      className="flex-1 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-all">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: user info */}
        <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center gap-2">
          <div className="size-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[9px] text-zinc-600">
              {user?.role === "ADMIN" ? "Admin" : user?.sub_role_dept || "Employee"}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right: message area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#1a1a1a] flex items-center gap-3 shrink-0">
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden size-7 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
                onClick={() => setShowSidebar(true)}
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
              <span className="material-symbols-outlined text-orange-400 text-sm shrink-0">
                {activeRoom.is_default ? "tag" : "forum"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{activeRoom.name}</div>
                {activeRoom.agenda && (
                  <div className="text-[10px] text-zinc-600 truncate">{activeRoom.agenda}</div>
                )}
              </div>
              {/* Call button */}
              <button
                onClick={() => window.__callManager?.requestCall(activeRoom.id, activeRoom.name)}
                className="size-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all shrink-0"
                title="Start voice call"
              >
                <span className="material-symbols-outlined text-[18px]">phone</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 flex flex-col gap-1">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-2 py-12">
                  <span className="material-symbols-outlined text-4xl">forum</span>
                  <span className="text-sm">No messages yet. Say hello!</span>
                </div>
              )}
              {renderMessages()}

              {/* Typing indicator */}
              {typing.length > 0 && (
                <div className="flex items-center gap-2 mt-2 self-start">
                  <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="size-1.5 rounded-full bg-zinc-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {typing.map(t => t.user_name).join(", ")} typing…
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply preview bar */}
            {replyTo && (
              <div className="mx-2 md:mx-4 mb-0 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] border-b-0 rounded-t-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-orange-400 text-sm shrink-0">reply</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold text-orange-400">{replyTo.sender_name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{replyTo.content}</div>
                </div>
                <button onClick={() => setReplyTo(null)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            {/* Input bar */}
            <div className="px-2 md:px-4 py-3 border-t border-[#1a1a1a] shrink-0">
              <div className={`flex items-end gap-2 bg-[#141414] border border-[#2a2a2a] px-3 py-2.5 focus-within:border-orange-500/30 transition-all ${replyTo ? "rounded-b-2xl rounded-t-none" : "rounded-2xl"}`}>
                {/* File attach */}
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-orange-400 transition-colors shrink-0">
                  <span className="material-symbols-outlined text-sm">
                    {uploading ? "hourglass_empty" : "attach_file"}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) setComposing(f);
                  }}
                />

                {/* Text input */}
                <textarea
                  value={input}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                    if (e.key === "Escape" && replyTo) setReplyTo(null);
                  }}
                  placeholder={`Message #${activeRoom.name}…`}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none resize-none min-h-[24px] max-h-28 leading-6"
                  style={{ overflowY: "auto" }}
                />

                {/* Send */}
                <button onClick={send} disabled={!input.trim()}
                  className="size-7 rounded-lg flex items-center justify-center bg-orange-500 hover:bg-orange-400 disabled:opacity-30 transition-all shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">send</span>
                </button>
              </div>
              <div className="text-[10px] text-zinc-700 mt-1 px-1 hidden md:block">
                Enter to send · Shift+Enter new line{replyTo ? " · Esc to cancel reply" : ""}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-3 px-4">
            <span className="material-symbols-outlined text-5xl">chat_bubble_outline</span>
            <span className="text-sm text-center">Select a channel to start chatting</span>
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setShowSidebar(true)}
                className="md:hidden text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-sm">menu</span> Open channels
              </button>
              <button onClick={() => setShowNew(true)}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-sm">add</span> New channel request
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Room Modal */}
      {showNew && <NewRoomModal onClose={() => setShowNew(false)} onCreated={() => loadRooms()} />}

      {/* Forward Modal */}
      {forwarding && (
        <ForwardModal
          msg={forwarding}
          rooms={rooms}
          onClose={() => setForwarding(null)}
          onForward={onForwardSend}
        />
      )}

      {/* Pre-send media composer */}
      {composing && (
        <MediaComposer
          file={composing}
          onSend={onComposerSend}
          onCancel={() => { setComposing(null); if (fileRef.current) fileRef.current.value = ""; }}
        />
      )}

      {/* Media lightbox viewer */}
      {lightbox && <MediaLightbox msg={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
