window.plugin = {
  pages: [
    {
      title: 'LLM Chat',
      path: 'llm-chat',
      render: () => {
        const { useState } = React;

        const ChatUI = () => {
          const [messages, setMessages] = useState([]);
          const [input, setInput] = useState('');
          const [loading, setLoading] = useState(false);

          const sendMessage = async () => {
            if (!input.trim()) return;

            const userMessage = { role: 'user', content: input };
            setMessages([...messages, userMessage]);
            setInput('');
            setLoading(true);

            try {
              const response = await fetch('https://your-backend-url/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input }),
              });

              const data = await response.json();

              const assistantMessage = {
                role: 'assistant',
                content: data?.response || 'No response',
              };

              setMessages(prev => [...prev, assistantMessage]);
            } catch (err) {
              console.error('Error:', err);
              setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error communicating with backend.' }]);
            } finally {
              setLoading(false);
            }
          };

          return React.createElement('div', {
            style: {
              maxWidth: '800px',
              margin: '20px auto',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '10px',
              fontFamily: 'sans-serif',
            }
          },
            React.createElement('h2', null, 'Chat with LLM'),

            React.createElement('div', {
              style: {
                height: '400px',
                overflowY: 'auto',
                background: '#f9f9f9',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '5px',
              }
            },
              messages.map((msg, idx) =>
                React.createElement('div', {
                  key: idx,
                  style: {
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                    background: msg.role === 'user' ? '#cce5ff' : '#e2e3e5',
                    margin: '8px 0',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    maxWidth: '80%',
                  }
                }, msg.content)
              )
            ),

            React.createElement('div', { style: { display: 'flex', gap: '10px' } },
              React.createElement('input', {
                type: 'text',
                value: input,
                placeholder: 'Ask something...',
                onChange: e => setInput(e.target.value),
                onKeyDown: e => e.key === 'Enter' && sendMessage(),
                disabled: loading,
                style: { flex: 1, padding: '10px', fontSize: '16px' }
              }),
              React.createElement('button', {
                onClick: sendMessage,
                disabled: loading,
                style: { padding: '10px 20px' }
              }, loading ? '...' : 'Send')
            )
          );
        };

        return React.createElement(ChatUI);
      }
    }
  ]
};
