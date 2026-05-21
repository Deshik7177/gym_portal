
import { redirect } from 'next/navigation';

export default function MemberDashboardPage() {
  // Remove member-facing dashboard
  redirect('/login');
}
