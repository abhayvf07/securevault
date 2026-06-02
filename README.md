# 🚀 SecureVault — File Storage & Sharing Platform

🔐 A full-stack secure file storage system inspired by Google Drive, built using the MERN stack.
It allows users to upload, manage, and share files securely with authentication, activity tracking, and scalable backend architecture.

---

## 📸 Preview

### 🏠 Dashboard

Overview of files, folders, and user activity.
<img width="1920" height="923" alt="Dashborad" src="Screenshots/Dashboard.png" />

---

### 🔗 File Sharing

Share files using secure links with optional protection.
<img width="1920" height="923" alt="Share" src="Screenshots/Share.png" />

---

### 📊 Activity Tracking

Track user actions like uploads, deletes, and shares.
<img width="1920" height="923" alt="Home Page" src="Screenshots/Activity.png" />

---

## 🎯 Why This Project Matters

This project demonstrates:

* Secure authentication system (JWT-based)
* Scalable backend design (modular architecture)
* File handling & storage logic
* Real-world features like sharing, tracking, and validation
* Clean frontend integration with API
* Refresh token rotation and secure cookie handling

💡 Built with focus on **backend engineering, security, and scalability**

---

## 📌 Features

### 🔐 Authentication & Security

* JWT-based authentication
* Protected API routes
* Environment variable protection
* Input validation (Zod)

### 📁 File Management

* Upload files with validation
* Folder-based organization
* Download & delete files
* File metadata handling

### 🔗 File Sharing

* Share files via unique links
* Password-protected access
* Expiry-based links
* Download tracking

### 📊 Activity Tracking

* Logs user actions (upload, delete, share, login)
* Backend logging system

### ⚡ Performance & Scalability

* Pagination support
* Optimized database queries
* Modular backend architecture

---

## 🏗 Tech Stack

### Frontend

* React 19 + Vite
* Tailwind CSS
* Axios
* React Router DOM

### Backend

* Node.js
* Express.js
* MongoDB / Mongoose
* JWT access + refresh token auth
* bcryptjs
* Multer
* Zod
* Cloudinary (optional)
* Helmet
* express-rate-limit
* cookie-parser

### Additional Libraries

* uuid
* cors
* dotenv

---

## 📂 Project Structure

```id="struct01"
SecureVault/
│
├── client/                # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   └── dist/ (ignored)
│
├── server/                # Backend (Node + Express)
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── uploads/ (ignored)
│   └── __tests__/
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash id="clone01"
git clone https://github.com/your-abhayvf07/securevault.git
cd securevault
```

---

### 2️⃣ Setup Backend

```bash id="backend01"
cd server
npm install
```

Create `.env` file (copy from `.env.example` and fill in your values):

```id="env01"
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/securevault
JWT_SECRET=generate_random_secret_here
JWT_REFRESH_SECRET=generate_another_random_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

To generate secure random JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run backend:

```bash id="backend02"
npm run dev
```

The backend will be available at `http://localhost:5000`

---

### 3️⃣ Setup Frontend

```bash id="frontend01"
cd client
npm install
```

Create `.env` file (optional — defaults to `http://localhost:5000/api`):

```id="env02"
VITE_API_URL=http://localhost:5000/api
```

Run frontend:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

### 4️⃣ Running Tests (Optional)

```bash id="tests01"
cd server
npm test
```

This runs Jest tests for authentication endpoints.

---

## 🚀 Deployment

* **Frontend**: Vercel / Netlify (run `npm run build` to create optimized build)
* **Backend**: Render / Railway (ensure all environment variables are set in production)

### Important: Production Setup
Before deploying to production:
1. Generate new JWT secrets (never reuse development secrets)
2. Set `NODE_ENV=production`
3. Configure MongoDB for production replica set (for transactions)
4. Enable HTTPS and set `secure: true` for cookies
5. Update `CLIENT_URL` to your production frontend URL
6. Set up proper logging and monitoring

---

## 🔒 Security Features

### Authentication & Authorization
* **JWT Access Token** (15 min) + **Refresh Token** (7 days) rotation
* **httpOnly Cookies** for secure refresh token storage (prevents XSS)
* **Access token in memory only** (not in localStorage) for XSS protection
* **Ownership verification** on all file operations (prevents IDOR)

### File Security
* **Path traversal protection** — uploaded files cannot access parent directories
* **Magic byte validation** — actual file content is verified, not just MIME type
* **Dangerous extension blocklist** — .exe, .bat, .sh, .dll, etc. rejected
* **UUID filename generation** — prevents filename-based attacks
* **File size limits** — configurable max file size (default 5MB)

### API Security
* **Rate limiting** — 100 req/15min general, 5 req/15min auth, 10 req/1min uploads
* **Zod schema validation** — all user inputs validated server-side
* **Helmet security headers** — prevents common web vulnerabilities
* **CORS configured** — frontend can only communicate from trusted origin
* **bcryptjs hashing** — passwords hashed with 12 salt rounds

### Password Security
* **Strong password policy** enforced at registration (uppercase, lowercase, numbers, special chars)
* **Shared link passwords** hashed with bcryptjs (not stored in plain text)
* **Session-based auth** — invalid tokens automatically logged out

---

## 📊 Future Improvements

* Deploy frontend and backend to production
* Add AWS S3 support alongside Cloudinary
* Expand test coverage across backend APIs
* Implement file move between folders
* Add user collaboration and real-time sharing updates

---

## 🧪 Testing

* Basic API test structure included
* Easily extendable for full test coverage

## 🤝 Contributing

Contributions are welcome! Feel free to fork and submit a pull request.

---

## 📧 Contact

GitHub: https://github.com/abhayvf07

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
