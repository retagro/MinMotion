# MinMotion

https://github.com/user-attachments/assets/93ed16f2-9709-4cee-af7a-ad7ebb5f5160

---

[![.NET 10.0](https://img.shields.io/badge/.NET-10.0-blue.svg)](https://dotnet.microsoft.com/)
[![Platforms](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://microsoft.com)
[![WebView2](https://img.shields.io/badge/WebView2-1.0.2849.39-orange.svg)](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

MinMotion is a lightweight native Windows application designed to create keyframe text and shape animations and export them into high-quality video formats. 

The application combines the execution speed and system integration of Windows Forms with the UI flexibility of modern web standards (HTML5, ES6 JS, CSS3) running inside Microsoft Edge WebView2.

---

## TODO

- [x] Migrate the animation engine from GSAP to native functions
- [ ] Add the ability to import an audio track to the timeline

---

## Core Features

- Keyframe Animation (Keyframing): Built-in timeline panel with tracks to visually record and interpolate keyframes across various properties (text, font size, tracking, colors, gradients, stroke, padding, pattern backgrounds).
- Typography Engine: Uses a custom-engineered lightweight vanilla ES6 JavaScript Animation Engine to animate characters, words, sentences, and paragraphs with absolute precision.
- Built-in Video Export: Sequential capture of the WebView2 rendering canvas paired with on-the-fly FFmpeg processing to generate:
  - MP4 (H.264) with high bitrate profiles.
  - MOV (Apple ProRes 4444) supporting alpha transparency channels for professional video production workflows.
- Customizable Branding & Layout: Responsive screen resolutions or custom output targets (such as Full HD 1920x1080).
- Project Management: Save and load complete project states, keyframes, and track layers into structured JSON files.
- Visual Control Over Styling: Interactive linear and radial gradient editors with draggable color stops, selection palettes, custom spacing, word wrapping, and responsive line background fitting.
- Light and Dark Modes: Includes custom-themed color sets (Alucard and KDE Breeze Dark) mapped to user preferences.

---

## Technology Stack

- Frontend: HTML5, CSS3, ES6 JavaScript, custom lightweight animation engine (animation.js).
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

## License

This software is distributed under the MIT license. Refer to local project documentation or files for terms.
