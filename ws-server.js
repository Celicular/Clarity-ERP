/**
 * ws-server.js  — Standalone WebSocket chat + calling server (port 3001)
 * Runs in parallel with Next.js / Turbopack via `npm run dev`.
 * JWT secret must match the one used by Next.js auth.
 */
require("dotenv").config({ path: ".env.local" });
const { WebSocketServer, WebSocket } = require("ws");
const { Pool }   = require("pg");
const { jwtVerify } = require("jose");
const { createSecretKey } = require("crypto");

const PORT   = Number(process.env.WS_PORT  || 3001);
const SECRET = process.env.JWT_SECRET;

if (!SECRET) { console.error("WS: JWT_SECRET not set"); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const query = (text, params) => pool.query(text, params);

/* Pre-build the HMAC key once */
const jwtKey = createSecretKey(Buffer.from(SECRET, "utf8"));

/* ── In-memory state ── */
const rooms        = new Map();  // chatRoomId → Set<ws>
const presence     = new Map();  // userId     → ws  (for badge broadcasts)
const callPresence = new Map();  // userId     → ws  (global WS only — used for call relay)
const callRooms    = new Map();  // callId     → Set<ws>

/* ── JWT validation ── */
async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, jwtKey, { algorithms: ["HS256"] });
    return payload; // { id, name, role, sub_role_dept, ... }
  } catch {
    return null;
  }
}

