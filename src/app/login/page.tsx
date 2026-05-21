
'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Logo from '@/components/logo';
import { Lock, User } from 'lucide-react';

export default function ReceptionLoginPage() {
  const loginImage = PlaceHolderImages.find((image) => image.id === 'login-hero');

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-[400px] gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="mb-2">
              <Logo className="scale-125" />
            </Link>
            <h1 className="text-3xl font-bold font-headline mt-4">Staff Access</h1>
            <p className="text-muted-foreground text-sm max-w-[280px]">
              Authorized personnel only. Please enter your credentials to manage Thrive Fit.
            </p>
          </div>
          
          <Card className="border-border/40 shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Secure Login
              </CardTitle>
              <CardDescription>
                Access the front-desk management system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Work Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="staff@thrivefit.com" className="pl-10" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Password</Label>
                    <Link href="#" className="ml-auto inline-block text-xs underline underline-offset-4 hover:text-primary">
                      Forgot?
                    </Link>
                  </div>
                  <Input id="password" type="password" required />
                </div>
                
                <div className="space-y-2 pt-2">
                  <Link href="/admin" className="w-full">
                    <Button className="w-full h-11 text-base font-semibold">
                      Access Portal
                    </Button>
                  </Link>
                  <p className="text-[10px] text-center text-muted-foreground">
                    By logging in, you agree to the internal security protocols.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
              ← Back to public site
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {loginImage && (
          <>
            <Image
              src={loginImage.imageUrl}
              alt="Thrive Fit Reception"
              width="1920"
              height="1080"
              className="h-full w-full object-cover brightness-[0.4] grayscale-[0.3]"
              data-ai-hint={loginImage.imageHint}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-12 left-12 right-12">
               <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10">
                  <p className="text-white font-headline text-2xl italic">"Strength doesn't come from what you can do. It comes from overcoming the things you once thought you couldn't."</p>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
