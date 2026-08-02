import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://logistics-app-production-e4a3.up.railway.app';

export default function Chat({ taskId, userId, userRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender_id: userId,
          sender_role: userRole
        })
      });

      if (response.ok) {
        setNewMessage('');
        loadMessages();
      } else {
        alert('Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
      alert('Ошибка сети');
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 15 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px',
          background: isOpen ? '#dc3545' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 'bold'
        }}
      >
        {isOpen ? '✖ Закрыть чат' : '💬 Открыть чат'}
      </button>

      {isOpen && (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: 8, 
          padding: 15, 
          marginTop: 10, 
          background: '#f9f9f9' 
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 10 }}>💬 Чат по рейсу #{taskId}</h4>
          
          <div style={{ 
            maxHeight: 300, 
            overflowY: 'auto', 
            marginBottom: 15, 
            padding: 10, 
            background: 'white', 
            borderRadius: 4,
            border: '1px solid #eee'
          }}>
            {messages.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', margin: 20 }}>
                Нет сообщений. Начните диалог!
              </p>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{ 
                    marginBottom: 10, 
                    textAlign: msg.sender_id === userId ? 'right' : 'left' 
                  }}
                >
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
                    {msg.sender_role === 'logistician' ? '👔 Логист' : '🚗 Водитель'}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    background: msg.sender_id === userId ? '#007bff' : '#e9ecef',
                    color: msg.sender_id === userId ? 'white' : 'black',
                    borderRadius: 8,
                    maxWidth: '70%',
                    wordWrap: 'break-word',
                    textAlign: 'left'
                  }}>
                    {msg.text}
                  </span>
                  <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              style={{ 
                flex: 1, 
                padding: 10, 
                border: '1px solid #ddd', 
                borderRadius: 4,
                fontSize: 14
              }}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !newMessage.trim()} 
              style={{ 
                padding: '10px 20px', 
                background: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {loading ? '...' : '📤'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
