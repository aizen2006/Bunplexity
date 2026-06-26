export default function OauthCard() {
  return (
    <div
      className="max-w-sm rounded-2xl overflow-hidden p-5 transition-shadow duration-300"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-raised)',
      }}
    >
      <h4 className="font-semibold" style={{ color: 'var(--fg-primary)' }}>
        Login With
      </h4>
      <div className="flex gap-2 mt-3">
        <button
          className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--fg-primary)' }}
        >
          Google
        </button>
        <button
          className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--fg-primary)' }}
        >
          Github
        </button>
      </div>
    </div>
  );
}
