import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Book, 
  MessageSquare, 
  Video, 
  FileText, 
  HelpCircle, 
  Mail,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const helpCategories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of using the platform',
      icon: Book,
      articles: [
        'Setting up your organization',
        'Inviting team members',
        'Basic navigation guide',
        'Understanding user roles'
      ]
    },
    {
      title: 'User Management',
      description: 'Managing users and permissions',
      icon: MessageSquare,
      articles: [
        'Adding new users',
        'Role-based permissions',
        'Managing invitations',
        'User profiles and settings'
      ]
    },
    {
      title: 'Features & Apps',
      description: 'Using platform features and applications',
      icon: Video,
      articles: [
        'Knowledge Base setup',
        'Feedback management',
        'Notification settings',
        'Feature configuration'
      ]
    },
    {
      title: 'Administration',
      description: 'Advanced admin and system settings',
      icon: FileText,
      articles: [
        'Organization settings',
        'Security configuration',
        'System administration',
        'Billing and subscriptions'
      ]
    }
  ];

  const quickLinks = [
    { title: 'Contact Support', icon: Mail, href: '/feedback' },
    { title: 'Video Tutorials', icon: Video, href: '#' },
    { title: 'API Documentation', icon: ExternalLink, href: '#' },
    { title: 'System Status', icon: HelpCircle, href: '#' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Find answers to your questions, learn how to use features, and get the most out of the platform
        </p>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickLinks.map((link, index) => {
          const Icon = link.icon;
          return (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="text-center pb-2">
                <Icon className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-sm">{link.title}</CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Help Categories */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Browse by Category</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {helpCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <div 
                        key={articleIndex}
                        className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer group"
                      >
                        <span className="text-sm">{article}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-4">
                    View all articles
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Popular Articles</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'How to invite users to your organization', views: '1.2k views', tag: 'Getting Started' },
            { title: 'Understanding user roles and permissions', views: '956 views', tag: 'User Management' },
            { title: 'Setting up the Knowledge Base', views: '834 views', tag: 'Features' },
            { title: 'Managing feedback and support tickets', views: '723 views', tag: 'Features' },
            { title: 'Organization security settings', views: '612 views', tag: 'Administration' },
            { title: 'Troubleshooting common issues', views: '504 views', tag: 'Support' }
          ].map((article, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <Badge variant="secondary" className="w-fit text-xs">
                  {article.tag}
                </Badge>
                <CardTitle className="text-base leading-tight">{article.title}</CardTitle>
                <CardDescription className="text-xs">{article.views}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="text-center space-y-4 py-8">
        <h3 className="text-xl font-semibold">Still need help?</h3>
        <p className="text-muted-foreground">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.href = '/feedback'}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email Us
          </Button>
        </div>
      </div>
    </div>
  );
}