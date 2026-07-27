import { headers } from 'next/headers';

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || 'usr_primary';
    }
  } catch (e) {}

  return 'usr_primary'; // Default fallback user for active workspace session
}
