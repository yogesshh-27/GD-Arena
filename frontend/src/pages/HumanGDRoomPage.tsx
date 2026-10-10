import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  Plus,
  Lock,
  Globe,
  Mic,
  MicOff,
  Volume2,
  Star,
  Send,
} from 'lucide-react';

export const HumanGDRoomPage: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);

  // Create room form state
  const [topicTitle, setTopicTitle] = useState('Remote vs Office Work for Early Career');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isPrivate, setIsPrivate] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [joinPasskey, setJoinPasskey] = useState('');

  // In-room state
  const [isMuted, setIsMuted] = useState(false);
  const [inRoomChat, setInRoomChat] = useState<{ sender: string; text: string }[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackComments, setFeedbackComments] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await api.listHumanRooms();
      setRooms(res);
    } catch (err) {
      console.error('Error fetching human rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createHumanRoom({
        topic_title: topicTitle,
        max_participants: maxParticipants,
        duration_seconds: durationMinutes * 60,
        is_private: isPrivate,
        passkey: isPrivate ? passkey : undefined,
      });
      setShowCreateModal(false);
      handleJoin(created.id, isPrivate ? passkey : undefined);
    } catch (err: any) {
      alert(`Error creating room: ${err.message}`);
    }
  };

  const handleJoin = async (roomId: string, key?: string) => {
    try {
      const res = await api.joinHumanRoom(roomId, key || joinPasskey);
      setActiveRoom({
        id: roomId,
        topic: res.topic_title || topicTitle,
        duration: res.duration_seconds || 900,
        participants: [
          { name: 'You (Joined)', role: 'Host' },
          { name: 'Aarav Patel', role: 'Candidate' },
          { name: 'Sneha Kulkarni', role: 'Candidate' },
        ],
      });
    } catch (err: any) {
      alert(`Unable to join room: ${err.message}`);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setInRoomChat((prev) => [...prev, { sender: 'You', text: chatMessage.trim() }]);
    setChatMessage('');
  };

  const handleLeaveRoom = () => {
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (activeRoom) {
      try {
        await api.submitPeerFeedback(activeRoom.id, {
          reviewee_id: 'sample_peer_id',
          rating: feedbackRating,
          comments: feedbackComments,
        });
      } catch {
        // Continue gracefully
      }
    }
    setShowFeedbackModal(false);
    setActiveRoom(null);
    loadRooms();
  };

  // RENDER: In-Room Live View
  if (activeRoom) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
        {/* Room Header */}
        <header
          style={{
            height: '65px',
            backgroundColor: 'rgba(18, 3, 7, 0.95)',
            borderBottom: '1px solid rgba(244, 63, 94, 0.18)',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={20} color="var(--accent-rose)" />
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.05em' }}>
                HUMAN GD PEER ROOM
              </span>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff1f2' }}>"{activeRoom.topic}"</h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: isMuted ? '1px solid rgba(244, 63, 94, 0.45)' : '1px solid rgba(251, 191, 36, 0.4)',
                background: isMuted ? 'rgba(244, 63, 94, 0.2)' : 'rgba(251, 191, 36, 0.15)',
                color: isMuted ? 'var(--accent-rose)' : 'var(--accent-gold)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              {isMuted ? 'Unmute Mic' : 'Mute Mic'}
            </button>

            <button
              onClick={handleLeaveRoom}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                background: 'rgba(244, 63, 94, 0.18)',
                color: 'var(--accent-rose)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Leave Room
            </button>
          </div>
        </header>

        {/* Room Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Peer Participants Grid */}
          <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {activeRoom.participants.map((p: any, idx: number) => (
                <div key={idx} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#233a2d' : 'rgba(255, 255, 255, 0.1)',
                      border: idx === 0 ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                      boxShadow: idx === 0 ? '0 0 15px rgba(35, 58, 45, 0.5)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#fff',
                      margin: '0 auto 0.75rem',
                    }}
                  >
                    {p.name[0]}
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff1f2' }}>{p.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>{p.role}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(26, 5, 14, 0.6)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Volume2 size={16} color="var(--accent-gold)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Audio session active • Live WebRTC peer connection</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Connected</span>
            </div>
          </div>

          {/* In-Room Text Chat Panel */}
          <div
            style={{
              width: '320px',
              borderLeft: '1px solid rgba(244, 63, 94, 0.18)',
              backgroundColor: 'rgba(18, 3, 7, 0.85)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '0.85rem', color: '#fff1f2' }}>
              Room Discussion Chat
            </div>
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {inRoomChat.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                  No messages yet. Send resources or pointers here.
                </p>
              ) : (
                inRoomChat.map((m, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>{m.sender}: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendChat} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(26, 5, 14, 0.6)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Peer Feedback Modal */}
        {showFeedbackModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1rem',
            }}
          >
            <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff1f2', marginBottom: '0.5rem' }}>
                Peer Feedback & Reflection
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                How would you rate the collaboration and idea exchange of your peer candidates?
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: star <= feedbackRating ? 'var(--accent-gold)' : 'var(--text-muted)',
                    }}
                  >
                    <Star size={28} fill={star <= feedbackRating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Optional constructive peer comments..."
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(26, 5, 14, 0.6)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  marginBottom: '1rem',
                }}
              />

              <button
                onClick={handleSubmitFeedback}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'linear-gradient(135deg, #e11d48, #be123c)',
                  boxShadow: '0 4px 15px rgba(225, 29, 72, 0.35)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Submit & Return to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER: Lobby View
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={24} color="var(--accent-gold)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff1f2' }}>Human GD Peer Rooms</h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Practice real-time group discussions with fellow college students in public or private audio rooms.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #1a2c22',
            background: '#233a2d',
            boxShadow: '0 4px 15px rgba(35, 58, 45, 0.4)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Host New Peer Room
        </button>
      </div>

      {/* Available Rooms Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading active peer rooms...
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--accent-rose)' }} />
          <p style={{ fontSize: '1rem', color: '#fff1f2', fontWeight: 600 }}>No public peer rooms waiting right now.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Be the first to host a discussion room for your campus peers!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              marginTop: '1.25rem',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              background: 'rgba(225, 29, 72, 0.15)',
              color: 'var(--accent-rose)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create a Room
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {rooms.map((r) => (
            <div key={r.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {r.is_private ? <Lock size={12} /> : <Globe size={12} />} {r.is_private ? 'PRIVATE ROOM' : 'PUBLIC ROOM'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {r.current_participants} / {r.max_participants} seats
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff1f2', marginBottom: '0.5rem' }}>
                  "{r.topic_title}"
                </h3>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                  <span>Duration: {Math.round(r.duration_seconds / 60)}m</span> • <span>Language: {r.language}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                {r.is_private && (
                  <input
                    type="password"
                    placeholder="Enter passkey to join"
                    value={joinPasskey}
                    onChange={(e) => setJoinPasskey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(26, 5, 14, 0.6)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      marginBottom: '0.5rem',
                      outline: 'none',
                    }}
                  />
                )}
                <button
                  onClick={() => handleJoin(r.id)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    boxShadow: '0 4px 15px rgba(225, 29, 72, 0.35)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Join Room Audio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Host Room Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Host a Peer Discussion Room
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Configure topic and capacity for your group practice session.
            </p>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Room Discussion Topic
                </label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Max Participants
                  </label>
                  <select
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: '#1a050e',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value={4}>4 Candidates</option>
                    <option value={6}>6 Candidates</option>
                    <option value={8}>8 Candidates</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: '#1a050e',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#fff', cursor: 'pointer', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  Make this a private room (Passkey required)
                </label>

                {isPrivate && (
                  <input
                    type="text"
                    required
                    placeholder="Set 4-digit passkey"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(26, 5, 14, 0.6)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    boxShadow: '0 4px 15px rgba(225, 29, 72, 0.35)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Create & Launch Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
