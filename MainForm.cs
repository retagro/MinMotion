using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace MinMotion
{
    // ─── RENDER PROGRESS WINDOW ─────────────────────────────────────────────────
    internal sealed class RenderProgressForm : Form
    {
        private readonly ProgressBar _bar;
        private readonly Label _statusLabel;
        private readonly Label _frameLabel;
        private readonly Button _okBtn;

        public RenderProgressForm()
        {
            Text = "MinMotion — Рендер";
            Width = 440;
            Height = 180;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            TopMost = true;
            ControlBox = false;   // hide X so user can't close mid-render

            var panel = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(16),
                RowCount = 4,
                ColumnCount = 1
            };
            panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            panel.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
            panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            Controls.Add(panel);

            _statusLabel = new Label { Text = "Рендеринг...", Dock = DockStyle.Fill, AutoSize = false, Height = 22 };
            _frameLabel  = new Label { Text = "",             Dock = DockStyle.Fill, AutoSize = false, Height = 20, ForeColor = System.Drawing.Color.Gray };
            _bar = new ProgressBar { Dock = DockStyle.Fill, Style = ProgressBarStyle.Continuous, Minimum = 0, Maximum = 100, Value = 0 };
            _okBtn = new Button
            {
                Text = "ОК",
                Width = 90,
                Anchor = AnchorStyles.None,
                Enabled = false
            };
            _okBtn.Click += (_, _) => Close();

            panel.Controls.Add(_statusLabel, 0, 0);
            panel.Controls.Add(_frameLabel,  0, 1);
            panel.Controls.Add(_bar,         0, 2);
            panel.Controls.Add(_okBtn,       0, 3);
            AcceptButton = _okBtn;
        }

        public void SetProgress(int frame, int total)
        {
            if (InvokeRequired) { Invoke(() => SetProgress(frame, total)); return; }
            int pct = total > 0 ? (int)Math.Round(frame * 100.0 / total) : 0;
            _bar.Value = Math.Min(100, pct);
            _statusLabel.Text = "Рендеринг кадров...";
            _frameLabel.Text  = $"Кадр {frame} / {total}";
        }

        public void SetEncoding()
        {
            if (InvokeRequired) { Invoke(SetEncoding); return; }
            _bar.Value = 100;
            _statusLabel.Text = "Кодирование FFmpeg...";
            _frameLabel.Text  = "";
        }

        public void SetDone(string path)
        {
            if (InvokeRequired) { Invoke(() => SetDone(path)); return; }
            _bar.Value = 100;
            _statusLabel.Text = "✅ Готово!";
            _frameLabel.Text  = path;
            _okBtn.Enabled = true;
            ControlBox = true;   // allow closing now
        }

        public void SetError(string msg)
        {
            if (InvokeRequired) { Invoke(() => SetError(msg)); return; }
            _statusLabel.Text = "❌ " + msg;
            _okBtn.Enabled = true;
            ControlBox = true;
        }
    }

    public class MainForm : Form
    {
        private readonly WebView2 _webView = new WebView2();
        private bool _isFullscreen = false;
        private System.Drawing.Rectangle _restoreBounds;
        private FormWindowState _restoreState;
        private FormBorderStyle _restoreBorderStyle;

        // Export state
        private CancellationTokenSource? _exportCts;
        private string? _exportTempDir;
        private int _exportTotalFrames;
        private int _exportFps;
        private string? _exportOutputPath;
        private string? _exportFormat;
        private int _exportWidth;
        private int _exportHeight;
        private int _exportStartFrame;
        private int _exportEndFrame;
        private int _exportCurrentFrame;
        private System.Drawing.Rectangle _preExportBounds;
        private bool _exportResized;
        private RenderProgressForm? _progressForm;

        public MainForm()
        {
            Text = "MinMotion";
            Width = 1280;
            Height = 800;

            using var stream = typeof(MainForm).Assembly
                .GetManifestResourceStream("MinMotion.app.ico");
            if (stream != null) Icon = new System.Drawing.Icon(stream);

            _webView.Dock = DockStyle.Fill;
            Controls.Add(_webView);

            Load += async (_, _) =>
            {
                var options = new CoreWebView2EnvironmentOptions("--disable-http-cache");
                var env = await CoreWebView2Environment.CreateAsync(null, null, options);
                await _webView.EnsureCoreWebView2Async(env);
                _webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

                string webDir = Path.Combine(AppContext.BaseDirectory, "web");
                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "minmotion.app", webDir,
                    CoreWebView2HostResourceAccessKind.Allow);

                _webView.CoreWebView2.Navigate("https://minmotion.app/MINMOTION.html");
            };
        }

        private void ToggleFullscreen()
        {
            if (!_isFullscreen)
            {
                _restoreBounds = Bounds;
                _restoreState = WindowState;
                _restoreBorderStyle = FormBorderStyle;

                // Must set Normal first, then None, then set Bounds to screen —
                // this hides the taskbar on Windows (Maximized alone does not).
                FormBorderStyle = FormBorderStyle.None;
                WindowState = FormWindowState.Normal;
                var screen = Screen.FromControl(this);
                Bounds = screen.Bounds;
                _isFullscreen = true;
            }
            else
            {
                FormBorderStyle = _restoreBorderStyle;
                WindowState = _restoreState;
                if (_restoreState == FormWindowState.Normal)
                    Bounds = _restoreBounds;
                _isFullscreen = false;
            }
        }

        private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                using var outer = JsonDocument.Parse(e.WebMessageAsJson);
                string jsonText = outer.RootElement.ValueKind == JsonValueKind.String
                    ? outer.RootElement.GetString()!
                    : e.WebMessageAsJson;

                using var doc = JsonDocument.Parse(jsonText);
                string action = doc.RootElement.GetProperty("action").GetString() ?? "";

                if (action == "toggleFullscreen")
                {
                    if (InvokeRequired) Invoke(ToggleFullscreen);
                    else ToggleFullscreen();
                }
                else if (action == "enterRenderFullscreen")
                {
                    Invoke(() =>
                    {
                        if (!_isFullscreen) ToggleFullscreen();
                    });
                }
                else if (action == "exitRenderFullscreen")
                {
                    Invoke(() =>
                    {
                        if (_isFullscreen) ToggleFullscreen();
                    });
                }
                else if (action == "open")
                {
                    Invoke(() =>
                    {
                        using var dlg = new OpenFileDialog
                        {
                            Title = "Open MinMotion Project",
                            Filter = "MinMotion JSON (*.json)|*.json|All files (*.*)|*.*",
                            DefaultExt = "json"
                        };
                        if (dlg.ShowDialog(this) == DialogResult.OK)
                        {
                            string content = File.ReadAllText(dlg.FileName);
                            string escaped = JsonSerializer.Serialize(content);
                            _webView.CoreWebView2.ExecuteScriptAsync($"_receiveFileContent({escaped})");
                        }
                    });
                }
                else if (action == "save")
                {
                    string data = doc.RootElement.GetProperty("data").GetString() ?? "{}";
                    Invoke(() =>
                    {
                        using var dlg = new SaveFileDialog
                        {
                            Title = "Save MinMotion Project",
                            Filter = "MinMotion JSON (*.json)|*.json|All files (*.*)|*.*",
                            DefaultExt = "json",
                            FileName = "animation.json"
                        };
                        if (dlg.ShowDialog(this) == DialogResult.OK)
                            File.WriteAllText(dlg.FileName, data);
                    });
                }
                else if (action == "startExport")
                {
                    var root = doc.RootElement;
                    int startFrame  = root.GetProperty("startFrame").GetInt32();
                    int endFrame    = root.GetProperty("endFrame").GetInt32();
                    int fps         = root.GetProperty("fps").GetInt32();
                    string format   = root.GetProperty("format").GetString() ?? "mp4";
                    int width       = root.GetProperty("width").GetInt32();
                    int height      = root.GetProperty("height").GetInt32();

                    Invoke(() => BeginExport(startFrame, endFrame, fps, format, width, height));
                }
                else if (action == "frameCapture")
                {
                    // JS signals frame is ready — capture it
                    int frame = doc.RootElement.GetProperty("frame").GetInt32();
                    _ = CaptureCurrentFrameAsync(frame);
                }
                else if (action == "cancelExport")
                {
                    _exportCts?.Cancel();
                }
            }
            catch (Exception ex)
            {
                Invoke(() => MessageBox.Show(ex.Message, "MinMotion Error", MessageBoxButtons.OK, MessageBoxIcon.Error));
            }
        }

        // ─── EXPORT ─────────────────────────────────────────────────────────────

        private void BeginExport(int startFrame, int endFrame, int fps, string format, int width, int height)
        {
            // Ask for output path
            string filter = format == "mov"
                ? "QuickTime MOV (*.mov)|*.mov"
                : "MP4 Video (*.mp4)|*.mp4";
            string ext = format == "mov" ? "mov" : "mp4";

            using var dlg = new SaveFileDialog
            {
                Title = "Экспорт видео",
                Filter = filter,
                DefaultExt = ext,
                FileName = $"minmotion_export.{ext}"
            };
            if (dlg.ShowDialog(this) != DialogResult.OK) return;

            _exportOutputPath  = dlg.FileName;
            _exportStartFrame  = startFrame;
            _exportEndFrame    = endFrame;
            _exportFps         = fps;
            _exportFormat      = format;
            _exportWidth       = width;
            _exportHeight      = height;
            _exportTotalFrames = endFrame - startFrame + 1;
            _exportCurrentFrame = startFrame;

            // Temp dir for PNG frames
            _exportTempDir = Path.Combine(Path.GetTempPath(), "minmotion_export_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_exportTempDir);

            _exportCts = new CancellationTokenSource();

            // If custom resolution differs from current window size, resize the window
            var currentScreen = Screen.FromControl(this);
            _exportResized = false;
            if (width != currentScreen.Bounds.Width || height != currentScreen.Bounds.Height)
            {
                _preExportBounds = Bounds;
                _exportResized = true;
                // Center the resized window on screen
                int cx = currentScreen.Bounds.Left + (currentScreen.Bounds.Width - width) / 2;
                int cy = currentScreen.Bounds.Top + (currentScreen.Bounds.Height - height) / 2;
                FormBorderStyle = FormBorderStyle.None;
                WindowState = FormWindowState.Normal;
                Bounds = new System.Drawing.Rectangle(cx, cy, width, height);
            }

            // Open native progress window on top
            _progressForm?.Close();
            _progressForm = new RenderProgressForm();
            _progressForm.Show(this);

            // Tell JS to jump to first frame and render it
            SendRenderRequest(startFrame);
        }

        private void SendRenderRequest(int frame)
        {
            // Ask JS to jump to frame, then notify us when DOM is painted
            string script = $"_exportJumpFrame({frame})";
            _webView.CoreWebView2.ExecuteScriptAsync(script);
        }

        private async Task CaptureCurrentFrameAsync(int frame)
        {
            if (_exportCts == null || _exportCts.IsCancellationRequested || _exportTempDir == null)
                return;

            try
            {
                // Compute zero-based index
                int idx = frame - _exportStartFrame;
                string pngPath = Path.Combine(_exportTempDir, $"frame{idx:D6}.png");

                // Capture WebView2 content as PNG
                using var ms = new MemoryStream();
                await _webView.CoreWebView2.CapturePreviewAsync(
                    CoreWebView2CapturePreviewImageFormat.Png, ms);
                ms.Position = 0;

                // If a specific resolution is requested, scale the image
                using var srcBmp = new System.Drawing.Bitmap(ms);
                if (srcBmp.Width != _exportWidth || srcBmp.Height != _exportHeight)
                {
                    using var dstBmp = new System.Drawing.Bitmap(_exportWidth, _exportHeight);
                    using var g = System.Drawing.Graphics.FromImage(dstBmp);
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.DrawImage(srcBmp, 0, 0, _exportWidth, _exportHeight);
                    dstBmp.Save(pngPath, System.Drawing.Imaging.ImageFormat.Png);
                }
                else
                {
                    srcBmp.Save(pngPath, System.Drawing.Imaging.ImageFormat.Png);
                }

                int next = frame + 1;
                int progress = idx + 1;

                // Update native progress window
                _progressForm?.SetProgress(progress, _exportTotalFrames);

                // Report progress to JS
                string progressJson = JsonSerializer.Serialize(new { action = "exportProgress", frame = progress, total = _exportTotalFrames });
                await _webView.CoreWebView2.ExecuteScriptAsync($"_exportProgress({JsonSerializer.Serialize(progressJson)})");

                if (next <= _exportEndFrame && !_exportCts.IsCancellationRequested)
                {
                    // Next frame
                    SendRenderRequest(next);
                }
                else
                {
                    // All frames captured — run FFmpeg
                    await RunFFmpegAsync();
                }
            }
            catch (Exception ex)
            {
                _progressForm?.SetError("Ошибка захвата: " + ex.Message);
                Invoke(() => MessageBox.Show("Ошибка захвата кадра: " + ex.Message, "MinMotion Export", MessageBoxButtons.OK, MessageBoxIcon.Error));
                CleanupExport();
            }
        }

        private async Task RunFFmpegAsync()
        {
            if (_exportTempDir == null || _exportOutputPath == null || _exportCts == null) return;

            // Update native progress window
            _progressForm?.SetEncoding();

            // Notify JS that encoding started
            string startJson = JsonSerializer.Serialize(new { action = "exportEncoding" });
            await _webView.CoreWebView2.ExecuteScriptAsync($"_exportProgress({JsonSerializer.Serialize(startJson)})");

            string? ffmpegPath = FindFFmpeg();
            if (ffmpegPath == null)
            {
                _progressForm?.SetError("ffmpeg.exe не найден");
                Invoke(() => MessageBox.Show(
                    "ffmpeg.exe не найден.\n\nСкачайте ffmpeg с https://ffmpeg.org/download.html и:\n• Положите ffmpeg.exe рядом с MinMotion.exe, или\n• Добавьте в системный PATH",
                    "FFmpeg не найден", MessageBoxButtons.OK, MessageBoxIcon.Warning));
                CleanupExport();
                return;
            }

            string inputPattern = Path.Combine(_exportTempDir, "frame%06d.png");
            string videoArgs;

            if (_exportFormat == "mov")
            {
                // ProRes 4444 with alpha — highest quality MOV
                videoArgs = $"-c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le";
            }
            else
            {
                // H.264 MP4, 10000 kbps
                videoArgs = $"-c:v libx264 -b:v 10000k -pix_fmt yuv420p -movflags +faststart";
            }

            string args = $"-y -framerate {_exportFps} -i \"{inputPattern}\" {videoArgs} -r {_exportFps} \"{_exportOutputPath}\"";

            try
            {
                var psi = new ProcessStartInfo(ffmpegPath, args)
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardError = true
                };

                using var proc = Process.Start(psi)!;
                string stderr = await proc.StandardError.ReadToEndAsync();
                await proc.WaitForExitAsync(_exportCts.Token);

                if (proc.ExitCode != 0)
                {
                    _progressForm?.SetError("FFmpeg завершился с ошибкой");
                    Invoke(() => MessageBox.Show(
                        "FFmpeg завершился с ошибкой:\n\n" + stderr,
                        "Ошибка экспорта", MessageBoxButtons.OK, MessageBoxIcon.Error));
                }
                else
                {
                    // Show done in native progress window
                    _progressForm?.SetDone(_exportOutputPath ?? "");
                    // Notify JS done
                    string doneJson = JsonSerializer.Serialize(new { action = "exportDone", path = _exportOutputPath });
                    await _webView.CoreWebView2.ExecuteScriptAsync($"_exportProgress({JsonSerializer.Serialize(doneJson)})");
                }
            }
            catch (OperationCanceledException)
            {
                // cancelled — close progress form immediately
                Invoke(() => { _progressForm?.Close(); _progressForm = null; });
            }
            catch (Exception ex)
            {
                _progressForm?.SetError(ex.Message);
                Invoke(() => MessageBox.Show("FFmpeg ошибка: " + ex.Message, "MinMotion Export", MessageBoxButtons.OK, MessageBoxIcon.Error));
            }
            finally
            {
                CleanupExport();
            }
        }

        private static string? FindFFmpeg()
        {
            // 1. Next to exe
            string local = Path.Combine(AppContext.BaseDirectory, "ffmpeg.exe");
            if (File.Exists(local)) return local;

            // 2. PATH
            foreach (string dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator))
            {
                string sanitizedDir = dir.Trim(' ', '"');
                if (string.IsNullOrEmpty(sanitizedDir)) continue;
                string candidate = Path.Combine(sanitizedDir, "ffmpeg.exe");
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }

        private void CleanupExport()
        {
            try
            {
                if (_exportTempDir != null && Directory.Exists(_exportTempDir))
                    Directory.Delete(_exportTempDir, true);
            }
            catch { }
            _exportTempDir = null;
            _exportCts?.Dispose();
            _exportCts = null;

            // Restore window size if it was resized for export
            if (_exportResized)
            {
                _exportResized = false;
                if (InvokeRequired)
                    Invoke(() => { FormBorderStyle = FormBorderStyle.Sizable; Bounds = _preExportBounds; });
                else
                    { FormBorderStyle = FormBorderStyle.Sizable; Bounds = _preExportBounds; }
            }
        }
    }
}
