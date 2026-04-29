import { useEffect, useState } from "react";
import axios from 'axios';
import { ChevronDown, Plus } from "lucide-react";
import { useNavigate } from "react-router";

export default function ChatInput() {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchModels() {
      try {
        const { data } = await axios.get(`${process.env.BUN_PUBLIC_API_URL}/models`);
        setModels(data);
      } catch {
        // Models endpoint is optional; keep the chat input usable.
        setModels(null);
      }
    }
    fetchModels();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/conversations/new?query=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-[#1f1f1f] border border-neutral-700 rounded-2xl px-4 py-3 shadow-lg">
          
          {/* Input */}
          <input
            type="text"
            placeholder="Ask anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-white placeholder-neutral-400 text-sm"
          />
  
          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-3 text-sm text-neutral-400">
            
            {/* Left Side */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-neutral-800 transition">
                <Plus size={16} />
              </button>
            </div>
  
            {/* Right Side */}
            <div className="flex items-center gap-3 relative">
              
              {/* Dropdown */}
              <div
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 cursor-pointer hover:text-white transition"
              >
                {selectedModel || "Select a model"}
                <ChevronDown size={14} />
              </div>
  
              {open && (
                <div className="absolute right-12 bottom-8 w-36 bg-[#2a2a2a] border border-neutral-700 rounded-lg shadow-lg overflow-hidden">
                  {models?.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedModel(m);
                        setOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-neutral-700 cursor-pointer text-sm text-white"
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
  
              {/* Mic Button */}
              <button className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition" type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" className="text-white" width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
         
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
