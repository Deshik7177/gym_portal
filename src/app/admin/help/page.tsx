'use client';

import { 
  BookOpen, 
  UserPlus, 
  Scan, 
  CreditCard, 
  ShieldCheck, 
  HelpCircle,
  Smartphone,
  Zap,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

export default function OperationsManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2 border-b border-primary/10 pb-6">
        <h1 className="text-4xl font-black font-headline tracking-tighter text-primary flex items-center gap-3">
          <BookOpen className="h-10 w-10" />
          STAFF MANUAL
        </h1>
        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">Standard Operating Procedures for Thrive Fit</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-tighter">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Core Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            Ensure every member has a seamless, secure entry experience while maintaining accurate financial and attendance records in the cloud.
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-tighter">
              <Zap className="h-4 w-4 text-accent" />
              Quick Tip
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            Always encourage members to use <b>Face Recognition</b> first. It's our premium feature and provides the fastest entry.
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="registration" className="border-white/10">
          <AccordionTrigger className="hover:no-underline py-6">
            <div className="flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-lg tracking-tight">Onboarding New Members</p>
                <p className="text-xs text-muted-foreground">How to correctly register a new customer</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
            <p>1. Navigate to <b>Registration</b> in the sidebar.</p>
            <p>2. Enter their <b>Full Name</b> and <b>Phone Number</b>. Note: The phone number is their permanent ID for both QR and Face logic.</p>
            <p>3. Choose <b>Active</b> for subscription-based members or <b>Fixed Term</b> for temporary passes.</p>
            <p>4. Input the <b>Fee</b> collected. This automatically creates a record in the Sales Ledger.</p>
            <p>5. Click <b>Register</b> to sync data to the cloud.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="kiosk" className="border-white/10">
          <AccordionTrigger className="hover:no-underline py-6">
            <div className="flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scan className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg tracking-tight">The Entrance Kiosk</p>
                <p className="text-xs text-muted-foreground">Managing the automated entry point</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
            <p><Badge className="bg-primary text-primary-foreground mr-2">FACE MODE</Badge> Instruct members to stand roughly 2-3 feet from the camera and look directly at the screen. The system identifies them automatically.</p>
            <p><Badge variant="outline" className="text-blue-400 border-blue-400/20 mr-2">QR MODE</Badge> If lighting is poor, switch to QR Mode. Members must present their digital QR Passport from their phone.</p>
            <p><b>Troubleshooting:</b> If a member is "Active" but denied, check their subscription end date in the <b>Members List</b>.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pt" className="border-white/10">
          <AccordionTrigger className="hover:no-underline py-6">
            <div className="flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-bold text-lg tracking-tight">Personal Training (PT) Upsells</p>
                <p className="text-xs text-muted-foreground">Assigning trainers and logging sales</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
            <p>1. Open the <b>Vault Directory</b> (Members List).</p>
            <p>2. Locate the member and click the <b>More Horizontal</b> (three dots) button.</p>
            <p>3. Select <b>Add PT Session</b>.</p>
            <p>4. Enter the package price and validity dates. This will change their badge to <Badge className="bg-accent">PERSONAL</Badge> and notify trainers.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="retention" className="border-white/10">
          <AccordionTrigger className="hover:no-underline py-6">
            <div className="flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <PhoneCall className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-bold text-lg tracking-tight">Retention Strategy</p>
                <p className="text-xs text-muted-foreground">Reducing churn and member dropout</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
            <p>Check the <b>Retention Alerts</b> every morning. We flag members based on two risk levels:</p>
            <div className="pl-4 border-l-2 border-white/5 space-y-2 mt-2">
              <p><span className="text-orange-400 font-bold">AT RISK (2-5 Days):</span> Send a polite SMS reminder via our templates.</p>
              <p><span className="text-destructive font-bold">CRITICAL (> 5 Days):</span> Call the member directly to check if they are facing any issues with the gym facilities.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="pt-10 flex items-center justify-center gap-2 text-muted-foreground opacity-40">
        <HelpCircle className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">System v1.2 - Thrive Fit Secure Ops</span>
      </div>
    </div>
  );
}
