'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';
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

  const loginImage = PlaceHolderImages.find((image) => image.id === 'login-hero');

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
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-[400px] gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="mb-2">
              <Logo className="scale-125" />
            </Link>
            <h1 className="text-3xl font-bold font-headline mt-4 text-primary">Staff Access</h1>
            <p className="text-muted-foreground text-sm max-w-[280px]">
              Authorized personnel only. Please enter your credentials to manage Thrive Fit.
            </p>
          </div>
          
          <Card className="border-primary/20 shadow-2xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4" />
                Secure Login
              </CardTitle>
              <CardDescription>
                Access the front-desk management system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Work Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="admin@thrivefit.com" 
                      className="pl-10" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Password</Label>
                    <Link href="#" className="ml-auto inline-block text-xs underline underline-offset-4 hover:text-primary">
                      Forgot?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="space-y-4 pt-2">
                  <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Access Portal'}
                  </Button>
                  
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-[11px] space-y-1">
                    <p className="font-bold text-primary uppercase tracking-tighter">Demo Credentials:</p>
                    <p className="text-muted-foreground">Email: <span className="text-foreground font-mono">admin@thrivefit.com</span></p>
                    <p className="text-muted-foreground">Pass: <span className="text-foreground font-mono">password123</span></p>
                    <p className="italic opacity-60">*Ensure these are created in your Firebase Console</p>
                  </div>
                  
                  <p className="text-[10px] text-center text-muted-foreground">
                    By logging in, you agree to the internal security protocols.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        {loginImage && (
          <>
            <Image
              src={loginImage.imageUrl}
              alt="Thrive Fit Reception"
              fill
              className="object-cover brightness-[0.4] grayscale-[0.3]"
              data-ai-hint={loginImage.imageHint}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-12 left-12 right-12">
               <div className="bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl">
                  <p className="text-white font-headline text-2xl md:text-3xl italic leading-relaxed">
                    "Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't."
                  </p>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
