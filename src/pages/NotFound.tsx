import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Home, 
  Search, 
  ArrowLeft, 
  FileQuestion,
  Navigation,
  Settings,
  Users,
  BarChart3,
  HelpCircle
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { usePermissions } from "@/contexts/PermissionContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { availableFeatures } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Log 404 for analytics
    console.warn("404 Error: Route not found:", {
      pathname: location.pathname,
      search: location.search,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  }, [location]);

  // Suggest possible routes based on the attempted path
  const getSuggestions = () => {
    const path = location.pathname.toLowerCase();
    const suggestions = [];

    // Common route suggestions based on attempted path
    if (path.includes('dashboard') || path.includes('home')) {
      suggestions.push({ label: 'Dashboard', path: '/dashboard', icon: BarChart3 });
    }
    if (path.includes('user') || path.includes('member')) {
      suggestions.push({ label: 'Users', path: '/users', icon: Users });
    }
    if (path.includes('setting') || path.includes('config')) {
      suggestions.push({ label: 'Profile Settings', path: '/settings/profile', icon: Settings });
    }
    if (path.includes('help') || path.includes('support')) {
      suggestions.push({ label: 'Help Center', path: '/help', icon: HelpCircle });
    }

    // Add feature-based suggestions
    availableFeatures.slice(0, 3).forEach(feature => {
      suggestions.push({
        label: feature.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        path: `/features/${feature}`,
        icon: Navigation
      });
    });

    // Default suggestions if no matches
    if (suggestions.length === 0) {
      suggestions.push(
        { label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
        { label: 'Users', path: '/users', icon: Users },
        { label: 'Settings', path: '/settings/profile', icon: Settings }
      );
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  const suggestions = getSuggestions();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Simple search logic - could be enhanced with actual search
      if (searchQuery.toLowerCase().includes('dashboard')) {
        navigate('/dashboard');
      } else if (searchQuery.toLowerCase().includes('user')) {
        navigate('/users');
      } else if (searchQuery.toLowerCase().includes('setting')) {
        navigate('/settings/profile');
      } else {
        // Default to dashboard if no match
        navigate('/dashboard');
      }
    }
  };

  // Determine the appropriate layout based on authentication
  const content = (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileQuestion className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-bold">Page Not Found</CardTitle>
          <p className="text-muted-foreground mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Badge variant="secondary" className="mt-2 font-mono text-xs">
            {location.pathname}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Search functionality */}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="search">
              Search for a page:
            </label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="e.g., dashboard, users, settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick navigation suggestions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Try these instead:
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start h-auto p-3"
                    onClick={() => navigate(suggestion.path)}
                  >
                    <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="text-left">{suggestion.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline" 
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => navigate(user ? '/dashboard' : '/')} 
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              {user ? 'Dashboard' : 'Home'}
            </Button>
          </div>

          {/* Additional help */}
          {user && (
            <div className="text-center text-sm text-muted-foreground">
              Need help? Visit our{' '}
              <Link to="/help" className="text-primary hover:underline">
                Help Center
              </Link>{' '}
              or contact support.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return content;
};

export default NotFound;
