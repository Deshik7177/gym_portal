
import { redirect } from 'next/navigation';

export default function SignupPage() {
  // Members do not sign themselves up; reception handles registration
  redirect('/login');
}
