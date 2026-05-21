
import { redirect } from 'next/navigation';

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  // Remove member-facing dashboard layout
  redirect('/login');
}
