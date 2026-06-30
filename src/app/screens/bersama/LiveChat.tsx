import React, { useState, useEffect, useRef } from 'react';
import { 
  type ChatMessage, 
  getChatMessages, 
  saveChatMessages, 
  type Package 
} from '../../../lib/storage';

interface LiveChatProps {
  role: 'pengirim' | 'driver';
  packages: Package[];
  messages: ChatMessage[];
}

export const LiveChat: React.FC<LiveChatProps> = ({ role, packages, messages }) => {
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Group messages by packetId to show in list
  const activePackagesMap = new Map<string, Package>();
  packages.forEach(p => activePackagesMap.set(p.id, p));

  // Get unique packetIds from messages or active packages that have a driver
  const chatSessions = Array.from(
    new Set([
      ...messages.map(m => m.packetId),
      ...packages
        .filter(p => p.driverId && p.status !== 'Draft' && p.status !== 'Dibatalkan')
        .map(p => p.id)
    ])
  ).map(packetId => {
    const pkg = activePackagesMap.get(packetId);
    const sessionMessages = messages.filter(m => m.packetId === packetId);
    const lastMessage = sessionMessages[sessionMessages.length - 1];
    
    // Determine partner name
    let partnerName = 'Layanan Pengiriman';
    let partnerAvatar = '';
    if (pkg) {
      if (role === 'pengirim') {
        partnerName = pkg.driverName || 'Mencari Driver...';
        partnerAvatar = pkg.driverAvatar || '';
      } else {
        partnerName = 'Pengirim (' + pkg.category + ')';
        partnerAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop&q=80';
      }
    }

    return {
      packetId,
      package: pkg,
      partnerName,
      partnerAvatar,
      lastMessageText: lastMessage ? lastMessage.text : 'Belum ada pesan. Sapa mitra Anda!',
      lastMessageTime: lastMessage ? new Date(lastMessage.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
      unreadCount: sessionMessages.filter(m => m.senderRole !== role && !m.read).length
    };
  });

  // Filter messages for current selected chat
  const currentMessages = messages.filter(m => m.packetId === selectedPacketId);
  const selectedSession = chatSessions.find(s => s.packetId === selectedPacketId);

  // Scroll to bottom when messages change or chat is opened
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPacketId, messages]);

  // Mark messages as read when opening chat
  useEffect(() => {
    if (selectedPacketId) {
      const allMessages = getChatMessages();
      let updated = false;
      const newMessages = allMessages.map(m => {
        if (m.packetId === selectedPacketId && m.senderRole !== role && !m.read) {
          updated = true;
          return { ...m, read: true };
        }
        return m;
      });
      if (updated) {
        saveChatMessages(newMessages);
      }
    }
  }, [selectedPacketId, messages, role]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPacketId) return;

    const newMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      packetId: selectedPacketId,
      senderRole: role,
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    const allMessages = getChatMessages();
    saveChatMessages([...allMessages, newMessage]);
    setInputText('');
  };

  if (selectedPacketId && selectedSession) {
    // Render Chat Room
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#f4f7fc',
          zIndex: 150,
          borderBottomLeftRadius: '32px',
          borderBottomRightRadius: '32px',
        }}
      >
        {/* Chat Room Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
          }}
        >
          <button 
            onClick={() => setSelectedPacketId(null)}
            className="back-pill"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          
          <img 
            src={selectedSession.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop&q=80'} 
            alt={selectedSession.partnerName}
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '15px', fontWeight: '700' }}>{selectedSession.partnerName}</span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 500 }}>
              {selectedSession.package ? `Paket: ${selectedSession.package.category}` : 'Umum'}
            </span>
          </div>
        </div>

        {/* Chat Bubbles Scroll Area */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {currentMessages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>
              <span className="material-icons" style={{ fontSize: '48px', marginBottom: '8px' }}>chat</span>
              <p>Mulai percakapan Anda.<br />Kirim pesan pertama sekarang!</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isSelf = msg.senderRole === role;
              return (
                <div 
                  key={msg.id}
                  style={{
                    alignSelf: isSelf ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isSelf ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Bubble */}
                  <div 
                    style={{
                      background: isSelf ? 'linear-gradient(135deg, #8eadf0 0%, #2091e7 100%)' : '#ffffff',
                      color: isSelf ? '#ffffff' : '#1e293b',
                      padding: '12px 16px',
                      borderRadius: isSelf ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      fontSize: '14px',
                      lineHeight: '1.4',
                    }}
                  >
                    {msg.text}
                  </div>
                  {/* Timestamp */}
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={handleSendMessage}
          style={{
            padding: '16px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '10px',
            borderBottomLeftRadius: '32px',
            borderBottomRightRadius: '32px',
          }}
        >
          <input 
            type="text"
            placeholder="Ketik pesan..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '12px 18px',
              fontSize: '14px',
              background: '#f8fafc',
              outline: 'none',
            }}
          />
          <button 
            type="submit"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #8eadf0 0%, #2091e7 100%)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(32,145,231,0.3)',
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px', marginLeft: '2px' }}>send</span>
          </button>
        </form>
      </div>
    );
  }

  // Render Session List
  return (
    <div className="screen-content">
      <div style={{ marginTop: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Pesan Masuk</h1>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Diskusi interpersonal dengan pengirim & driver</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {chatSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <span className="material-icons" style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px' }}>
              chat_bubble_outline
            </span>
            <p style={{ fontSize: '14px', fontWeight: 500 }}>Belum Ada Percakapan</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Hubungan chat akan otomatis terbuat ketika paket mendapatkan pengemudi.
            </p>
          </div>
        ) : (
          chatSessions.map((session) => (
            <div 
              key={session.packetId}
              onClick={() => setSelectedPacketId(session.packetId)}
              className="premium-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Avatar */}
              <img 
                src={session.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop&q=80'} 
                alt={session.partnerName}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
              />

              {/* Chat Text Details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                    {session.partnerName}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {session.lastMessageTime}
                  </span>
                </div>
                <span 
                  style={{ 
                    fontSize: '12px', 
                    color: session.unreadCount > 0 ? '#1e293b' : '#64748b', 
                    fontWeight: session.unreadCount > 0 ? '600' : '400',
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}
                >
                  {session.lastMessageText}
                </span>
              </div>

              {/* Unread Badge */}
              {session.unreadCount > 0 && (
                <span 
                  style={{
                    background: '#2091e7',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(32, 145, 231, 0.4)',
                  }}
                >
                  {session.unreadCount}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default LiveChat;
