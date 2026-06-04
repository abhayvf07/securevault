# SecureVault — File Storage & Sharing Platform

A full-stack file storage and sharing app I built using the MERN stack, inspired by Google Drive. Users can upload, manage and share files securely. I focused a lot on getting the auth, file handling and backend structure right — not just making something that runs, but something that's actually built properly.

---

## Preview

### Dashboard
Overview of your files, folders and recent activity.
<img width="1920" height="923" alt="Dashboard" src="Screenshots/Dashboard.png" />

---

### File Sharing
Share files using unique secure links — with optional password and expiry.
<img width="1920" height="923" alt="Share" src="Screenshots/Share.png" />

---

### Activity Tracking
See everything that happened — uploads, deletes, shares, logins.
<img width="1920" height="923" alt="Activity" src="Screenshots/Activity.png" />

---

## Why I Built This

I wanted to build something that actually feels like a real-world project. Most beginner projects are just basic CRUD apps and I wanted to go beyond that. File storage seemed like a great challenge because there's so much to think about — how do you handle auth properly? How do you make sharing safe? How do you structure the backend so it doesn't become a nightmare to maintain?

Building this taught me a lot about JWT refresh token rotation, secure cookie handling, file validation, modular backend design and more. I'm genuinely proud of how this turned out.

---

## Features

### Authentication & Security
- JWT-based auth with access + refresh tokens
- Protected API routes
- Input validation using Zod
- Environment variable protection

### File Management
- Upload files with proper validation
- Organize into folders
- Download and delete files
- File metadata handling

### File Sharing
- Share files via unique generated links
- Optional password protection on links
- Set expiry on share links
- Tracks how many times a file was downloaded
- When using Cloudinary, downloads stream securely from the cloud

### Activity Tracking
- Logs every user action — upload, delete, share, login
- Backend logging system

### Performance & Scalability
- Pagination on file listings
- Optimized database queries
- Modular backend so adding new features doesn't break existing ones

---

## Tech Stack

**Frontend**
- React 19 + Vite
- Tailwind CSS
- Axios
- React Router DOM

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (access + refresh token auth)
- bcryptjs
- Multer
- Zod
- Cloudinary (optional)
- Helmet
- express-rate-limit
- cookie-parser
- uuid, cors, dotenv

---

## How I Structured It

The backend is service-oriented — routes handle HTTP, controllers handle request/response, and services have the actual business logic. Storage is abstracted into its own layer which means switching between local and Cloudinary is just an env variable change, no code change needed.

**Storage options:**
- **Local** — files go to the `uploads/` folder on the server, good for dev and cheap hosting
- **Cloudinary** — just add credentials in `.env` and it switches automatically

The frontend also has a clean structure — pages, reusable components, hooks/context and API clients are all kept separate.

### API Endpoints

| Method | Route | What it does |
|--------|-------|--------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get logged in user |
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files` | List all files |
| DELETE | `/api/files/:id` | Delete a file |
| PUT | `/api/files/:id/rename` | Rename a file |
| GET | `/api/files/download/:id` | Download a file |
| POST | `/api/share/:fileId` | Create a share link |
| GET | `/api/share/:token/info` | Get share link info |
| POST | `/api/share/:token/download` | Download via share link |
| GET | `/api/activity` | Get activity log |
| GET | `/api/activity/analytics` | Get analytics |

I'll add a proper Postman collection soon — it's on my to-do list.

---

## Project Structure

```
SecureVault/
│
├── client/                # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   └── dist/              (ignored)
│
├── server/                # Backend (Node + Express)
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── uploads/           (ignored)
│   └── __tests__/
│
└── README.md
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/abhayvf07/securevault.git
cd securevault
```

### 2. Setup the backend

```bash
cd server
npm install
```

Create a `.env` file (you can copy `.env.example` and fill in the values):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/securevault
JWT_SECRET=generate_random_secret_here
JWT_REFRESH_SECRET=generate_another_random_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
CLIENT_URL=http://localhost:5173

# leave blank if you want to use local storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

You can generate secure JWT secrets like this:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the backend:
```bash
npm run dev
```

It'll run on `http://localhost:5000`. If that port is busy it'll automatically try the next one.

---

### 3. Setup the frontend

```bash
cd client
npm install
```

Optionally create a `.env` file (defaults to `http://localhost:5000/api` if you skip this):
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

### 4. Running Tests (optional)

```bash
cd server
npm test
```

This runs the Jest tests I wrote for the auth endpoints.

---

## Security — what I implemented and why

This was honestly the most fun part to work on. Security is usually treated as an afterthought in student projects so I made it a priority here.

**Auth & Authorization**
- Access token lives in memory only — not localStorage, so XSS can't steal it
- Refresh token stored in httpOnly cookie — JavaScript can't access it at all
- Token rotation on every refresh, old tokens are invalidated
- Every file operation checks ownership — can't access someone else's file by guessing an ID (IDOR protection)
- Invalid or expired tokens automatically log the user out

**File Security**
- Magic byte validation — I check the actual file content, not just the extension (so you can't rename a `.exe` to `.jpg` and sneak it through)
- Dangerous extensions are blocked — `.exe`, `.bat`, `.sh`, `.dll` etc.
- Files get a UUID name on disk — original filename never touches storage
- Path traversal protection — uploads can't escape their directory
- File size limit — 5MB by default, configurable in env

**API Security**
- Rate limiting — 100 req/15min general, 5 req/15min on auth routes, 10 req/min on uploads
- Zod validates all user input before it reaches business logic
- Helmet sets security headers automatically
- CORS is locked to the configured `CLIENT_URL` only

**Passwords**
- Strong password policy enforced at signup
- Share link passwords are bcrypt hashed with 12 salt rounds — never stored as plain text

---

## Deployment

**Frontend** → Vercel or Netlify. Just run `npm run build` and deploy the `dist/` folder.

**Backend** → Render or Railway. Set all env variables in the dashboard before deploying.

Things to do before going to production:
1. Generate new JWT secrets — never reuse dev ones in production
2. Set `NODE_ENV=production`
3. Set up MongoDB with a replica set (needed for transactions)
4. Enable HTTPS and set `secure: true` on cookies
5. Update `CLIENT_URL` to your real frontend URL
6. Set up proper logging and monitoring

---

## What I Want to Add Next

- Actually deploy the whole thing (frontend + backend)
- Add AWS S3 as another storage option
- Write more tests — currently only auth is covered, want to cover files, sharing and activity too
- File move between folders
- Real-time notifications for shared files
- Postman collection / Swagger docs

---

## Testing

I wrote a basic Jest test suite for auth endpoints to start. The structure is clean so extending it to other routes is easy.

```bash
cd server
npm test
```

---

## Contributing

Feel free to fork and open a PR if you want to add something or fix a bug. If it's a bigger change, open an issue first so we can talk about it.

---

## Contact

GitHub: [https://github.com/abhayvf07](https://github.com/abhayvf07)

If you liked this project, a star on GitHub would mean a lot to me — it keeps me motivated to keep building!