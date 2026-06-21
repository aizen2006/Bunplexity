'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConversationSidebar from '@/components/ConversationSidebar';
import MediaGallery from '@/components/MediaGallery';
import { fetchLibrary, deleteImage, AuthError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { MediaItem } from '@/types';

export default function LibraryPage() {
  const router = useRouter();
  const auth = useAuth();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      router.push(`/login?next=${encodeURIComponent('/library')}`);
    }
  }, [auth.status, router]);

  const load = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLibrary(auth.token);
      setItems(data);
    } catch (err) {
      if (err instanceof AuthError) { router.push('/login'); return; }
      setError('Failed to load your library');
    } finally {
      setLoading(false);
    }
  }, [auth.token, router]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = useCallback((item: MediaItem) => {
    router.push(`/studio?editUrl=${encodeURIComponent(item.url)}`);
  }, [router]);

  const handleDelete = useCallback(async (item: MediaItem) => {
    if (!auth.token || deletingId) return;
    if (!window.confirm('Delete this image? This cannot be undone.')) return;

    setDeletingId(item.id);
    setError(null);
    // Optimistic removal; restore on failure.
    const prev = items;
    setItems(curr => curr.filter(i => i.id !== item.id));
    try {
      await deleteImage(auth.token, item.id);
    } catch (err) {
      if (err instanceof AuthError) { router.push('/login'); return; }
      setItems(prev);
      setError('Failed to delete the image');
    } finally {
      setDeletingId(null);
    }
  }, [auth.token, deletingId, items, router]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <ConversationSidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--fg-subtle)', background: 'var(--bg-base)' }}
        >
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}>
            Library
            {items.length > 0 && (
              <span className="ml-2 text-xs" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                {items.length}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--fg-muted)', border: '1px solid var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}
          >
            Refresh
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">
            {error ? (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                {error}
              </div>
            ) : (
              <MediaGallery
                items={items}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
                loading={loading}
                emptyLabel="No generated images yet — head to the Studio to create some."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
