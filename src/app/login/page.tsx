'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { Lock, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ReceptionLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back to the Thrive Fit portal.",
      });
      router.push('/admin');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4">
      <div className="mx-auto grid w-full max-w-[400px] gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="mb-2">
            <Logo className="scale-125" />
          </Link>
          <h1 className="text-3xl font-bold font-headline mt-4 text-primary uppercase tracking-tighter italic">Portal Access</h1>
          <p className="text-muted-foreground text-sm max-w-[280px]">
            Authorized personnel only. Please enter your credentials to manage the facility.
          </p>
        </div>
        
        <Card className="border-primary/20 shadow-2xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2 text-primary font-headline italic uppercase tracking-tighter">
              <Lock className="h-4 w-4" />
              Secure Authentication
            </CardTitle>
            <CardDescription>
              Access the operational command center.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground">Work Identifier</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@thrivefit.com" 
                    className="pl-10 h-11 bg-black/20 border-white/10" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground">Security Token</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  className="h-11 bg-black/20 border-white/10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              
              <div className="space-y-4 pt-2">
                <Button type="submit" className="w-full h-12 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enter System'}
                </Button>
                
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">Internal Directory Hints</p>
                  
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Admin Command:</span>
                      <code className="text-[11px] text-primary">admin@thrivefit.com</code>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Staff Unit:</span>
                      <code className="text-[11px] text-primary">staff@thrivefit.com</code>
                    </div>
                  </div>
                  
                  <p className="text-[9px] italic opacity-40 font-medium">Note: Ensure corresponding documents exist in /users collection with role: "admin" or "staff".</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
