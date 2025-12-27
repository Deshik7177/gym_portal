# **App Name**: Zenith Gym OS

## Core Features:

- User Authentication: Secure user registration, login, and profile management with Firebase Authentication, including phone number (OTP) and email verification.
- RFID Access Control: Backend logic to map RFID card UIDs to user IDs, manage time-based and credit-based access, and log all access attempts.
- Subscription Management: Admin interface to create and manage subscription plans with various entry types, time slots, and auto-expiry logic using Cloud Functions.
- Payment Gateway Integration: Simulated payment flow with backend webhook verification to auto-activate subscriptions, generate invoices, and email them to users.
- Role-Based Admin Panel: Secure admin dashboard for user and plan management, analytics, and RFID access logs with role-based access control.
- Counter Portal: Restricted-access interface for gym staff to register users, assign RFID cards, renew subscriptions, and view access logs.
- Automated Reporting and Notifications: Scheduled Cloud Functions to send monthly revenue and usage reports to admins and notify users about subscription expiry and low credit balance.

## Style Guidelines:

- Primary color: Deep navy blue (#1A237E) to convey professionalism and trust.
- Background color: Light gray (#F5F5F5), creating a clean and modern backdrop.
- Accent color: Vibrant orange (#FF9800) for call-to-action buttons and key highlights, adding energy.
- Body and headline font: 'Inter', a versatile sans-serif providing a modern and neutral feel for both headings and body text.
- Use sharp, minimalist icons to represent gym equipment, user profiles, and subscription plans.
- Employ a grid-based layout with ample spacing to ensure a clean and organized interface across all portals.
- Subtle transitions and loading animations to enhance user experience without being distracting.