import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [serverIP, setServerIP] = useState('192.168.0.166');
  const [serverPort, setServerPort] = useState('8000');
  const [isConfigured, setIsConfigured] = useState(false);
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const connectWebSocket = () => {
    if (!serverIP || !serverPort) {
      alert('Please enter server IP and port');
      return;
    }

    setIsConfigured(true);
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
    }

    const wsURL = `ws://${serverIP}:${serverPort}/ws`;
    console.log(`Connecting to: ${wsURL}`);
    ws.current = new WebSocket(wsURL);

    ws.current.onopen = () => {
      console.log('Connected to WebSocket');
      setConnected(true);
      setWsStatus('Connected');
    };

    ws.current.onmessage = (event) => {
      const data = event.data;
      if (data.startsWith('CLIENT_LIST:')) {
        const clientsList = data.substring(12).split(',');
        setClients(clientsList.filter(client => client !== ''));
      } else {
        setMessages(prevMessages => [...prevMessages, data]);
      }
    };

    ws.current.onclose = () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
      setWsStatus('Disconnected');
      setTimeout(connectWebSocket, 2000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('Error: Could not connect');
    };
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && connected) {
      ws.current.send(inputMessage);
      setInputMessage('');
    }
  };

  const sendPrivateMessage = async (e) => {
    e.preventDefault();
    if (privateMessage.trim() && selectedClient) {
      try {
        const response = await fetch(`http://${serverIP}:${serverPort}/send/${selectedClient}?message=${encodeURIComponent(privateMessage)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setMessages(prevMessages => [...prevMessages, `You privately to ${selectedClient}: ${privateMessage}`]);
          setPrivateMessage('');
        } else {
          console.error('Failed to send private message');
        }
      } catch (error) {
        console.error('Error sending private message:', error);
      }
    }
  };

  const fetchMessages = async () => {
    if (!isConfigured) return;
    
    try {
      const response = await fetch(`http://${serverIP}:${serverPort}/getMessages`);
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchClients = async () => {
    if (!isConfigured) return;
    
    try {
      const response = await fetch(`http://${serverIP}:${serverPort}/clients`);
      const data = await response.json();
      setClients(data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isConfigured) {
      fetchMessages();
      fetchClients();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isConfigured]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleServerConfig = (e) => {
    e.preventDefault();
    connectWebSocket();
  };

  return (
    <div className="chat-app">
      <header className="header">
        <h1>WebSocket Chat</h1>
        <div className="status">
          Status: <span className={connected ? 'status-connected' : 'status-disconnected'}>{wsStatus}</span>
        </div>
      </header>

      {!isConfigured ? (
        <div className="server-config">
          <h2>Connect to Chat Server</h2>
          <form onSubmit={handleServerConfig}>
            <div className="form-group">
              <label>Server IP:</label>
              <input 
                type="text" 
                value={serverIP} 
                onChange={(e) => setServerIP(e.target.value)}
                placeholder="e.g. 192.168.0.166" 
                required
              />
            </div>
            <div className="form-group">
              <label>Server Port:</label>
              <input 
                type="text" 
                value={serverPort} 
                onChange={(e) => setServerPort(e.target.value)}
                placeholder="e.g. 8000" 
                required
              />
            </div>
            <button type="submit" className="connect-button">Connect</button>
          </form>
        </div>
      ) : (
        <div className="container">
          <div className="main">
            <div className="messages-container">
              <div className="messages">
                {messages.map((msg, index) => (
                  <div key={index} className="message">
                    {msg}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!connected}
                className="message-input"
              />
              <button 
                type="submit" 
                disabled={!connected || !inputMessage.trim()} 
                className="send-button"
              >
                Send
              </button>
            </form>
          </div>

          <div className="sidebar">
            <div className="server-info">
              <p>Connected to: {serverIP}:{serverPort}</p>
              <button 
                onClick={() => setIsConfigured(false)} 
                className="change-server"
              >
                Change Server
              </button>
            </div>
            
            <div className="clients-container">
              <h3>Connected Clients</h3>
              <div className="clients-list">
                {clients.length ? (
                  clients.map((client, index) => (
                    <div 
                      key={index} 
                      className={`client ${selectedClient === client ? 'selected' : ''}`}
                      onClick={() => setSelectedClient(client)}
                    >
                      {client}
                    </div>
                  ))
                ) : (
                  <div className="no-clients">No clients connected</div>
                )}
              </div>
            </div>

            <div className="private-message-container">
              <h3>Send Private Message</h3>
              <form onSubmit={sendPrivateMessage} className="private-message-form">
                <select 
                  value={selectedClient} 
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="client-select"
                  disabled={!connected || clients.length === 0}
                >
                  <option value="">Select a client</option>
                  {clients.map((client, index) => (
                    <option key={index} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  placeholder="Private message..."
                  disabled={!connected || !selectedClient}
                  className="private-message-input"
                />
                <button 
                  type="submit"
                  disabled={!connected || !selectedClient || !privateMessage.trim()}
                  className="private-send-button"
                >
                  Send Private
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
