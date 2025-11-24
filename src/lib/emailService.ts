import nodemailer from 'nodemailer'
import { CustomerFeedback } from '@/types'

interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'user'
}

interface EmailOptions {
  to: string | string[]
  subject: string
  text: string
  html?: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Skip sending emails in development if no email config
      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
        console.log('📧 Email would be sent in production:', {
          to: options.to,
          subject: options.subject,
          text: options.text.substring(0, 100) + '...'
        })
        return true
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@dialersystem.com',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br>'),
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('📧 Email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      return false
    }
  }

  async notifyAdminsOfNewFeedback(
    feedback: CustomerFeedback, 
    submittedByUser: AdminUser,
    adminEmails: string[]
  ): Promise<boolean> {
    const priorityEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      urgent: '🔴'
    }

    const typeEmoji = {
      complaint: '😞',
      happy: '😊',
      suggestion: '💡', 
      general: '💬'
    }

    const subject = `${priorityEmoji[feedback.priority]} New Customer Feedback: ${feedback.feedback_type} (${feedback.priority} priority)`

    const text = `
New Customer Feedback Submitted

Feedback Details:
• Type: ${typeEmoji[feedback.feedback_type]} ${feedback.feedback_type.charAt(0).toUpperCase() + feedback.feedback_type.slice(1)}
• Priority: ${priorityEmoji[feedback.priority]} ${feedback.priority.toUpperCase()}
• Subject: ${feedback.subject}

Client Information:
• Name: ${feedback.clients?.principal_key_holder || 'Unknown'}
• Box Number: ${feedback.clients?.box_number || 'N/A'}
• Phone: ${feedback.clients?.telephone_cell || 'N/A'}

Submitted by: ${submittedByUser.first_name} ${submittedByUser.last_name} (${submittedByUser.email})
Date: ${new Date(feedback.created_at).toLocaleString()}

Feedback Notes:
${feedback.notes}

Please review this feedback in the admin dashboard:
${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer-feedback

---
This is an automated notification from the Dialer System.
    `.trim()

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
      ${priorityEmoji[feedback.priority]} New Customer Feedback
    </h2>
    
    <div style="background-color: ${feedback.priority === 'urgent' ? '#fef2f2' : feedback.priority === 'high' ? '#fff7ed' : '#f0f9ff'}; border-left: 4px solid ${feedback.priority === 'urgent' ? '#dc2626' : feedback.priority === 'high' ? '#ea580c' : '#0284c7'}; padding: 15px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #374151;">
        ${typeEmoji[feedback.feedback_type]} ${feedback.feedback_type.charAt(0).toUpperCase() + feedback.feedback_type.slice(1)} Feedback
      </h3>
      <p style="margin: 0; font-weight: bold; color: #6b7280;">Priority: ${priorityEmoji[feedback.priority]} ${feedback.priority.toUpperCase()}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 30%;">Subject:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${feedback.subject}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Client:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${feedback.clients?.principal_key_holder || 'Unknown'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Box Number:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${feedback.clients?.box_number || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Phone:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${feedback.clients?.telephone_cell || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Submitted by:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${submittedByUser.first_name} ${submittedByUser.last_name} (${submittedByUser.email})</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Date:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${new Date(feedback.created_at).toLocaleString()}</td>
      </tr>
    </table>

    <div style="background-color: #f9fafb; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #374151;">Feedback Notes:</h4>
      <p style="margin: 0; color: #6b7280; white-space: pre-wrap;">${feedback.notes}</p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer-feedback" 
         style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Review in Dashboard
      </a>
    </div>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      This is an automated notification from the Dialer System.<br>
      Please do not reply to this email.
    </p>
  </div>
</div>
    `

    return this.sendEmail({
      to: adminEmails,
      subject,
      text,
      html
    })
  }
}

export const emailService = new EmailService()