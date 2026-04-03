import App from "@/App";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { SessionProvider } from "@contexts/SessionContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </React.StrictMode>
);
