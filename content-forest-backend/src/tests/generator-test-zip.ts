import { deflateRawSync } from "node:zlib";

interface ZipFileInput {
  path: string;
  content: string;
  compression?: "store" | "deflate";
}

interface CentralDirectoryRecord {
  path: string;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  localHeaderOffset: number;
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

export function createZip(files: ZipFileInput[]): Buffer {
  const localParts: Buffer[] = [];
  const centralRecords: CentralDirectoryRecord[] = [];
  let offset = 0;

  for (const file of files) {
    const pathBuffer = Buffer.from(file.path, "utf8");
    const contentBuffer = Buffer.from(file.content, "utf8");
    const method = file.compression === "store" ? 0 : 8;
    const compressed =
      method === 0 ? contentBuffer : deflateRawSync(contentBuffer);
    const crc32 = calculateCrc32(contentBuffer);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(pathBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, pathBuffer, compressed);
    centralRecords.push({
      path: file.path,
      crc32,
      compressedSize: compressed.length,
      uncompressedSize: contentBuffer.length,
      method,
      localHeaderOffset: offset,
    });
    offset += localHeader.length + pathBuffer.length + compressed.length;
  }

  const centralParts = centralRecords.map((record) => {
    const pathBuffer = Buffer.from(record.path, "utf8");
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(record.method, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(record.crc32, 16);
    centralHeader.writeUInt32LE(record.compressedSize, 20);
    centralHeader.writeUInt32LE(record.uncompressedSize, 24);
    centralHeader.writeUInt16LE(pathBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(record.localHeaderOffset, 42);
    return Buffer.concat([centralHeader, pathBuffer]);
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(centralRecords.length, 8);
  endRecord.writeUInt16LE(centralRecords.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function calculateCrc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
