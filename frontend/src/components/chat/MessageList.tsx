type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type MessageListProps = {
  messages: ChatMessage[];
};

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="space-y-5">
      {messages.map((message) =>
        message.role === "user" ? (
          <div
            key={message.id}
            className="ml-auto w-fit max-w-3xl rounded-2xl bg-[#1f1f1f] px-4 py-3 text-sm text-neutral-100"
          >
            {message.content}
          </div>
        ) : (
          <article
            key={message.id}
            className="rounded-2xl border border-white/5 bg-[#111111] px-5 py-4 text-neutral-200"
          >
            <div className="whitespace-pre-wrap leading-7">{message.content}</div>
          </article>
        ),
      )}
    </div>
  );
}
