"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const ROOMS = ["general", "dev", "random", "jobs"];

const ROOM_ICONS = {
  general: "◈",
  dev: "⟨/⟩",
  random: "∿",
  jobs: "⬡",
};

export default function ChatApp() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeRoom, setActiveRoom] = useState("general");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch messages + realtime
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room", activeRoom)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`room:${activeRoom}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room=eq.${activeRoom}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, activeRoom]);

  // Presence
  useEffect(() => {
    if (!user) return;
    const displayName = user.user_metadata?.username || user.email.split("@")[0];

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).map((s) => s[0]?.username).filter(Boolean);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ username: displayName });
        }
      });

    return () => supabase.removeChannel(channel);
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) setAuthError(error.message);
      else setAuthError("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
    setAuthLoading(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const displayName = user.user_metadata?.username || user.email.split("@")[0];

    const { error } = await supabase.from("messages").insert({
      user_id: user.id,
      username: displayName,
      content: newMessage.trim(),
      room: activeRoom,
    });

    if (!error) setNewMessage("");
    setSending(false);
    inputRef.current?.focus();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteMessage = async (id) => {
    await supabase.from("messages").delete().eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isOwnMessage = (msg) => msg.user_id === user?.id;

  // ── AUTH SCREEN ──
  if (!user) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #020205; }

          .auth-wrap {
            min-height: 100vh;
            background: #020205;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'JetBrains Mono', monospace;
            position: relative;
            overflow: hidden;
          }
          .auth-grid {
            position: absolute; inset: 0;
            background-image:
              linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .auth-glow {
            position: absolute;
            width: 600px; height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0,255,200,0.06) 0%, transparent 70%);
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }
          .auth-box {
            position: relative;
            width: 420px;
            background: #0a0a0f;
            border: 1px solid rgba(0,255,200,0.15);
            padding: 48px 40px;
          }
          .auth-logo {
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 1.8rem;
            color: #00ffc8;
            letter-spacing: -0.02em;
            margin-bottom: 6px;
          }
          .auth-sub {
            font-size: 0.65rem;
            color: rgba(255,255,255,0.3);
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 40px;
          }
          .auth-label {
            font-size: 0.6rem;
            color: rgba(0,255,200,0.6);
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: block;
          }
          .auth-input {
            width: 100%;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            padding: 12px 14px;
            outline: none;
            margin-bottom: 20px;
            transition: border-color 0.2s;
          }
          .auth-input:focus { border-color: rgba(0,255,200,0.4); }
          .auth-input::placeholder { color: rgba(255,255,255,0.15); }
          .auth-btn {
            width: 100%;
            background: #00ffc8;
            color: #000;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            padding: 14px;
            border: none;
            cursor: pointer;
            transition: opacity 0.2s;
            margin-top: 4px;
          }
          .auth-btn:hover { opacity: 0.85; }
          .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; }
          .auth-toggle {
            margin-top: 20px;
            text-align: center;
            font-size: 0.65rem;
            color: rgba(255,255,255,0.3);
          }
          .auth-toggle span {
            color: #00ffc8;
            cursor: pointer;
            text-decoration: underline;
          }
          .auth-error {
            font-size: 0.65rem;
            padding: 10px 12px;
            margin-bottom: 16px;
            border-left: 2px solid;
          }
          .auth-error.err { color: #ff4466; border-color: #ff4466; background: rgba(255,68,102,0.05); }
          .auth-error.ok { color: #00ffc8; border-color: #00ffc8; background: rgba(0,255,200,0.05); }
        `}</style>
        <div className="auth-wrap">
          <div className="auth-grid" />
          <div className="auth-glow" />
          <div className="auth-box">
            <div className="auth-logo">NEXUS</div>
            <div className="auth-sub">Real-time chat platform</div>

            {authError && (
              <div className={`auth-error ${authError.includes("Check") ? "ok" : "err"}`}>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth}>
              {isSignup && (
                <>
                  <label className="auth-label">Username</label>
                  <input className="auth-input" placeholder="your_username" value={username}
                    onChange={e => setUsername(e.target.value)} required />
                </>
              )}
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <label className="auth-label">Password</label>
              <input className="auth-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <button className="auth-btn" type="submit" disabled={authLoading}>
                {authLoading ? "LOADING..." : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}
              </button>
            </form>

            <div className="auth-toggle">
              {isSignup ? "Already have an account? " : "No account? "}
              <span onClick={() => { setIsSignup(!isSignup); setAuthError(""); }}>
                {isSignup ? "Sign in" : "Sign up"}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── CHAT SCREEN ──
  const displayName = user.user_metadata?.username || user.email.split("@")[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #020205; }

        .chat-wrap {
          height: 100vh;
          display: flex;
          background: #020205;
          font-family: 'JetBrains Mono', monospace;
          color: #fff;
          overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          width: 220px;
          min-width: 220px;
          background: #07070d;
          border-right: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          padding: 24px 0;
        }
        .sidebar-logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.3rem;
          color: #00ffc8;
          padding: 0 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          letter-spacing: -0.02em;
        }
        .sidebar-section {
          padding: 20px 20px 8px;
          font-size: 0.55rem;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .room-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          transition: all 0.15s;
          border-left: 2px solid transparent;
        }
        .room-btn:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.02); }
        .room-btn.active {
          color: #00ffc8;
          background: rgba(0,255,200,0.05);
          border-left-color: #00ffc8;
        }
        .room-icon { font-size: 0.8rem; opacity: 0.7; width: 16px; text-align: center; }

        .online-section { margin-top: auto; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .online-title { font-size: 0.55rem; color: rgba(255,255,255,0.25); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; }
        .online-user {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.68rem; color: rgba(255,255,255,0.5);
          margin-bottom: 6px;
        }
        .online-dot { width: 6px; height: 6px; border-radius: 50%; background: #00ffc8; flex-shrink: 0; }

        .signout-btn {
          margin: 12px 20px 0;
          padding: 8px 12px;
          background: none;
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.25);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          width: calc(100% - 40px);
        }
        .signout-btn:hover { border-color: rgba(255,68,102,0.4); color: #ff4466; }

        /* MAIN */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          padding: 18px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #07070d;
        }
        .chat-header-left { display: flex; align-items: center; gap: 12px; }
        .chat-room-icon { font-size: 1rem; color: #00ffc8; }
        .chat-room-name {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .chat-header-right { font-size: 0.6rem; color: rgba(255,255,255,0.2); letter-spacing: 0.1em; }

        /* MESSAGES */
        .messages-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }

        .msg-group { margin-bottom: 16px; }

        .msg-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 4px;
        }
        .msg-username {
          font-size: 0.72rem;
          font-weight: 700;
          color: #00ffc8;
          letter-spacing: 0.05em;
        }
        .msg-username.own { color: #c084fc; }
        .msg-time {
          font-size: 0.58rem;
          color: rgba(255,255,255,0.2);
        }
        .msg-bubble {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.75);
          line-height: 1.6;
          padding: 10px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-left: 2px solid rgba(0,255,200,0.2);
          max-width: 680px;
          word-break: break-word;
        }
        .msg-bubble.own {
          border-left-color: rgba(192,132,252,0.3);
          background: rgba(192,132,252,0.04);
        }

        .day-divider {
          text-align: center;
          font-size: 0.58rem;
          color: rgba(255,255,255,0.15);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 16px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .day-divider::before, .day-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.05);
        }

        /* INPUT */
        .input-area {
          padding: 20px 28px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: #07070d;
        }
        .input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0 16px;
          transition: border-color 0.2s;
        }
        .input-wrap:focus-within { border-color: rgba(0,255,200,0.25); }
        .input-prompt { font-size: 0.75rem; color: rgba(0,255,200,0.4); }
        .chat-input {
          flex: 1;
          background: none;
          border: none;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          padding: 14px 0;
          outline: none;
        }
        .chat-input::placeholder { color: rgba(255,255,255,0.15); }
        .send-btn {
          background: none;
          border: none;
          color: rgba(0,255,200,0.5);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s;
        }
        .send-btn:hover { color: #00ffc8; }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .input-hint {
          font-size: 0.58rem;
          color: rgba(255,255,255,0.12);
          margin-top: 8px;
          letter-spacing: 0.06em;
        }

        /* MOBILE */
        @media (max-width: 640px) {
          .sidebar { width: 60px; min-width: 60px; }
          .sidebar-logo { padding: 0 0 16px; text-align: center; font-size: 1rem; }
          .sidebar-section, .room-btn span, .online-section, .signout-btn { display: none; }
          .room-btn { justify-content: center; padding: 12px; }
          .room-icon { width: auto; }
          .chat-header { padding: 14px 16px; }
          .messages-wrap { padding: 16px; }
          .input-area { padding: 12px 16px; }
        }
      `}</style>

      <div className="chat-wrap">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-logo">NEXUS</div>

          <div className="sidebar-section">Channels</div>
          {ROOMS.map(room => (
            <button
              key={room}
              className={`room-btn ${activeRoom === room ? "active" : ""}`}
              onClick={() => setActiveRoom(room)}
            >
              <span className="room-icon">{ROOM_ICONS[room]}</span>
              <span>{room}</span>
            </button>
          ))}

          <div className="online-section">
            <div className="online-title">Online — {onlineUsers.length}</div>
            {onlineUsers.slice(0, 5).map((u, i) => (
              <div key={i} className="online-user">
                <div className="online-dot" />
                {u}
              </div>
            ))}
          </div>

          <button className="signout-btn" onClick={signOut}>Sign out</button>
        </div>

        {/* MAIN */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-room-icon">{ROOM_ICONS[activeRoom]}</span>
              <span className="chat-room-name">{activeRoom}</span>
            </div>
            <div className="chat-header-right">
              {displayName} · NEXUS
            </div>
          </div>

          <div className="messages-wrap">
            {messages.length === 0 && (
              <div className="day-divider">No messages yet — say hello</div>
            )}

            {messages.length > 0 && (
              <div className="day-divider">Start of #{activeRoom}</div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="msg-group">
                <div className="msg-header">
                  <span className={`msg-username ${isOwnMessage(msg) ? "own" : ""}`}>
                    {msg.username}
                  </span>
                  <span className="msg-time">{formatTime(msg.created_at)}</span>
                </div>
                <div className={`msg-bubble ${isOwnMessage(msg) ? "own" : ""}`} style={{ position: "relative" }}>
  {msg.content}
  {isOwnMessage(msg) && (
    <button onClick={() => deleteMessage(msg.id)} style={{
      position: "absolute", top: 6, right: 8,
      background: "none", border: "none",
      color: "rgba(255,68,102,0.3)", cursor: "pointer",
      fontSize: "0.65rem", padding: "0 2px",
      transition: "color 0.2s",
    }}
      onMouseEnter={e => e.target.style.color = "#ff4466"}
      onMouseLeave={e => e.target.style.color = "rgba(255,68,102,0.3)"}
    >✕</button>
  )}
</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="input-area">
            <form onSubmit={sendMessage}>
              <div className="input-wrap">
                <span className="input-prompt">&gt;</span>
                <input
                  ref={inputRef}
                  className="chat-input"
                  placeholder={`Message #${activeRoom}`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  autoFocus
                />
                <button className="send-btn" type="submit" disabled={sending || !newMessage.trim()}>
                  SEND ↵
                </button>
              </div>
              <div className="input-hint">Press Enter to send</div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}