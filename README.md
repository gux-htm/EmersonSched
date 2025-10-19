# 🎓 EmersonSched - University Timetable Management System

A comprehensive, intelligent university timetable management system built with **Next.js**, **Express.js**, and **MySQL**. EmersonSched automates scheduling, resource allocation, instructor workload management, and exam scheduling using Block Theory.

## 🌟 Features

### Core Functionality
- ✅ **Intelligent Timetable Generation** using Block Theory algorithm
- ✅ **Role-Based Access Control** (Admin, Instructor, Student)
- ✅ **First Admin Auto-Registration** system
- ✅ **Instructor-Led Course Acceptance** workflow
- ✅ **Real-Time Conflict Detection** and validation
- ✅ **Exam Scheduling** with Match & Shuffle modes
- ✅ **Rescheduling Capabilities** with undo functionality
- ✅ **Reset & Regeneration Modules** with audit trails
- ✅ **Responsive UI** with animations (Tailwind CSS + Framer Motion)

### Admin Panel
- Manage programs, majors, courses, sections, and rooms
- Configure university timings and time slots
- Generate course requests and timetables
- Approve/reject user registrations
- Schedule exams (midterm, final, supplementary)
- Reset and regeneration options
- Dashboard with comprehensive statistics

### Instructor Panel
- View and accept course requests
- Set availability preferences (days & time slots)
- View personal timetable
- Reschedule classes (with conflict detection)
- Undo course acceptance (10-second window)

### Student Panel
- View personal timetable
- View exam schedule
- Receive notifications for updates

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **RESTful API** architecture

### Frontend
- **Next.js 14** (React framework)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Axios** for API calls
- **React Context** for state management

## 📋 Prerequisites

Before installation, ensure you have:

- **Node.js 18+** installed
- **MySQL 8+** (via XAMPP or standalone)
- **npm** or **yarn** package manager
- Web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Installation Guide

### Step 1: Clone or Download

```bash
cd /workspace
```

### Step 2: Database Setup

1. **Start MySQL** (via XAMPP or MySQL service)
   ```bash
   # If using XAMPP, start Apache & MySQL from control panel
   ```

2. **Create Database**
   ```bash
   mysql -u root -p
   ```
   
   Then in MySQL:
   ```sql
   CREATE DATABASE university_timetable;
   exit;
   ```

3. **Import Schema**
   ```bash
   mysql -u root -p university_timetable < database/schema.sql
   ```

### Step 3: Configure Environment

1. **Create `.env` file** in the root directory:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your configuration:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_mysql_password
   DB_NAME=university_timetable

   # JWT Secret (change this!)
   JWT_SECRET=your_super_secret_jwt_key_here

   # Server
   PORT=5000

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

### Step 4: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Step 5: Start the Application

#### Option 1: Run Both Together (Recommended)
```bash
npm run dev
```

#### Option 2: Run Separately

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

### Step 6: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## 👤 First Admin Registration

1. Navigate to http://localhost:3000/register
2. The system will detect this is the **first admin registration**
3. Fill in the form:
   - Name: Your Name
   - Email: admin@university.edu
   - Password: (your secure password)
   - Department: Administration
4. Click **Register**
5. You'll be **auto-approved** and redirected to the admin dashboard

## 📖 Usage Guide

### Admin Workflow

1. **Register First Admin** (auto-approved)
2. **Set University Timings** (Settings → University Timings)
   - Opening time, closing time
   - Break duration, slot length
   - Working days
3. **Create Academic Structure:**
   - Programs (BS, MS, PhD, etc.)
   - Majors (CS, AI, SE, etc.)
   - Courses with credit hours (3+1, 2+0, etc.)
   - Sections (A, B, C, etc.)
   - Rooms (lecture halls, labs)
4. **Approve Users** (Approvals tab)
5. **Generate Course Requests** (Timetable → Generate Requests)
6. **Wait for Instructors** to accept courses
7. **Generate Timetable** (Timetable → Generate)
8. **Schedule Exams** (Exams → Generate Schedule)

### Instructor Workflow

1. **Register** (awaits admin approval)
2. **Login** after approval
3. **View Course Requests** (Requests tab)
4. **Select Course** and set preferences:
   - Choose preferred days
   - Choose preferred time slots
5. **Accept Course** (10-second undo window)
6. **View Timetable** (My Timetable)
7. **Reschedule Classes** if needed

### Student Workflow

1. **Register** with program/section details
2. **Login** after approval
3. **View Timetable** for your section
4. **View Exam Schedule**
5. **Receive Notifications** for changes

## 🗂️ Project Structure

