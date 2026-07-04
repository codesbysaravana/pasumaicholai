# Production Deployment Guide (PasumaiCholai)

This guide provides instructions for deploying PasumaiCholai alongside MicroOps on your existing AWS EC2 instance without causing conflicts.

## 1. Initial Server Setup (One-time)

SSH into your EC2 instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-ip>
```

### Clone the Repository
```bash
# Create directory
sudo mkdir -p /var/www/pasumaicholai
sudo chown -R $USER:$USER /var/www/pasumaicholai
cd /var/www/pasumaicholai

# Clone from GitHub
git clone https://github.com/codesbysaravana/pasumaicholai.git .
```

### Setup Environment Variables
```bash
cp server/.env.production.example server/.env
nano server/.env
```
*Fill in your production secrets (MongoDB URI, AWS keys, etc.). Ensure `NODE_ENV=production`.*

## 2. Nginx Setup

1. Copy the Nginx configuration:
```bash
sudo cp nginx/pasumaicholai.conf /etc/nginx/sites-available/pasumaicholai
```
2. Replace `pasumaicholai.example.com` with your actual domain in `/etc/nginx/sites-available/pasumaicholai`.
3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/pasumaicholai /etc/nginx/sites-enabled/
```
4. Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```
5. Install SSL Certificate (Certbot):
```bash
sudo certbot --nginx -d pasumaicholai.example.com -d www.pasumaicholai.example.com
```

## 3. GitHub Actions Setup (CI/CD)

To enable automated deployments on `git push`, add the following Secrets to your GitHub repository (`Settings` > `Secrets and variables` > `Actions`):

- `EC2_HOST`: The public IP or domain of your EC2 instance.
- `EC2_USERNAME`: The SSH username (usually `ubuntu` or `ec2-user`).
- `EC2_SSH_KEY`: The raw contents of your `.pem` private key file.

## 4. Rollback Strategy

If a deployment fails, you can quickly rollback to the previous working state.

1. SSH into the server: `cd /var/www/pasumaicholai`
2. Find the previous commit hash: `git log -n 5`
3. Revert code: `git checkout <previous-commit-hash>`
4. Rebuild and restart:
```bash
docker-compose -f docker-compose.production.yml up -d --build
cd client && npm ci && npm run build
```

## 5. Troubleshooting & Verification

- **Check Backend Logs**: `docker logs pasumaicholai-server --tail 100 -f`
- **Check Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
- **MicroOps Integrity**: Verify that MicroOps is still accessible on its domain. 
- **Port Conflicts**: PasumaiCholai runs on port `5001`. Ensure no other service uses this port using `sudo netstat -tulpn | grep 5001`.