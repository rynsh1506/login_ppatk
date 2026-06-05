'use strict';

const { execFile } = require('child_process');
const path = require('path');
const logger = require('./logger');

/**
 * Mentranskripsi file audio MP3 secara lokal menggunakan Python Whisper
 * @param {string} audioFilePath - Path absolut file mp3
 * @returns {Promise<string>} Hasil transkripsi teks
 */
const transcribeAudioLocal = (audioFilePath) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(__dirname, '../../transcribe.py');
    
    logger.info(`[Transcriber] Menjalankan Whisper lokal pada: ${audioFilePath}`);
    
    // Panggil script python
    execFile('python', [pythonScript, audioFilePath], (error, stdout, stderr) => {
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
