import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readPdf } from '../api/_lib/drive.mjs';

const request = bytes => Object.assign(Readable.from([bytes]), {
  headers: { 'content-type': 'application/pdf' },
});

const sample = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n' +
  'xref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\n' +
  'startxref\n9\n%%EOF\n', 'ascii'
);

test('valid PDF-shaped examination paper keeps its original bytes', async () => {
  const file = await readPdf(request(sample));
  assert.equal(file.type, 'application/pdf');
  assert.match(file.name, /^bcg-past-paper-[0-9a-f-]{36}\.pdf$/);
  assert.deepEqual(file.bytes, sample);
});

test('PDF upload refuses incomplete files and arbitrary content with PDF prefix', async () => {
  for (const bytes of [
    Buffer.from('%PDF-1.4\nnot a PDF'),
    Buffer.from('%PDF-9.9\nstartxref\n9\n%%EOF\n'),
    Buffer.from('%PDF-1.7\nstartxref\n9\n'),
    Buffer.from('%PDF-1.4\n%%EOF\n'),
    Buffer.from('not a pdf at all'),
  ]) {
    await assert.rejects(() => readPdf(request(bytes)), { status: 400 });
  }
});

test('PDF upload preserves 10 MB limit and rejects unsupported content types', async () => {
  await assert.rejects(() => readPdf(request(Buffer.alloc(10 * 1024 * 1024 + 1))), { status: 413 });
  const badType = request(sample);
  badType.headers['content-type'] = 'image/png';
  await assert.rejects(() => readPdf(badType), { status: 400 });
});
