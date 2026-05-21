
'use client';

import { useState, useRef } from 'react';
import { Camera, Search, UserCircle, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function RegisterMemberPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState('active');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check permissions."
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        // Stop stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Registration Success",
        description: "New member has been registered successfully."
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Register New User</h1>
          <p className="text-muted-foreground">Enter member details and capture profile photo.</p>
        </div>
        <div className="relative w-64">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input placeholder="Search phone for edit..." className="pl-8" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Information</CardTitle>
                <CardDescription>Personal and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input id="full-name" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Username)</Label>
                  <Input id="phone" placeholder="1234567890" required />
                </div>
                <div className="space-y-2">
                  <Label>Duration Type</Label>
                  <RadioGroup value={status} onValueChange={setStatus} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id="active" />
                      <Label htmlFor="active">Active (Unlimited)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="non-active" id="non-active" />
                      <Label htmlFor="non-active">Non-active (Fixed Term)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {status === 'non-active' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input id="start-date" type="date" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input id="end-date" type="date" required />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="days-count">Count of Days</Label>
                      <Input id="days-count" type="number" placeholder="30" required />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="price">Price (Manual Entry)</Label>
                  <Input id="price" type="number" placeholder="299.00" required />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Any health conditions or goals..." className="min-h-[100px]" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
                <CardDescription>Capture or upload member photo.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-full aspect-square bg-muted rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                  {photo ? (
                    <img src={photo} alt="Member" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <UserCircle className="h-20 w-20 mb-2 opacity-20" />
                      <p className="text-sm">No photo captured</p>
                    </div>
                  )}
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    className={`absolute inset-0 w-full h-full object-cover ${photo ? 'hidden' : ''}`} 
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="flex gap-2 w-full">
                  {!photo ? (
                    <>
                        <Button type="button" variant="outline" className="flex-1" onClick={startCamera}>
                            <Camera className="mr-2 h-4 w-4" /> Start Camera
                        </Button>
                        <Button type="button" className="flex-1" onClick={capturePhoto}>
                            Capture
                        </Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" className="w-full" onClick={() => setPhoto(null)}>
                        Retake Photo
                    </Button>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Complete Registration'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