/* ── Broadcast to everyone in a chat room (optionally except one sender) ── */
function broadcast(roomId, data, except = null) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  const payload = JSON.stringify(data);
  for (const ws of clients) {
    if (ws !== except && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/* ── Broadcast to everyone in a call room ── */
function broadcastCall(callId, data, except = null) {
  const clients = callRooms.get(callId);
  if (!clients) return;
  const payload = JSON.stringify(data);
  for (const ws of clients) {
    if (ws !== except && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/* ── Send to a specific user by userId (O(1) via presence map) ── */
function sendTo(userId, data) {
  const ws = presence.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/* ── Fetch last N messages for a room (with reply preview & read receipts) ── */
async function fetchHistory(roomId, limit = 60) {
  const { rows } = await query(
    `SELECT m.*, 
            u.name AS sender_name,
            rm.content AS reply_to_content,
            ru.name    AS reply_to_sender,
            (
              SELECT COALESCE(json_agg(
                json_build_object('id', crr.user_id, 'name', uu.name, 'read_at', crr.last_read_at)
              ), '[]'::json)
              FROM chat_room_reads crr
              JOIN users uu ON uu.id = crr.user_id
              WHERE crr.room_id = m.room_id 
                AND crr.user_id != m.sender_id
                AND crr.last_read_at >= (m.created_at - interval '1 second')
            ) AS read_by,
            (
              SELECT COUNT(*)::int 
              FROM chat_room_members 
              WHERE room_id = m.room_id
            ) AS total_members
     FROM chat_messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN chat_messages rm ON rm.id = m.reply_to_id
     LEFT JOIN users ru ON ru.id = rm.sender_id
     WHERE m.room_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [roomId, limit]
  );
  return rows.reverse();
}

/* ── Persist + broadcast a new chat message ── */
async function handleMessage(ws, user, data) {
  const { roomId, content, msg_type = "text", file_url, file_name, reply_to_id } = data;
  if (!roomId) return;

  /* Verify membership */
  const { rows: [member] } = await query(
    "SELECT 1 FROM chat_room_members WHERE room_id=$1 AND user_id=$2",
    [roomId, user.id]
  );
  if (!member) return ws.send(JSON.stringify({ type: "error", message: "Not a member of this room" }));

  /* Validate reply target belongs to same room */
  let replyId = null;
  let replyContent = null;
  let replySender = null;
  if (reply_to_id) {
    const { rows: [rm] } = await query(
      `SELECT cm.content, cm.file_name, u.name AS sender_name
       FROM chat_messages cm JOIN users u ON u.id = cm.sender_id
       WHERE cm.id = $1 AND cm.room_id = $2`,
      [reply_to_id, roomId]
    );
    if (rm) { replyId = reply_to_id; replyContent = rm.content || rm.file_name; replySender = rm.sender_name; }
  }

  /* Save to DB */
  const { rows: [msg] } = await query(
    `INSERT INTO chat_messages (room_id, sender_id, content, msg_type, file_url, file_name, reply_to_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [roomId, user.id, content || null, msg_type, file_url || null, file_name || null, replyId]
  );

  const outgoing = {
    type:             "message",
    id:               msg.id,
    room_id:          roomId,
    sender_id:        user.id,
    sender_name:      user.name,
    content:          msg.content,
    msg_type:         msg.msg_type,
    file_url:         msg.file_url,
    file_name:        msg.file_name,
    reply_to_id:      replyId,
    reply_to_content: replyContent,
    reply_to_sender:  replySender,
    read_by:          [], // brand new message, nobody has read it yet
    total_members:    (await query("SELECT COUNT(*)::int FROM chat_room_members WHERE room_id=$1", [roomId])).rows[0].count,
    created_at:       msg.created_at,
  };

  broadcast(roomId, outgoing);

  /* ── Broadcast global notification to all members of this room ── */
  const { rows: allMembers } = await query(
    "SELECT user_id FROM chat_room_members WHERE room_id=$1", [roomId]
  );
  const memberIds = new Set(allMembers.map(m => m.user_id));
  
  const globClients = rooms.get("global");
  if (globClients) {
    for (const globWs of globClients) {
      if (globWs.readyState === WebSocket.OPEN && memberIds.has(globWs._user.id)) {
        globWs.send(JSON.stringify({ type: "global_message", room_id: roomId }));
      }
    }
  }
}

/* ── Call Signaling Handlers ── */

async function handleStartCall(ws, user, data) {
  const { roomId } = data;

  /* Verify user is a member */
  const { rows: [member] } = await query(
    "SELECT 1 FROM chat_room_members WHERE room_id=$1 AND user_id=$2",
    [roomId, user.id]
  );
  if (!member) return;

  /* If a call is already active in this room, just join it */
  const { rows: existing } = await query(
    "SELECT id FROM call_sessions WHERE room_id=$1 AND status IN ('ringing','active') LIMIT 1",
    [roomId]
  );
  if (existing.length > 0) {
    /* Re-use the accept-call flow */
    return handleAcceptCall(ws, user, { callId: existing[0].id });
  }

  /* Create new call session */
  const { rows: [sess] } = await query(
    "INSERT INTO call_sessions (room_id, initiator_id, status) VALUES ($1,$2,'active') RETURNING id",
    [roomId, user.id]
  );
  const callId = sess.id;

  /* Add initiator to call room tracking */
  callRooms.set(callId, new Set([ws]));
  ws._callId = callId;

  /* Log initiator as participant */
  await query(
    "INSERT INTO call_participants (call_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [callId, user.id]
  );

  /* Post "call started" system message to the chat room */
  const { rows: [startMsg] } = await query(
    `INSERT INTO chat_messages (room_id, sender_id, content, msg_type)
     VALUES ($1, $2, $3, 'system') RETURNING *`,
    [roomId, user.id, `📞 ${user.name} started a voice call`]
  );
  broadcast(roomId, {
    type:        "message",
    id:          startMsg.id,
    room_id:     roomId,
    sender_id:   user.id,
    sender_name: user.name,
    content:     startMsg.content,
    msg_type:    "system",
    created_at:  startMsg.created_at,
  });

  /* Tell the initiator they're in (no one else yet) */
  ws.send(JSON.stringify({
    type:         "call-joined",
    callId,
    roomId,
    participants: [],
    isInitiator:  true,
  }));
  console.log(`[CALL] ${user.name} started call ${callId} in room ${roomId}`);
}

async function handleAcceptCall(ws, user, data) {
  const { callId } = data;

  /* Verify call exists and is ringing/active */
  const { rows: [sess] } = await query(
    "SELECT * FROM call_sessions WHERE id=$1 AND status IN ('ringing','active')", [callId]
  );
  if (!sess) return ws.send(JSON.stringify({ type: "call-error", message: "Call not found or ended" }));

  /* Add to call room */
  if (!callRooms.has(callId)) callRooms.set(callId, new Set());
  const callClients = callRooms.get(callId);
  callClients.add(ws);
  ws._callId = callId;

  /* Mark call active + log this participant first (so they appear in the SELECT below) */
  if (sess.status === "ringing") {
    await query("UPDATE call_sessions SET status='active' WHERE id=$1", [callId]);
  }
  await query(
    "INSERT INTO call_participants (call_id, user_id) VALUES ($1,$2) ON CONFLICT (call_id,user_id) DO NOTHING",
    [callId, user.id]
  );

  /* Collect current participants from DB — excludes self, reliable after reconnects */
  const { rows: currentParticipants } = await query(
    `SELECT cp.user_id AS "userId", u.name AS "userName"
     FROM call_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.call_id = $1 AND cp.left_at IS NULL AND cp.user_id <> $2`,
    [callId, user.id]
  );
  console.log(`[CALL] ${user.name} joining ${callId}, existing: ${currentParticipants.map(p=>p.userName).join(', ') || 'none'}`);

  /* Tell the joiner who's already in */
  ws.send(JSON.stringify({
    type: "call-joined",
    callId,
    participants: currentParticipants,
  }));

  /* Tell everyone else a new participant joined */
  broadcastCall(callId, {
    type:     "call-participant-joined",
    callId,
    userId:   user.id,
    userName: user.name,
  }, ws);

  console.log(`[CALL] ${user.name} accepted/joined call ${callId}`);
}

/* reject-call intentionally removed — Discord model: no ringing, no decline */

async function handleLeaveCall(ws, user, data) {
  const { callId } = data;
  _removeFromCall(ws, user, callId);
}

async function handleEndCall(ws, user, data) {
  const { callId } = data;
  /* Only initiator or admin can end */
  const { rows: [sess] } = await query("SELECT initiator_id FROM call_sessions WHERE id=$1", [callId]);
  if (!sess) return;
  if (sess.initiator_id !== user.id && user.role !== "ADMIN") return;

  await query("UPDATE call_sessions SET status='ended', ended_at=NOW() WHERE id=$1", [callId]);
  broadcastCall(callId, { type: "call-ended", callId });

  /* ── Post "call ended" system message to chat ── */
  const { rows: [endMsg] } = await query(
    `INSERT INTO chat_messages (room_id, sender_id, content, msg_type)
     VALUES ($1, $2, $3, 'system') RETURNING *`,
    [sess.room_id, user.id, `📵 Voice call ended`]
  );
  broadcast(sess.room_id, {
    type:        "message",
    id:          endMsg.id,
    room_id:     sess.room_id,
    sender_id:   user.id,
    sender_name: user.name,
    content:     endMsg.content,
    msg_type:    "system",
    created_at:  endMsg.created_at,
  });

  /* Cleanup memory */
  const callClients = callRooms.get(callId);
  if (callClients) {
    for (const c of callClients) { c._callId = null; }
    callRooms.delete(callId);
  }
  console.log(`[CALL] ${user.name} ended call ${callId}`);
}

/* Helper: remove a ws from a call room */
async function _removeFromCall(ws, user, callId) {
  if (!callId) return;
  const callClients = callRooms.get(callId);
  if (callClients) {
    callClients.delete(ws);
    if (callClients.size === 0) {
      /* Last person left → end the call */
      await query("UPDATE call_sessions SET status='ended', ended_at=NOW() WHERE id=$1 AND status != 'ended'", [callId]);
      callRooms.delete(callId);
    }
  }
  /* Update left_at in DB */
  await query("UPDATE call_participants SET left_at=NOW() WHERE call_id=$1 AND user_id=$2 AND left_at IS NULL", [callId, user.id]).catch(() => {});

  /* Notify remaining participants */
  broadcastCall(callId, { type: "call-participant-left", callId, userId: user.id, userName: user.name });
  ws._callId = null;
  console.log(`[CALL] ${user.name} left call ${callId}`);
}

/* ── WebRTC relay (pure passthrough — never touches DB) ── */
function handleRelay(user, data) {
  const { targetUserId } = data;
  if (!targetUserId) return;
  /* Always relay to the target's GLOBAL WS (callPresence) so CallManager receives it */
  const target = callPresence.get(targetUserId) || presence.get(targetUserId);
  console.log(`[RELAY] ${data.type} from ${user.name} → ${targetUserId} (found=${!!target}, state=${target?.readyState}, global=${callPresence.has(targetUserId)})`);
  if (target && target.readyState === WebSocket.OPEN) {
    target.send(JSON.stringify({ ...data, fromUserId: user.id, fromUserName: user.name }));
  }
}

/* ── Start WS server ── */
const wss = new WebSocketServer({ port: PORT });
console.log(`[WS] Chat+Call server listening on ws://localhost:${PORT}`);

wss.on("connection", async (ws, req) => {
  /* Parse token + room from query string */
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const token  = url.searchParams.get("token");
  const roomId = url.searchParams.get("room");

  if (!token) return ws.close(4001, "No token");
  const user = await verifyToken(token);
  if (!user)  return ws.close(4003, "Invalid token");

  /* ── GLOBAL CONNECTION (sidebar unread badges + call presence) ── */
  if (roomId === "global") {
    if (!rooms.has("global")) rooms.set("global", new Set());
    rooms.get("global").add(ws);
    ws._user   = user;
    ws._roomId = "global";

    /* Register in presence + callPresence maps */
    presence.set(user.id, ws);
    callPresence.set(user.id, ws);  // ← dedicated map for offer/ICE relay

    /* Mark as logged in actively */
    try {
      await query("UPDATE users SET is_logged_in = TRUE, updated_at = NOW() WHERE id = $1", [user.id]);
    } catch (e) {
      console.error("[WS] DB update true error", e);
    }

    /* ── Global message handler: call signaling + WebRTC relay ── */
    ws.on("message", async (raw) => {
      let data;
      try { data = JSON.parse(raw); } catch { return; }

      switch (data.type) {
        case "start-call":    await handleStartCall(ws, user, data); break;
        case "accept-call":   await handleAcceptCall(ws, user, data); break;
        case "join-call":     await handleAcceptCall(ws, user, data); break;
        case "leave-call":    await handleLeaveCall(ws, user, data); break;
        case "end-call":      await handleEndCall(ws, user, data); break;
        case "offer":
        case "answer":
        case "ice-candidate": handleRelay(user, data); break;
      }
    });

    ws.on("close", async () => {
      const globClients = rooms.get("global");
      if (globClients) {
        globClients.delete(ws);

        /* Check if this user has any other active global tabs open */
        let userHasOtherTabs = false;
        for (const c of globClients) {
          if (c._user && c._user.id === user.id) {
            userHasOtherTabs = true;
            break;
          }
        }
        
        if (!userHasOtherTabs) {
          try {
            await query("UPDATE users SET is_logged_in = FALSE WHERE id = $1", [user.id]);
          } catch (e) {
            console.error("[WS] DB update false error", e);
          }
        }

        if (globClients.size === 0) rooms.delete("global");
      }
      if (presence.get(user.id) === ws) presence.delete(user.id);
      if (callPresence.get(user.id) === ws) callPresence.delete(user.id);
      /* Leave any call if the socket dies */
      if (ws._callId) await _removeFromCall(ws, user, ws._callId).catch(() => {});
    });

    return;
  }

  /* ── SPECIFIC ROOM CONNECTION ── */
  const { rows: [room] } = await query(
    "SELECT * FROM chat_rooms WHERE id=$1 AND status='active'", [roomId]
  );
  if (!room) return ws.close(4004, "Room not found or inactive");

  const { rows: [member] } = await query(
    "SELECT * FROM chat_room_members WHERE room_id=$1 AND user_id=$2", [roomId, user.id]
  );
  if (!member) return ws.close(4005, "Not a member");

  /* Subscribe */
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  ws._user   = user;
  ws._roomId = roomId;
  ws._callId = null;

  /* Fallback presence: register if not already in global */
  if (!presence.has(user.id)) presence.set(user.id, ws);

  /* Send history */
  const history = await fetchHistory(roomId);
  ws.send(JSON.stringify({ type: "history", messages: history }));

  /* Announce join to others */
  broadcast(roomId, { type: "join", user_id: user.id, user_name: user.name }, ws);

  /* ─── Handle incoming messages ─── */
  ws.on("message", async (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    switch (data.type) {
      /* ── Chat ── */
      case "message":        await handleMessage(ws, user, data); break;
      case "delete_message": {
        try {
          const { messageId } = data;
          const delQ = user.role === "ADMIN"
            ? await query("DELETE FROM chat_messages WHERE id=$1 AND room_id=$2", [messageId, roomId])
            : await query("DELETE FROM chat_messages WHERE id=$1 AND room_id=$2 AND sender_id=$3", [messageId, roomId, user.id]);
          if (delQ.rowCount > 0) broadcast(roomId, { type: "delete_message", messageId });
        } catch (err) { console.error("[WS] Delete error:", err.message); }
        break;
      }
      case "typing": broadcast(roomId, { type: "typing", user_id: user.id, user_name: user.name }, ws); break;

      case "mark_read": {
        // Broadcast that this user has read the room up to NOW()
        broadcast(roomId, { 
          type: "read_receiptUpdate", 
          room_id: roomId, 
          user_id: user.id, 
          user_name: user.name, 
          read_at: new Date().toISOString() 
        }, ws);
        break;
      }

      /* ── WebRTC relay (pure passthrough) ── */
      case "offer":
      case "answer":
      case "ice-candidate": handleRelay(user, data); break;
    }
  });

  ws.on("close", async () => {
    const clients = rooms.get(roomId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) rooms.delete(roomId);
    }
    /* Leave any active call */
    if (ws._callId) await _removeFromCall(ws, user, ws._callId).catch(() => {});
    /* Remove presence only if still registered */
    if (presence.get(user.id) === ws) presence.delete(user.id);
    broadcast(roomId, { type: "leave", user_id: user.id, user_name: user.name });
  });

  ws.on("error", (err) => console.error("[WS] Client error:", err.message));
});

wss.on("error", (err) => console.error("[WS] Server error:", err.message));
