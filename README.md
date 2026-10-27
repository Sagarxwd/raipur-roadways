# Raipur Roadways: Consignment Note Application

React + Node.js (Express) + MongoDB. One service serves both the API and the website.

## 1. Run on your computer
1. Create a free MongoDB Atlas cluster and copy its connection string.
2. `cp backend/.env.example backend/.env` and fill in the values (connection string, JWT_SECRET, the two passwords, START_LR).
3. `npm run install:all`
4. `npm run seed` creates the Administrator and Operator logins.
5. Import your party list: `npm --prefix backend run import -- /path/to/PARTY.xlsx`
6. In two terminals: `npm run dev:backend` and `npm run dev:frontend`, then open http://localhost:5173

## 2. Put it online (Render, Railway or any Node host)
- Build command: `npm run install:all && npm run build`
- Start command: `npm start`
- Environment variables: MONGODB_URI, JWT_SECRET, START_LR (and the passwords only for the one-time seed)
- After the first deploy run `npm run seed` once (Render: Shell tab).
- In Atlas, allow the host's IP (or 0.0.0.0/0) under Network Access.

## 3. Images and data you must add
| What | Where | Notes |
|---|---|---|
| Company logo | `frontend/public/logo.png` | Transparent PNG, about 400 x 130 px. Printed on every note. If missing, a built-in RR mark is used. |
| Browser tab icon | `frontend/public/favicon.png` | 512 x 512 px square PNG. |
| Party list | `PARTY.xlsx` (sheet "PARTY": PARTY NAME, ADDRESS, GSTIN) | Import with the command in step 1. |
| Company details | Sign in as Administrator > **Print Template** | Confirm company name, PAN, mobile numbers, email, address, bank details. |
| Starting note number | `START_LR` in `.env` | Set to your next number. Used only until the first note is saved. |
| Passwords | `ADMIN_PASSWORD`, `OPERATOR_PASSWORD` | Run `npm run seed` again to change them. |

## 4. How it behaves
- **Administrator:** everything, including Print Template, deleting notes and the 6-month clean-up.
- **Operator:** create notes, Reports, Party Master. No Print Template, no delete, no side preview. Sees a preview before every download.
- **Saving:** identical details (including date and note no.) are never stored twice; the Reports page shows "Saved x2". Any change creates a new record with the next note number.
- Every new note also stores its PDF, so it can be downloaded again from Reports.
- Note numbers are never reused, even after old records are deleted.
- E-way bill numbers are typed in manually (generating them needs a paid GST portal API).
- Email opens a draft in the mail app. Browsers cannot attach files to a draft automatically, so download the PDF and attach it.
