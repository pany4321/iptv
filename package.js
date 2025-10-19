const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publishDir = path.join(rootDir, 'publish');
const publicDir = path.join(publishDir, 'public');
const backendDist = path.join(rootDir, 'backend', 'dist');
const frontendDist = path.join(rootDir, 'frontend', 'dist');
const backendPkgJson = path.join(rootDir, 'backend', 'package.json');
const backendPkgLock = path.join(rootDir, 'backend', 'package-lock.json');

console.log('Starting packaging process...');

try {
    // 1. Clean up old publish directory
    if (fs.existsSync(publishDir)) {
        console.log(`Removing old publish directory: ${publishDir}`);
        fs.rmSync(publishDir, { recursive: true, force: true });
    }

    // 2. Create new publish directory structure
    console.log(`Creating new publish directory: ${publishDir}`);
    fs.mkdirSync(publishDir);
    console.log(`Creating new public directory: ${publicDir}`);
    fs.mkdirSync(publicDir);

    // 3. Copy files
    console.log(`Copying backend from ${backendDist} to ${publishDir}...`);
    fs.cpSync(backendDist, publishDir, { recursive: true });

    console.log(`Copying frontend from ${frontendDist} to ${publicDir}...`);
    fs.cpSync(frontendDist, publicDir, { recursive: true });

    console.log('Copying backend package files...');
    fs.copyFileSync(backendPkgJson, path.join(publishDir, 'package.json'));
    fs.copyFileSync(backendPkgLock, path.join(publishDir, 'package-lock.json'));

    console.log('Adjusting start script in final package.json...');
    const publishPkgJsonPath = path.join(publishDir, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(publishPkgJsonPath, 'utf-8'));
    pkgJson.scripts.start = 'node index.js';
    if (pkgJson.scripts.dev) {
        delete pkgJson.scripts.dev;
    }
    fs.writeFileSync(publishPkgJsonPath, JSON.stringify(pkgJson, null, 2));

    console.log('\nPackaging process completed successfully!');
    console.log(`\nYour bundled application is ready in the 'publish' directory.`);
    console.log('To run it, execute: npm start');

} catch (error) {
    console.error('\nAn error occurred during the packaging process:');
    console.error(error);
    process.exit(1);
}
