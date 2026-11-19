/* Local XLSX reader for indicator-table round trips. No file content leaves the browser. */
async function readLocalWorkbook(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = await unzipLocalWorkbook(bytes);
  const decoder = new TextDecoder();
  const text = name => entries[name] ? decoder.decode(entries[name]) : '';
  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)]
    .map(match => [...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)].map(part => decodeWorkbookXml(part[1])).join(''));
  const workbook = text('xl/workbook.xml');
  const relationships = Object.fromEntries([...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map(match => [match[1], match[2]]));
  const sheets = [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  const parsedSheets = [];
  for (const sheet of sheets) {
    const target = relationships[sheet[2]] || '';
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const xml = text(path);
    const rows = parseWorkbookSheet(xml, shared);
    if (rows.length) parsedSheets.push({ sheetName: decodeWorkbookXml(sheet[1]), rows });
  }
  if (!parsedSheets.length) throw new Error('工作簿中没有可读取的数据表');
  return { ...parsedSheets[0], sheets: parsedSheets };
}

function parseWorkbookSheet(xml, shared) {
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(row => {
    const values = [];
    for (const match of row[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = match[1].match(/r="([A-Z]+)\d+"/)?.[1] || 'A';
      const column = ref.split('').reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const type = match[1].match(/t="([^"]+)"/)?.[1];
      const raw = match[2].match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? '';
      const inline = [...match[2].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)].map(part => decodeWorkbookXml(part[1])).join('');
      values[column] = type === 's' ? (shared[Number(raw)] || '') : inline || decodeWorkbookXml(raw);
    }
    return values.map(value => value ?? '');
  }).filter(row => row.some(value => String(value).trim()));
}

async function unzipLocalWorkbook(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), entries = {};
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const flags = view.getUint16(offset + 6, true), method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true);
    if (flags & 0x08) throw new Error('暂不支持数据描述符格式的 XLSX');
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength, compressed = bytes.slice(start, start + compressedSize);
    if (method === 0) entries[name] = compressed;
    else if (method === 8 && typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      entries[name] = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('浏览器不支持该 XLSX 压缩方式');
    offset = start + compressedSize;
  }
  return entries;
}

function decodeWorkbookXml(value) {
  const doc = new DOMParser().parseFromString(`<x>${value}</x>`, 'application/xml');
  return doc.documentElement.textContent || '';
}
