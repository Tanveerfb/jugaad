import JSZip from "jszip";

/*
 * Builders for real files of each type the extractors read — tests and the live fixture set
 * only. Each makes the smallest file the real reader accepts.
 */

/** The smallest PDF that holds one line of text on one page; PDF.js rebuilds the missing xref. */
export function pdfWith(text: string): Buffer {
  const safe = text.replace(/[()\\]/g, " ");
  const stream = `BT /F1 12 Tf 72 720 Td (${safe}) Tj ET`;
  return Buffer.from(
    [
      "%PDF-1.4",
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
      `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      "trailer << /Root 1 0 R >>",
      "%%EOF",
    ].join("\n"),
    "latin1",
  );
}

/** A Word document with one paragraph. */
export async function docxWith(text: string): Promise<Buffer> {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${escaped}</w:t></w:r></w:p></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

/** A minimal JPEG carrying EXIF Make, Model and DateTimeOriginal — little-endian TIFF, built by hand. */
export function jpegWithExif({ make, model, taken }: { make: string; model: string; taken: string }): Buffer {
  const ascii = (s: string) => Buffer.from(s + "\0", "latin1");
  const makeB = ascii(make);
  const modelB = ascii(model);
  const takenB = ascii(taken);
  // header(8) | IFD0: 2 + 3*12 + 4 = 42 | exif IFD: 2 + 12 + 4 = 18 | strings
  const ifd0 = 8;
  const exifIfd = ifd0 + 42;
  let data = exifIfd + 18;
  const tiff = Buffer.alloc(data + makeB.length + modelB.length + takenB.length);
  tiff.write("II", 0, "latin1");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(ifd0, 4);
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    tiff.writeUInt16LE(tag, at);
    tiff.writeUInt16LE(type, at + 2);
    tiff.writeUInt32LE(count, at + 4);
    tiff.writeUInt32LE(value, at + 8);
  };
  const place = (b: Buffer) => {
    const at = data;
    b.copy(tiff, at);
    data += b.length;
    return at;
  };
  tiff.writeUInt16LE(3, ifd0);
  entry(ifd0 + 2, 0x010f, 2, makeB.length, place(makeB));
  entry(ifd0 + 14, 0x0110, 2, modelB.length, place(modelB));
  entry(ifd0 + 26, 0x8769, 4, 1, exifIfd);
  tiff.writeUInt32LE(0, ifd0 + 38);
  tiff.writeUInt16LE(1, exifIfd);
  entry(exifIfd + 2, 0x9003, 2, takenB.length, place(takenB));
  tiff.writeUInt32LE(0, exifIfd + 14);

  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const length = body.length + 2;
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (length >> 8) & 0xff, length & 0xff]), body]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, Buffer.from([0xff, 0xd9])]);
}