```
/workspace/
├── backend/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   ├── adminController.js  # Admin operations
│   │   ├── timetableController.js
│   │   ├── timingController.js
│   │   └── examController.js
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── timetable.js
│   │   ├── timing.js
│   │   └── exam.js
│   ├── utils/
│   │   └── helpers.js          # Utility functions
│   ├── server.js               # Express server
│   └── package.json
├── frontend/
│   ├── components/
│   │   └── Layout.tsx          # Main layout wrapper
│   ├── context/
│   │   └── AuthContext.tsx     # Auth state management
│   ├── lib/
│   │   └── api.ts              # API client
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── admin/              # Admin pages
│   │   ├── instructor/         # Instructor pages
│   │   └── student/            # Student pages
│   ├── styles/
│   │   └── globals.css         # Global styles
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── database/
│   └── schema.sql              # Database schema
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🎨 UI Design

### Color Palette
- **Primary:** `#A855F7` (Purple)
- **Secondary:** `#F3F4F6` (Gray)
- **Success:** `#10B981` (Green)
- **Error:** `#EF4444` (Red)

### Features
- Gradient backgrounds
- Smooth animations (Framer Motion)
- Responsive grid layouts
- Card-based design
- Interactive buttons with hover effects
- Toast notifications
- Loading spinners

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/check-first-admin` - Check if first admin exists
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/pending-registrations` - Get pending users (admin)
- `POST /api/auth/update-registration-status` - Approve/reject user (admin)

### Admin
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `POST /api/admin/programs` - Create program
- `GET /api/admin/programs` - Get all programs
- `POST /api/admin/majors` - Create major
- `GET /api/admin/majors` - Get majors
- `POST /api/admin/courses` - Create course
- `GET /api/admin/courses` - Get courses
- `POST /api/admin/sections` - Create section
- `GET /api/admin/sections` - Get sections
- `POST /api/admin/rooms` - Create room
- `GET /api/admin/rooms` - Get rooms
- `GET /api/admin/instructors` - Get instructors

### Timetable
- `POST /api/timetable/generate-requests` - Generate course requests
- `GET /api/timetable/requests` - Get course requests
- `POST /api/timetable/accept-request` - Accept course (instructor)
- `POST /api/timetable/undo-acceptance` - Undo acceptance (instructor)
- `POST /api/timetable/generate` - Generate timetable (admin)
- `GET /api/timetable` - Get timetable
- `POST /api/timetable/reschedule` - Reschedule class (instructor)
- `POST /api/timetable/reset` - Reset timetable (admin)

### Exams
- `POST /api/exam/create` - Create exam
- `POST /api/exam/generate-schedule` - Generate exam schedule
- `GET /api/exam` - Get exams
- `POST /api/exam/reset` - Reset exams

## 🧪 Testing

### Test First Admin Registration
1. Visit http://localhost:3000/register
2. Register as admin (auto-approved)
3. Login and access admin dashboard

### Test Instructor Flow
1. Register as instructor
2. Admin approves registration
3. Login and view course requests
4. Accept a course with preferences
5. View your timetable

### Test Timetable Generation
1. Admin creates programs, courses, sections, rooms
2. Admin generates course requests
3. Instructors accept courses
4. Admin generates timetable
5. View generated schedule

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check if MySQL is running
mysql -u root -p

# Verify credentials in .env file
# Ensure database name matches
```

### Port Already in Use
```bash
# Backend (port 5000)
lsof -ti:5000 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

### Module Not Found
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

## 📚 Block Theory Algorithm

Each timetable block is represented as:

```
BLOCK = {
  Teacher,
  Course,
  Section,
  Room,
  Day,
  Time Slot,
  Shift
}
```

**Conflict Detection Rules:**
1. No teacher can be in two places at once
2. No section can have two classes simultaneously
3. No room can be double-booked (same shift)
4. Lab courses require lab-type rooms
5. Room capacity must accommodate section size

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Protected routes (middleware)
- Role-based access control
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)

## 📝 Future Enhancements

- Email notifications (nodemailer)
- PDF generation for timetables
- Excel export functionality
- Mobile app (React Native)
- Real-time notifications (Socket.io)
- Multi-language support
- Dark mode
- Calendar integration

## 🤝 Contributing

This is a university project. For issues or improvements, please contact the development team.

## 📄 License

This project is developed for academic purposes.

## 👨‍💻 Authors

**EmersonSched Development Team**

---

## 🎉 Quick Start Summary

```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE university_timetable;"
mysql -u root -p university_timetable < database/schema.sql

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Install dependencies
npm run install:all

# 4. Start application
npm run dev

# 5. Open browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
```

## ✨ Key Features Demo

1. **First Admin Registration** → Auto-approved
2. **User Management** → Approve instructors/students
3. **Academic Setup** → Programs, courses, sections, rooms
4. **Course Requests** → Generate and assign to instructors
5. **Instructor Preferences** → Select days and time slots
6. **Timetable Generation** → Automatic conflict-free scheduling
7. **Exam Scheduling** → Match or shuffle mode
8. **Reset Options** → Flexible semester management

---

**Built with ❤️ for efficient university management**
