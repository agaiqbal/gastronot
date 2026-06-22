# Gastronot Landing Page — Deploy Guide

## Arsitektur

```
Browser (Visitor)
    │
    ▼
[ Nginx reverse proxy :80/:443 ]
    │
    ▼
[ Docker: gastronot_app :3000 ]
    ├── GET /          → public/index.html   (Landing page)
    ├── GET /admin.html → public/admin.html  (CMS Admin)
    ├── GET /api/cms   → data/cms.json       (Read content)
    └── POST /api/cms  → data/cms.json       (Write content, auth required)
    │
    ▼
[ Docker Volume: gastronot_data ]
    ├── data/cms.json
    ├── data/partner-logos.json
    └── data/client-logos.json
```

---

## GitHub Secrets yang dibutuhkan

Di GitHub repo → **Settings → Secrets and variables → Actions**, tambahkan:

| Secret | Contoh nilai | Keterangan |
|--------|-------------|------------|
| `REMOTE_HOST` | `123.456.789.0` | IP DigitalOcean Droplet |
| `REMOTE_USER` | `root` | Username SSH Droplet |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | Private key SSH |
| `ADMIN_TOKEN` | `abc123-ganti-ini!` | Token rahasia untuk CMS admin |

---

## Setup Droplet (sekali saja)

```bash
# SSH ke Droplet
ssh root@YOUR_DROPLET_IP

# Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Buat direktori deploy
mkdir -p /opt/gastronot

# (Opsional) Install Nginx sebagai reverse proxy
apt install -y nginx certbot python3-certbot-nginx

# Konfigurasi Nginx
cat > /etc/nginx/sites-available/gastronot << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gastronot /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL (butuh domain yang sudah pointing ke Droplet)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## SSH Key Setup

```bash
# Di komputer lokal
ssh-keygen -t ed25519 -C "github-deploy-gastronot" -f ~/.ssh/gastronot_deploy

# Tambahkan public key ke Droplet
ssh-copy-id -i ~/.ssh/gastronot_deploy.pub root@YOUR_DROPLET_IP

# Copy private key → paste ke GitHub Secret SSH_PRIVATE_KEY
cat ~/.ssh/gastronot_deploy
```

---

## Deploy

### Otomatis (CI/CD)
Setiap push ke branch `main` → GitHub Actions otomatis:
1. Build Docker image
2. Kirim ke Droplet via SCP
3. Load image + restart container (data volume tetap aman)

### Manual pertama kali
```bash
cd /opt/gastronot
docker compose up -d
```

---

## Cara pakai CMS Admin

1. Buka `https://yourdomain.com/admin.html`
2. Di kolom **API Token**, masukkan nilai `ADMIN_TOKEN` yang kamu set di GitHub Secrets
3. Klik **Simpan Token** — indikator hijau berarti terhubung
4. Edit konten → perubahan otomatis tersimpan ke server

---

## Perintah berguna di Droplet

```bash
# Lihat status container
docker ps

# Lihat logs
docker logs gastronot_app -f

# Restart manual
cd /opt/gastronot && docker compose restart

# Backup data CMS
docker run --rm -v gastronot_data:/data alpine tar czf - /data > cms-backup.tar.gz
```
