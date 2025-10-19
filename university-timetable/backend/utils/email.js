const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email notification
const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send registration approval email
const sendRegistrationApprovalEmail = async (userEmail, userName, role) => {
  const subject = 'Account Approved - EmersonSched';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A855F7;">Welcome to EmersonSched!</h2>
      <p>Dear ${userName},</p>
      <p>Your ${role} account has been approved. You can now log in to the system.</p>
      <p>Login URL: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
      <p>Best regards,<br>EmersonSched Team</p>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send registration rejection email
const sendRegistrationRejectionEmail = async (userEmail, userName, reason = '') => {
  const subject = 'Account Registration - EmersonSched';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EF4444;">Registration Update</h2>
      <p>Dear ${userName},</p>
      <p>Unfortunately, your account registration has been rejected.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>If you believe this is an error, please contact the administrator.</p>
      <p>Best regards,<br>EmersonSched Team</p>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send timetable update notification
const sendTimetableUpdateEmail = async (userEmail, userName, updateType, details) => {
  const subject = `Timetable Update - ${updateType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A855F7;">Timetable Update</h2>
      <p>Dear ${userName},</p>
      <p>Your timetable has been updated:</p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px;">
        <p><strong>Update Type:</strong> ${updateType}</p>
        <p><strong>Details:</strong> ${details}</p>
      </div>
      <p>Please check your dashboard for the latest information.</p>
      <p>Best regards,<br>EmersonSched Team</p>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send exam schedule notification
const sendExamScheduleEmail = async (userEmail, userName, examDetails) => {
  const subject = 'Exam Schedule - EmersonSched';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A855F7;">Exam Schedule</h2>
      <p>Dear ${userName},</p>
      <p>Your exam has been scheduled:</p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px;">
        <p><strong>Course:</strong> ${examDetails.courseName}</p>
        <p><strong>Date:</strong> ${examDetails.examDate}</p>
        <p><strong>Time:</strong> ${examDetails.startTime} - ${examDetails.endTime}</p>
        <p><strong>Room:</strong> ${examDetails.roomName}</p>
        <p><strong>Invigilator:</strong> ${examDetails.invigilatorName}</p>
      </div>
      <p>Please arrive 15 minutes before the exam time.</p>
      <p>Best regards,<br>EmersonSched Team</p>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

// Send reschedule notification
const sendRescheduleEmail = async (userEmail, userName, rescheduleDetails) => {
  const subject = 'Class Rescheduled - EmersonSched';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A855F7;">Class Rescheduled</h2>
      <p>Dear ${userName},</p>
      <p>Your class has been rescheduled:</p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px;">
        <p><strong>Course:</strong> ${rescheduleDetails.courseName}</p>
        <p><strong>Old Time:</strong> ${rescheduleDetails.oldTime}</p>
        <p><strong>New Time:</strong> ${rescheduleDetails.newTime}</p>
        <p><strong>Room:</strong> ${rescheduleDetails.roomName}</p>
      </div>
      <p>Please update your schedule accordingly.</p>
      <p>Best regards,<br>EmersonSched Team</p>
    </div>
  `;
  
  return await sendEmail(userEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendRegistrationApprovalEmail,
  sendRegistrationRejectionEmail,
  sendTimetableUpdateEmail,
  sendExamScheduleEmail,
  sendRescheduleEmail
};