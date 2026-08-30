import { redirect } from 'next/navigation';

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = code ? encodeURIComponent(code.trim().toUpperCase()) : '';

  redirect(`/early-access?ref=${cleanCode}`);
}
