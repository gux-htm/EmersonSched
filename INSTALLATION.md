# 🚀 EmersonSched - Detailed Installation Guide

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **MySQL 8+** (XAMPP recommended for Windows)
- [ ] **npm** (comes with Node.js)
- [ ] A code editor (VS Code recommended)
- [ ] A terminal/command prompt

## Step-by-Step Installation

### 1️⃣ Install Node.js

**Windows/Mac:**
1. Visit https://nodejs.org/
2. Download the LTS version
3. Run the installer
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 2️⃣ Install MySQL (Using XAMPP)

**Windows:**
1. Download XAMPP from https://www.apachefriends.org/
2. Install XAMPP
3. Open XAMPP Control Panel
4. Start **Apache** and **MySQL** modules
5. Click **Admin** next to MySQL to open phpMyAdmin

**Mac:**
1. Download XAMPP for Mac
2. Install and run XAMPP
3. Start MySQL from XAMPP Manager
4. Access phpMyAdmin at http://localhost/phpmyadmin

**Linux:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 3️⃣ Create Database

**Option A: Using phpMyAdmin**
1. Open http://localhost/phpmyadmin
2. Click "New" in left sidebar
3. Database name: `university_timetable`
4. Click "Create"
5. Click "Import" tab
6. Choose file: `/workspace/database/schema.sql`
7. Click "Go"

**Option B: Using MySQL Command Line**
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE university_timetable;

# Exit MySQL
exit;

# Import schema
mysql -u root -p university_timetable < database/schema.sql
```

### 4️⃣ Configure Project

**1. Navigate to project directory:**
```bash
cd /workspace
```

**2. Create environment file:**
```bash
cp .env.example .env
```

**3. Edit .env file:**

Open `.env` in your text editor and configure:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=                    # Leave empty if no password
DB_NAME=university_timetable

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your_unique_super_secret_key_here

# Server Configuration
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Important:** Change `JWT_SECRET` to a random string!

### 5️⃣ Install Dependencies

**Option A: Install all at once (Recommended)**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

**Option B: Install separately**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 6️⃣ Start the Application

**Option A: Run both together (Recommended)**
```bash
npm run dev
```

**Option B: Run separately in two terminals**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 7️⃣ Verify Installation

1. **Backend Health Check:**
   - Open browser: http://localhost:5000/api/health
   - Should see: `{"status":"ok","message":"EmersonSched API is running"}`

2. **Frontend:**
   - Open browser: http://localhost:3000
   - Should see: Login/Registration page

## First Time Setup

### 🎯 Create First Admin Account

1. Go to http://localhost:3000/register
2. Fill in the form:
   - **Name:** Admin User
   - **Email:** admin@university.edu
   - **Password:** (choose a strong password)
   - **Role:** Admin (auto-selected)
   - **Department:** Administration
3. Click **Register**
4. You'll be auto-approved and logged in!

### ⚙️ Configure University Settings

1. Click **Settings** in sidebar
2. Set **University Timings:**
   - Opening Time: 08:00
   - Closing Time: 17:00
   - Break Duration: 60 (minutes)
   - Slot Length: 60 or 90 (minutes)
   - Working Days: Mon-Fri
3. Click **Save**

### 📚 Add Academic Data

**1. Create Programs:**
- Dashboard → Programs → Add Program
- Example: BS Computer Science, 8 semesters, Morning shift

**2. Create Majors:**
- Programs → Add Major
- Example: Artificial Intelligence

**3. Create Courses:**
- Courses → Add Course
- Example: Data Structures (CS201, 3+1 credit hours, Semester 3)

**4. Create Sections:**
- Courses → Add Section
- Example: Section A, 50 students, Morning shift

**5. Create Rooms:**
- Rooms → Add Room
- Example: Room 101, Lecture, 60 capacity

## Common Issues & Solutions

### ❌ Database Connection Failed

**Error:** `Database connection failed`

**Solution:**
1. Make sure MySQL is running (check XAMPP)
2. Verify database exists:
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```
3. Check `.env` credentials match MySQL
4. Restart MySQL service

### ❌ Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### ❌ Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### ❌ JWT Secret Not Set

**Error:** `JWT secret is not defined`

**Solution:**
1. Check `.env` file exists in root
2. Verify `JWT_SECRET` is set
3. Restart backend server

### ❌ CORS Error

**Error:** `Access-Control-Allow-Origin error`

**Solution:**
1. Make sure backend is running on port 5000
2. Check `NEXT_PUBLIC_API_URL` in `.env`
3. Clear browser cache

## Verification Checklist

After installation, verify:

- [ ] Backend runs on http://localhost:5000
- [ ] Frontend runs on http://localhost:3000
- [ ] Database `university_timetable` exists
- [ ] All tables created (check phpMyAdmin)
- [ ] Can register first admin
- [ ] Can login successfully
- [ ] Admin dashboard loads
- [ ] Can create programs/courses/rooms

## Next Steps

1. **Create more users:**
   - Register instructors and students
   - Approve them from Admin → Approvals

2. **Setup academic structure:**
   - Add all programs, majors, courses, sections

3. **Generate timetable:**
   - Create course requests
   - Instructors accept courses
   - Generate timetable

4. **Schedule exams:**
   - Go to Exams → Generate Schedule

## Need Help?

If you encounter issues:

1. Check error messages in terminal
2. Check browser console (F12)
3. Verify all steps completed
4. Restart services
5. Check firewall settings

## Production Deployment

For production deployment:

1. **Change JWT_SECRET** to a strong random string
2. **Set secure database password**
3. **Use environment variables** for sensitive data
4. **Enable HTTPS**
5. **Set proper CORS origins**
6. **Use production database**

---

**✅ Installation Complete!**

You're now ready to use EmersonSched. Visit http://localhost:3000 to get started!
