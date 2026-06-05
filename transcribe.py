import sys
import os
import whisper
import warnings

# Jika dipanggil dari Node.js yang memiliki ffmpeg-static internal
if len(sys.argv) > 2:
    ffmpeg_binary_path = sys.argv[2]
    ffmpeg_dir = os.path.dirname(ffmpeg_binary_path)
    # Tambahkan direktori ffmpeg ke PATH Python
    os.environ["PATH"] += os.pathsep + ffmpeg_dir

# Sembunyikan warning agar tidak mengotori stdout
warnings.filterwarnings("ignore")

def transcribe(audio_path):
    try:
        # Gunakan model 'tiny' agar cepat dan ringan di CPU lokal
        model = whisper.load_model("tiny")
        result = model.transcribe(audio_path, fp16=False)
        print(result["text"].strip())
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: Path ke file audio tidak disertakan.", file=sys.stderr)
        sys.exit(1)
    transcribe(sys.argv[1])
