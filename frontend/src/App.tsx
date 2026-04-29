import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ConversationPage from "./pages/ConversationPage";
import History from "./pages/History";
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/history" element={<History />} />
        <Route path="/conversations/:conversationId" element={<ConversationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
