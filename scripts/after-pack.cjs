const path = require('path');

module.exports = async function applyWindowsBranding(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { rcedit } = await import('rcedit');
  const appInfo = context.packager.appInfo;
  const executablePath = path.join(
    context.appOutDir,
    `${appInfo.productFilename}.exe`
  );
  const iconPath = path.join(
    context.packager.projectDir,
    'renderer',
    'assets',
    'icon.ico'
  );

  await rcedit(executablePath, {
    icon: iconPath,
    'file-version': appInfo.shortVersion || appInfo.version,
    'product-version': appInfo.version,
    'version-string': {
      FileDescription: appInfo.productName,
      ProductName: appInfo.productName,
      InternalName: appInfo.productFilename,
      OriginalFilename: `${appInfo.productFilename}.exe`,
    },
  });
};
