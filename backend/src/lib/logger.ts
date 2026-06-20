export function log(level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta !== undefined ? { meta: meta instanceof Error ? { message: meta.message, stack: meta.stack } : meta } : {}),
  });
  if (level === 'error') console.error(line);
  else console.log(line);
}
