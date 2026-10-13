import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RpcProvider } from "./rpc/RpcProvider";
import { applyThemePreset, readThemePreset } from "./theme";
import "./index.css";

applyThemePreset(readThemePreset());

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root is missing");
}

createRoot(root).render(
  <StrictMode>
    <RpcProvider>
      <App />
    </RpcProvider>
  </StrictMode>,
);
