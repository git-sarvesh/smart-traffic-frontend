import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/status');
      setStatus(res.data);
      setCountdown(Math.max(0, res.data.remaining_time));
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
      const res = await axios.post('http://localhost:5000/api/ai-chat', { message: userMsg });
      setChatMessages(prev => [...prev, { role: 'ai', content: res.data.response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', content: 'AI service error. Check Gemini API key.' }]);
    }
    setIsTyping(false);
  };

  const triggerEmergency = async (lane) => {
    await axios.post('http://localhost:5000/api/emergency', { lane });
    fetchStatus();
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
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
        <h2>{status.active_lane} - GREEN</h2>
        <div className="countdown">{countdown}s</div>
      </div>

      <div className="lanes">
        {Object.entries(status.lanes).map(([id, lane]) => (
          <div key={id} className="lane-card" style={{borderLeft: `8px solid ${getColor(lane.light)}`}}>
            <h3>{id}</h3>
            <p>{lane.count} cars | Density: {lane.density}/5</p>
            <p>{lane.light}</p>
          </div>
        ))}
      </div>

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
        <p>🟢 Live | API: localhost:5000 | AI: Google Gemini | Refresh: 1s</p>
      </footer>
    </div>
  );
}

export default App;
