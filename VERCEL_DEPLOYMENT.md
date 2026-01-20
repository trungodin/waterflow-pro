# 🚀 VERCEL DEPLOYMENT GUIDE

## ✅ PREREQUISITES

- [x] Vercel CLI installed (`npm install -g vercel`)
- [x] Supabase client installed (`@supabase/supabase-js`)
- [x] Project built successfully (`npm run build`)

---

## 🚀 OPTION 1: DEPLOY VỚI VERCEL CLI (RECOMMENDED)

### **Bước 1: Login to Vercel**

```bash
vercel login
```

Chọn method:
- Email
- GitHub
- GitLab
- Bitbucket

### **Bước 2: Deploy**

```bash
cd E:\waterflow-pro
vercel
```

**Vercel sẽ hỏi:**

1. **Set up and deploy?** → `Y` (Yes)
2. **Which scope?** → Chọn account của bạn
3. **Link to existing project?** → `N` (No)
4. **What's your project's name?** → `waterflow-pro` (hoặc tên khác)
5. **In which directory is your code located?** → `./` (Enter)
6. **Want to override settings?** → `N` (No)

**Vercel sẽ:**
- Build project
- Deploy to production
- Cung cấp URL: `https://waterflow-pro.vercel.app`

### **Bước 3: Add Environment Variables**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste your Supabase URL

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your Supabase anon key
```

### **Bước 4: Redeploy**

```bash
vercel --prod
```

---

## 🌐 OPTION 2: DEPLOY QUA VERCEL DASHBOARD

### **Bước 1: Push to GitHub (Optional)**

```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/waterflow-pro.git
git branch -M main
git push -u origin main
```

### **Bước 2: Import to Vercel**

1. Vào https://vercel.com/new
2. Click **"Import Git Repository"**
3. Chọn repository `waterflow-pro`
4. Click **"Import"**

### **Bước 3: Configure Project**

- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./`
- **Build Command:** `npm run build` (auto)
- **Output Directory:** `.next` (auto)

### **Bước 4: Add Environment Variables**

Click **"Environment Variables"**:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
```

### **Bước 5: Deploy**

Click **"Deploy"**

Đợi ~2 phút → **Live! 🎉**

---

## 🔧 POST-DEPLOYMENT

### **1. Custom Domain (Optional)**

1. Vào Project Settings → **Domains**
2. Add domain: `waterflow.com`
3. Update DNS records (Vercel sẽ hướng dẫn)

### **2. Enable Analytics**

1. Vào Project → **Analytics**
2. Enable **Web Analytics**
3. View real-time data

### **3. Setup Monitoring**

1. Vào **Monitoring**
2. Enable **Error Tracking**
3. Setup alerts

---

## 📊 VERIFY DEPLOYMENT

### **Check these URLs:**

```
https://waterflow-pro.vercel.app
https://waterflow-pro.vercel.app/login
https://waterflow-pro.vercel.app/dashboard
```

### **Test Supabase Connection:**

```
https://waterflow-pro.vercel.app/test-supabase
```

---

## 🐛 TROUBLESHOOTING

### **Build Failed?**

```bash
# Test build locally first
npm run build

# Check for errors
npm run lint
```

### **Environment Variables Not Working?**

1. Check spelling (case-sensitive!)
2. Redeploy after adding env vars
3. Use `NEXT_PUBLIC_` prefix for client-side vars

### **404 on Routes?**

- Verify file structure: `app/[route]/page.tsx`
- Check for typos in folder names
- Redeploy

---

## 🔄 CONTINUOUS DEPLOYMENT

Vercel auto-deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys! 🚀
```

**Preview Deployments:**
- Every branch gets a preview URL
- Test before merging to main

---

## 📈 PERFORMANCE

### **Vercel Edge Network:**
- ✅ Global CDN
- ✅ Auto-scaling
- ✅ DDoS protection
- ✅ SSL/HTTPS auto

### **Expected Metrics:**
- **First Load:** < 1s
- **Time to Interactive:** < 2s
- **Lighthouse Score:** 90+

---

## 💰 PRICING

### **Free Tier Includes:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Analytics

### **Pro Tier ($20/month):**
- 1TB bandwidth
- Advanced analytics
- Team collaboration
- Priority support

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Vercel CLI installed
- [ ] Project builds successfully
- [ ] Environment variables added
- [ ] Deployed to Vercel
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Supabase connected
- [ ] All pages working
- [ ] Performance tested

---

## 🎉 SUCCESS!

Your app is now live at:
**https://waterflow-pro.vercel.app**

Share it with the world! 🌍

---

**Need help?** Check Vercel docs: https://vercel.com/docs
