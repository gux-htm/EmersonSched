# EmersonSched - University Timetable Management System

A comprehensive full-stack web application for managing university timetables using the Block Theory algorithm. Built with Next.js, Node.js, and MySQL.

## 🎯 Features

- **Smart Scheduling**: AI-powered timetable generation using Block Theory algorithm
- **Role-Based Access Control**: Secure access for administrators, instructors, and students
- **Course Management**: Comprehensive course, program, and section management
- **Real-time Updates**: Instant notifications for schedule changes
- **Conflict Detection**: Advanced validation to prevent scheduling conflicts
- **Exam Scheduling**: Automated exam scheduling with invigilator assignment
- **Responsive Design**: Modern, mobile-friendly interface
- **Email Notifications**: Automated email system for updates

## 🏗️ System Architecture

### Backend (Node.js + Express)
- RESTful API with JWT authentication
- MySQL database with comprehensive schema
- Role-based access control
- Email notification system
- File upload and export capabilities

### Frontend (Next.js + TypeScript)
- Modern React with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Responsive design
- Real-time updates

### Database (MySQL)
- Comprehensive schema for all entities
- Optimized indexes for performance
- Audit trails for all operations
- Flexible metadata storage

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8.0+ (or XAMPP)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd emerson-sched
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Database Setup**
   ```bash
   # Start MySQL (XAMPP or standalone)
   # Create database
   mysql -u root -p
   CREATE DATABASE university_timetable;
   
   # Import schema
   mysql -u root -p university_timetable < database/schema.sql
   ```

4. **Environment Configuration**
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=university_timetable
   JWT_SECRET=your_jwt_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

5. **Start the application**
   ```bash
   # From root directory
   npm run dev
   
   # Or start individually
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Frontend (Terminal 2)
   cd frontend && npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## 📋 First Time Setup

1. **Register as First Admin**
   - Visit http://localhost:3000/register
   - Select "Administrator" role
   - Complete registration (first admin is auto-approved)

2. **Configure University Settings**
   - Login as admin
   - Go to Settings → University Timings
   - Set opening/closing times, break duration, slot length
   - Configure working days

3. **Add Academic Data**
   - Create Programs (BS, MS, etc.)
   - Add Majors for each program
   - Create Courses with credit hours
   - Add Sections for each major
   - Add Rooms with capacity and type

4. **Generate Course Requests**
   - Go to Timetable → Generate Requests
   - System creates course requests for instructors

5. **Instructor Course Acceptance**
   - Instructors login and accept courses
   - Select preferred days and time slots
   - System validates preferences

6. **Generate Timetable**
   - Admin generates timetable using Block Theory
   - System creates conflict-free schedule
   - Export timetables (PDF, Excel, Image)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/first-admin-status` - Check first admin status

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/approve` - Approve/reject user
- `POST /api/admin/programs` - Create program
- `GET /api/admin/programs` - Get all programs
- `POST /api/admin/majors` - Create major
- `GET /api/admin/majors` - Get all majors
- `POST /api/admin/courses` - Create course
- `GET /api/admin/courses` - Get all courses
- `POST /api/admin/sections` - Create section
- `GET /api/admin/sections` - Get all sections
- `POST /api/admin/rooms` - Create room
- `GET /api/admin/rooms` - Get all rooms
- `GET /api/admin/course-requests` - Get course requests

### Timetable
- `POST /api/timetable/timings` - Set university timings
- `GET /api/timetable/timings` - Get university timings
- `GET /api/timetable/time-slots` - Get time slots
- `POST /api/timetable/generate-requests` - Generate course requests
- `GET /api/timetable/blocks` - Get timetable blocks
- `POST /api/timetable/generate` - Generate timetable

### Instructor
- `GET /api/instructor/course-requests` - Get instructor's course requests
- `POST /api/instructor/course-requests/:id/accept` - Accept course request
- `POST /api/instructor/course-requests/:id/undo` - Undo course request
- `GET /api/instructor/timetable` - Get instructor's timetable
- `POST /api/instructor/reschedule/:id` - Reschedule class

### Student
- `GET /api/student/timetable` - Get student's timetable
- `GET /api/student/exams` - Get student's exams
- `GET /api/student/notifications` - Get notifications
- `PATCH /api/student/notifications/:id/read` - Mark notification as read

### Exams
- `POST /api/exams/sessions` - Create exam session
- `GET /api/exams/sessions` - Get exam sessions
- `POST /api/exams/generate` - Generate exam schedule
- `GET /api/exams` - Get exams
- `POST /api/exams/reset` - Reset exam schedule

### Notifications
- `POST /api/notifications/send` - Send notification
- `POST /api/notifications/send-bulk` - Send bulk notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and authentication
- `programs` - Academic programs (BS, MS, etc.)
- `majors` - Specializations within programs
- `courses` - Individual courses
- `sections` - Class sections
- `rooms` - Physical rooms and facilities
- `time_slots` - Available time slots
- `blocks` - Timetable blocks (scheduled classes)
- `course_requests` - Instructor course preferences
- `exams` - Exam schedules
- `notifications` - System notifications
- `audit_logs` - System audit trail

## 🎨 UI Components

### Layout Components
- `Header` - Navigation and user menu
- `Layout` - Main layout wrapper
- `Sidebar` - Navigation sidebar (if needed)

### UI Components
- `LoadingSpinner` - Loading indicators
- `Modal` - Modal dialogs
- `Table` - Data tables
- `Form` - Form components
- `Button` - Button variants
- `Input` - Input fields
- `Select` - Dropdown selects

### Pages
- `HomePage` - Landing page
- `LoginPage` - User login
- `RegisterPage` - User registration
- `DashboardPage` - Main dashboard
- `AdminPages` - Admin management pages
- `InstructorPages` - Instructor interface
- `StudentPages` - Student interface

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting (can be added)

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS for styling
- Flexible grid layouts
- Touch-friendly interfaces
- Optimized for all screen sizes

## 🚀 Deployment

### XAMPP Deployment
1. Download and install XAMPP
2. Start Apache and MySQL
3. Copy project to `htdocs/emerson-sched`
4. Import database schema
5. Configure environment variables
6. Access via `http://localhost/emerson-sched/frontend`

### Production Deployment
1. Set up production MySQL database
2. Configure environment variables
3. Build frontend: `npm run build`
4. Start backend: `npm start`
5. Serve frontend with nginx or similar

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
  - User authentication and roles
  - Timetable generation
  - Course management
  - Exam scheduling
  - Notification system

---

**EmersonSched** - Transforming university timetable management with intelligent scheduling and modern technology.