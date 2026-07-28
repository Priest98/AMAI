"use client";

// AutoPilot has been replaced by the AMAI Engine. This route now just
// redirects so any old bookmarks/links still land somewhere useful.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoPilotRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/engine');
  }, [router]);
  return null;
}
