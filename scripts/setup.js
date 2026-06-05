const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VENV_DIR = path.resolve(__dirname, '../.venv');
const OS_TYPE = process.platform; // 'win32', 'linux', atau 'darwin'

console.log('=============================================');
console.log('  PPATK Scraper - Internal Environment Setup ');
console.log('=============================================');

try {
  // 1. Cek apakah Python ada di sistem host
  let pythonCmd = OS_TYPE === 'win32' ? 'py' : 'python3';
  try {
    execSync(`${pythonCmd} --version`, { stdio: 'ignore' });
  } catch (e) {
    if (OS_TYPE === 'win32') {
      pythonCmd = 'python'; // Fallback coba python biasa
      execSync(`${pythonCmd} --version`, { stdio: 'ignore' });
    } else {
      pythonCmd = 'python';
      execSync(`${pythonCmd} --version`, { stdio: 'ignore' });
    }
  }
  
  console.log(`[1/3] Python host terdeteksi. Menggunakan perintah: ${pythonCmd}`);

  // 2. Buat Virtual Environment di folder .venv
  if (!fs.existsSync(VENV_DIR)) {
    console.log(`[2/3] Membangun Python Virtual Environment (.venv) internal...`);
    execSync(`${pythonCmd} -m venv .venv`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  } else {
    console.log(`[2/3] Folder .venv sudah ada. Melewati pembuatan venv.`);
  }

  // 3. Instal dependensi AI (Whisper) ke dalam .venv
  console.log(`[3/3] Menginstal Whisper AI ke dalam internal .venv (ini butuh waktu beberapa menit)...`);
  
  const venvPipWin = path.resolve(__dirname, '../.venv/Scripts/pip.exe');
  const venvPipLin = path.resolve(__dirname, '../.venv/bin/pip');
  
  let pipCmd = fs.existsSync(venvPipWin) ? `"${venvPipWin}"` : `"${venvPipLin}"`;
  
  execSync(`${pipCmd} install openai-whisper`, { stdio: 'inherit' });
  
  console.log('=============================================');
  console.log('✅ SETUP SELESAI!');
  console.log('Semua dependensi Python dan FFmpeg sekarang');
  console.log('telah diisolasi dan ditaruh ke dalam mode Internal.');
  console.log('=============================================');

} catch (error) {
  console.error('\\n❌ GAGAL: Terjadi kesalahan saat melakukan setup.');
  console.error('Pastikan Anda sudah menginstal Python secara global terlebih dahulu sebelum menjalankan skrip ini.');
  console.error('Pesan Error:', error.message);
  process.exit(1);
}
