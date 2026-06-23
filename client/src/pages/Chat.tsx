import { useEffect, useRef, useState, useCallback } from "react";
import API from "../api/axios";
import { io, Socket } from "socket.io-client";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";

interface User {
  id: string;
  username: string;
  last_seen: string;
  last_message: string | null;
}
interface UnreadCount {
  sender_id: string;
  unread_count: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  encrypted_message: string;
  created_at: string;
  is_read: boolean;
}
interface IncomingMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  encrypted_message: string;
  created_at: string;
  is_read: boolean;
}

interface CurrentUser {
  id: string;
  username: string;
}

interface WebRTCSignalData {
  type: RTCSdpType;
  sdp: string;
}

export default function Chat() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // --- Calling Infrastructure States ---
  const [callActive, setCallActive] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState<WebRTCSignalData | null>(null);
  const [callerId, setCallerId] = useState("");
  const [callTypeVideo, setCallTypeVideo] = useState(false);

  const docInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const token = localStorage.getItem("token");

  const currentUser: CurrentUser | null = token
    ? JSON.parse(atob(token.split(".")[1]))
    : null;
    
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  // ===================================
  // WEBRTC TERMINATION SYSTEM
  // ===================================
  const terminateCallStreams = useCallback((notifyOpponent = true) => {
    setCallActive(false);
    setIsReceivingCall(false);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (notifyOpponent && socketRef.current) {
      const target = selectedUser ? String(selectedUser.id) : callerId;
      if (target) {
        socketRef.current.emit("end-call", { to: target });
      }
    }
  }, [selectedUser, callerId]);

  // ==================================
  // SOCKET & WEBRTC PIPELINE EFFECT
  // ==================================
  useEffect(() => {
    if (!currentUser?.id) return;

    const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"); //  Fixed!
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("user-online", String(currentUser.id));
    });

    socket.on("online-users", (usersList: string[]) => {
      setOnlineUsers(usersList);
    });
    
    socket.on("receive-message", (newMessage: IncomingMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    socket.on("incoming-call", (data: { from: string; name: string; signal: WebRTCSignalData; isVideo: boolean }) => {
      setIsReceivingCall(true);
      setCallerId(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      setCallTypeVideo(data.isVideo);
    });

    socket.on("call-accepted", async (signal: WebRTCSignalData) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    });

    socket.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("ICE exchange tracking error:", err);
      }
    });

    socket.on("call-ended", () => {
      terminateCallStreams(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id, callerId, selectedUser, terminateCallStreams]);

  // ===================================
  // ENDPOINT DATA RESOLVERS
  // ===================================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get("/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allUsers = res.data.users || [];
        setUsers(allUsers.filter((u: User) => u.id !== currentUser?.id));
      } catch (err) {
        console.log("Error loading users database:", err);
      }
    };
    fetchUsers();
  }, [token, currentUser?.id]);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const res = await API.get("/messages/unread/counts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const countsMap: Record<string, number> = {};
        (res.data.counts || []).forEach((item: UnreadCount) => {
          countsMap[item.sender_id] = Number(item.unread_count);
        });
        setUnreadCounts(countsMap);
      } catch (err) {
        console.log("Error calculating unread message metadata:", err);
      }
    };
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 2000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!selectedUser) return;
    const fetchMessages = async () => {
      try {
        const res = await API.get(`/messages/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(res.data.messages || []);
        setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
      } catch (err) {
        console.log("Error pulling target conversation rows:", err);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [selectedUser, token]);

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 200);
    }
  }, [selectedUser, messages.length]);

  // ===================================
  // WEBRTC PEER CONNECTION DRIVER
  // ===================================
  const initializeWebRTCPeer = async (isVideo: boolean, targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    peerConnectionRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };
  };

  const startCall = async (isVideo: boolean) => {
    if (!selectedUser) return;
    setCallActive(true);
    setCallTypeVideo(isVideo);

    await initializeWebRTCPeer(isVideo, String(selectedUser.id));

    if (peerConnectionRef.current) {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      socketRef.current?.emit("call-user", {
        userToCall: String(selectedUser.id),
        signalData: offer,
        from: String(currentUser?.id),
        name: currentUser?.username,
        isVideo
      });
    }
  };

  const acceptCall = async () => {
    setIsReceivingCall(false);
    setCallActive(true);

    await initializeWebRTCPeer(callTypeVideo, callerId);

    if (peerConnectionRef.current && callerSignal) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(callerSignal));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socketRef.current?.emit("answer-call", { to: callerId, signal: answer });
    }
  };

  // =========================
  // ACTION PIPELINES
  // =========================
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser || !text.trim()) return;
    try {
      await API.post("/messages/send", { receiverId: selectedUser.id, message: text }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setText("");
      setShowEmojiPicker(false);
      const res = await API.get(`/messages/${selectedUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.log("Error dispatching text payload:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append(fieldName, file);
    try {
      const res = await API.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const fileUrl = res.data.imageUrl || res.data.fileUrl || "[Attached File]";
      setText((prev) => (prev ? `${prev} ${fileUrl}` : fileUrl));
      setShowAttachmentMenu(false);
    } catch (err) {
      console.log(err);
    }
  };

  const handleLocationAccess = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setText((prev) => (prev ? `${prev} ${mapsLink}` : mapsLink));
        setShowAttachmentMenu(false);
      },
      () => {
        alert("Unable to retrieve location. Please grant permission.");
      }
    );
  };

  const handleContactAccess = () => {
    const dummyContact = "👤 Contact Name: Alex Smith\n📞 Phone: +1 555-0199";
    setText((prev) => (prev ? `${prev}\n\n${dummyContact}` : dummyContact));
    setShowAttachmentMenu(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "25%", borderRight: "1px solid #ccc", padding: "15px", backgroundColor: "#f8f9fa", overflowY: "auto", height: "100vh" }}>
        <h2>Chats</h2>
        <input
          type="text"
          placeholder="🔍 Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ccc", outline: "none", boxSizing: "border-box" }}
        />
        <p style={{ marginBottom: "20px" }}>Logged in as: <b>{currentUser?.username}</b></p>

        {filteredUsers.map((u) => {
          const unread = unreadCounts[u.id] || 0;
          return (
            <div key={u.id} onClick={() => setSelectedUser(u)} style={{ display: "flex", alignItems: "center", padding: "12px", marginBottom: "8px", borderRadius: "10px", cursor: "pointer", background: selectedUser?.id === u.id ? "#e6f4ff" : "white", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              {/* FIXED: Removed the invalid 'center' property right here */}
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#0088cc", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", marginRight: "10px", flexShrink: 0 }}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</div>
                  {unread > 0 && <div style={{ backgroundColor: "#2AABEE", color: "white", borderRadius: "50%", minWidth: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", marginLeft: "5px" }}>{unread}</div>}
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.last_message || "No messages yet"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CHAT AREA */}
      <div style={{ width: "75%", display: "flex", flexDirection: "column", height: "100vh" }}>
        
        {/* CHAT HEADER */}
        <div style={{ padding: "15px", borderBottom: "1px solid #ddd", backgroundColor: "white", position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {selectedUser ? (
            <>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "18px" }}>{selectedUser.username}</div>
                <div style={{ fontSize: "13px", color: "gray" }}>
                  {onlineUsers.includes(String(selectedUser.id)) ? "online" : selectedUser.last_seen ? `last seen ${new Date(selectedUser.last_seen).toLocaleString()}` : "offline"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "20px", paddingRight: "10px" }}>
                <button onClick={() => startCall(true)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", outline: "none" }}>📹</button>
                <button onClick={() => startCall(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", outline: "none" }}>📞</button>
              </div>
            </>
          ) : (
            <div style={{ fontWeight: "bold", fontSize: "16px", color: "gray" }}>Select a user to start chatting</div>
          )}
        </div>

        {/* INCOMING CALL UI BANNER */}
        {isReceivingCall && (
          <div style={{ backgroundColor: "#2AABEE", padding: "15px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Incoming {callTypeVideo ? "Video" : "Voice"} Call from <b>{callerName}</b>...</span>
            <div>
              <button onClick={acceptCall} style={{ backgroundColor: "#12CF12", color: "white", border: "none", padding: "8px 16px", borderRadius: "20px", marginRight: "10px", cursor: "pointer" }}>Answer</button>
              <button onClick={() => terminateCallStreams(true)} style={{ backgroundColor: "#FF4E74", color: "white", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer" }}>Decline</button>
            </div>
          </div>
        )}

        {/* STREAM MODAL WINDOW */}
        {callActive && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.9)", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "80%", height: "70%", backgroundColor: "#222", borderRadius: "12px", overflow: "hidden" }}>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {callTypeVideo && <video ref={localVideoRef} autoPlay muted playsInline style={{ position: "absolute", top: "20px", right: "20px", width: "150px", height: "110px", borderRadius: "8px", objectFit: "cover", border: "2px solid white" }} />}
            </div>
            <button onClick={() => terminateCallStreams(true)} style={{ marginTop: "20px", width: "60px", height: "60px", borderRadius: "50%", border: "none", backgroundColor: "#FF4E74", color: "white", fontSize: "24px", cursor: "pointer" }}>🛑</button>
          </div>
        )}

        {/* MESSAGES LAYER CONTAINER */}
        <div ref={messagesContainerRef} style={{ flex: 1, height: "0", overflowY: "auto", padding: "20px", backgroundColor: "#E5DDD5", borderRadius: "10px" }}>
          {messages.map((m) => {
            const isMine = String(m.sender_id) === String(currentUser?.id);
            const isOpponentOnline = onlineUsers.includes(String(m.receiver_id));

            return (
              <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                <div style={{ backgroundColor: isMine ? "#2AABEE" : "#FFFFFF", color: isMine ? "white" : "black", padding: "8px 12px", borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", maxWidth: "70%", wordBreak: "break-word", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
                  <div>{m.encrypted_message}</div>
                  <div style={{ fontSize: "11px", marginTop: "4px", textAlign: "right", opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMine && (
                      <span 
                        style={{ 
                          marginLeft: "5px", 
                          fontSize: "14px", 
                          fontWeight: "bold", 
                          lineHeight: "1", 
                          color: m.is_read ? "#006699" : "#FFFFFF" 
                        }}
                      >
                        {m.is_read ? "✓✓" : isOpponentOnline ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT ACTIONS DOCK */}
        <div style={{ position: "relative", backgroundColor: "#f0f0f0", padding: "10px" }}>
          <input type="file" ref={docInputRef} style={{ display: "none" }} accept=".pdf,.doc,.docx,.txt" onChange={(e) => handleFileUpload(e, "profilePic")} />
          <input type="file" ref={cameraInputRef} style={{ display: "none" }} accept="image/*" capture="user" onChange={(e) => handleFileUpload(e, "profilePic")} />
          <input type="file" ref={galleryInputRef} style={{ display: "none" }} accept="image/*,video/*" onChange={(e) => handleFileUpload(e, "profilePic")} />
          <input type="file" ref={audioInputRef} style={{ display: "none" }} accept="audio/*" onChange={(e) => handleFileUpload(e, "profilePic")} />

          {showEmojiPicker && (
            <div style={{ position: "absolute", bottom: "70px", left: "10px", zIndex: 200 }}>
              <EmojiPicker onEmojiClick={(data) => setText((prev) => prev + data.emoji)} theme={Theme.LIGHT} emojiStyle={EmojiStyle.NATIVE} lazyLoadEmojis={true} height={350} width={340} />
            </div>
          )}

          {showAttachmentMenu && (
            <div style={{ position: "absolute", bottom: "70px", right: "110px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", padding: "15px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", zIndex: 200, width: "220px" }}>
              <div onClick={() => docInputRef.current?.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}><div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#7F66FF", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📄</div><span style={{ fontSize: "11px", marginTop: "4px" }}>Document</span></div>
              <div onClick={() => cameraInputRef.current?.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}><div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#FF4E74", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📷</div><span style={{ fontSize: "11px", marginTop: "4px" }}>Camera</span></div>
              <div onClick={() => galleryInputRef.current?.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}><div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#12CF12", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🖼️</div><span style={{ fontSize: "11px", marginTop: "4px" }}>Gallery</span></div>
              <div onClick={() => audioInputRef.current?.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}><div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#FFA114", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎵</div><span style={{ fontSize: "11px", marginTop: "4px" }}>Audio</span></div>
              <div onClick={handleLocationAccess} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}><div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#06D755", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📍</div><span style={{ fontSize: "11px", marginTop: "4px" }}>Location</span></div>
              <div onClick={handleContactAccess} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}><div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#0099FF", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>👤</div><span style={{ fontSize: "11px", marginTop: "4px" }}>Contact</span></div>
            </div>
          )}

          <form onSubmit={sendMessage} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", backgroundColor: "white", borderRadius: "25px", padding: "4px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
              <button type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachmentMenu(false); }} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px", outline: "none" }}>😀</button>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" style={{ flex: 1, border: "none", padding: "10px", fontSize: "15px", outline: "none", marginLeft: "5px" }} />
              <button type="button" onClick={() => { setShowAttachmentMenu(!showAttachmentMenu); setShowEmojiPicker(false); }} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px", outline: "none", color: "#555" }}>📎</button>
              <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px", marginLeft: "8px", outline: "none", color: "#555" }}>📷</button>
            </div>
            <button type="submit" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "none", backgroundColor: "#2AABEE", color: "white", fontSize: "20px", cursor: "pointer", marginLeft: "8px", display: "flex", alignItems: "center", justifyContent: "center", outline: "none", flexShrink: 0 }}>➤</button>
          </form>
        </div>

      </div>
    </div>
  );
}