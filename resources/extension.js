((window) => {
  const ChatExtension = () => {
    const [apps, setApps] = React.useState([]);
    const [selectedApp, setSelectedApp] = React.useState("");
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [backendUrl, setBackendUrl] = React.useState("");
    const [apiRequest, setApiRequest] = React.useState(null);
    const [appJson, setAppJson] = React.useState(null);
    const [counter, setCounterAppJson] = React.useState(new Map([["test", 0]]));

    React.useEffect(() => {
      fetch(`${window.location.origin}/api/v1/applications`)
        .then(res => res.json())
        .then(data => {
          const names = data.items.map(item => item.metadata.name);
          setApps(names);
        })
        .catch(err => {
          console.error("Failed to fetch applications:", err);
        });
    }, []);

    const isValidUrl = (url) => {
      try {
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch (_) {
        return false;
      }
    };

    const filterRelevantResources = (status) => {
      if (!status || !Array.isArray(status.resources)) return [];
      return status.resources.filter(res => {
        const isSynced = res.status === "Synced";
        const isHealthy = res.health && res.health.status === "Healthy";
        return !(isSynced && isHealthy);
      });
    };

    const handleAppChange = (e) => {
      const appName = e.target.value;
      setSelectedApp(appName);
      setMessages([]);
      setInput("");
      setApiRequest(null);
      if (!isValidUrl(backendUrl)) {
        alert("Please enter a valid backend URL (must start with http:// or https://)");
        return;
      }

      setLoading(true);
      fetch(`${window.location.origin}/api/v1/applications/${appName}`)
        .then(res => res.json())
        .then(appData => {
          setAppJson(appData);
          // const degradedResources = filterRelevantResources(appData.status);
          // const payload = {
          //   application: appName,
          //   status: appData.status,
          //   spec: appData.spec
          // };
          // return fetch(backendUrl, {
          //   method: "POST",
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify(payload)
          // });
        })
        // .then(res => res.json())
        // .then(data => {
        //   setMessages(prev => [...prev, { user: "Agent", text: data.reply || JSON.stringify(data) }]);
        //   if (data.request) {
        //     setApiRequest(data.request);
        //   }
        // })
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

      if(counter.get(selectedApp) == 0) {
        fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId: selectedApp, application: selectedApp })
      })
        .then(res => res.json())
        .then(data => {
          setMessages(prev => [...prev, { user: "Agent", text: data.reply || JSON.stringify(data) }]);
          if (data.request) {
            setApiRequest(data.request);
          }
          const newCounter = new Map(counter);
          newCounter.set(selectedApp, 1);
          setCounterAppJson(newCounter);
        })
        .catch(err => {
          console.error("Chat backend error:", err);
          setMessages(prev => [...prev, { user: "Agent", text: "Error getting chat response." }]);
        });
      } else {
        fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId: selectedApp, application: selectedApp, status: appJson.status, spec: appJson.spec  })
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
      }
      
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
          setMessages(prev => [
            ...prev,
            { user: "Agent", text: `❌ Failed to send request: ${apiRequest.method} ${apiRequest.url}` },
          ]);
        });
    };

    return React.createElement(
      "div",
      { style: { padding: "20px", fontFamily: "sans-serif" } },
      React.createElement("h2", null, "Argo CD Chat Assistant"),
      React.createElement("div", { style: { marginBottom: "10px" } },
        React.createElement("label", { htmlFor: "backendUrl", style: { marginRight: "10px" } }, "Backend URL:"),
        React.createElement("input", {
          type: "text",
          id: "backendUrl",
          value: backendUrl,
          onChange: (e) => setBackendUrl(e.target.value),
          placeholder: "https://backend/api/analyze",
          style: { width: "60%" }
        })
      ),
      React.createElement("div", { style: { marginBottom: "15px" } },
        React.createElement("label", { htmlFor: "appSelect", style: { marginRight: "10px" } }, "Select Application:"),
        React.createElement(
          "select",
          {
            id: "appSelect",
            value: selectedApp,
            onChange: handleAppChange,
            style: { padding: "5px" }
          },
          React.createElement("option", { value: "" }, "-- Choose --"),
          apps.map(app =>
            React.createElement("option", { key: app, value: app }, app)
          )
        )
      ),
      loading &&
        React.createElement("p", { style: { color: "orange" } }, "Analyzing app status... Please wait..."),
      selectedApp &&
        React.createElement("div", null,
          React.createElement("div", {
            style: {
              border: "1px solid #ccc",
              height: "300px",
              overflowY: "auto",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "#f9f9f9",
            },
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
            onChange: (e) => setInput(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && handleSend(),
            placeholder: "Type your message...",
            style: { width: "80%", marginRight: "5px" },
          }),
          React.createElement("button", { onClick: handleSend }, "Send"),
          apiRequest &&
            React.createElement("div", { style: { marginTop: "10px" } },
              React.createElement("p", null, `Suggested Request: ${apiRequest.method} ${apiRequest.url}`),
              React.createElement("button", { onClick: runSuggestedRequest }, "Send Request")
            )
        ),
      !selectedApp &&
        React.createElement("p", { style: { color: "gray" } }, "Please select an application to start chatting.")
    );
  };

  window.extensionsAPI.registerSystemLevelExtension(
    ChatExtension,
    "Chat",
    "/chat",
    "fa-comments"
  );
})(window);
