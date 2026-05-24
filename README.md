# MinMotion

[![.NET 10.0](https://img.shields.io/badge/.NET-10.0-blue.svg)](https://dotnet.microsoft.com/)
[![Platforms](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://microsoft.com)
[![WebView2](https://img.shields.io/badge/WebView2-1.0.2849.39-orange.svg)](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

MinMotion is a lightweight native Windows application designed to create keyframe text and shape animations and export them into high-quality video formats. 

The application combines the execution speed and system integration of Windows Forms with the UI flexibility of modern web standards (HTML5, JS, CSS, GSAP) running inside Microsoft Edge WebView2.

---

## Core Features

- Keyframe Animation (Keyframing): Built-in timeline panel with tracks to visually record and interpolate keyframes across various properties (text, font size, tracking, colors, gradients, stroke, padding, pattern backgrounds).
- Typography Engine: Uses GreenSock Animation Platform (GSAP) to animate characters, words, sentences, and paragraphs with absolute precision.
- Built-in Video Export: Sequential capture of the WebView2 rendering canvas paired with on-the-fly FFmpeg processing to generate:
  - MP4 (H.264) with high bitrate profiles.
  - MOV (Apple ProRes 4444) supporting alpha transparency channels for professional video production workflows.
- Customizable Branding & Layout: Responsive screen resolutions or custom output targets (such as Full HD 1920x1080).
- Project Management: Save and load complete project states, keyframes, and track layers into structured JSON files.
- Visual Control Over Styling: Interactive linear and radial gradient editors with draggable color stops, selection palettes, custom spacing, word wrapping, and responsive line background fitting.
- Light and Dark Modes: Includes custom-themed color sets (Alucard and KDE Breeze Dark) mapped to user preferences.

---

## Technology Stack

- Frontend: HTML5, CSS3, ES6 JavaScript, GSAP (gsap.min.js, SplitText, TextPlugin, Draggable).
- Backend / Desktop Host: C#, WinForms (.NET 10.0-windows).
- Interface Bridge: Microsoft.Web.WebView2 for secure two-way event transmission (WebMessage) between JavaScript and C#.
- Media Compiling: FFmpeg CLI interface.

---

## System Requirements & Prerequisites

### System Requirements:
- Operating System: Windows 10 / Windows 11 (x64)
- Microsoft Edge WebView2 Runtime (pre-installed on modern Windows editions or auto-downloaded if missing).
- .NET 10.0 Runtime (for building/running source code, [.NET 10.0 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) is required).

### FFmpeg Setup:
FFmpeg is required to compile captured frames into video:
1. Download a stable builds compilation for Windows from [ffmpeg.org](https://ffmpeg.org/download.html).
2. Save `ffmpeg.exe` directly inside the root project directory (near `MinMotion.csproj` for development) or alongside the compiled `MinMotion.exe` in the publication/assembly folder.
3. Alternatively, you can add `ffmpeg.exe` path to the system path (`PATH`) environment variable, and the C# host will detect it automatically.

---

## Building and Publishing

### Compiling via .NET CLI:

Open a command line console in the project root folder and execute:

```bash
# Restore local package dependencies
dotnet restore

# Build compiled project in Release mode
dotnet build -c Release
```

### Self-Contained Release Generation:

The application is pre-configured to build a single-file, highly compressed standalone executable. Run:

```bash
dotnet publish -c Release -o publish
```

This compilation places a single executable **`MinMotion.exe`**, the associated WebView2 binaries, and the UI-providing **`web/`** directory in the target `publish` folder.

Note: Remember to place `ffmpeg.exe` in the output `publish` folder to allow video rendering to operate correctly right out of the box.

---

## Project Structure

- `MinMotion.csproj` - C# project configurations and dependencies.
- `minmotion_native.sln` - Visual Studio solution file.
- `MainForm.cs` - Core C# application window. Hosts the WebView2 browser control, manages system file dialogs for saving/loading, performs frame-by-frame UI rendering captures, and invokes background FFmpeg subprocesses.
- `Program.cs` - Main application entry point.
- `app.ico` - Native application icon resource.
- `ffmpeg.exe` - CLI video encoder (ignored by Git, placed in directory during development).
- `web/` - Web resource files representing the main UI wrapper:
  - `web/MINMOTION.html` - Main HTML timeline interface and editor canvas container.
  - `web/style/` - Directory storing CSS stylesheet configurations and fonts.
  - `web/libs/` - Local copies of key JavaScript packages (such as GSAP and core plugins).
  - `web/js/` - Frontend engine modular files:
    - `dom.js` - UI rendering utilities, sidebar layouts, and settings binding.
    - `state.js` - Application state core, state definitions mapping, and properties serializing.
    - `functions.js` - Timeline timeline logic, canvas drawing sequences, and GSAP binding functions.
    - `events.js` - Global mouse context managers, timeline key listeners, file drag and drop, and import/export hooks.
- `publish/` - Standalone executable directory.

---

## Version History

### v0.1.29
- Configured automated build and publish preparation scripts.
- Added instructions and built artefacts tracking definitions to gitignore.
- Completely translated documentation to English and simplified markup style.

### v0.1.28
- Designed a new KDE Breeze Dark-based dark mode palette.
- Redesigned visual tick box parameters with a bimodal flat minimalist look.
- Completed full English language support across the user interface.
- Resolved timeline grid alignment bugs on zoom states using CSS properties.

### v0.1.27
- Shifted base typeface to an offline PT Sans setup, ensuring functional layout and fallback integrity on offline machines.

### v0.1.26
- Embedded PT Sans Regular font formats in style assets.
- Altered C# project MSBuild assets copying configurations.

### v0.1.25
- Implemented global hotkey 'H' mapping to toggle standard sidebar interfaces in presentation styles.

### v0.1.24
- Deleted traditional top header markup to optimize actual view canvas.
- Introduced floating icon layouts for layout alignments.

---

## License

This software is distributed under the MIT license. Refer to local project documentation or files for terms. GSAP plugins and tools are licensed by GreenSock Inc. and are used solely for evaluation purposes.
