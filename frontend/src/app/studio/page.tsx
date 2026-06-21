'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ConversationSidebar from '@/components/ConversationSidebar';
import StudioComposer, { type StudioMode } from '@/components/StudioComposer';
import MediaGallery from '@/components/MediaGallery';
import { generateImage, editImage, type SavedImage } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { ImageOptions, MediaItem } from '@/types';
import { DEFAULT_IMAGE_OPTIONS } from '@/types';

async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const ext = blob.type.split('/')[1] || 'png';
  return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/png' });
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  const [options, setOptions] = useState<ImageOptions>(DEFAULT_IMAGE_OPTIONS);
  const [mode, setMode] = useState<StudioMode>('generate');
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewB64, setPreviewB64] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [sessionItems, setSessionItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const seededRef = useRef(false);

  // Redirect when unauthenticated
  useEffect(() => {
    if (auth.status !== 'unauthenticated') return;
    router.push(`/login?next=${encodeURIComponent('/studio')}`);
  }, [auth.status, router]);

  // Preload an edit reference from ?editUrl= (used by the Library "Edit" action)
  useEffect(() => {
    if (seededRef.current) return;
    const editUrl = searchParams.get('editUrl');
    if (!editUrl) return;
    seededRef.current = true;
    setMode('edit');
    urlToFile(editUrl, 'reference')
      .then(file => setReferenceFiles(prev => [...prev, file]))
      .catch(err => console.error('Failed to load reference image:', err));
  }, [searchParams]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadAsReference = useCallback(async (item: MediaItem) => {
    try {
      const file = await urlToFile(item.url, 'reference');
      setMode('edit');
      setReferenceFiles(prev => [...prev, file]);
    } catch (err) {
      console.error('Failed to load reference image:', err);
    }
  }, []);

  const handleSubmit = useCallback((prompt: string) => {
    if (!auth.token || loading) return;

    setLoading(true);
    setError(null);
    setPreviewB64(null);
    setFinalUrl(null);

    const callbacks = {
      onPartial: (b64: string) => setPreviewB64(b64),
      onSaved: (img: SavedImage) => {
        setFinalUrl(img.url);
        setPreviewB64(null);
        setSessionItems(prev => [
          {
            id: img.id,
            kind: 'image' as const,
            url: img.url,
            prompt,
            style: options.style,
            model: options.model,
            type: mode === 'edit' ? ('edit' as const) : ('generate' as const),
            createdAt: img.createdAt,
            expiresAt: img.expiresAt,
          },
          ...prev,
        ]);
      },
      onError: (err: Error) => { setError(err.message); setLoading(false); },
      onDone: () => setLoading(false),
    };

    abortRef.current?.abort();
    abortRef.current =
      mode === 'edit'
        ? editImage(auth.token, prompt, options, referenceFiles, callbacks)
        : generateImage(auth.token, prompt, options, callbacks);
  }, [auth.token, loading, mode, options, referenceFiles]);

  const previewSrc = previewB64
    ? `data:image/${options.output_format};base64,${previewB64}`
    : finalUrl;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <ConversationSidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="flex items-center px-6 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--fg-subtle)', background: 'var(--bg-base)' }}
        >
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}>
            Image Studio
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 grid lg:grid-cols-2 gap-6">
            {/* Left: composer */}
            <div className="flex flex-col gap-4">
              <StudioComposer
                options={options}
                onOptionsChange={setOptions}
                mode={mode}
                onModeChange={setMode}
                referenceFiles={referenceFiles}
                onAddReferences={files => setReferenceFiles(prev => [...prev, ...files])}
                onRemoveReference={i => setReferenceFiles(prev => prev.filter((_, idx) => idx !== i))}
                loading={loading}
                onSubmit={handleSubmit}
              />

              {error && (
                <div
                  className="px-4 py-2 rounded-lg text-sm flex items-center justify-between"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-3 opacity-60 hover:opacity-100 text-xs">✕</button>
                </div>
              )}
            </div>

            {/* Right: preview */}
            <div className="flex flex-col gap-4">
              <div
                className="relative aspect-square rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--fg-subtle)' }}
              >
                {previewSrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewSrc} alt="Generated preview" className="w-full h-full object-contain" />
                    {loading && previewB64 && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ opacity: [0.15, 0.35, 0.15] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ background: 'linear-gradient(110deg, transparent, rgba(0,212,255,0.12), transparent)' }}
                      />
                    )}
                  </>
                ) : loading ? (
                  <div className="flex flex-col items-center gap-3" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-6 h-6 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent)' }} />
                    <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>Rendering…</span>
                  </div>
                ) : (
                  <p className="text-xs px-6 text-center" style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                    Your generated image will appear here
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Session gallery */}
          {sessionItems.length > 0 && (
            <div className="max-w-5xl mx-auto px-6 pb-10">
              <h3 className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                This session
              </h3>
              <MediaGallery items={sessionItems} onEdit={loadAsReference} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  );
}
