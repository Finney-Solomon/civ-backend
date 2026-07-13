# CIV Backend — AWS EC2 Deployment Guide

http://98.130.129.255/health

This guide deploys the Node.js/Express backend to an Ubuntu EC2 instance using:

- MongoDB Atlas for the database
- `systemd` for process management
- Nginx as the reverse proxy
- Let's Encrypt for HTTPS

Never commit `.env`, AWS credentials, private keys, or other production secrets.

## 1. Create the EC2 instance

In the AWS EC2 console:

1. Select **Launch instance**.
2. Enter a name such as `api-civ`.
3. Select an Ubuntu Server LTS AMI.
4. Select an instance type such as `t3.micro`.
5. Create or select an RSA/ED25519 key pair and download its `.pem` file.
6. Configure the security group with these inbound rules:

   | Type | Port | Source |
   | --- | ---: | --- |
   | SSH | 22 | Your public IP only |
   | HTTP | 80 | `0.0.0.0/0` and `::/0` |
   | HTTPS | 443 | `0.0.0.0/0` and `::/0` |

7. Launch the instance and wait for both status checks to pass.

Do not open the application port `5004` in the security group. Only Nginx should be publicly accessible.

## 2. Assign an Elastic IP

An automatically assigned public IP can change when an instance is stopped and started.

1. Open **EC2 → Network & Security → Elastic IP addresses**.
2. Select **Allocate Elastic IP address**.
3. Select the new address and choose **Actions → Associate Elastic IP address**.
4. Select the `api-civ` instance and associate the address.
5. Record the Elastic IP as `<EC2_IP>` for the commands below.

Check current AWS pricing and release unused Elastic IP addresses.

## 3. Secure the private key and connect

Place the key outside the repository when possible. If it is temporarily stored in the repository directory, ensure `*.pem` is in `.gitignore`.

```bash
chmod 600 ./api-civ-key.pem
ssh -i ./api-civ-key.pem ubuntu@<EC2_IP>
```

The first connection displays the server fingerprint. Confirm it against the EC2 console before entering `yes`.

All remaining server commands should be run after connecting over SSH unless marked as local commands.

## 4. Update Ubuntu and create swap

A small instance can run out of memory while installing native Node.js packages. Create a persistent 1 GB swap file:

```bash
sudo apt-get update
sudo apt-get upgrade -y

sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

free -h
```

Run the swap creation commands only once. Confirm `/swapfile` is not already present in `/etc/fstab` before adding it again.

## 5. Install the runtime and Nginx

```bash
sudo apt-get install -y nodejs npm build-essential nginx git
sudo systemctl enable --now nginx

node --version
npm --version
nginx -v
```

Use a supported Node.js LTS release compatible with the dependencies in `package-lock.json`.

## 6. Clone the backend

```bash
sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www

git clone --branch main https://github.com/Finney-Solomon/civ-backend.git /var/www/civ-backend
cd /var/www/civ-backend
mkdir -p uploads
```

If the repository is private, configure a read-only GitHub deploy key or use a secure GitHub authentication method. Do not put a personal access token directly in the remote URL.

## 7. Create the production environment file

Create the file directly on EC2:

```bash
cd /var/www/civ-backend
nano .env
```

Use this template and replace every placeholder with its production value:

```dotenv
NODE_ENV=production
PORT=5004

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/christ_is_victor
MONGODB_URI_TEST=

JWT_SECRET=<generate-a-long-random-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

LOGIN_OTP_TTL_MINUTES=10
DEFAULT_LOGIN_OTP=
OTP_SERVICE_ENABLED=true

RAZORPAY_KEY_ID=<production-key-id>
RAZORPAY_KEY_SECRET=<production-key-secret>
RAZORPAY_WEBHOOK_SECRET=<production-webhook-secret>

ALLOWED_ORIGINS=https://<admin-domain>,https://<reader-domain>

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

USE_REDIS=false
REDIS_URI=

AWS_ACCESS_KEY_ID=<aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<aws-secret-access-key>
AWS_REGION=<aws-region>
AWS_S3_BUCKET_NAME=<bucket-name>

ELEVENLABS_API_KEY=<elevenlabs-api-key>
ELEVENLABS_VOICE_ID=<voice-id>
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Secure the file:

```bash
chmod 600 /var/www/civ-backend/.env
```

Generate a JWT secret locally or on the server:

```bash
openssl rand -hex 64
```

Copy the generated value into `.env`; do not paste it into tickets, chat messages, or documentation.

### MongoDB Atlas access

In MongoDB Atlas:

1. Create a dedicated production database user.
2. Open **Network Access**.
3. Add the EC2 Elastic IP as `<ELASTIC_IP>/32`.
4. Avoid `0.0.0.0/0` for long-term production access.

### AWS access

Prefer attaching an EC2 IAM role with only the required S3 permissions instead of storing long-lived AWS access keys in `.env`. If the application currently requires environment credentials, use a dedicated least-privilege IAM user and rotate its keys regularly.

## 8. Install production dependencies

```bash
cd /var/www/civ-backend
npm ci --omit=dev
npm audit --omit=dev
```

Review audit findings. Do not run `npm audit fix --force` on production without testing because it may install breaking dependency versions.

## 9. Create the systemd service

```bash
sudo nano /etc/systemd/system/civ-backend.service
```

Add:

```ini
[Unit]
Description=Christ Is Victor Backend API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/civ-backend
EnvironmentFile=/var/www/civ-backend/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
TimeoutStopSec=20
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now civ-backend
sudo systemctl status civ-backend --no-pager
```

Inspect logs if startup fails:

```bash
sudo journalctl -u civ-backend -n 100 --no-pager
sudo journalctl -u civ-backend -f
```

Verify the application directly on the server:

```bash
curl -i http://127.0.0.1:5004/health
```

Expected result: HTTP `200` with a JSON response containing `"status":"ok"` and `"env":"production"`.

## 10. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/civ-backend
```

