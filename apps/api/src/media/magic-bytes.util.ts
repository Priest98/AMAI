/**
 * Security audit fix (8.2): MIME-type validation up to this point (the
 * upload-token route's allowedContentTypes, the legacy multer fileFilter,
 * and assertAllowedMimeType in media.service.ts) all trust what the
 * *caller* claims the file is -- the browser's Content-Type header on the
 * multipart path, or a plain client-supplied string on the direct-upload
 * `/register` path. None of them look at the actual bytes, so a file with
 * spoofed metadata sails through every check.
 *
 * This is a defense-in-depth layer, not a replacement for those checks --
 * see the audit report for why the practical severity here is limited
 * (uploaded files are never executed server-side, and sharp/fluent-ffmpeg
 * do their own internal format sniffing rather than trusting the caller).
 * It fails OPEN (returns true / "can't determine") on anything short of a
 * confident mismatch, so a network hiccup or an unrecognized-but-legitimate
 * variant never blocks a real upload -- the goal is to catch obvious
 * spoofing, not to be the sole gate.
 */

type SignatureCheck = (bytes: Buffer) => boolean;

function matches(bytes: Buffer, offset: number, signature: number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function isRiffWebp(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  const riff = bytes.toString('ascii', 0, 4) === 'RIFF';
  const webp = bytes.toString('ascii', 8, 12) === 'WEBP';
  return riff && webp;
}

function isIsoBmffContainer(bytes: Buffer): boolean {
  // MP4 / MOV (QuickTime) are both ISO Base Media File Format containers --
  // a 4-byte size field followed by an 'ftyp' box type at offset 4. Not
  // trying to distinguish MP4 from MOV specifically here (both are in the
  // allowlist), just confirming this is a real ISOBMFF file and not, say,
  // an HTML file or an executable wearing an .mp4 extension.
  if (bytes.length < 8) return false;
  return bytes.toString('ascii', 4, 8) === 'ftyp';
}

function isEbmlContainer(bytes: Buffer): boolean {
  // WebM and MKV are both Matroska/EBML containers sharing the same
  // top-level magic bytes (1A 45 DF A3) -- distinguishing them requires
  // parsing the DocType element deeper in the stream, which isn't
  // necessary here since both are allowed types.
  return matches(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3]);
}

const SIGNATURE_CHECKS: Record<string, SignatureCheck> = {
  'image/jpeg': (b) => matches(b, 0, [0xff, 0xd8, 0xff]),
  'image/png': (b) => matches(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif': (b) => matches(b, 0, [0x47, 0x49, 0x46, 0x38]), // 'GIF8'
  'image/webp': isRiffWebp,
  'video/mp4': isIsoBmffContainer,
  'video/quicktime': isIsoBmffContainer,
  'video/webm': isEbmlContainer,
  'video/x-matroska': isEbmlContainer,
};

/**
 * Returns false only when we positively recognize the bytes as a
 * *different* known container/image format than the one claimed (a
 * confident mismatch). Returns true for "matches", "too short to tell",
 * or "claimed type isn't one we have a signature for" -- callers should
 * treat this as "no red flag found", not "verified safe".
 */
export function claimedMimeTypeMatchesBytes(bytes: Buffer, claimedMimeType: string): boolean {
  const normalized = claimedMimeType?.toLowerCase();
  const check = SIGNATURE_CHECKS[normalized];
  if (!check) return true; // no signature registered for this type -- don't block on it

  if (check(bytes)) return true;

  // Bytes didn't match the claimed type's signature. Before flagging it as
  // a mismatch, make sure the buffer wasn't just too short to evaluate
  // (e.g. a truncated Range fetch) -- in that case we genuinely can't tell,
  // so fail open rather than reject a possibly-legitimate upload.
  const minLengthNeeded = normalized === 'image/png' ? 8 : 12;
  if (bytes.length < minLengthNeeded) return true;

  return false;
}
