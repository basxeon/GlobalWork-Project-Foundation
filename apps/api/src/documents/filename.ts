/**
 * Multer/busboy expose `file.originalname` as the raw header bytes decoded as
 * latin1, so a UTF-8 filename (Thai, in practice) arrives mojibake'd:
 * "รายงาน.pdf" becomes "à¸£à¸²à¸¢à¸‡à¸²à¸™.pdf". Re-encoding those code points back
 * to bytes and decoding them as UTF-8 restores the original name.
 *
 * The round trip is only applied when it is provably safe: the value must be
 * fully latin1-representable and must decode back to exactly the same bytes,
 * so a filename that was already correct is returned untouched.
 */
export function decodeUploadFilename(name: string): string {
  if (!name) return name;

  const bytes = Buffer.from(name, 'latin1');
  if (bytes.toString('latin1') !== name) return name;

  const decoded = bytes.toString('utf8');
  if (decoded.includes('\uFFFD')) return name;
  if (!Buffer.from(decoded, 'utf8').equals(bytes)) return name;

  return decoded;
}

/**
 * Content-Disposition value that survives non-ASCII filenames. RFC 6266 keeps a
 * plain ASCII `filename` for legacy clients and adds RFC 5987 `filename*` with
 * the real UTF-8 name.
 */
export function contentDisposition(
  type: 'inline' | 'attachment',
  filename: string,
): string {
  const fallback = filename
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
