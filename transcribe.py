import sys
import whisper
import warnings

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
