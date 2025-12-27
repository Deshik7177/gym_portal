import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details here. Click save when you're done.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" defaultValue="John Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" defaultValue="1990-01-01" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="john.d@example.com" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" defaultValue="123-456-7890" />
                </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" defaultValue="123 Gym Street, Fitville, USA" />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emergency-contact-name">Emergency Contact Name</Label>
                <Input id="emergency-contact-name" defaultValue="Jane Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency-contact-phone">Emergency Contact Phone</Label>
                <Input id="emergency-contact-phone" type="tel" defaultValue="987-654-3210" />
              </div>
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Membership & Access</CardTitle>
          <CardDescription>Your unique identifiers. These fields are not editable.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="member-id">Member ID</Label>
                <Input id="member-id" defaultValue="USR001" readOnly />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="rfid-uid">RFID Card UID</Label>
                <Input id="rfid-uid" defaultValue="A1B2C3D4" readOnly />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
