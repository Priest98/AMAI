export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px", lineHeight: 1.65 }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: "#666" }}>Last updated: July 26, 2026</p>

      <p>
        Marketing OS (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) provides a social media
        management platform that helps you schedule, publish, and manage content across
        connected accounts, including Instagram and TikTok. This Privacy Policy explains what
        information we collect, how we use it, and the choices you have.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Account Information</h3>
      <p>When you create an account, we collect your name, email address, and password (stored securely, hashed — never in plain text).</p>

      <h3>Connected Platform Data</h3>
      <p>
        When you connect a third-party account (Instagram, TikTok, Google Drive) via OAuth, we
        receive and store:
      </p>
      <ul>
        <li>Your public profile information from that platform (username, display name, profile picture)</li>
        <li>An access token (and, where issued, a refresh token) that lets us act on your behalf within the permissions you approve</li>
        <li>Content metadata needed to schedule and publish posts (captions, media references, scheduling times)</li>
      </ul>
      <p>
        We do <strong>not</strong> receive or store your password for these third-party platforms —
        authentication happens entirely on the platform&apos;s own login screen (Meta/Instagram,
        TikTok, Google), and we only receive the token they issue us after you approve access.
      </p>

      <h3>Usage Data</h3>
      <p>We collect standard technical data such as IP address, browser type, and pages visited, to maintain and improve the service.</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide the core service: scheduling and publishing content to your connected accounts</li>
        <li>To display your connection status and account details back to you in the dashboard</li>
        <li>To maintain security, prevent abuse, and debug issues</li>
        <li>To communicate with you about your account or the service</li>
      </ul>
      <p>We do not sell your personal information or connected-account data to third parties.</p>

      <h2>3. How We Store and Protect Your Data</h2>
      <p>
        Access and refresh tokens for connected accounts are encrypted at rest (AES-256-GCM)
        before being stored in our database. They are never exposed to your browser or any
        client-side code — only used server-side to make authorized API calls on your behalf.
      </p>

      <h2>4. Third-Party Services</h2>
      <p>We integrate with the following platforms, each governed by its own privacy policy:</p>
      <ul>
        <li>Meta / Instagram — <a href="https://www.facebook.com/privacy/policy/">Meta Privacy Policy</a></li>
        <li>TikTok — <a href="https://www.tiktok.com/legal/privacy-policy">TikTok Privacy Policy</a></li>
        <li>Google (Google Drive integration) — <a href="https://policies.google.com/privacy">Google Privacy Policy</a></li>
      </ul>

      <h2>5. Data Retention &amp; Deletion</h2>
      <p>
        We retain connected-account tokens and associated data for as long as your account
        remains active or until you disconnect that account. You may disconnect any connected
        account at any time from your dashboard&apos;s Integrations page, which immediately
        revokes and deletes the stored tokens for that connection.
      </p>
      <p>
        To request full deletion of your account and all associated data, contact us at the
        email below. We will process deletion requests within 30 days.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, export, or delete
        your personal data. Contact us to exercise these rights.
      </p>

      <h2>7. Children&apos;s Privacy</h2>
      <p>Marketing OS is not directed at individuals under 16, and we do not knowingly collect data from them.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Material changes will be reflected by updating the &quot;Last updated&quot; date above.</p>

      <h2>9. Contact Us</h2>
      <p>
        Questions about this policy or your data? Contact us at:{" "}
        <a href="mailto:privacy@marketing-os-eight-virid.vercel.app">
          privacy@marketing-os-eight-virid.vercel.app
        </a>
        {" "}(replace with your real support/contact email before publishing).
      </p>
    </main>
  );
}
