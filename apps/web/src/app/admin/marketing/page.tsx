import type { Metadata } from 'next';
import { MarketingAdminDashboard } from '@/components/marketing/MarketingAdminDashboard';

export const metadata: Metadata = {
  title: 'Oyinca Admin | Marketing & Founding Creator Acquisition',
  description: 'Founder administration view for early access signups, referral metrics, and Founding TikTok Creator qualification.',
};

export default function MarketingAdminPage() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-purple-600 font-sans py-8">
      <MarketingAdminDashboard />
    </div>
  );
}
