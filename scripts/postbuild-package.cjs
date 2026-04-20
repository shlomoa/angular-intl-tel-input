const fs = require('node:fs');
const path = require('node:path');
const sass = require('sass');

const packageRoot = path.resolve(__dirname, '..');
const distDir = path.join(packageRoot, 'dist');
const distPackageJsonPath = path.join(distDir, 'package.json');
const distCssDir = path.join(distDir, 'src', 'css');

if (!fs.existsSync(distPackageJsonPath)) {
  throw new Error(`Missing built package metadata: ${distPackageJsonPath}`);
}

fs.mkdirSync(distCssDir, { recursive: true });

const compileScss = (inputFile, outputFile) => {
  const result = sass.compile(inputFile, {
    style: 'compressed',
  });
  fs.writeFileSync(outputFile, result.css + '\n');
};

compileScss(
  path.join(packageRoot, 'src', 'css', 'intlTelInput.scss'),
  path.join(distCssDir, 'intlTelInput-no-assets.css'),
);
compileScss(
  path.join(packageRoot, 'src', 'css', 'intlTelInputWithAssets.scss'),
  path.join(distCssDir, 'intlTelInput.css'),
);
fs.copyFileSync(
  path.join(packageRoot, 'src', 'css', 'styles.d.ts'),
  path.join(distCssDir, 'styles.d.ts'),
);

const packageJson = JSON.parse(fs.readFileSync(distPackageJsonPath, 'utf8'));
packageJson.exports = {
  ...packageJson.exports,
  './styles': {
    types: './src/css/styles.d.ts',
    default: './src/css/intlTelInput.css',
  },
  './styles/no-assets': {
    types: './src/css/styles.d.ts',
    default: './src/css/intlTelInput-no-assets.css',
  },
};
packageJson.style = './src/css/intlTelInput.css';

fs.writeFileSync(distPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log(`Post-processed built package at ${distDir}`);
