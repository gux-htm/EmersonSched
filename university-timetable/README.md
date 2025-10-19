# EmersonSched - University Timetable Management System

A comprehensive university timetable management system built with Next.js, Node.js, and MySQL. Features intelligent scheduling using Block Theory algorithm, role-based access control, and automated exam scheduling.

## 🚀 Features

- **Intelligent Timetable Generation** - Block Theory algorithm for conflict-free scheduling
- **Role-Based Access Control** - Admin, Instructor, and Student dashboards
- **Course Management** - Programs, majors, courses, and sections
- **Resource Management** - Rooms, time slots, and capacity management
- **Exam Scheduling** - Match Mode and Shuffle Mode for invigilator assignment
- **Email Notifications** - Automated notifications for updates and reschedules
- **Rescheduling System** - Instructor-led class rescheduling with conflict detection
- **Reset Operations** - Flexible reset options for semester management
- **Responsive Design** - Modern UI with Tailwind CSS and Framer Motion

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **Nodemailer** - Email notifications
- **Joi** - Data validation

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Hook Form** - Form management
- **Axios** - HTTP client

## 📋 Prerequisites

- Node.js 20+ 
- MySQL 8.0+ (XAMPP recommended)
- npm or yarn
- Git

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd university-timetable
```

### 2. Database Setup

1. Start MySQL via XAMPP
2. Create database:
```sql
CREATE DATABASE university_timetable;
```

3. Import the schema:
```bash
mysql -u root -p university_timetable < database/schema.sql
```

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=university_timetable
DB_PORT=3306
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=EmersonSched <noreply@emersonsched.edu>
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start the backend:
```bash
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 👥 User Roles

### Super Admin (First Registration)
- Full system access
- User management and approval
- System configuration
- Reset operations

### Administrator
- User management
- Academic setup (programs, courses, rooms)
- Timetable generation
- Exam scheduling
- System monitoring

### Instructor
- Course acceptance and preferences
- Class rescheduling
- Timetable viewing
- Student notifications

### Student
- Registration and profile management
- Timetable viewing
- Notification receiving

## 🔄 System Workflow

1. **First Admin Registration** - System initialization
2. **User Registration** - Role-based registration with approval
3. **Academic Setup** - Programs, courses, rooms, sections
4. **University Timings** - Configure working hours and time slots
5. **Course Requests** - Generate hierarchical course list
6. **Instructor Acceptance** - Course selection with preferences
7. **Timetable Generation** - Block Theory algorithm
8. **Exam Scheduling** - Match/Shuffle mode assignment
9. **Notifications** - Automated email updates
10. **Rescheduling** - Instructor-led class changes
11. **Reset Operations** - Semester management

## 📊 Database Schema

### Core Tables
- `users` - User accounts and roles
- `programs` - Academic programs
- `majors` - Program specializations
- `courses` - Course catalog
- `sections` - Class sections
- `rooms` - Physical spaces
- `blocks` - Timetable blocks
- `exams` - Exam schedules
- `notifications` - User notifications

### Supporting Tables
- `university_timings` - System timing configuration
- `time_slots` - Generated time slots
- `course_requests` - Instructor preferences
- `audit_logs` - System activity tracking
- `reset_operations` - Reset operation history

## 🎯 Key Features

### Block Theory Algorithm
Each timetable block contains:
- Teacher (Instructor)
- Course
- Section
- Room
- Day
- Time Slot
- Shift

### Conflict Detection
- Teacher availability
- Room capacity
- Section scheduling
- Time slot conflicts

### Email Notifications
- Registration approval/rejection
- Timetable updates
- Class reschedules
- Exam schedules

### Reset Operations
- Time Slots Only
- Teachers & Rooms
- Full Reset (New Semester)

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Password strength validation
- Input sanitization
- Rate limiting
- CORS protection

## 📱 Responsive Design

- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interface
- Print-friendly timetables

## 🚀 Deployment

### XAMPP Deployment
1. Extract project to `htdocs/university-timetable/`
2. Start Apache and MySQL
3. Access via `http://localhost/university-timetable/frontend/`

### Production Deployment
1. Configure production database
2. Set environment variables
3. Build frontend: `npm run build`
4. Start backend: `npm start`
5. Configure reverse proxy (nginx)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm run test
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password

### Users (Admin)
- `GET /api/users` - Get all users
- `POST /api/users/:id/approve` - Approve user
- `POST /api/users/:id/reject` - Reject user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Timetable
- `POST /api/timetable/generate` - Generate timetable
- `GET /api/timetable` - Get timetable
- `POST /api/timetable/reschedule` - Reschedule class
- `POST /api/timetable/reset` - Reset operations

### Exams
- `POST /api/exams/session` - Create exam session
- `GET /api/exams` - Get exams
- `POST /api/exams/reset` - Reset exam operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- Block Theory timetable generation
- Role-based access control
- Exam scheduling system
- Email notification system
- Responsive UI design

---

**EmersonSched** - Streamlining university timetable management with intelligent scheduling and modern technology.