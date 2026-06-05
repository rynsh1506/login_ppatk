'use strict';

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Mendapatkan path internal FFmpeg dari library npm
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  logger.warn('[Transcriber] ffmpeg-static belum diinstal. Pastikan menjalankan npm run setup.');
  ffmpegPath = '';
}

/**
 * Mentranskripsi file audio MP3 secara lokal menggunakan Python Whisper
 * @param {string} audioFilePath - Path absolut file mp3
 * @returns {Promise<string>} Hasil transkripsi teks
 */
const transcribeAudioLocal = (audioFilePath) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(__dirname, '../../transcribe.py');
    
    logger.info(`[Transcriber] Menjalankan Whisper lokal pada: ${audioFilePath}`);
    
    // 1. Cek apakah ada Virtual Environment internal (.venv) di dalam project
    const venvPythonWin = path.resolve(__dirname, '../../.venv/Scripts/python.exe');
    const venvPythonLin = path.resolve(__dirname, '../../.venv/bin/python');
    
    let pythonCmd = 'python';
    if (fs.existsSync(venvPythonWin)) {
      pythonCmd = venvPythonWin; // Windows Internal
    } else if (fs.existsSync(venvPythonLin)) {
      pythonCmd = venvPythonLin; // Linux/Mac Internal
    } else {
      // Fallback ke Python sistem jika internal belum dibuat
      pythonCmd = process.platform === 'win32' ? 'py' : 'python';
      logger.warn(`[Transcriber] Internal .venv tidak ditemukan. Fallback menggunakan python sistem: ${pythonCmd}`);
    }

    // Panggil script python dengan menyisipkan path ffmpeg-static internal
    execFile(pythonCmd, [pythonScript, audioFilePath, ffmpegPath], (error, stdout, stderr) => {
      if (error) {
        logger.error(`[Transcriber] Gagal menjalankan Whisper: ${stderr || error.message}`);
        return reject(new Error(`Whisper failed: ${stderr || error.message}`));
      }
      
      const transcription = stdout.trim();
      logger.info(`[Transcriber] Hasil transkripsi: "${transcription}"`);
      resolve(transcription);
    });
  });
};

module.exports = { transcribeAudioLocal };
