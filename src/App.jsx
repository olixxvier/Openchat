
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, username, message, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setMessages(data);
      }

      setLoading(false);
    }

    loadMessages();

    const channel = supabase
      .channel('public-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new;

          setMessages((previousMessages) => {
            const alreadyExists = previousMessages.some(
              (item) => item.id === newMessage.id
            );

            if (alreadyExists) {
              return previousMessages;
            }

            return [...previousMessages, newMessage].sort(
              (a, b) =>
                new Date(a.created_at) - new Date(b.created_at)
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(event) {
    event.preventDefault();

    const cleanUsername = username.trim();
    const cleanMessage = message.trim();

    if (!cleanUsername || !cleanMessage) {
      setError('Enter both a username and a message.');
      return;
    }

    setError('');

    const { error } = await supabase
      .from('messages')
      .insert({
        username: cleanUsername,
        message: cleanMessage,
      });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage('');
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">O</div>
          <div>
            <h1>OpenChat</h1>
            <p>A place to connect</p>
          </div>
        </div>
        <span className="status">Live chat</span>
      </header>

      <section className="chat">
        <div className="chat-heading">
          <h2>Public Chat</h2>
          <p>Say hello to the community.</p>
        </div>

        <div className="messages">
          {loading ? (
            <p>Loading messages...</p>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✉</span>
              <h3>Start a conversation</h3>
              <p>Be the first to send a message!</p>
            </div>
          ) : (
            messages.map((item) => (
              <article className="message" key={item.id}>
                <div className="avatar">
                  {item.username.charAt(0).toUpperCase()}
                </div>

                <div className="message-content">
                  <div className="message-meta">
                    <strong>{item.username}</strong>
                    <time>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <p>{item.message}</p>
                </div>
              </article>
            ))
          )}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <label htmlFor="username">Your username</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Choose a name..."
            maxLength={30}
          />

          <label htmlFor="message">Your message</label>
          <div className="message-input">
            <input
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a message..."
              maxLength={1000}
            />
            <button type="submit" disabled={loading}>
              Send ↗
            </button>
          </div>

          {error && <p role="alert" className="hint">{error}</p>}

          <p className="hint">
            Be kind to others. Messages are shared publicly.
          </p>
        </form>
      </section>

      <footer>OpenChat · Built for everyone</footer>
    </main>
  );
}

export default App;
