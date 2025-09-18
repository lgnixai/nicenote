import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { TabManagerProvider } from "./store/tabManager";

createRoot(document.getElementById("root")!).render(
  <TabManagerProvider>
    <App />
  </TabManagerProvider>
);
