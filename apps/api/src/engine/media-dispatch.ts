import { getAppUrl } from '../common/app-url.util';

/** Dispatch is awaited; the MediaAsset row is the durable recovery record. */
export async function dispatchMediaProcessing(assetId: string, kind: 'process-media' | 'optimize-media' = 'process-media'): Promise<void> {
  const token = process.env.QSTASH_TOKEN;
  const secret = process.env.CRON_SECRET;
  if (!token || !secret) throw new Error('Media worker dispatch is not configured.');
  const destination = `${getAppUrl().replace(/\/$/, '')}/api/cron/${kind}/${encodeURIComponent(assetId)}`;
  const response = await fetch(`https://qstash.upstash.io/v2/publish/${destination}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Upstash-Forward-Authorization': `Bearer ${secret}`,
      'Upstash-Retries': '3',
      'Upstash-Flow-Control-Key': `oyinca-${kind}`,
      'Upstash-Flow-Control-Value': 'parallelism=1,rate=6,period=1m',
    },
    body: '{}',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Media dispatch returned HTTP ${response.status}.`);
}
