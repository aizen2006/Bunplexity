const suggestionChips = [
  "Help me learn",
  "Recruiting",
  "Organize my life",
  "Create a prototype",
];
// TODO : Fetch from API and generate random suggestions
const promptIdeas = [
  "Turn my notes into a polished write-up",
  "Compare tools or frameworks and recommend one",
  "Quiz me until I can recall it confidently",
];

export default function RandQuery() {
  return (
    <section className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#151516] p-4">
      <div className="flex flex-wrap gap-2">
        {suggestionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="rounded-full border border-white/10 bg-[#1f1f1f] px-3 py-1 text-sm text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {promptIdeas.map((idea) => (
          <button
            key={idea}
            type="button"
            className="block text-left text-sm text-neutral-300 transition-colors hover:text-white"
          >
            {idea}
          </button>
        ))}
      </div>
    </section>
  );
}
