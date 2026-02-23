"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";

const WebSocketContext = createContext(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }) {
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    let isSubscribed = true;

    async function connectGlobal() {
      try {
        const tRes = await fetch("/api/chat/ws-ticket");
        if (!tRes.ok) return;
        const { token } = await tRes.json();
        if (!token || !isSubscribed) return;

        const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
        const gws = new WebSocket(`${WS_URL}?room=global&token=${encodeURIComponent(token)}`);
        wsRef.current = gws;

        gws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          // Handle Chat Global Messages (Existing)
          if (data.type === "global_message" || data.type === "erp_sync") {
            setLastEvent(data); // Expose event to components

            // Trigger Browser Native Notification for erp_sync
            if (data.type === "erp_sync" && data.message) {
              if ("Notification" in window && Notification.permission === "granted") {
                const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ? `${process.env.NEXT_PUBLIC_COMPANY_NAME} CRM` : "Clarity CRM";
                new Notification(companyName, {
                  body: data.message,
                  icon: "/favicon.ico" // optional, assuming there is one
                });
              }
            }
          }
        };

        gws.onclose = () => {
          if (isSubscribed) {
            // Optional: Implement reconnect logic
            setTimeout(connectGlobal, 3000);
          }
        };
      } catch (err) {
        console.error("[WebSocketProvider] connection error", err);
      }
    }

    connectGlobal();

    return () => {
      isSubscribed = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        setShowPrompt(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      await Notification.requestPermission();
      setShowPrompt(false);
    } catch (e) {
      console.error(e);
      setShowPrompt(false);
    }
  };

  return (
    <WebSocketContext.Provider value={{ lastEvent, wsRef }}>
      {children}
      {showPrompt && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-2xl shadow-2xl max-w-sm flex items-start gap-4 animate-in slide-in-from-bottom-5">
          <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-400">notifications_active</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white mb-1">Enable Notifications</h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Get real-time alerts for incoming messages, meetings, and tickets.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={requestPermission}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                Enable Now
              </button>
              <button onClick={() => setShowPrompt(false)}
                className="px-3 py-1.5 bg-transparent hover:bg-zinc-800 text-zinc-400 text-xs font-semibold rounded-lg transition-colors">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </WebSocketContext.Provider>
  );
}
