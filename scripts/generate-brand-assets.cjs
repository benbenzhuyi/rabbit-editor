const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(
  rootDir,
  'renderer',
  'assets',
  'brand',
  'rabbit-app-icon-dark.svg'
);
const pngPath = path.join(rootDir, 'renderer', 'assets', 'icon.png');
const icoPath = path.join(rootDir, 'renderer', 'assets', 'icon.ico');
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

function createIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + entrySize * images.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = dataOffset;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(image => image.data)]);
}

app.commandLine.appendSwitch('force-device-scale-factor', '1');

app.whenReady().then(async () => {
  const svg = fs.readFileSync(sourcePath);
  const svgUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`;
  const html = Buffer.from(
    `<style>html,body{width:100%;height:100%;margin:0;background:transparent;overflow:hidden}img{display:block;width:100%;height:100%}</style><img src="${svgUrl}">`
  ).toString('base64');
  const window = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
    },
  });
  await window.loadURL(`data:text/html;base64,${html}`);
  const source = await window.webContents.capturePage({
    x: 0,
    y: 0,
    width: 1024,
    height: 1024,
  });
  if (source.isEmpty()) {
    throw new Error(`Unable to render brand SVG: ${sourcePath}`);
  }

  fs.writeFileSync(
    pngPath,
    source.resize({ width: 1024, height: 1024, quality: 'best' }).toPNG()
  );

  const icoImages = icoSizes.map(size => ({
    size,
    data: source.resize({ width: size, height: size, quality: 'best' }).toPNG(),
  }));
  fs.writeFileSync(icoPath, createIco(icoImages));
  window.destroy();
  app.quit();
}).catch(error => {
  console.error(error);
  app.exit(1);
});
