"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   app/components/WebmailView.js
   Webmail interface with secondary login layer & internal sidebar.
───────────────────────────────────────────────────────────────────────────── */

export default function WebmailView({ user }) {
  // Login State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth]   = useState(true);
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [storeCredentials, setStoreCredentials] = useState(true);
  const [isLoggingIn, setIsLoggingIn]         = useState(false);
  const [loginError, setLoginError]           = useState("");

  // Mail State
  const [activeFolder, setActiveFolder]       = useState("INBOX");
  const [messages, setMessages]               = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [isComposing, setIsComposing]         = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  // Compose State
  const [composeTo, setComposeTo]             = useState("");
  const [composeSubject, setComposeSubject]   = useState("");
  const [composeHtml, setComposeHtml]         = useState("");
  const [attachments, setAttachments]         = useState([]);
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSending, setIsSending]             = useState(false);

  const editorRef = useRef(null);

  // Sync external HTML changes (like reply quotes or clear after send) back to the uncontrolled div
  useEffect(() => {
    if (editorRef.current && composeHtml !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = composeHtml;
    }
  }, [composeHtml]);

  // Folder defaults
  const FOLDERS = [
    { id: "INBOX",   label: "Inbox",   icon: "inbox" },
    { id: "INBOX.Drafts",  label: "Drafts",  icon: "draft" },
    { id: "INBOX.Sent",    label: "Sent",    icon: "send" },
    { id: "INBOX.Junk",    label: "Junk",    icon: "report" },
    { id: "INBOX.Trash",   label: "Trash",   icon: "delete" },
    { id: "INBOX.Archive", label: "Archive", icon: "archive" },
  ];

  // Check initial authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/webmail/login");
        const data = await res.json();
        if (data.hasCredentials) {
          setIsAuthenticated(true);
          setEmail(data.email);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch messages function
  const fetchMessages = useCallback(async (quiet = false) => {
    if (!isAuthenticated) return;
    
    if (!quiet) {
      setIsLoadingMessages(true);
      setMessages([]); // clear existing to show spinner on manual refresh/folder change
    }
    
    try {
      const res = await fetch(`/api/webmail/messages?folder=${activeFolder}`);
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setIsLoadingMessages(false);
    }
  }, [activeFolder, isAuthenticated]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages(true); // Quiet poll every 20s
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/webmail/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, storeCredentials })
      });
      const data = await res.json();

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch (err) {
      setLoginError("Network error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!composeTo || !composeHtml) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/webmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          html: composeHtml,
          attachments: attachments
        }),
      });

      if (res.ok) {
        setComposeTo("");
        setComposeSubject("");
        setComposeHtml("");
        setAttachments([]);
        setIsComposing(false);
        // Maybe fetch Sent folder if we are in it
        if(activeFolder === "INBOX.Sent") fetchMessages();
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while sending");
    } finally {
      setIsSending(false);
    }
  };

  async function handleMessageAction(action) {
    if (!selectedMessage) return;
    setIsPerformingAction(true);
    try {
      const res = await fetch("/api/webmail/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          uid: selectedMessage.id,
          currentFolder: activeFolder
        })
      });
      if (res.ok) {
        setSelectedMessage(null);
        fetchMessages(); // refresh list
      } else {
        alert(`Failed to ${action} message`);
      }
    } catch (err) {
      alert("Network error occurred");
    } finally {
      setIsPerformingAction(false);
    }
  }

  async function handleSelectMessage(msg) {
    // We start with the existing msg data (headers/snippet) so we can display the modal instantly
    setSelectedMessage({ ...msg, snippet: "Loading full message content..." });
    setIsMessageLoading(true);

    try {
      // 1. Fetch the full content
      const contentRes = await fetch(`/api/webmail/message?folder=${activeFolder}&uid=${msg.id}`);
      if (contentRes.ok) {
        const { html, body } = await contentRes.json();
        setSelectedMessage(prev => ({
          ...prev,
          htmlContent: html,
          snippet: body
        }));
      } else {
        setSelectedMessage(prev => ({
          ...prev,
          snippet: "Error loading message content."
        }));
      }

      // 2. Mark as read in IMAP if unread
      if (!msg.flags?.includes("\\Seen")) {
        await fetch("/api/webmail/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: msg.id, folder: activeFolder })
        });
        // Remove unread dot instantly in local state
        setMessages(msgs => msgs.map(m => m.id === msg.id ? { ...m, flags: [...(m.flags || []), '\\Seen'] } : m));
        
        // Update selectedMessage so Reply keeps the flag updated natively
        setSelectedMessage(prev => ({ ...prev, flags: [...(prev.flags || []), '\\Seen'] }));
      }
    } catch (e) {
      console.error("Failed to fetch message or mark read:", e);
      setSelectedMessage(prev => ({
        ...prev,
        snippet: "Error loading message."
      }));
    } finally {
      setIsMessageLoading(false);
    }
  }

  // Auto-Suggest logic
  useEffect(() => {
    const query = composeTo.split(',').pop().trim();
    if (query.length > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          const res = await fetch(`/api/webmail/contacts?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const { contacts } = await res.json();
            setContactSuggestions(contacts);
            setShowSuggestions(true);
          }
        } catch (e) { }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setShowSuggestions(false);
      setContactSuggestions([]);
    }
  }, [composeTo]);

  function handleSelectContact(email) {
    const parts = composeTo.split(',');
    parts.pop(); // remove partial
    parts.push(email);
    setComposeTo(parts.join(', ') + ', ');
    setShowSuggestions(false);
    setContactSuggestions([]);
  }

  // Attachments logic
  const handleAttachment = async (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = await Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            filename: file.name,
            contentType: file.type,
            content: ev.target.result
          });
        };
        reader.readAsDataURL(file);
      });
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Rich Text helper
  const execCmd = (cmd, arg=null) => {
    document.execCommand(cmd, false, arg);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg className="animate-spin size-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  // 1. Secondary Login Screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-[#161616] border border-[#252525] rounded-2xl w-full max-w-md p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="size-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">mail</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Webmail Login</h2>
            <p className="text-sm text-zinc-500 text-center mt-2">
              Please enter your Webmail credentials to access your inbox.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-400">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder:text-zinc-600
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-400">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder:text-zinc-600
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={storeCredentials}
                onChange={(e) => setStoreCredentials(e.target.checked)}
                className="size-4 rounded accent-blue-600 bg-[#111] border-[#2a2a2a] cursor-pointer"
              />
              <span className="text-sm text-zinc-400 select-none">
                Store credentials securely for future logins
              </span>
            </label>

            {loginError && (
              <p className="text-xs text-red-500 mt-1">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <svg className="animate-spin size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Logging in...
                </>
              ) : (
                "Login to Webmail"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Main Webmail Interface
  return (
    <div className="flex flex-1 h-full min-h-0 bg-[#111111] rounded-2xl overflow-hidden border border-[#252525]">
      {/* Secondary Sidebar */}
      <div className="w-64 bg-[#161616] border-r border-[#252525] flex flex-col pt-6 pb-4">
        
        {/* Compose Button */}
        <div className="px-5 mb-6">
          <button
            onClick={() => setIsComposing(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20
                       transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Compose
          </button>
        </div>

        {/* Folders List */}
        <div className="flex flex-col flex-1 px-3 space-y-1">
          {FOLDERS.map((folder) => {
            const isActive = activeFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-blue-500/10 text-blue-400" 
                    : "text-zinc-400 hover:bg-[#202020] hover:text-white"
                  }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-blue-400" : "text-zinc-500"}`}>
                  {folder.icon}
                </span>
                {folder.label}
              </button>
            );
          })}
        </div>

        {/* Account indicator at bottom of sidebar */}
        <div className="px-5 mt-auto pt-4 border-t border-[#252525]">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="material-symbols-outlined text-[16px] text-zinc-600">account_circle</span>
            <span className="truncate">{email || "Connected Account"}</span>
          </div>
        </div>
      </div>

      {/* Main Mail Area */}
      <div className="flex-1 flex flex-col pt-6 px-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white capitalize flex items-center gap-2">
            {FOLDERS.find(f => f.id === activeFolder)?.label || activeFolder}
            {isLoadingMessages && (
               <svg className="animate-spin size-4 text-zinc-500 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
               </svg>
            )}
          </h2>
          <button 
            onClick={() => fetchMessages()}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm bg-[#161616] border border-[#252525] hover:bg-[#1a1a1a] rounded-lg px-3 py-1.5"
            disabled={isLoadingMessages}
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Refresh
          </button>
        </div>
        
        {/* Email List */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
          {isLoadingMessages && messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 mt-20 opacity-50">
               <svg className="animate-spin size-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
               </svg>
               <p className="text-zinc-500 text-sm">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50 mt-20">
              <span className="material-symbols-outlined text-6xl text-zinc-700 mb-4">
                {FOLDERS.find(f => f.id === activeFolder)?.icon || "mail"}
              </span>
              <p className="text-zinc-500">No messages in {activeFolder}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id || Math.random()} 
                onClick={() => handleSelectMessage(msg)}
                className="bg-[#161616] hover:bg-[#1a1a1a] border border-[#252525] hover:border-[#353535] p-4 rounded-xl cursor-pointer transition-colors flex flex-col gap-1 relative group"
              >
                <div className="flex justify-between items-center">
                   <h4 className={`text-sm ${!msg.flags?.includes('\\Seen') ? "text-white font-bold" : "text-zinc-300 font-medium"}`}>
                     {activeFolder === "INBOX.Sent" ? `To: ${msg.to}` : msg.from}
                   </h4>
                   <span className="text-xs text-zinc-500">{new Date(msg.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <h5 className={`text-sm ${!msg.flags?.includes('\\Seen') ? "text-white font-semibold" : "text-zinc-400"}`}>{msg.subject}</h5>
                <p className="text-xs text-zinc-500 truncate mt-1">{msg.snippet}</p>
                {!msg.flags?.includes('\\Seen') && <div className="absolute left-3 top-1/2 -translate-y-1/2 size-1.5 bg-blue-500 rounded-full" />}
              </div>
            ))
          )}
        </div>

        {/* View Message Modal */}
        {selectedMessage && (
          <div className="absolute inset-x-6 inset-y-6 bg-[#161616] border border-[#252525] rounded-xl shadow-2xl flex flex-col overflow-hidden z-20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525] bg-[#1a1a1a]">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">mail</span> 
                {selectedMessage.subject}
              </h3>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            {/* Headers */}
            <div className="px-6 py-4 border-b border-[#252525] bg-[#111]">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <p className="text-sm text-zinc-300"><span className="text-zinc-500 w-12 inline-block">From:</span> {selectedMessage.from}</p>
                   <p className="text-sm text-zinc-300"><span className="text-zinc-500 w-12 inline-block">To:</span> {selectedMessage.to}</p>
                 </div>
                 <div className="flex flex-col items-end gap-2">
                   <span className="text-xs text-zinc-500">
                     {new Date(selectedMessage.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                   </span>
                   <div className="flex gap-2">
                     <button title="Archive" onClick={() => handleMessageAction('archive')} disabled={isPerformingAction} className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50">
                       <span className="material-symbols-outlined text-sm">archive</span>
                     </button>
                     <button title="Delete" onClick={() => handleMessageAction('trash')} disabled={isPerformingAction} className="text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-50">
                       <span className="material-symbols-outlined text-sm">delete</span>
                     </button>
                   </div>
                 </div>
               </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto relative">
               {isMessageLoading ? (
                 <div className="absolute inset-0 flex items-center justify-center bg-[#161616]/50 backdrop-blur-sm z-10">
                   <svg className="animate-spin size-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                   </svg>
                 </div>
               ) : null}
               
               {selectedMessage.htmlContent ? (
                 <div 
                   className="text-sm text-zinc-300 w-full"
                   dangerouslySetInnerHTML={{ __html: selectedMessage.htmlContent }}
                 />
               ) : (
                 <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-w-4xl">
                   {selectedMessage.snippet === "No text content" ? (
                     <span className="italic text-zinc-600">No text content available.</span>
                   ) : (
                     selectedMessage.snippet
                   )}
                 </div>
               )}
            </div>
            <div className="px-4 py-3 border-t border-[#252525] bg-[#1a1a1a] flex gap-2">
              <button 
                onClick={() => {
                   function handleReply() {
                      const prevHtml = selectedMessage.htmlContent || selectedMessage.snippet;
                      const safeSnippet = prevHtml === "Loading full message content..." ? "" : prevHtml;
                      
                      setComposeTo(selectedMessage.from);
                      setComposeSubject(selectedMessage.subject.startsWith("Re:") ? selectedMessage.subject : `Re: ${selectedMessage.subject}`);
                      setComposeHtml(`<br><br><blockquote style="border-left: 2px solid #555; padding-left: 10px; color: #aaa; margin-left: 0;">${safeSnippet}</blockquote>`);
                      setSelectedMessage(null);
                      setIsComposing(true);
                    }
                    handleReply();
                }}
                className="bg-[#252525] hover:bg-[#303030] text-white px-5 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Reply
              </button>
            </div>
          </div>
        )}

        {/* Mock Compose Overlay */}
        {isComposing && (
          <div className="absolute inset-x-6 inset-y-6 bg-[#161616] border border-[#252525] rounded-xl shadow-2xl flex flex-col overflow-hidden z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525] bg-[#1a1a1a]">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">edit</span> New Message
              </h3>
              <button 
                onClick={() => setIsComposing(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleSend} className="flex-1 p-4 flex flex-col gap-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="To (comma separated)"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  className="w-full bg-[#161616] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  required
                />
                {showSuggestions && contactSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#161616] border border-[#333] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {contactSuggestions.map(contact => (
                      <button
                        key={contact.email}
                        type="button"
                        onClick={() => handleSelectContact(contact.email)}
                        className="w-full text-left px-4 py-2 hover:bg-[#252525] text-white flex flex-col transition-colors border-b border-[#252525] last:border-0"
                      >
                        <span className="font-medium text-sm">{contact.name || contact.email.split('@')[0]}</span>
                        <span className="text-xs text-zinc-400">{contact.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <input 
                  type="text" 
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full bg-[#161616] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              <div className="border border-[#333] rounded-lg overflow-hidden flex flex-col">
                <div className="bg-[#111] p-2 flex items-center gap-1 border-b border-[#333]">
                  <button type="button" onClick={() => execCmd('bold')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded transition-colors" title="Bold"><span className="material-symbols-outlined text-sm">format_bold</span></button>
                  <button type="button" onClick={() => execCmd('italic')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded transition-colors" title="Italic"><span className="material-symbols-outlined text-sm">format_italic</span></button>
                  <button type="button" onClick={() => execCmd('underline')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded transition-colors" title="Underline"><span className="material-symbols-outlined text-sm">format_underlined</span></button>
                  <div className="w-px h-4 bg-[#333] mx-1"></div>
                  <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded transition-colors" title="Bulleted List"><span className="material-symbols-outlined text-sm">format_list_bulleted</span></button>
                  <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded transition-colors" title="Numbered List"><span className="material-symbols-outlined text-sm">format_list_numbered</span></button>
                  
                  <div className="flex-1"></div>
                  
                  <label className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] rounded transition-colors cursor-pointer" title="Attach file">
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                    <input type="file" multiple className="hidden" onChange={handleAttachment} />
                  </label>
                </div>
                <div 
                  ref={editorRef}
                  contentEditable
                  dir="ltr"
                  onInput={e => setComposeHtml(e.currentTarget.innerHTML)}
                  className="w-full h-48 bg-[#161616] px-4 py-3 text-white focus:outline-none overflow-y-auto text-left"
                  style={{ minHeight: "12rem" }}
                />
              </div>

              {attachments.length > 0 && (
                <div className="flex z-10 flex-wrap gap-2 mt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-zinc-300">
                      <span className="material-symbols-outlined text-[14px]">insert_drive_file</span>
                      <span className="truncate max-w-[150px]">{att.filename}</span>
                      <button type="button" onClick={() => removeAttachment(i)} className="text-zinc-500 hover:text-red-400 ml-1">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[#333]">
                <button 
                  type="submit" 
                  disabled={isSending || !composeTo || !composeHtml}
                  className="bg-zinc-100 hover:bg-white text-black px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSending && (
                    <svg className="animate-spin size-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {isSending ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
