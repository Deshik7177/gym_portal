
import Image from 'next/image';
import Link from 'next/link';
import { Dumbbell, DollarSign, Calendar, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Logo from '@/components/logo';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find((image) => image.id === 'login-hero');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background shadow-sm">
        <Logo />
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4">
            Pricing
          </Link>
          <Link href="#about" className="text-sm font-medium hover:underline underline-offset-4">
            About
          </Link>
          <Link href="/login">
            <Button variant="outline">Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Sign Up</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt="Hero"
                  width="1920"
                  height="1080"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                  data-ai-hint={heroImage.imageHint}
                />
              )}
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Reach Your Zenith Fitness Goals
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Zenith Gym OS is your all-in-one solution for managing your fitness journey. Track your progress,
                    manage your membership, and stay motivated.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/signup">
                    <Button size="lg">Join Now</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">
                      Member Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  Everything You Need to Succeed
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform provides you with the tools to take control of your fitness.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1 text-center">
                <Dumbbell className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Workout Tracking</h3>
                <p className="text-muted-foreground">Log your workouts, track your personal bests, and see your progress over time.</p>
              </div>
              <div className="grid gap-1 text-center">
                <Calendar className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Class Scheduling</h3>
                <p className="text-muted-foreground">Book your spot in our wide range of fitness classes directly from the app.</p>
              </div>
              <div className="grid gap-1 text-center">
                <Users className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Community</h3>
                <p className="text-muted-foreground">Connect with other members, share your successes, and find a workout partner.</p>
              </div>
            </div>
          </div>
        </section>
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
                Flexible Pricing for Everyone
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Choose a plan that fits your lifestyle and budget. No hidden fees, cancel anytime.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Basic</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold">$29.99</span>/month
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                  <p>Unlimited gym access.</p>
                  <p>Access to all basic equipment.</p>
                  <p>Perfect for getting started.</p>
                  <Button className="w-full">Choose Plan</Button>
                </CardContent>
              </Card>
              <Card className="border-primary shadow-lg">
                 <CardHeader>
                  <CardTitle>Quarterly Pro</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold">$79.99</span>/quarter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                  <p>All benefits of Basic plan.</p>
                  <p>Access to all group classes.</p>
                  <p>The most popular choice.</p>
                  <Button className="w-full">Choose Plan</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Annual Gold</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold">$299.99</span>/year
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                  <p>All benefits of Pro plan.</p>
                  <p>Personal training session included.</p>
                  <p>Best value for dedicated members.</p>
                  <Button className="w-full">Choose Plan</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section id="about" className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">About Zenith Gym</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Founded in 2024, our mission is to provide a state-of-the-art facility and a supportive community to help you achieve your fitness goals.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Zenith Gym OS. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}

    