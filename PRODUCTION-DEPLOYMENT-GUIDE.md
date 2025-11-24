# 🚀 Production Deployment Guide for Dialer System

## 🔒 **CRITICAL SECURITY CHECKLIST**

### ✅ Pre-Deployment Security Requirements

**1. Environment Variables Setup**
- [ ] Copy `.env.example` to `.env.local`
- [ ] Generate secure JWT secret: `openssl rand -base64 64`
- [ ] Set strong Supabase credentials
- [ ] Configure production domain in `NEXTAUTH_URL`
- [ ] Set `NODE_ENV=production`

**2. Database Security**
- [ ] Execute `database/security-schema.sql` in Supabase SQL Editor
- [ ] Verify Row Level Security (RLS) is enabled on all tables
- [ ] Test audit logging is working
- [ ] Create database backups
- [ ] Set up monitoring for audit logs

**3. Application Security**
- [ ] Verify all hardcoded secrets are removed
- [ ] Test rate limiting is working
- [ ] Confirm input validation is active
- [ ] Check security headers are applied
- [ ] Test authentication flows

---

## 🌐 **DEPLOYMENT PLATFORMS**

### **Option 1: Vercel (Recommended)**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod

# 4. Set environment variables in Vercel dashboard
# Go to Project Settings > Environment Variables
# Add all variables from .env.example
```

**Environment Variables in Vercel:**
- Add each variable from `.env.example`
- Mark sensitive variables as "Sensitive"
- Ensure `NODE_ENV` is set to `production`

### **Option 2: Railway**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up

# 5. Set environment variables
railway variables set JWT_SECRET=your-secret-here
# Add all other variables...
```

### **Option 3: Netlify**

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build the project
npm run build

# 3. Deploy
netlify deploy --prod --dir=.next
```

### **Option 4: AWS/DigitalOcean/Custom VPS**

```bash
# 1. Set up Node.js environment
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2 for process management
npm install -g pm2

# 3. Clone and setup project
git clone your-repo
cd dialer-system
npm install
npm run build

# 4. Create PM2 ecosystem file
```

**PM2 Ecosystem (ecosystem.config.js):**
```javascript
module.exports = {
  apps: [{
    name: 'dialer-system',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## 🔧 **SERVER CONFIGURATION**

### **Nginx Configuration (for VPS deployment)**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    location /api/auth/ {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### **Docker Deployment**

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  dialer-system:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
```

---

## 📊 **MONITORING & MAINTENANCE**

### **Health Checks**
Create API health check endpoint:

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  })
}
```

### **Log Monitoring**
```bash
# For PM2 deployments
pm2 logs dialer-system

# For Docker deployments
docker logs -f container-name

# Set up log rotation
pm2 install pm2-logrotate
```

### **Database Monitoring**
```sql
-- Monitor audit logs
SELECT COUNT(*) as total_audit_logs, 
       table_name, 
       operation 
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, operation;

-- Monitor active sessions
SELECT COUNT(*) as active_sessions,
       user_role
FROM sessions 
WHERE last_activity > NOW() - INTERVAL '30 minutes'
GROUP BY user_role;
```

---

## 🔒 **SECURITY MAINTENANCE**

### **Regular Security Tasks**

**Weekly:**
- [ ] Review audit logs for suspicious activity
- [ ] Check for failed login attempts
- [ ] Monitor rate limiting effectiveness
- [ ] Update dependencies: `npm audit fix`

**Monthly:**
- [ ] Rotate JWT secrets (if using manual rotation)
- [ ] Review user access and permissions
- [ ] Clean up old audit logs
- [ ] Performance optimization review

**Quarterly:**
- [ ] Security penetration testing
- [ ] Dependency security audit
- [ ] Backup and disaster recovery testing
- [ ] Review and update security policies

### **Automated Monitoring Setup**

**Supabase Alerts:**
```sql
-- Create function to alert on suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS void AS $$
BEGIN
  -- Alert on multiple failed logins
  IF (SELECT COUNT(*) FROM audit_logs 
      WHERE table_name = 'auth_attempts' 
      AND operation = 'FAILED_LOGIN' 
      AND created_at > NOW() - INTERVAL '5 minutes') > 10 THEN
    
    -- Send alert (implement your notification method)
    RAISE WARNING 'SECURITY ALERT: Multiple failed login attempts detected';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule the check (use pg_cron if available)
SELECT cron.schedule('security-check', '*/5 * * * *', 'SELECT check_suspicious_activity();');
```

---

## 🚨 **INCIDENT RESPONSE**

### **Security Incident Checklist**

**Immediate Response:**
1. [ ] Identify the scope of the incident
2. [ ] Block malicious IP addresses at firewall/load balancer
3. [ ] Invalidate compromised user sessions
4. [ ] Check audit logs for unauthorized access
5. [ ] Document the incident timeline

**Investigation:**
1. [ ] Analyze audit logs for the incident timeframe
2. [ ] Check for data exposure or modification
3. [ ] Identify attack vectors and vulnerabilities
4. [ ] Assess system integrity

**Recovery:**
1. [ ] Apply security patches if needed
2. [ ] Reset passwords for affected accounts
3. [ ] Update security policies
4. [ ] Communicate with affected users (if applicable)

**Post-Incident:**
1. [ ] Conduct post-mortem analysis
2. [ ] Update security documentation
3. [ ] Improve monitoring and alerting
4. [ ] Train team on lessons learned

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### **Production Optimizations**

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      }
    ]
  },

  // Redirects for security
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true
      }
    ]
  }
}
```

### **Database Performance**
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_clients_search 
ON clients USING gin(to_tsvector('english', principal_key_holder || ' ' || contract_no));

-- Optimize audit log queries
CREATE INDEX CONCURRENTLY idx_audit_logs_recent 
ON audit_logs(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 📱 **SSL/TLS Configuration**

### **Let's Encrypt (Free SSL)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **SSL Security Check**
Test your SSL configuration at: https://www.ssllabs.com/ssltest/

---

## 🎯 **GO-LIVE CHECKLIST**

### **Final Pre-Launch Verification**

**Security:**
- [ ] All environment variables set correctly
- [ ] JWT secret is strong and unique
- [ ] Database RLS policies are active
- [ ] Rate limiting is working
- [ ] Security headers are applied
- [ ] HTTPS is enforced
- [ ] Audit logging is functional

**Performance:**
- [ ] Application builds without errors
- [ ] All API endpoints respond correctly
- [ ] Database queries are optimized
- [ ] Static assets are compressed
- [ ] CDN is configured (if applicable)

**Functionality:**
- [ ] User authentication works
- [ ] Admin and user dashboards load
- [ ] Client management functions
- [ ] Call logging works
- [ ] Notifications system active
- [ ] Reports generate correctly

**Monitoring:**
- [ ] Health check endpoint works
- [ ] Error logging is configured
- [ ] Uptime monitoring is set up
- [ ] Database monitoring is active
- [ ] Backup system is tested

**Documentation:**
- [ ] Admin user credentials documented
- [ ] API documentation updated
- [ ] User manual prepared
- [ ] Incident response plan ready

---

## 🎉 **POST-DEPLOYMENT**

### **Immediate Actions After Go-Live**
1. Monitor logs for the first 24 hours
2. Test all critical user journeys
3. Verify backup systems are working
4. Set up monitoring alerts
5. Document any issues and resolutions

### **Success Metrics to Track**
- Login success rate
- API response times
- Database query performance
- Security incident count
- User satisfaction scores

---

**🚨 Remember: Security is an ongoing process, not a one-time setup. Regularly review and update your security measures!**