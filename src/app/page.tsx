
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Since the app is now reception-only, we redirect the root to the staff login
  redirect('/login');
}
