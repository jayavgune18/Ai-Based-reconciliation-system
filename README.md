# AI-Based Reconciliation System 

An enterprise-grade, production-ready double-entry financial reconciliation application built using the MERN stack with dynamic AI-powered transaction matching, Razorpay payment gateway reconciliation, subscription billing management, risk controls, and automated reporting.

Designed and optimized to be suitable for Final Year Engineering projects, placement reviews, and technical showcase portfolios.

---

## 📚 Table of Contents

- [Live Demo](#️-live-demo)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-system-folder-structure)
- [Screenshot Overview](#-screenshots)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Environment Setup](#prerequisites)
  - [Server Setup](#step-1-set-up-the-backend)
  - [Client Setup](#step-2-set-up-the-frontend)
- [Security Architecture](#-security-architecture)
- [Contact](#-contact)

---

## 🛰️ Live Demo

Check out the live portfolio here: [🔗 View Portfolio](https://ai-based-reconciliation-system-frontend.onrender.com)

---

## 🛠 Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite, Recharts, Lucide Icons, Axios, React Router v6.
- **Backend**: Node.js, Express.js, Socket.IO, Multer, PDFKit, XLSX, CSV-Parser, Fuse.js.
- **Database**: MongoDB & Mongoose (with index optimizations).
- **Authentication**: JWT Authorization, bcrypt password hashing, and role-based route security (Admin/User).
- **Payments**: Razorpay Payment Gateway (Orders, Webhooks, Subscriptions, Invoice generation).

---

## 📁 System Folder Structure

```text
ai-recon-system/
├── backend/
│   ├── config/             # DB connection, Socket wrappers, Razorpay client, Subscription plans
│   ├── controllers/        # Express handlers (Auth, Recon, Dashboard, Reports, Payment, Subscription)
│   ├── middlewares/        # JWT Protections, Rate Limiters, File uploads, Usage Limit enforcement
│   ├── models/             # Mongoose schemas (User, Transaction, Match, AuditLog, Payment, Subscription, Invoice)
│   ├── routes/             # RESTful API route declarations
│   ├── services/           # Business logic (Reconciliation, Fraud, Exporters, Payment Recon, Invoice Generator, Subscription)
│   ├── utils/              # Algorithms (Levenshtein, Cosine, Seeder script)
│   ├── server.js           # Server Entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/        # Auth & Dark Theme contexts
    │   ├── layouts/        # Dashboard layout sidebar
    │   ├── pages/          # Login, Dashboard, Workbench, Fraud, Audits, Gateway Recon, Subscriptions & Plans
    │   ├── services/       # API service modules (payment, subscription)
    │   └── App.jsx         # Routes definition
    ├── tailwind.config.js
    └── package.json

```

---

## 📸 Screenshots

### 🔐 Authentication
| Login | Register |
|:----:|:----:|
| ![Login](frontend/public/images/Login.png) | ![Register](frontend/public/images/Register.png) |

### 📊 Dashboard & Workbench
| Dashboard |
|:----:|
| ![Dashboard](frontend/public/images/Dashboard.png) |

### 📁 File Upload
| Upload Interface | Reconciliation Workbench |
|:----:|:----:|
| ![UploadFile](frontend/public/images/UploadFile.png) | ![Reconciliation Workbench](frontend/public/images/ReconciliationWorkbench.png) |

### 💳 Gateway Reconciliation & Subscriptions
| Gateway Recon Dashboard | Subscription Plans | Subscription Billing |
|:----:|:----:|:----:|
| ![Gateway Recon](frontend/public/images/GatewayRecon.png) | ![Subscription Plans](frontend/public/images/SubscriptionPlans.png) | ![Subscription Billing](frontend/public/images/SubscriptionBilling.png) |

### 🚨 Fraud Detection & Audit
| Fraud Alerts | Audit Logs |
|:----:|:----:|
| ![FraudAlerts](frontend/public/images/FraudAlerts.png) | ![Audit Logs](frontend/public/images/AuditLogs.png) |

### ⚙️ Settings Pages
| Profile Settings | Storage Overview | Password Change |
|:----:|:----:|:----:|
| ![SettingsProfile](frontend/public/images/SettingsProfile.png) | ![SettingsStorage](frontend/public/images/SettingsStorage.png) | ![SettingsPassword](frontend/public/images/SettingsPassword.png) |

| Devices & Sessions | Account Options |
|:----:|:----:|
| ![SettingsDevicesAndSessions](frontend/public/images/SettingsDevicesAndSessions.png) | ![SettingsAccountOptions](frontend/public/images/SettingsAccountOptions.png) |

---

## 🚀 Key Features

### 1. **Hybrid AI Matching Engine**
- Calculates multi-pass transaction matching:
  1. **Deterministic filter**: Scans matching external Transaction reference IDs and perfect Amount/Date fits.
  2. **Character N-Gram Cosine Similarity**: Measures spelling and word arrangement similarity (e.g. `AMAZONPAY INDIA` ↔ `Amazon Pay`).
  3. **Jaro-Winkler & Levenshtein Distances**: Provides highly accurate string proximity scores.
- Assigns a dynamic **Confidence Score %** and compiles natural-language **AI Explanations** for match validations.

### 2. **Razorpay Gateway Reconciliation**
- Real-time reconciliation comparing **Razorpay gateway settlements** against company internal ledgers.
- Automatically flags **amount discrepancies**, **duplicate charges**, and **orphan gateway entries**.
- Tabular view with per-row classification: Matched, Amount Mismatch, Duplicates, Orphan Gateway, and Missing Payment.
- Live Audit Sync with exportable **PDF** and **Excel** reconciliation reports.

### 3. **Subscription Billing & Plan Management**
- Four-tier subscription model: **Free Starter**, **Starter Plan (₹999/mo)**, **Professional Plan (₹2,999/mo)**, and **Enterprise Sync (₹7,999/mo)**.
- Live **monthly usage quotas** with real-time progress bars for Reconciliation Jobs, Transaction Volume, and AI Fuzzy Matching Checks.
- Integrated **Razorpay checkout** for plan upgrades and downgrades with webhook-driven status updates.
- **Billing History** view with downloadable tax invoices and auto-generated PDF receipts.
- Usage Limit Middleware enforces plan quotas per API route, returning quota-exceeded errors when limits are reached.

### 4. **Continuous Risk Heuristics (Fraud Detection)**
- **Velocity Spikes**: Flags multiple identical debit transactions occurring within a 1-hour window.
- **Double Debits**: Alarms users if the bank has processed duplicate transfers within a 24-hour timeframe.
- **Statistical Outliers**: Employs standard deviation scoring (Z-Score > 2.5) to isolate extreme anomalous transaction amounts dynamically.

### 5. **Structured Ingestion & Processing**
- Features a dropzone to drag-and-drop CSV or Excel sheets.
- **Dynamic Headers Normalizer**: Auto-detects and aligns mismatching column headers (e.g., matching "UTR No", "Ref ID", or "Transaction No" to the schema's `transactionId`).
- **Invoice OCR extraction**: Mock pipeline demonstrating Tesseract.js text extraction from invoice receipts.

### 6. **Sharing & Permissions**
- **Share** reconciliation files via email (registered users) or direct link (guest users).
- **Role-based access**: Assign **Viewer** (read-only) or **Editor** (modify/re-run) permissions.
- **Dashboard** with *Shared by Me* and *Shared with Me* views + real-time permission updates.
- **Activity logs** track share events; **access revocation** is instant.

### 7. **Enterprise Audit & Exporters**
- Export **PDF Reconciliation Reports** with job summaries and match pairs.
- Generate **multi-sheet Excel** files for bookkeeping.
- Full **Audit Log** tracking all user actions.

---

## 🏃 Getting Started & Local Setup

### **Prerequisites**
- Install Node.js (v18 or higher)
- Run a local MongoDB server (`mongodb://localhost:27017`) or configure a MongoDB Atlas connection string.
- Create a [Razorpay](https://razorpay.com) account and generate Test API keys.

### **Step 1: Set up the Backend**
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Configure your environment variables (copy from `.env.example`):
   ```ini
   PORT=
   MONGO_URI=
   JWT_SECRET=
   NODE_ENV=

   # Razorpay Payment Gateway
   RAZORPAY_KEY_ID=rzp_test_YourTestKeyIdHere
   RAZORPAY_KEY_SECRET=YourTestKeySecretHere
   RAZORPAY_WEBHOOK_SECRET=YourRazorpayWebhookSecretHere
   ```
3. Run the DB Seeder to populate initial data, default accounts, and graphs:
   ```bash
   npm run seed
   ```
4. Start the development API server:
   ```bash
   npm run dev
   ```

### **Step 2: Set up the Frontend**
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Start the Vite React client:
   ```bash
   npm run dev
   ```
3. Access the portal at: `http://localhost:3000/`

---

## 🔒 Security Architecture

1. **Authentication**: JWT token signatures with short TTL, mapped directly to secure Axios request headers.
2. **API Rate Limiter**: Limits uploads to 20 sheets per 5 minutes per IP to prevent storage flooding.
3. **Usage Limit Middleware**: Enforces per-plan quotas (reconciliation jobs, transaction volume) at the route level before processing begins.
4. **Data Sanitization**: Mongoose schema compilations and parameter sanitization to neutralize NoSQL injections.
5. **Header Hardening**: Leverages `Helmet` to obscure internal Express fingerprints.
6. **Share Link Tokens**: Unique, expirable tokens for guest share links with optional passphrase protection.
7. **Razorpay Webhook Verification**: HMAC-SHA256 signature validation on all incoming payment webhooks to prevent forged events.

---

## 📬 Contact

Feel free to reach out to me:

- [LinkedIn](https://www.linkedin.com/in/jay-avgune-1316b323a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app)