Add the following configuration and replace `<API_DOMAIN>`:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name <API_DOMAIN>;
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Activate it:

```bash
sudo ln -sfn /etc/nginx/sites-available/civ-backend /etc/nginx/sites-enabled/civ-backend
sudo unlink /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx
```

Test through Nginx:

```bash
curl -i http://127.0.0.1/health -H 'Host: <API_DOMAIN>'
curl -i http://<EC2_IP>/health
```

## 11. Configure DNS

At the DNS provider for your domain:

1. Create an `A` record such as `api`.
2. Point it to the EC2 Elastic IP.
3. Wait for DNS propagation.
4. Verify it:

```bash
dig +short <API_DOMAIN>
```

The output must match the Elastic IP before requesting the certificate.

## 12. Enable HTTPS

Install Certbot:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

Request and configure the certificate:

```bash
sudo certbot --nginx -d <API_DOMAIN>
```

Select the HTTPS redirect when prompted. Then verify:

```bash
curl -i https://<API_DOMAIN>/health
sudo certbot renew --dry-run
systemctl status certbot.timer --no-pager
```

Update `ALLOWED_ORIGINS` in `.env` with the exact HTTPS frontend URLs, then restart the backend:

```bash
sudo systemctl restart civ-backend
```

`ALLOWED_ORIGINS` is a comma-separated list of frontend origins. Each entry must contain only the scheme, hostname, and optional port. Do not include paths or trailing slashes.

Example:

```dotenv
ALLOWED_ORIGINS=https://civ-admin.vercel.app,https://civ-admin-ten.vercel.app
```

After changing CORS configuration, validate it with an origin that should be accepted:

```bash
curl -i -X OPTIONS https://<API_DOMAIN>/health \
  -H 'Origin: https://civ-admin.vercel.app' \
  -H 'Access-Control-Request-Method: GET'
```

The response should include an `Access-Control-Allow-Origin` header matching the supplied origin.

## 13. Deploy future updates

SSH into the instance and run:

```bash
cd /var/www/civ-backend
git status
git pull --ff-only origin main
npm ci --omit=dev
sudo systemctl restart civ-backend
sudo systemctl status civ-backend --no-pager
curl -fsS https://<API_DOMAIN>/health
```

If `git status` shows unexpected server-side changes, stop and investigate instead of overwriting them.

### Deploy an environment-only change

Changes to `.env`, including `ALLOWED_ORIGINS`, do not require `npm ci`. Edit the file, restart the service, and verify health and logs:

```bash
cd /var/www/civ-backend
nano .env
chmod 600 .env
sudo systemctl restart civ-backend
sudo systemctl status civ-backend --no-pager
sudo journalctl -u civ-backend -n 50 --no-pager
curl -fsS https://<API_DOMAIN>/health
```

## 14. Operational commands

```bash
# Service status
sudo systemctl status civ-backend --no-pager

# Live backend logs
sudo journalctl -u civ-backend -f

# Restart the backend
sudo systemctl restart civ-backend

# Validate and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Check listening ports
sudo ss -ltnp

# Check memory, swap, and disk
free -h
df -h /

# Check health locally
curl -i http://127.0.0.1:5004/health
```

## 15. Production checklist

- [ ] Elastic IP is associated with the EC2 instance.
- [ ] SSH is restricted to trusted administrator IP addresses.
- [ ] Only ports 80 and 443 are public.
- [ ] Port 5004 is not publicly exposed.
- [ ] MongoDB Atlas allows only the Elastic IP.
- [ ] `.env` is not committed and has mode `600`.
- [ ] The `.pem` key is not committed and has mode `600`.
- [ ] Previously exposed credentials have been rotated.
- [ ] JWT, Razorpay, AWS, and ElevenLabs values are production credentials.
- [ ] Redis is configured or intentionally disabled.
- [ ] Nginx configuration passes `sudo nginx -t`.
- [ ] `civ-backend` and Nginx are enabled and active.
- [ ] HTTPS works and redirects HTTP traffic.
- [ ] Certbot renewal succeeds in dry-run mode.
- [ ] `/health` returns HTTP 200 through the public HTTPS domain.
- [ ] Dependency audit findings have been reviewed and tested.
- [ ] Monitoring, backups, and billing alerts are configured.

## Current deployment snapshot

At the time this guide was created, the initial deployment used:

- EC2 instance: `api-civ`
- Ubuntu user: `ubuntu`
- Application directory: `/var/www/civ-backend`
- Application port: `5004`
- Service name: `civ-backend`
- Public health endpoint before HTTPS: `http://98.130.129.255/health`

Replace the snapshot IP after assigning an Elastic IP. Do not use the temporary address in permanent client configuration.
