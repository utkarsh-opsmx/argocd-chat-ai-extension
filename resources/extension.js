((window) => {
  const { React, axios } = window;

  const ArgoCDAIExtension = () => {
    const { api } = React.useContext(window.ArgoUI.Context);
    const [backendUrl, setBackendUrl] = React.useState('');
    const [applications, setApplications] = React.useState([]);
    const [selectedApp, setSelectedApp] = React.useState('');
    const [appManifest, setAppManifest] = React.useState(null);
    const [chatInput, setChatInput] = React.useState('');
    const [chatHistory, setChatHistory] = React.useState([]);
    const [apiResponse, setApiResponse] = React.useState(null);
    const [agentReply, setAgentReply] = React.useState(null);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
      const fetchApplications = async () => {
        try {
          const response = await api.get('/api/v1/applications');
          setApplications(response.data.items || []);
        } catch (err) {
          setError('Failed to fetch applications');
        }
      };
      fetchApplications();
    }, []);

    React.useEffect(() => {
      if (selectedApp) {
        const fetchManifest = async () => {
          try {
            const response = await api.get(`/api/v1/applications/${selectedApp}`);
            setAppManifest(response.data);
          } catch (err) {
            setError('Failed to fetch application manifest');
          }
        };
        fetchManifest();
      }
    }, [selectedApp]);

    const sendMessage = async () => {
      if (!backendUrl || !chatInput || !selectedApp || !appManifest) {
        setError('Please provide backend URL, select an application, and enter a message');
        return;
      }

      const message = {
        userInput: chatInput,
        appName: selectedApp,
        appStatus: appManifest.status,
        appSpec: appManifest.spec,
      };

      try {
        const response = await axios.post(backendUrl, message);
        setAgentReply(response.data);
        setChatHistory([...chatHistory, `User: ${chatInput}`, `AI: ${response.data.comment}`]);
        setChatInput('');
        setError('');
      } catch (err) {
        setError('Failed to send message to backend');
      }
    };

    const runApi = async () => {
      if (!agentReply || !agentReply.shouldRun || !agentReply.method || !agentReply.url) {
        setError('Invalid API configuration in agent reply');
        return;
      }

      try {
        const response = await axios({
          method: agentReply.method,
          url: agentReply.url,
          data: agentReply.body,
          headers: agentReply.headers,
        });
        setApiResponse(response.data);
        setError('');
      } catch (err) {
        setError('Failed to execute API call');
        setApiResponse({ error: 'API call failed' });
      }
    };

    const sendApiResponseToBackend = async () => {
      if (!backendUrl || !apiResponse) {
        setError('No API response to send or backend URL missing');
        return;
      }

      try {
        const response = await axios.post(backendUrl, { apiResponse });
        setChatHistory([...chatHistory, `API Response sent to AI: ${JSON.stringify(response.data.comment)}`]);
        setError('');
      } catch (err) {
        setError('Failed to send API response to backend');
      }
    };

    return React.createElement(
      'div',
      { style: { padding: '16px', backgroundColor: '#f3f4f6', height: '100%', display: 'flex', flexDirection: 'column' } },
      React.createElement('h2', { style: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' } }, 'AI Extension'),
      React.createElement('input', {
        type: 'text',
        placeholder: 'Enter Backend URL',
        value: backendUrl,
        onChange: (e) => setBackendUrl(e.target.value),
        style: { marginBottom: '16px', width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' },
      }),
      React.createElement(
        'select',
        {
          value: selectedApp,
          onChange: (e) => setSelectedApp(e.target.value),
          style: { marginBottom: '16px', width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' },
        },
        React.createElement('option', { value: '' }, 'Select an application'),
        applications.map((app) =>
          React.createElement('option', { key: app.metadata.name, value: app.metadata.name }, app.metadata.name)
        )
      ),
      React.createElement('textarea', {
        value: chatInput,
        onChange: (e) => setChatInput(e.target.value),
        placeholder: 'Type your message...',
        style: { marginBottom: '16px', width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', height: '96px' },
      }),
      React.createElement(
        'button',
        {
          onClick: sendMessage,
          style: { marginBottom: '16px', backgroundColor: '#3b82f6', color: 'white', padding: '8px', borderRadius: '4px' },
        },
        'Send'
      ),
      error && React.createElement('div', { style: { color: '#ef4444', marginBottom: '16px' } }, error),
      React.createElement(
        'div',
        { style: { flex: 1, overflowY: 'auto', backgroundColor: 'white', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '16px' } },
        chatHistory.map((message, index) =>
          React.createElement('div', { key: index, style: { marginBottom: '8px' } }, message)
        )
      ),
      agentReply?.shouldRun &&
        React.createElement(
          'button',
          {
            onClick: runApi,
            style: { marginBottom: '16px', backgroundColor: '#10b981', color: 'white', padding: '8px', borderRadius: '4px' },
          },
          'Run API'
        ),
      apiResponse &&
        React.createElement(
          'div',
          { style: { backgroundColor: '#e5e7eb', padding: '16px', borderRadius: '4px', marginBottom: '16px' } },
          React.createElement('h3', { style: { fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' } }, 'API Response'),
          React.createElement('pre', { style: { fontSize: '12px', overflowX: 'auto' } }, JSON.stringify(apiResponse, null, 2)),
          React.createElement(
            'button',
            {
              onClick: sendApiResponseToBackend,
              style: { marginTop: '8px', backgroundColor: '#8b5cf6', color: 'white', padding: '8px', borderRadius: '4px' },
            },
            'Send to AI'
          )
        )
    );
  };

  // Load dependencies and register extension
  const loadDependencies = () => {
    const scripts = [
      'https://unpkg.com/react@17/umd/react.production.min.js',
      'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js',
      'https://unpkg.com/axios@1.6.0/dist/axios.min.js',
      'https://unpkg.com/@argoproj/argo-ui@1.0.0/dist/argo.min.js',
    ];

    scripts.forEach((src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      document.head.appendChild(script);
    });
  };

  loadDependencies();
  window.extensionsAPI.registerSystemLevelExtension(
    ArgoCDAIExtension,
    'AI Extension',
    '/ai-extension',
    'fa-robot'
  );
})(window);