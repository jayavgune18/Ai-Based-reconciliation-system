# AI-Based Reconciliation System 

An enterprise-grade, production-ready double-entry financial reconciliation application built using the MERN stack with dynamic AI-powered transaction matching, risk controls, and automated reporting.

Designed and optimized to be suitable for Final Year Engineering projects, placement reviews, and technical showcase portfolios.

---

## 🖥️ Live Demo

Check out the live portfolio here: [🔗 View Portfolio](https://ai-based-reconciliation-system-frontend.onrender.com)

---

## 🛠 Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite, Recharts, Lucide Icons, Axios, React Router v6.
- **Backend**: Node.js, Express.js, Socket.IO, Multer, PDFKit, XLSX, CSV-Parser, Fuse.js.
- **Database**: MongoDB & Mongoose (with index optimizations).
- **Authentication**: JWT Authorization, bcrypt password hashing, and role-based route security (Admin/User).

---

## 📁 System Folder Structure

```text
ai-recon-system/
├── backend/
│   ├── config/             # DB connection & Socket server wrappers
│   ├── controllers/        # Express handlers (Auth, Recon, Dashboard, Reports)
│   ├── middlewares/        # JWT Protections, Rate Limiters, File uploads
│   ├── models/             # Mongoose schemas (User, Transaction, Match, AuditLog)
│   ├── routes/             # RESTful API route declarations
│   ├── services/           # Business logic (Reconciliation, Fraud, Exporters)
│   ├── utils/              # Algorithms (Levenshtein, Cosine, Seeder script)
│   ├── server.js           # Server Entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/        # Auth & Dark Theme contexts
    │   ├── layouts/        # Dashboard layout sidebar
    │   ├── pages/          # Login, Dashboard, Workbench, Fraud, Audits
    │   └── App.jsx         # Routes definition
    ├── tailwind.config.js
    └── package.json

```

## 📸 Portfolio Screenshots

### Login
![Login](frontend/public/images/Login.png)

### Dashboard
![ Dashboard ](frontend/public/images/Dashboard.png)

### Reconciliation Workbench
![Reconciliation Workbench](frontend/public/images/ReconciliationWorkbench.png)

### UploadFile
![UploadFile](frontend/public/images/UploadFile.png)

### FraudAlerts
![FraudAlerts](frontend/public/images/FraudAlerts.png)

### Audit Logs
![Audit Logs](frontend/public/images/AuditLogs.png)

---

## 🚀 Key Features

### 1. **Hybrid AI Matching Engine**
- Calculates multi-pass transaction matching:
  1. **Deterministic filter**: Scans matching external Transaction reference IDs and perfect Amount/Date fits.
  2. **Character N-Gram Cosine Similarity**: Measures spelling and word arrangement similarity (e.g. `AMAZONPAY INDIA` ↔ `Amazon Pay`).
  3. **Jaro-Winkler & Levenshtein Distances**: Provides highly accurate string proximity scores.
- Assigns a dynamic **Confidence Score %** and compiles natural-language **AI Explanations** for match validations.

### 2. **Continuous Risk Heuristics (Fraud Detection)**
- **Velocity Spikes**: Flags multiple identical debit transactions occurring within a 1-hour window.
- **Double Debits**: Alarms users if the bank has processed duplicate transfers within a 24-hour timeframe.
- **Statistical Outliers**: Employs standard deviation scoring (Z-Score > 2.5) to isolate extreme anomalous transaction amounts dynamically.

### 3. **Structured Ingestion & Processing**
- Features a dropzone to drag-and-drop CSV or Excel sheets.
- **Dynamic Headers Normalizer**: Auto-detects and aligns mismatching column headers (e.g., matching "UTR No", "Ref ID", or "Transaction No" to the schema's `transactionId`).
- **Invoice OCR extraction**: Mock pipeline demonstrating Tesseract.js text extraction from invoice receipts.

### 4. **Enterprise Audit & Exporters**
- Downloads fully compiled **PDF Reconciliation Reports** containing aggregate statistics, job statuses, and ledger matching pairs.
- Exports tabular **multi-sheet Excel files** for bookkeeping.
- Includes a strict administrative **Audit Log** tracking all user actions.

---

## 🏃 Getting Started & Local Setup

### **Prerequisites**
- Install Node.js (v18 or higher)
- Run a local MongoDB server (`mongodb://localhost:27017`) or configure a MongoDB Atlas connection string.

### **Step 1: Set up the Backend**
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Configure your environment variables. The `.env` file is pre-configured for local setups out of the box:
   ```ini
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/ai-recon-db
   JWT_SECRET=supersecretkeychangeinproduction123!@#
   NODE_ENV=development
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

## 🔑 Default Accounts (Pre-Seeded)

- **System Administrator (Full access to Audit Logs & Fraud Center)**:
  - **Email**: `admin@recon.com`
  - **Password**: `admin123`
- **Reconciliation Officer (Standard upload and review actions)**:
  - **Email**: `user@recon.com`
  - **Password**: `user123`

---

## 🔒 Security Architecture

1. **Authentication**: JWT token signatures with short TTL, mapped directly to secure Axios request headers.
2. **API Rate Limiter**: Limits uploads to 20 sheets per 5 minutes per IP to prevent storage flooding.
3. **Data Sanitization**: Mongoose schema compilations and parameter sanitization to neutralize NoSQL injections.
4. **Header Hardening**: Leverages `Helmet` to obscure internal Express fingerprints.

---

## 📬 Contact

Feel free to reach out to me:

- [LinkedIn](https://www.linkedin.com/in/jay-avgune-1316b323a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app)
- [Instagram](https://www.instagram.com/jay.avgune?igsh=ejF2YW44bXNrZ3Ry)