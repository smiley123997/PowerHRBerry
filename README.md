# ⚡ WorkPulse HRMS

A modern, premium **Human Resource Management System** built with pure HTML, CSS, and JavaScript — no frameworks, no build tools. Deploys instantly to GitHub Pages.

---

## 🖥️ Live Demo

> After deploying: `https://YOUR-USERNAME.github.io/workpulse-hrms/`

---

## 📁 File Structure

```
workpulse-hrms/
├── index.html          ← Employee Dashboard (main app)
├── admin.html          ← Admin Panel
├── css/
│   ├── style.css       ← Main stylesheet (shared)
│   └── admin.css       ← Admin-specific overrides
├── js/
│   ├── app.js          ← Employee dashboard logic
│   └── admin.js        ← Admin panel logic
└── README.md
```

---

## 🚀 Deploy to GitHub Pages (Step-by-Step)

### Step 1 — Create a GitHub Repository
1. Go to [github.com](https://github.com) → Sign in
2. Click **"New"** (green button, top left)
3. Repository name: `workpulse-hrms`
4. Set to **Public**
5. Click **"Create repository"**

### Step 2 — Upload Files
1. In your new repo, click **"uploading an existing file"**
2. Upload ALL files maintaining the folder structure:
   - `index.html`
   - `admin.html`
   - `css/style.css`
   - `css/admin.css`
   - `js/app.js`
   - `js/admin.js`
   - `README.md`
3. Scroll down → Click **"Commit changes"**

### Step 3 — Enable GitHub Pages
1. Go to your repo → **Settings** tab
2. Left sidebar → **Pages**
3. Under **Source** → Select **"Deploy from a branch"**
4. Branch: **main** | Folder: **/ (root)**
5. Click **Save**

### Step 4 — Wait ~2 Minutes
Your app will be live at:
```
https://YOUR-USERNAME.github.io/workpulse-hrms/
```

---

## ✨ Features

### Employee Dashboard (`index.html`)
- 📊 Live clock & personalized greeting
- 📅 Attendance calendar with color-coded status
- 📋 Leave balance progress bars
- 🗒️ Recent leave requests with status badges
- 🎉 Upcoming holidays list
- ⏱️ Attendance log with daily timestamps
- 👤 Employee profile page
- 💰 Payslip history with download button
- ➕ Apply Leave modal form

### Admin Panel (`admin.html`)
- 📈 Company-wide KPI cards
- 👥 Live employee status board
- 📊 Department headcount bar chart
- 📅 Weekly attendance histogram
- ✅ Pending approvals workflow (Approve / Reject per card)
- 👤 Full employee directory with search & filter
- ⏱️ Today's attendance management
- 🎉 Holiday management (add/edit/delete)
- 📈 Department leave summary reports

---

## 🎨 Design System

| Token | Value |
|---|---|
| Brand color | `#6366f1` (Indigo) |
| Accent | `#7c3aed` (Violet) |
| Font | Plus Jakarta Sans |
| Border radius | 12px (cards), 8px (inputs) |
| Background | `#f8f7ff` |

---

## 🔧 Customization

To change the employee name or data, edit `js/app.js`:
```js
// Change name in greeting
var greetingText = 'Good Morning, YOUR NAME 👋';

// Edit leave balance in buildLeaveBars()
var types = [
  { label: 'Casual Leave', used: 3, total: 12 },
  ...
];
```

To add more employees, edit `js/admin.js`:
```js
var employees = [
  { id: 'WP-1001', name: 'Your Name', dept: 'Engineering', ... },
  // Add more rows here
];
```

---

## 📱 Mobile Support

Fully responsive — works on Android & iOS browsers. Sidebar collapses to a hamburger menu on screens under 640px.

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, Grid, Flexbox
- **Vanilla JS** — Pure DOM manipulation (no jQuery, no frameworks)
- **Google Fonts** — Plus Jakarta Sans
- **GitHub Pages** — Free hosting

---

*Built with ⚡ WorkPulse Design System*
