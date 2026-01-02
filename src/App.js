import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Use environment variable for API URL (falls back to localhost for local development)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLane, setSelectedLane] = useState(null);
  const chatRef = useRef(null);
  const lastSyncRef = useRef(0); // Track when we last synced with backend

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/status`);
      setStatus(res.data);
      // Only update countdown if we haven't started counting or if there's a big difference
    // Only sync with backend when countdown reaches 0 (signal changed)
      setCountdown(res.data.remaining_time);      }
      lastSyncRef.current = Date.now();
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  const sendAIChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsTyping(true);
    try {
      const res = await axios.post(`${API_URL}/api/ai-chat`, { message: userMsg });
      setChatMessages(prev => [...prev, { role: 'ai', content: res.data.response }]);
    } catch (error) {
      console.error('Gemini AI Error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: error.response?.data?.error || 'Gemini AI: Service temporarily unavailable.'
      }]);
    }
    setIsTyping(false);
  };

  const triggerEmergency = async (lane) => {
    await axios.post(`${API_URL}/api/emergency`, { lane });
    fetchStatus();
  };

  const handleLaneClick = (laneId) => {
    setSelectedLane(laneId);
  };

  // Fetch status every 5 seconds (less frequent to not interfere with countdown)
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Smooth countdown timer - decrements every second
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && status) {
      // When countdown reaches 0, fetch new status to get next signal
      fetchStatus();
    }
  }, [countdown]);

  if (!status) return <div className="loading">Loading Smart Traffic AI...</div>;

  const getColor = (light) => {
    if (light === 'GREEN') return '#4CAF50';
    if (light === 'YELLOW') return '#FF9800';
    return '#F44336';
  };

  return (
    <div className="app">
      <header>
        <h1>🚦 Smart Traffic AI Control</h1>
        <div className={`status ${status.emergency_active ? 'emergency' : ''}`}>
          {status.emergency_active ? '🚨 EMERGENCY MODE' : '🟢 Normal Mode'}
        </div>
      </header>

      <div className="main-display">
        <h2>{status.active_lane} - {status.lanes[status.active_lane]?.light || 'GREEN'}</h2>
        <div className="countdown">{countdown}s</div>
      </div>

      <div className="lanes">
        {Object.entries(status.lanes).map(([id, lane]) => (
          <div 
            key={id} 
            className={`lane-card ${selectedLane === id ? 'selected' : ''}`}
            style={{
              borderLeft: `8px solid ${getColor(lane.light)}`,
              cursor: 'pointer'
            }}
            onClick={() => handleLaneClick(id)}
          >
            <h3>{id}</h3>
            <p>{lane.count} cars | Density: {lane.density}/5</p>
            <p style={{ color: getColor(lane.light), fontWeight: 'bold' }}>{lane.light}</p>
          </div>
        ))}
      </div>

      {selectedLane && (
        <div className="selected-lane-info" style={{
          background: '#2c3e50',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px 0',
          border: '2px solid #3498db'
        }}>
          <h3 style={{ color: '#3498db' }}>Selected Lane: {selectedLane}</h3>
          <p>Status: <span style={{ color: getColor(status.lanes[selectedLane].light) }}>{status.lanes[selectedLane].light}</span></p>
          <p>Cars: {status.lanes[selectedLane].count} | Density: {status.lanes[selectedLane].density}/5</p>
        </div>
      )}

      <div className="prediction">
        <h3>🎯 Congestion Prediction</h3>
        <div className={`badge ${status.congestion.level.toLowerCase()}`}>
          {status.congestion.level} ({(status.congestion.confidence*100).toFixed(0)}%)
        </div>
      </div>

      <div className="emergency">
        <h3>🚑 Emergency Test</h3>
        {['NORTH', 'SOUTH', 'EAST', 'WEST'].map(lane => (
          <button key={lane} onClick={() => triggerEmergency(lane)} className="emergency-btn">
            🚨 {lane} Priority
          </button>
        ))}
      </div>

      <div className="ai-chat">
        <h3>🤖 Google Gemini AI Assistant</h3>
        <div className="chat-container">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <strong>{msg.role === 'user' ? 'You' : 'Gemini AI'}:</strong> {msg.content}
            </div>
          ))}
          {isTyping && <div className="chat-message ai">Gemini AI is typing...</div>}
          <div ref={chatRef} />
        </div>
        <div className="chat-input">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendAIChat()}
            placeholder="Ask: 'Why North congested?' or 'Optimize signals?'"
            disabled={isTyping}
          />
          <button onClick={sendAIChat} disabled={isTyping || !chatInput.trim()}>
            Send
          </button>
        </div>
      </div>

      <footer>
        <p>🟢 Live | API: {API_URL} | AI: Google Gemini | Refresh: 5s</p>
      </footer>
    </div>
  );
}

export default App;
