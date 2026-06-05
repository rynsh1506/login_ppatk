# Gunakan Node.js resmi yang berjalan di atas Debian dengan library pendukung Chrome
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Atur working directory di dalam container
WORKDIR /app

# Install Python 3 dan venv karena image Playwright belum tentu punya Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

# Copy package.json dan package-lock.json terlebih dahulu untuk optimalisasi cache Docker
COPY package*.json ./

# Install dependensi Node.js (termasuk playwright dan ffmpeg-static)
RUN npm install

# Copy seluruh source code
COPY . .

# Jalankan skrip setup otomatis untuk membangun Python .venv Internal
RUN npm run setup

# Buka port 3000 untuk diakses dari luar container
EXPOSE 3000

# Perintah yang dijalankan ketika container hidup
CMD ["npm", "start"]
