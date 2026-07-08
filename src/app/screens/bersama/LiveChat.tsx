import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, Package } from '../../../lib/storage';
import * as api from '../../../lib/api';

interface LiveChatProps {
  role: 'pengirim' | 'driver';
  packages: Package[];
  messages: ChatMessage[];
  navigate?: (screen: string) => void;
}

export const LiveChat: React.FC<LiveChatProps> = ({ role, packages, navigate }) => {
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Active packages that could have chats
  const activePackagesMap = new Map<string, Package>();
  packages.forEach(p => activePackagesMap.set(p.id, p));

  // Build chat session list from packages that have a driver or any known history
  const chatSessions = packages
    .filter(p => p.driverId && p.status !== 'Draft' && p.status !== 'Dibatalkan')
    .map(pkg => {
      let partnerName = 'Layanan Pengiriman';
      let partnerAvatar = '';
      if (role === 'pengirim') {
        partnerName = pkg.driverName || 'Mencari Driver...';
        partnerAvatar = pkg.driverAvatar || '';
      } else {
        partnerName = 'Pengirim (' + pkg.category + ')';
        partnerAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop&q=80';
      }
      return {
        packetId: pkg.id,
        package: pkg,
        partnerName,
        partnerAvatar,
      };
    });

  const selectedSession = chatSessions.find(s => s.packetId === selectedPacketId);

  // Load messages & subscribe when a chat is opened
  useEffect(() => {
    if (!selectedPacketId) {
      setCurrentMessages([]);
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      return;
    }

    setLoadingMessages(true);
    api.fetchMessages(selectedPacketId).then(msgs => {
      setCurrentMessages(msgs);
      setLoadingMessages(false);
    });

    // Subscribe to real-time messages for this packet
    const unsub = api.subscribeToMessages(selectedPacketId, (msgs) => {
      setCurrentMessages(msgs);
    });
    unsubRef.current = unsub;

    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [selectedPacketId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages, selectedPacketId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPacketId) return;
    const text = inputText.trim();
    setInputText('');
    try {
      await api.sendMessage(selectedPacketId, text, role);
      // Optimistic update: add local message immediately
      const optimistic: ChatMessage = {
        id: 'opt_' + Date.now(),
        packetId: selectedPacketId,
        senderRole: role,
        text,
        timestamp: new Date().toISOString(),
        read: true,
      };
      setCurrentMessages(prev => [...prev, optimistic]);
    } catch (err: any) {
      alert('Gagal mengirim pesan: ' + err.message);
    }
  };

  if (selectedPacketId && selectedSession) {
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
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              objectFit: 'cover',
              cursor: navigate ? 'pointer' : 'default',
            }}
            onClick={() => navigate?.('setelan')}
          />

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span
              style={{ fontSize: '15px', fontWeight: '700', cursor: navigate ? 'pointer' : 'default' }}
              onClick={() => navigate?.('setelan')}
            >
              {selectedSession.partnerName}
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 500 }}>
              {selectedSession.package ? `Paket: ${selectedSession.package.category}` : 'Umum'}
            </span>
          </div>

          {/* Package status badge */}
          {selectedSession.package && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#64748b',
            }}>
              {selectedSession.package.status}
            </span>
          )}
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
          {loadingMessages ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              <span className="material-icons" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>hourglass_top</span>
              Memuat pesan...
            </div>
          ) : currentMessages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>
              <span className="material-icons" style={{ fontSize: '48px', marginBottom: '8px', display: 'block' }}>chat</span>
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
            disabled={!inputText.trim()}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: inputText.trim()
                ? 'linear-gradient(180deg, #8eadf0 0%, #2091e7 100%)'
                : '#e2e8f0',
              color: inputText.trim() ? '#ffffff' : '#94a3b8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              boxShadow: inputText.trim() ? '0 4px 10px rgba(32,145,231,0.3)' : 'none',
              transition: 'all 0.2s',
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
            <span className="material-icons" style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px', display: 'block' }}>
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
              {/* Avatar — clicking navigates to profile */}
              <img
                src={session.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&fit=crop&q=80'}
                alt={session.partnerName}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                onClick={(e) => { e.stopPropagation(); navigate?.('setelan'); }}
              />

              {/* Chat Text Details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                    {session.partnerName}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {session.package ? session.package.status : ''}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    fontWeight: '400',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {session.package
                    ? `📍 ${session.package.pickupAddress.split(',')[0]} → 🏁 ${session.package.dropoffAddress.split(',')[0]}`
                    : 'Ketuk untuk memulai percakapan'}
                </span>
              </div>

              {/* Arrow */}
              <span className="material-icons" style={{ fontSize: '18px', color: '#cbd5e1' }}>chevron_right</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default LiveChat;
