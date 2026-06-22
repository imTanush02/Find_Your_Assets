import sys
import os
import subprocess
import shutil
import numpy as np
import glob


def find_ffmpeg():
    """Find ffmpeg binary — checks PATH first, then common Windows install locations."""
    # 1) Check PATH
    path = shutil.which('ffmpeg')
    if path:
        return path

    # 2) Probe common Windows install locations
    candidates = []
    user_home = os.path.expanduser('~')
    program_files = os.environ.get('ProgramFiles', 'C:\\Program Files')
    local_app_data = os.environ.get('LOCALAPPDATA', os.path.join(user_home, 'AppData', 'Local'))

    # winget installs (Gyan.FFmpeg) — typically lands here
    candidates.extend(glob.glob(os.path.join(local_app_data, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')))
    candidates.extend(glob.glob(os.path.join(program_files, 'FFmpeg', '**', 'ffmpeg.exe'), recursive=True))
    # Chocolatey
    choco_root = os.environ.get('ChocolateyInstall', 'C:\\ProgramData\\chocolatey')
    candidates.extend(glob.glob(os.path.join(choco_root, 'bin', 'ffmpeg.exe')))
    # Scoop
    candidates.extend(glob.glob(os.path.join(user_home, 'scoop', 'shims', 'ffmpeg.exe')))
    candidates.extend(glob.glob(os.path.join(user_home, 'scoop', 'apps', 'ffmpeg', '**', 'ffmpeg.exe'), recursive=True))
    # Generic fallbacks
    candidates.extend(glob.glob('C:\\ffmpeg\\**\\ffmpeg.exe', recursive=True))
    candidates.extend(glob.glob(os.path.join(program_files, '**', 'ffmpeg.exe'), recursive=True))

    for c in candidates:
        if os.path.isfile(c):
            return c

    return None


def main(input_path, output_path):
    # Import heavy dependencies inside main so errors are caught
    try:
        import cv2
    except ImportError:
        print("Error: opencv-python (cv2) is not installed. Run: pip install opencv-python", flush=True)
        sys.exit(1)

    try:
        import torch
    except ImportError:
        print("Error: PyTorch is not installed. See https://pytorch.org/get-started/locally/", flush=True)
        sys.exit(1)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}", flush=True)

    try:
        # Remove dummy GITHUB_TOKEN if it exists to avoid 401 Unauthorized errors
        if 'GITHUB_TOKEN' in os.environ:
            del os.environ['GITHUB_TOKEN']
        model = torch.hub.load("PeterL1n/RobustVideoMatting", "mobilenetv3", trust_repo=True)
        model = model.to(device)
    except Exception as e:
        print(f"Error loading model: {e}", flush=True)
        sys.exit(1)

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error opening video: {input_path}", flush=True)
        sys.exit(1)

    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps    = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if fps == 0:
        fps = 30
    if total_frames <= 0:
        total_frames = 100 # Fallback

    print(f"Video specs: {width}x{height} @ {fps}fps. Total frames: {total_frames}", flush=True)

    # Find ffmpeg binary
    ffmpeg_bin = find_ffmpeg()
    if not ffmpeg_bin:
        print("Error: ffmpeg is not installed or not in PATH. Please install ffmpeg (winget install Gyan.FFmpeg).", flush=True)
        cap.release()
        sys.exit(1)

    print(f"Using ffmpeg: {ffmpeg_bin}", flush=True)

    # Prepare ffmpeg command
    command = [
        ffmpeg_bin,
        '-y', # overwrite
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{width}x{height}',
        '-pix_fmt', 'bgra',
        '-r', str(fps),
        '-i', '-', # read from stdin
        '-c:v', 'prores_ks', # ProRes 4444
        '-profile:v', '4444',
        '-pix_fmt', 'yuva444p10le',
        '-vendor', 'apl0',
        output_path
    ]

    try:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Error: Failed to start ffmpeg: {e}", flush=True)
        cap.release()
        sys.exit(1)

    rec = [None] * 4 # Initial hidden states

    downsample_ratio = 1.0
    if max(width, height) > 1080:
        downsample_ratio = 1080 / max(width, height)
    elif max(width, height) <= 512:
        downsample_ratio = 1.0

    frame_count = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Convert to RGB tensor
            img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img_tensor = torch.from_numpy(img).permute(2, 0, 1).float().unsqueeze(0).to(device) / 255.0

            with torch.no_grad():
                fgr, pha, *rec = model(img_tensor, *rec, downsample_ratio)

            # Convert back to uint8 numpy
            fgr_np = (fgr[0].permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
            pha_np = (pha[0].permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)

            # Ensure pha is 2D (H, W) for cv2.merge — RVM outputs (H, W, 1)
            if pha_np.ndim == 3:
                pha_np = pha_np[:, :, 0]

            # Create BGRA frame
            r, g, b = cv2.split(fgr_np)
            bgra = cv2.merge((b, g, r, pha_np)) # BGRA

            process.stdin.write(bgra.tobytes())

            frame_count += 1
            if frame_count % 10 == 0:
                progress = min((frame_count / total_frames) * 100, 100.0)
                print(f"Progress: {progress:.2f}%", flush=True)
    except IOError as e:
        print(f"Error writing to ffmpeg pipe: {e}", flush=True)
        cap.release()
        process.stdin.close()
        process.wait()
        sys.exit(1)
    except Exception as e:
        print(f"Error processing frame {frame_count}: {e}", flush=True)
        cap.release()
        process.stdin.close()
        process.wait()
        sys.exit(1)

    cap.release()
    process.stdin.close()
    process.wait()
    print("Progress: 100.00%", flush=True)
    print("Processing complete.", flush=True)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python remove_video_bg.py <input_video_path> <output_video_path>")
        sys.exit(1)
    
    try:
        main(sys.argv[1], sys.argv[2])
    except Exception as e:
        print(f"Error: {e}", flush=True)
        sys.exit(1)

