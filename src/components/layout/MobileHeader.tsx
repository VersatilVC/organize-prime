import { useState } from 'react';
import { Menu, X, Bell, User } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/auth/AuthProvider';
import { NotificationBell } from '@/components/NotificationBell';

export const MobileHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="lg:hidden flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Open navigation menu"
            className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close navigation menu"
              className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          {/* Mobile sidebar content */}
          <div className="overflow-y-auto">
            <AppSidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile app title */}
      <h1 className="text-lg font-semibold truncate px-4">
        The Ultimate B2B App
      </h1>

      {/* Mobile actions */}
      <div className="flex items-center gap-2">
        {user && <NotificationBell />}
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="User menu"
          className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};