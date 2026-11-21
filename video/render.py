"""
Exporte l'animation griffin-lab-explainer.html en vidéo WebM (1920×1080, 30 i/s).

    python render.py              → griffin-lab-explainer.webm
    python render.py --stills 3 15 30   → images de contrôle aux secondes données

Utilise Playwright (Chromium) et le ffmpeg fourni avec Playwright (VP8).
"""
import glob
import os
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
PAGE = (HERE / "griffin-lab-explainer.html").as_uri() + "?render"
FPS = 30
FFMPEG = glob.glob(os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\ffmpeg-*\ffmpeg-win64.exe"))[0]


def main():
    args = sys.argv[1:]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(PAGE)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(800)

        if args and args[0] == "--stills":
            out = HERE / "stills"
            out.mkdir(exist_ok=True)
            for s in args[1:]:
                page.evaluate(f"window.__seek({float(s)})")
                page.screenshot(path=str(out / f"t{float(s):05.1f}.png"))
            print("images :", out)
            return

        duration = page.evaluate("window.__duration")
        frames = int(duration * FPS)
        target = HERE / "griffin-lab-explainer.webm"
        ffmpeg = subprocess.Popen(
            [FFMPEG, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "pipe:0",
             "-c:v", "libvpx", "-b:v", "8M", "-crf", "6", "-qmin", "0", "-qmax", "30", "-deadline", "good",
             "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", str(target)],
            stdin=subprocess.PIPE,
        )
        for i in range(frames + 1):
            page.evaluate(f"window.__seek({i / FPS})")
            ffmpeg.stdin.write(page.screenshot(type="jpeg", quality=95))
            if i % 150 == 0:
                print(f"{i}/{frames}", flush=True)
        ffmpeg.stdin.close()
        ffmpeg.wait()
        browser.close()
        print("vidéo :", target, f"{target.stat().st_size / 1e6:.1f} Mo")


if __name__ == "__main__":
    main()
