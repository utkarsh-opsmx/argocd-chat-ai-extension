(() => {
const ChatExtension = () => {
const [apps, setApps] = React.useState([]);
const [selectedApp, setSelectedApp] = React.useState("");
const [messages, setMessages] = React.useState([]);
const [input, setInput] = React.useState("");
const [loading, setLoading] = React.useState(false);
const [backendUrl, setBackendUrl] = React.useState("");
const [apiRequest, setApiRequest] = React.useState(null);
const [apiResponse, setApiResponse] = React.useState(null);
const [appJson, setAppJson] = React.useState(null);
const [counter, setCounterAppJson] = React.useState(new Map());

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

const handleAppChange = (e) => {
  const appName = e.target.value;
  setSelectedApp(appName);
  setMessages([]);
  setInput("");
  setApiRequest(null);
  setApiResponse(null);

  if (!isValidUrl(backendUrl)) {
    alert("Please enter a valid backend URL.");
    return;
  }

  setLoading(true);
  fetch(`${window.location.origin}/api/v1/applications/${appName}`)
    .then(res => res.json())
    .then(appData => {
      setAppJson(appData);
    })
    .catch(err => {
      console.error("Failed to fetch app details:", err);
      setMessages(prev => [...prev, { user: "Agent", text: "Error getting app data." }]);
    })
    .finally(() => setLoading(false));
};

const handleSend = (msg = null) => {
  const userInput = msg || input.trim();
  if (!userInput) return;

  setMessages(prev => [...prev, { user: "You", text: userInput }]);
  if (!msg) setInput("");

  if (!isValidUrl(backendUrl)) {
    alert("Please enter a valid backend URL.");
    return;
  }

  const firstTime = !counter.get(selectedApp);
  const newCounter = new Map(counter);
  newCounter.set(selectedApp, 1);
  setCounterAppJson(newCounter);

  const payload = {
    message: userInput,
    sessionId: selectedApp,
    application: selectedApp,
    ...(firstTime && appJson ? { status: appJson.status, spec: appJson.spec } : {})
  };

  fetch(backendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      setMessages(prev => [...prev, { user: "Agent", text: data.reply || JSON.stringify(data) }]);

      if (data.method && data.url && data.method !== "None" && data.url !== "None") {
        setApiRequest({
          method: data.method,
          url: data.url,
          body: data.body !== "None" ? data.body : null
        });
      } else {
        setApiRequest(null);
      }
    })
    .catch(err => {
      console.error("Chat backend error:", err);
      setMessages(prev => [...prev, { user: "Agent", text: "Error getting chat response." }]);
    });
};

const runSuggestedRequest = () => {
  if (!apiRequest || !apiRequest.method || !apiRequest.url) {
    alert("No valid API request to run.");
    return;
  }

  const fullUrl = apiRequest.url.startsWith("http")
    ? apiRequest.url
    : `${window.location.origin}${apiRequest.url}`;

  fetch(fullUrl, {
    method: apiRequest.method,
    headers: { "Content-Type": "application/json" },
    body: apiRequest.body ? JSON.stringify(apiRequest.body) : null
  })
    .then(res => res.json())
    .then(data => {
      setApiResponse(data);
    })
    .catch(err => {
      console.error("API request failed:", err);
      setApiResponse({ error: "Request failed: " + err.message });
    });
};

const sendApiResponseToAgent = () => {
  if (!apiResponse) return;
  const responseString = typeof apiResponse === "string"
    ? apiResponse
    : JSON.stringify(apiResponse, null, 2);
  handleSend(responseString);
};

return React.createElement("div", { style: { padding: "20px", fontFamily: "sans-serif" } },
  React.createElement("h2", null, "Argo CD Chat Assistant"),
  React.createElement("div", { style: { marginBottom: "10px" } },
    React.createElement("label", { htmlFor: "backendUrl", style: { marginRight: "10px" } }, "Backend URL:"),
    React.createElement("input", {
      type: "text",
      id: "backendUrl",
      value: backendUrl,
      onChange: e => setBackendUrl(e.target.value),
      placeholder: "https://your-backend/api/analyze",
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
  loading &&
    React.createElement("p", { style: { color: "orange" } }, "Loading application info..."),
  selectedApp &&
    React.createElement("div", null,
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
            React.createElement("strong", null, `${msg.user}: `),
            msg.text
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
      React.createElement("button", { onClick: () => handleSend() }, "Send"),
      apiRequest &&
        React.createElement("div", { style: { marginTop: "10px" } },
          React.createElement("p", null, `Suggested: ${apiRequest.method} ${apiRequest.url}`),
          React.createElement("button", { onClick: runSuggestedRequest }, "Send Request")
        ),
      apiResponse &&
        React.createElement("div", {
          style: {
            marginTop: "15px",
            padding: "10px",
            border: "1px solid #ccc",
            backgroundColor: "#eef5ff",
            maxHeight: "200px",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace"
          }
        },
          React.createElement("strong", null, "API Response:\n"),
          typeof apiResponse === "string"
            ? apiResponse
            : JSON.stringify(apiResponse, null, 2)
        ),
      apiResponse &&
        React.createElement("div", { style: { marginTop: "10px" } },
          React.createElement("button", { onClick: sendApiResponseToAgent }, "Send to AI")
        )
    ),
  !selectedApp &&
    React.createElement("p", { style: { color: "gray" } }, "Select an app to start chatting.")
);
};

window.extensionsAPI.registerSystemLevelExtension(
ChatExtension,
"Chat",
"/chat",
"fa-comments"
);
})();