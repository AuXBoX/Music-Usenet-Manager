/**
 * Build script for Windows installer
 * Validates configuration and builds the installer
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const ICON_ICO = path.join(BUILD_DIR, 'icon.ico');
const ICON_PNG = path.join(BUILD_DIR, 'icon.png');
const LICENSE = path.join(__dirname, '..', 'LICENSE.txt');
const INSTALLER_NSH = path.join(BUILD_DIR, 'installer.nsh');

console.log('🔍 Validating build configuration...\n');

let hasErrors = false;

// Check for required files
const requiredFiles = [
  { path: ICON_PNG, name: 'icon.png', required: true },
  { path: LICENSE, name: 'LICENSE.txt', required: true },
  { path: INSTALLER_NSH, name: 'installer.nsh', required: true },
  { path: ICON_ICO, name: 'icon.ico', required: false, warning: 'Icon file missing. See build/ICON_INSTRUCTIONS.md' }
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ ${file.name} found`);
  } else {
    if (file.required) {
      console.error(`❌ ${file.name} not found at ${file.path}`);
      hasErrors = true;
    } else {
      console.warn(`⚠️  ${file.name} not found - ${file.warning}`);
    }
  }
});

console.log('');

// Check electron-builder.json
const builderConfigPath = path.join(__dirname, '..', 'electron-builder.json');
if (fs.existsSync(builderConfigPath)) {
  console.log('✅ electron-builder.json found');
  try {
    const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf8'));
    
    // Validate key settings
    if (config.win && config.win.target) {
      console.log('✅ Windows target configured');
    } else {
      console.error('❌ Windows target not configured');
      hasErrors = true;
    }
    
    if (config.nsis) {
      console.log('✅ NSIS configuration found');
    } else {
      console.error('❌ NSIS configuration missing');
      hasErrors = true;
    }
  } catch (error) {
    console.error('❌ Failed to parse electron-builder.json:', error.message);
    hasErrors = true;
  }
} else {
  console.error('❌ electron-builder.json not found');
  hasErrors = true;
}

console.log('');

// Check package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`📦 Package: ${packageJson.name} v${packageJson.version}`);
  console.log(`✅ Main entry: ${packageJson.main}`);
} else {
  console.error('❌ package.json not found');
  hasErrors = true;
}

console.log('');

if (hasErrors) {
  console.error('❌ Build validation failed. Please fix the errors above.\n');
  process.exit(1);
}

console.log('✅ Build configuration validated successfully!\n');

// Ask if user wants to proceed with build
const args = process.argv.slice(2);
if (args.includes('--build')) {
  console.log('🔨 Building application...\n');
  
  try {
    // Build the application
    console.log('📦 Building renderer...');
    execSync('npm run build:renderer', { stdio: 'inherit' });
    
    console.log('📦 Building main process...');
    execSync('npm run build:main', { stdio: 'inherit' });
    
    console.log('📦 Creating Windows installer...');
    execSync('npm run package:win', { stdio: 'inherit' });
    
    console.log('\n✅ Build completed successfully!');
    console.log('📁 Installer location: release/');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️  To build the installer, run:');
  console.log('   node scripts/build-installer.js --build');
  console.log('   or');
  console.log('   npm run package:win\n');
}
