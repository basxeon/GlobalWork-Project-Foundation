import { contentDisposition, decodeUploadFilename } from './filename';

describe('decodeUploadFilename', () => {
  const thai = 'ราคาประเมินห้องชุด.pdf';
  const asLatin1 = Buffer.from(thai, 'utf8').toString('latin1');

  it('restores a UTF-8 filename that multer decoded as latin1', () => {
    expect(asLatin1).not.toBe(thai);
    expect(decodeUploadFilename(asLatin1)).toBe(thai);
  });

  it('leaves an ASCII filename untouched', () => {
    expect(decodeUploadFilename('Scanned Document.pdf')).toBe(
      'Scanned Document.pdf',
    );
  });

  it('leaves an already-correct UTF-8 filename untouched', () => {
    expect(decodeUploadFilename(thai)).toBe(thai);
  });

  it('leaves a genuine latin1 name that is not valid UTF-8 untouched', () => {
    expect(decodeUploadFilename('résumé.pdf')).toBe('résumé.pdf');
  });

  it('is idempotent', () => {
    expect(decodeUploadFilename(decodeUploadFilename(asLatin1))).toBe(thai);
  });

  it('handles an empty name', () => {
    expect(decodeUploadFilename('')).toBe('');
  });
});

describe('contentDisposition', () => {
  it('carries the real name in filename* and an ASCII fallback', () => {
    const header = contentDisposition('inline', 'ราคา.pdf');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain(encodeURIComponent('ราคา.pdf'));
    expect(header.startsWith('inline; filename="')).toBe(true);
    expect(header).not.toMatch(/filename="[^"]*[^\x20-\x7e]/);
  });

  it('does not let a quote in the name break the header', () => {
    expect(contentDisposition('attachment', 'a"b.pdf')).toContain(
      'filename="a_b.pdf"',
    );
  });
});
