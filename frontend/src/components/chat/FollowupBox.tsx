import type { FormEvent } from "react";

type FollowupBoxProps = {
  value: string;
  disabled?: boolean;
  onChange: (nextValue: string) => void;
  onSubmit: (e: FormEvent) => void;
};

export default function FollowupBox({ value, disabled, onChange, onSubmit }: FollowupBoxProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 mt-6 bg-linear-to-t from-[#101010] via-[#101010] to-transparent pb-4 pt-10"
    >
      <div className="rounded-2xl border border-white/10 bg-[#151516] px-4 py-3">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask a follow-up..."
          className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-neutral-500">Learn step by step</span>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-medium text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
