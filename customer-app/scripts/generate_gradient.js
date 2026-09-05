const fs = require('fs');
const zlib = require('zlib');

// Simple PNG generator (1x8 pixels, vertical gradient)
function createGradientPNG(colors) {
    const width = 1;
    const height = colors.length;
    
    // PNG Signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR Chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeInt32BE(width, 0);
    ihdrData.writeInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createChunk('IHDR', ihdrData);
    
    // IDAT Chunk (Pixel data)
    // For each row: 1 filter byte (0) + 3 bytes (R, G, B)
    const scanlines = [];
    for (const hex of colors) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        scanlines.push(0); // Filter type 0
        scanlines.push(r, g, b);
    }
    const uncompressedData = Buffer.from(scanlines);
    const compressedData = zlib.deflateSync(uncompressedData);
    const idat = createChunk('IDAT', compressedData);
    
    // IEND Chunk
    const iend = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const length = data.length;
    const chunk = Buffer.alloc(4 + 4 + length + 4);
    chunk.writeInt32BE(length, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    
    // Calculate CRC
    const crcTable = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            if (c & 1) {
                c = 0xedb88320 ^ (c >>> 1);
            } else {
                c = c >>> 1;
            }
        }
        crcTable[i] = c;
    }
    
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + length; i++) {
        crc = crcTable[(crc ^ chunk[i]) & 0xff] ^ (crc >>> 8);
    }
    crc = crc ^ 0xffffffff;
    
    chunk.writeInt32BE(crc, 8 + length);
    return chunk;
}

// Gradient: Sky Blue (#60A5FA) -> Vibrant Blue (#3B82F6) -> Royal Blue (#2563EB)
const colors = ['#60A5FA', '#539DF9', '#4695F8', '#3B82F6', '#2F7AEF', '#2471E8', '#2563EB'];
const pngBuffer = createGradientPNG(colors);
const base64 = pngBuffer.toString('base64');
console.log('BASE64 GRADIENT:');
console.log('data:image/png;base64,' + base64);
fs.writeFileSync('gradient.txt', 'data:image/png;base64,' + base64);
