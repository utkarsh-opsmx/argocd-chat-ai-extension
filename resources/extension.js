((window) => {
  const ChatDialog = ({ close }) => {
    const [apps, setApps] = React.useState([]);
    const [selectedApp, setSelectedApp] = React.useState("");
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [backendUrl, setBackendUrl] = React.useState("");
    const [apiRequest, setApiRequest] = React.useState(null);

    React.useEffect(() => {
      fetch(`${window.location.origin}/api/v1/applications`)
        .then(res => res.json())
        .then(data => {
          const names = data.items.map(item => item.metadata.name);
          setApps(names);
        })
        .catch(err => console.error("Failed to fetch applications:", err));
    }, []);

    const isValidUrl = url => {
      try {
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch (_) {
        return false;
      }
    };

    const filterRelevantResources = status => {
      if (!status || !Array.isArray(status.resources)) return [];
      return status.resources.filter(res => {
        const isSynced = res.status === "Synced";
        const isHealthy = res.health && res.health.status === "Healthy";
        return !(isSynced && isHealthy);
      });
    };

    const handleAppChange = e => {
      const appName = e.target.value;
      setSelectedApp(appName);
      setMessages([]);
      setInput("");
      setApiRequest(null);

      if (!isValidUrl(backendUrl)) {
        alert("Please enter a valid backend URL.");
        return;
      }

      setLoading(true);
      fetch(`${window.location.origin}/api/v1/applications/${appName}`)
        .then(res => res.json())
        .then(appData => {
          const degradedResources = filterRelevantResources(appData.status);
          const payload = {
            application: appName,
            status: {
              resources: degradedResources,
              sync: appData.status.sync,
              health: appData.status.health
            }
          };
          return fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        })
        .then(res => res.json())
        .then(data => {
          setMessages(prev => [...prev, { user: "Agent", text: data.reply || JSON.stringify(data) }]);
          if (data.request) {
            setApiRequest(data.request);
          }
        })
        .catch(err => {
          console.error("Backend error:", err);
          setMessages(prev => [...prev, { user: "Agent", text: "Error getting analysis from backend." }]);
        })
        .finally(() => setLoading(false));
    };

    const handleSend = () => {
      if (!input.trim()) return;
      setMessages([...messages, { user: "You", text: input }]);
      setInput("");

      if (!isValidUrl(backendUrl)) {
        alert("Please enter a valid backend URL.");
        return;
      }

      fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, application: selectedApp })
      })
        .then(res => res.json())
        .then(data => {
          setMessages(prev => [...prev, { user: "Agent", text: data.reply || JSON.stringify(data) }]);
          if (data.request) {
            setApiRequest(data.request);
          }
        })
        .catch(err => {
          console.error("Chat backend error:", err);
          setMessages(prev => [...prev, { user: "Agent", text: "Error getting chat response." }]);
        });
    };

    const runSuggestedRequest = () => {
      if (!apiRequest || !apiRequest.url || !apiRequest.method) {
        alert("No valid request to run.");
        return;
      }

      const fullUrl = apiRequest.url.startsWith("http")
        ? apiRequest.url
        : `${window.location.origin}${apiRequest.url}`;

      fetch(fullUrl, {
        method: apiRequest.method,
        headers: { "Content-Type": "application/json" },
        body: apiRequest.body ? JSON.stringify(apiRequest.body) : null,
      })
        .then(res => res.json())
        .then(data => {
          setMessages(prev => [
            ...prev,
            { user: "Agent", text: `✅ Request sent: ${apiRequest.method} ${apiRequest.url}` },
            { user: "Agent", text: JSON.stringify(data, null, 2) }
          ]);
        })
        .catch(err => {
          console.error("Failed to send request:", err);
          setMessages(prev => [...prev, { user: "Agent", text: `❌ Failed to send request: ${apiRequest.method} ${apiRequest.url}` }]);
        });
    };

    return React.createElement(
      "div",
      {
        style: {
          background: "white",
          padding: "20px",
          borderRadius: "10px",
          width: "600px",
          maxHeight: "80vh",
          overflowY: "auto"
        }
      },
      React.createElement("h2", null, "Argo CD Chat Assistant"),
      React.createElement("button", { onClick: close, style: { float: "right" } }, "×"),
      React.createElement("div", { style: { marginBottom: "10px" } },
        React.createElement("label", { htmlFor: "backendUrl", style: { marginRight: "10px" } }, "Backend URL:"),
        React.createElement("input", {
          type: "text",
          id: "backendUrl",
          value: backendUrl,
          onChange: e => setBackendUrl(e.target.value),
          placeholder: "https://backend/api/analyze",
          style: { width: "60%" }
        })
      ),
      React.createElement("div", { style: { marginBottom: "15px" } },
        React.createElement("label", { htmlFor: "appSelect", style: { marginRight: "10px" } }, "Select Application:"),
        React.createElement("select", {
          id: "appSelect",
          value: selectedApp,
          onChange: handleAppChange,
          style: { padding: "5px" }
        },
          React.createElement("option", { value: "" }, "-- Choose --"),
          apps.map(app => React.createElement("option", { key: app, value: app }, app))
        )
      ),
      loading && React.createElement("p", { style: { color: "orange" } }, "Analyzing app status... Please wait..."),
      selectedApp && React.createElement("div", null,
        React.createElement("div", {
          style: {
            border: "1px solid #ccc",
            height: "300px",
            overflowY: "auto",
            padding: "10px",
            marginBottom: "10px",
            backgroundColor: "#f9f9f9"
          }
        },
          messages.map((msg, idx) =>
            React.createElement("div", { key: idx, style: { marginBottom: "8px" } },
              React.createElement("strong", null, `${msg.user}: `), msg.text
            )
          )
        ),
        React.createElement("input", {
          type: "text",
          value: input,
          onChange: e => setInput(e.target.value),
          onKeyDown: e => e.key === "Enter" && handleSend(),
          placeholder: "Type your message...",
          style: { width: "80%", marginRight: "5px" }
        }),
        React.createElement("button", { onClick: handleSend }, "Send"),
        apiRequest && React.createElement("div", { style: { marginTop: "10px" } },
          React.createElement("p", null, `Suggested Request: ${apiRequest.method} ${apiRequest.url}`),
          React.createElement("button", { onClick: runSuggestedRequest }, "Send Request")
        )
      )
    );
  };

  window.extensionsAPI.registerTopBarMenuAction(() => {
    const modalRoot = document.createElement("div");
    modalRoot.style.position = "fixed";
    modalRoot.style.top = "0";
    modalRoot.style.left = "0";
    modalRoot.style.width = "100%";
    modalRoot.style.height = "100%";
    modalRoot.style.backgroundColor = "rgba(0,0,0,0.3)";
    modalRoot.style.zIndex = "10000";
    modalRoot.style.display = "flex";
    modalRoot.style.justifyContent = "center";
    modalRoot.style.alignItems = "center";

    const closeModal = () => {
      ReactDOM.unmountComponentAtNode(modalRoot);
      document.body.removeChild(modalRoot);
    };

    document.body.appendChild(modalRoot);
    ReactDOM.render(React.createElement(ChatDialog, { close: closeModal }), modalRoot);
  }, "Open Chat Assistant", "fa-comments");
})(window);
