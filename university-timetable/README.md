# 🎓 EmersonSched - University Timetable Management System

EmersonSched is a comprehensive, intelligent University Timetable Management System (UTMS) that automates scheduling, resource allocation, instructor workload management, and exam scheduling using the Block Theory model.

## ✨ Features

### 🎯 Core Features
- **Intelligent Timetable Generation** - Block Theory algorithm for conflict-free scheduling
- **Role-Based Access Control** - Admin, Instructor, and Student dashboards
- **Real-Time Conflict Detection** - Prevents scheduling conflicts automatically
- **Instructor-Led Workflow** - Course acceptance with preference selection
- **Exam Scheduling** - Match Mode & Shuffle Mode for invigilator assignment
- **Notification System** - Automated email notifications for updates
- **Responsive Design** - Mobile-friendly interface with animations

### 🔧 Technical Features
- **Next.js Frontend** - Modern React framework with TypeScript
- **Node.js Backend** - Express.js API with JWT authentication
- **MySQL Database** - Robust relational database design
- **Real-Time Validation** - Conflict detection and resolution
- **Audit Logging** - Complete action tracking and history
- **Reset Modules** - Flexible system reset options

## 🏗️ System Architecture

### Block Theory Model
Each scheduling block contains:
```
Block = {
  Instructor,
  Course,
  Section,
  Room,
  Day,
  Time Slot,
  Shift
}
```

### User Roles
1. **Admin** - Full system control, user management, timetable generation
2. **Instructor** - Course acceptance, preference setting, class rescheduling
3. **Student** - Timetable viewing, notifications, exam schedules

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- XAMPP (recommended for local development)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd university-timetable
```

2. **Set up the database**
```bash
# Start MySQL via XAMPP
# Create database
mysql -u root -p
CREATE DATABASE university_timetable;
exit

# Import schema
mysql -u root -p university_timetable < database/schema.sql
```

3. **Configure environment**
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=university_timetable
JWT_SECRET=your_super_secret_jwt_key
```

4. **Install dependencies and start backend**
```bash
cd backend
npm install
npm run dev
```

5. **Install dependencies and start frontend**
```bash
cd ../frontend
npm install
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 📋 System Setup Flow

### First Time Setup
1. Visit http://localhost:3000
2. System will redirect to setup page
3. Create first administrator account
4. System is now ready for use

### User Registration Flow
1. Users register with role selection (Admin/Instructor/Student)
2. Admin approves new user registrations
3. Approved users can access their role-specific dashboards

## 🎛️ Admin Panel Features

### Dashboard
- User statistics and system overview
- Quick actions for common tasks
- Pending request notifications

### Academic Management
- **Programs** - Create BS, MS, MPhil, PhD programs
- **Majors** - Define specializations within programs
- **Courses** - Add courses with credit hours (e.g., 3+1)
- **Sections** - Create class sections with capacity
- **Rooms** - Manage lecture halls, labs, and seminar rooms

### Time Management
- **University Timings** - Set working hours and breaks
- **Time Slot Generation** - Automatic slot creation
- **Shift Management** - Morning, Evening, Weekend shifts

### Timetable Operations
- **Generate Requests** - Create course assignment requests
- **Instructor Assignment** - Assign courses to instructors
- **Conflict Resolution** - View and resolve scheduling conflicts
- **Timetable Generation** - Automated Block Theory scheduling

### Exam Management
- **Exam Sessions** - Create midterm, final, supplementary exams
- **Invigilator Assignment** - Match or Shuffle mode
- **Room Allocation** - Automatic room assignment
- **Conflict Detection** - Prevent exam scheduling conflicts

## 👨‍🏫 Instructor Panel Features

### Course Management
- **Course Requests** - View assigned courses
- **Acceptance Workflow** - Accept courses with preferences
- **Preference Selection** - Choose preferred days and time slots
- **Undo Functionality** - 10-second undo window

### Schedule Management
- **Personal Timetable** - View teaching schedule
- **Class Rescheduling** - Move classes to different slots
- **Conflict Validation** - Real-time conflict checking

## 👨‍🎓 Student Panel Features

### Academic Information
- **Enrollment** - Register for sections
- **Personal Timetable** - View class schedule
- **Exam Schedule** - View upcoming exams

### Notifications
- **Schedule Updates** - Automatic notifications for changes
- **Email Alerts** - PDF attachments for timetables
- **Exam Notifications** - Exam details and room assignments

## 🔄 System Workflows

### Timetable Generation Process
1. Admin creates academic structure (programs, courses, rooms)
2. Admin generates course requests
3. Instructors accept courses and set preferences
4. System validates preferences for conflicts
5. Admin generates final timetable using Block Theory
6. Students receive notifications with updated schedules

### Exam Scheduling Process
1. Admin creates exam session (type, dates, duration)
2. System assigns rooms based on capacity
3. Invigilators assigned via Match or Shuffle mode
4. Conflict validation ensures no overlaps
5. Students receive exam notifications with details

## 🛠️ Development

### Project Structure
```
university-timetable/
├── backend/
│   ├── routes/          # API endpoints
│   ├── controllers/     # Business logic
│   ├── models/          # Database models
│   ├── middleware/      # Auth & validation
│   └── utils/           # Helper functions
├── frontend/
│   ├── pages/           # Next.js pages
│   ├── components/      # React components
│   ├── context/         # React context
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
└── database/
    └── schema.sql       # Database schema
```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/setup-admin` - First admin setup
- `GET /api/auth/profile` - Get user profile

#### Admin Routes
- `GET /api/admin/dashboard` - Dashboard statistics
- `POST /api/admin/programs` - Create program
- `POST /api/admin/courses` - Create course
- `POST /api/admin/rooms` - Create room
- `POST /api/admin/generate-time-slots` - Generate time slots

#### Timetable Routes
- `POST /api/timetable/generate-requests` - Generate course requests
- `POST /api/timetable/generate` - Generate timetable
- `GET /api/timetable/conflicts` - View conflicts
- `POST /api/timetable/reset` - Reset system

#### Exam Routes
- `POST /api/exam/sessions` - Create exam session
- `GET /api/exam` - Get exams
- `GET /api/exam/conflicts` - View exam conflicts

### Database Schema

Key tables:
- `users` - All system users with roles
- `programs` - Academic programs (BS, MS, etc.)
- `courses` - Course definitions with credit hours
- `blocks` - Core timetable data (Block Theory)
- `exams` - Exam scheduling data
- `time_slots` - University timing structure

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Password strength validation
- SQL injection prevention
- XSS protection
- Rate limiting
- Audit logging

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS for styling
- Framer Motion animations
- Touch-friendly interfaces
- Progressive Web App features

## 🚀 Deployment

### Production Deployment
1. Build frontend: `npm run build`
2. Set production environment variables
3. Configure MySQL for production
4. Deploy to hosting service (Vercel, Netlify, etc.)
5. Set up email service for notifications

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📊 System Requirements

### Minimum Requirements
- 2GB RAM
- 10GB Storage
- Node.js 18+
- MySQL 8.0+

### Recommended Requirements
- 4GB+ RAM
- 20GB+ Storage
- SSD Storage
- Load balancer for high traffic

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints
- Test with sample data

## 🎯 Roadmap

### Version 2.0 Features
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with LMS systems
- [ ] Multi-language support
- [ ] Advanced reporting features
- [ ] Calendar synchronization
- [ ] Bulk data import/export
- [ ] Advanced notification preferences

---

**EmersonSched** - Intelligent University Timetable Management System
Built with ❤️ for modern universities