import Link from 'next/link';

const CONTACT_EMAIL = 'Abdurasaqadamolayinka@gmail.com';
const LAST_UPDATED = 'July 30, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 max-w-4xl mx-auto space-y-8 font-sans pb-24">
      <div>
        <Link href="/login" className="text-xs text-blue-400 hover:underline">← Back to AMAI</Link>
        <h1 className="text-3xl font-bold mt-4">AMAI Terms of Service</h1>
        <p className="text-xs text-zinc-500 mt-2">Last updated: {LAST_UPDATED}</p>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        These Terms of Service ("Terms") govern your use of AMAI, an AI-powered content
        scheduling and publishing tool. By creating an account or otherwise using AMAI, you
        agree to these Terms.
      </p>

      <Section title="1. Description of Service">
        <p>AMAI lets you upload photos and videos, automatically generates captions, hashtags, and a suggested publishing schedule using AI, and publishes or schedules that content to Instagram and/or TikTok accounts that you connect and authorize. Depending on your settings, AMAI will either hold generated posts in an Approval Queue for you to review before anything is published, or publish automatically at the times you configure.</p>
      </Section>

      <Section title="2. Account Registration & Eligibility">
        <p>You must provide accurate information when creating an account and are responsible for keeping your login credentials secure. You must be at least 16 years old to use AMAI. You are responsible for all activity that occurs under your account.</p>
      </Section>

      <Section title="3. Connecting Third-Party Accounts">
        <p>By connecting an Instagram, TikTok, or Google Drive account to AMAI, you represent that you own or have authority to manage that account, and you authorize AMAI to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Read basic profile information from the connected account.</li>
          <li>Publish content to the connected Instagram/TikTok account, either after your explicit approval or automatically if you enable Auto Approval mode.</li>
          <li>Read and download files from a Google Drive folder you explicitly select, for the sole purpose of importing them as media to publish.</li>
        </ul>
        <p>You may revoke this authorization at any time by disconnecting the account within AMAI, or through the platform's own connected-apps settings (e.g. Instagram, TikTok, or Google account security settings).</p>
      </Section>

      <Section title="4. Your Content">
        <p>You retain all ownership rights to the media you upload and any resulting posts. By uploading content, you grant AMAI a limited license to store, process, analyze, and transmit that content solely for the purpose of providing the Service — including sending it to Google's Gemini API for AI analysis and to Instagram's/TikTok's APIs for publishing. You are solely responsible for ensuring your content complies with applicable law and with Instagram's and TikTok's own platform policies and community guidelines.</p>
      </Section>

      <Section title="5. AI-Generated Content">
        <p>Captions, hashtags, and scheduling suggestions are generated automatically by AI and are provided as a starting point. If you use Manual Approval mode, you are responsible for reviewing generated content before it publishes. If you enable Auto Approval mode, generated content will publish without further review, and you are responsible for the consequences of any content published under your connected accounts, including AI-generated text.</p>
      </Section>

      <Section title="6. Acceptable Use">
        <p>You agree not to use AMAI to publish content that is illegal, infringing, defamatory, or that violates Instagram's, TikTok's, or Google's respective terms of service. We reserve the right to suspend or terminate accounts that we reasonably believe are using AMAI to violate this section or any connected platform's policies.</p>
      </Section>

      <Section title="7. Service Availability">
        <p>AMAI depends on third-party APIs (Instagram, TikTok, Google Drive, Google Gemini) that we do not control. We do not guarantee uninterrupted availability of the Service, and publishing may be delayed or fail due to outages, rate limits, or policy changes on those third-party platforms.</p>
      </Section>

      <Section title="8. Disclaimer & Limitation of Liability">
        <p>AMAI is provided "as is" without warranties of any kind, express or implied. To the maximum extent permitted by law, AMAI and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including content published to your connected accounts.</p>
      </Section>

      <Section title="9. Termination">
        <p>You may stop using AMAI and delete your account at any time. We may suspend or terminate your access if you violate these Terms or if required to comply with a connected platform's policies.</p>
      </Section>

      <Section title="10. Changes to These Terms">
        <p>We may update these Terms from time to time. Material changes will be reflected by updating the "Last updated" date above. Continued use of AMAI after a change constitutes acceptance of the updated Terms.</p>
      </Section>

      <Section title="11. Contact Us">
        <p>Questions about these Terms? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-400 hover:underline">{CONTACT_EMAIL}</a>.</p>
      </Section>
    </div>
  );
}
