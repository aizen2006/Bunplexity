export type Role = 'user' | 'assistant';

export type ChatMode = 'fast' | 'thinking';
export type ChatModel =
  | 'gpt-5.5'
  | 'gpt-5.4'
  | 'gpt-5.4-mini';

export interface ChatOptions {
  mode: ChatMode;
  model: ChatModel;
}

export const DEFAULT_CHAT_OPTIONS: ChatOptions = {
  mode: 'fast',
  model: 'gpt-5.4-mini',
};

export interface ChatModelEntry {
  value: ChatModel;
  label: string;
  description: string;
}

export interface ChatModelGroup {
  group: string;
  models: ChatModelEntry[];
}

export const CHAT_MODEL_GROUPS: ChatModelGroup[] = [
  {
    group: 'GPT-5',
    models: [
      { value: 'gpt-5.5',      label: 'GPT-5.5',      description: 'New class of intelligence for coding & professional work' },
      { value: 'gpt-5.4',      label: 'GPT-5.4',      description: 'Affordable model for coding & professional work' },
      { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini',  description: 'Strongest mini for coding, computer use & subagents' },
    ],
  },
];

export const CHAT_MODELS: ChatModelEntry[] = CHAT_MODEL_GROUPS.flatMap(g => g.models);

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: Role;
  createdAt: string;
  sources?: Source[];
}

export interface Conversation {
  id: string;
  title: string | null;
  userId: string;
  createdAt: string;
  messages?: Message[];
}

export interface Source {
  title: string;
  url: string;
}

export interface ProcessedFileResult {
  fileName: string;
  fileContext: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
  credits: number;
  createdAt: string;
}

// ── Image Studio / Media Library ─────────────────────────────────────────────

export type ImageStyle =
  | 'Realistic'
  | 'Cinematic'
  | 'Anime'
  | '3D Render'
  | 'Watercolor'
  | 'Oil Painting'
  | 'Pixel Art'
  | 'Comic Book'
  | 'Minimalist'
  | 'Cyberpunk'
  | 'Fantasy'
  | 'Vintage'
  | 'Sketch'
  | 'Cartoon'
  | 'Studio Photo';

export const IMAGE_STYLES: ImageStyle[] = [
  'Realistic', 'Cinematic', 'Anime', '3D Render', 'Watercolor', 'Oil Painting',
  'Pixel Art', 'Comic Book', 'Minimalist', 'Cyberpunk', 'Fantasy', 'Vintage',
  'Sketch', 'Cartoon', 'Studio Photo',
];

export type ImageSize = 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
export const IMAGE_SIZES: { value: ImageSize; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: 'Square' },
  { value: '1536x1024', label: 'Landscape' },
  { value: '1024x1536', label: 'Portrait' },
];

export type ImageQuality = 'auto' | 'high' | 'medium' | 'low';
export const IMAGE_QUALITIES: ImageQuality[] = ['auto', 'high', 'medium', 'low'];

export type ImageModel = 'gpt-image-1' | 'gpt-image-2';

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';

export interface ImageOptions {
  style: ImageStyle;
  size: ImageSize;
  quality: ImageQuality;
  model: ImageModel;
  output_format: ImageOutputFormat;
}

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  style: 'Realistic',
  size: 'auto',
  quality: 'auto',
  model: 'gpt-image-1',
  output_format: 'jpeg',
};

/** A generated/edited image as returned by the Library (and `saved` SSE frame). */
export interface MediaItem {
  id: string;
  kind: 'image';
  url: string;
  prompt: string;
  style: string;
  model: string;
  type: 'generate' | 'edit';
  createdAt: string;
  expiresAt: string;
}
