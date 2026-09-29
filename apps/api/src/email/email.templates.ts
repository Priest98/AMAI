import { getAppUrl } from '../common/app-url.util';

export type EmailTemplate = { subject: string; html: string; text: string };

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function shell(preview: string, heading: string, copy: string, action: string, url: string, note: string): string {
  const safeUrl = escapeHtml(url);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(preview)}</title></head><body style="margin:0;background:#f4f1ea;color:#102a3b;font-family:Arial,'Helvetica Neue',sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf8;border:1px solid #ddd7cc;border-radius:24px;overflow:hidden"><tr><td style="height:6px;background:#102a3b"></td></tr><tr><td style="padding:44px 44px 24px"><p style="margin:0;color:#102a3b;font-family:Georgia,serif;font-size:28px;letter-spacing:-.5px">Oyinca</p><p style="margin:8px 0 0;color:#a37b4f;font-size:11px;letter-spacing:3px;text-transform:uppercase">Your social media, handled</p></td></tr><tr><td style="padding:8px 44px 36px"><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.15;color:#102a3b">${escapeHtml(heading)}</h1><p style="margin:0 0 28px;color:#526773;font-size:16px;line-height:1.65">${escapeHtml(copy)}</p><a href="${safeUrl}" style="display:inline-block;box-sizing:border-box;background:#102a3b;color:#fff;text-decoration:none;border-radius:999px;padding:15px 26px;font-size:15px;font-weight:700">${escapeHtml(action)} &nbsp;→</a><p style="margin:30px 0 8px;color:#71818a;font-size:12px;line-height:1.6">If the button does not work, copy this address into your browser:</p><p style="margin:0;overflow-wrap:anywhere;color:#355f7a;font-size:12px;line-height:1.6"><a href="${safeUrl}" style="color:#355f7a">${safeUrl}</a></p><p style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e7e1d7;color:#71818a;font-size:12px;line-height:1.6">${escapeHtml(note)}</p></td></tr><tr><td style="padding:22px 44px;background:#102a3b;color:#cbd4d8;font-size:11px;line-height:1.6">Powered by Turaab Technology<br>© ${new Date().getFullYear()} Oyinca</td></tr></table></td></tr></table></body></html>`;
}

export function verificationEmail(name: string, url: string): EmailTemplate {
  const greeting = name ? `Hi ${name}. ` : '';
  return { subject: 'Verify your email — Oyinca', html: shell('Verify your Oyinca email', 'Verify your email', `${greeting}Confirm your email address to finish setting up your Oyinca account.`, 'Verify email', url, 'This link expires in 24 hours. If you did not create an Oyinca account, you can ignore this email.'), text: `Oyinca\n\nVerify your email\n\n${greeting}Confirm your email address to finish setting up your Oyinca account.\n\nVerify email: ${url}\n\nThis link expires in 24 hours. If you did not create an Oyinca account, you can ignore this email.\n\nPowered by Turaab Technology` };
}

export function passwordResetEmail(url: string): EmailTemplate {
  return { subject: 'Reset your Oyinca password', html: shell('Reset your Oyinca password', 'Reset your password', 'We received a request to reset your password.', 'Reset password', url, "This link expires in one hour. If you did not request this, you can ignore this email."), text: `Oyinca\n\nReset your password\n\nWe received a request to reset your password.\n\nReset password: ${url}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.\n\nPowered by Turaab Technology` };
}

export function welcomeEmail(): EmailTemplate {
  const url = `${getAppUrl()}/dashboard`;
  return { subject: 'Welcome to Oyinca', html: shell('Welcome to Oyinca', 'Your social media, handled.', 'Your account is ready. Oyinca can now help you plan, create, schedule and grow.', 'Open Oyinca', url, 'You are receiving this transactional message because your Oyinca account was verified.'), text: `Oyinca\n\nYour social media, handled.\n\nYour account is ready.\n\nOpen Oyinca: ${url}\n\nPowered by Turaab Technology` };
}
