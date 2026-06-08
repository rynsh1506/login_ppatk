const fs = require('fs');
const path = require('path');
const { getCsrfToken } = require('./src/services/searchService');

const cookieString = "_csrf_backend=a925c564fa89a07452ed810283e6489a96a08304b6e65a320d939787a8cf7f17a%3A2%3A%7Bi%3A0%3Bs%3A13%3A%22_csrf_backend%22%3Bi%3A1%3Bs%3A32%3A%22dMn6Hjy6_Y23fGq5xXwVGbPiQ9Ci8MFx%22%3B%7D; cookiesession1=678B28901EC4A6A48B350A66E03616AA; PHPSESSID=68f60cb9b625951ac0d1713271b88625";

(async () => {
    try {
        console.log('Mengambil CSRF Token menggunakan cookie yang diberikan...');
        const csrfToken = await getCsrfToken(cookieString);
        
        const CACHE_FILE = path.join(__dirname, 'cache.json');
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ cookieString, csrfToken }, null, 2));
        
        console.log('Berhasil! File cache.json telah di-generate.');
        console.log('Isi cache.json:');
        console.log(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (err) {
        console.error('Gagal:', err);
    }
})();
