# Application Icon Instructions

## Creating the Windows Icon (.ico)

The Windows installer requires a `.ico` file for the application icon. This file should be created from the existing `icon.png` file.

### Requirements

- The `.ico` file should contain multiple resolutions: 16x16, 32x32, 48x48, 64x64, 128x128, and 256x256 pixels
- The icon should be clear and recognizable at all sizes
- Use a transparent background if possible

### Methods to Create .ico File

#### Option 1: Using Online Converter
1. Go to https://convertio.co/png-ico/ or https://www.icoconverter.com/
2. Upload `build/icon.png`
3. Select all size options (16x16 through 256x256)
4. Download the generated `icon.ico`
5. Place it in the `build/` directory

#### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Then run:
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### Option 3: Using GIMP (Free Software)
1. Open `icon.png` in GIMP
2. Go to File → Export As
3. Change the file extension to `.ico`
4. In the export dialog, select multiple sizes
5. Save to the `build/` directory

### Current Status

- ✅ `icon.png` exists (used for tray icon)
- ❌ `icon.ico` needs to be created for Windows installer

### After Creating the Icon

Once you have created `icon.ico`, place it in the `build/` directory alongside `icon.png`. The electron-builder configuration is already set up to use it.

You can then build the Windows installer with:
```bash
npm run package:win
```
