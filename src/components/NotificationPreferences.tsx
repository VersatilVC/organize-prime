import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Mail, Volume2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const notificationPreferencesSchema = z.object({
  email_notifications: z.object({
    feedback_responses: z.boolean(),
    team_invitations: z.boolean(),
    system_announcements: z.boolean(),
    digest_frequency: z.enum(['never', 'daily', 'weekly']),
  }),
  app_notifications: z.object({
    play_sound: z.boolean(),
    show_toasts: z.boolean(),
  }),
});

type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

const defaultPreferences: NotificationPreferences = {
  email_notifications: {
    feedback_responses: true,
    team_invitations: true,
    system_announcements: true,
    digest_frequency: 'daily',
  },
  app_notifications: {
    play_sound: true,
    show_toasts: true,
  },
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch current preferences
  const { data: currentPreferences, refetch } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return defaultPreferences;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      const savedPrefs = data?.preferences as any;
      const notificationPrefs = savedPrefs?.notifications;
      return notificationPrefs ? { ...defaultPreferences, ...notificationPrefs } : defaultPreferences;
    },
    enabled: !!user?.id,
  });

  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    values: currentPreferences || defaultPreferences,
  });

  const onSubmit = async (values: NotificationPreferences) => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get current preferences to merge with notification preferences
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle();

      const currentPrefs = currentProfile?.preferences as any;
      const updatedPreferences = {
        ...currentPrefs,
        notifications: values,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });

      refetch();
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Notifications</CardTitle>
            </div>
            <CardDescription>
              Choose what email notifications you'd like to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="email_notifications.feedback_responses"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Feedback Responses
                    </FormLabel>
                    <FormDescription>
                      Get notified when someone responds to your feedback or when you receive new feedback
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_notifications.team_invitations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Team Invitations
                    </FormLabel>
                    <FormDescription>
                      Receive emails when you're invited to join a team or organization
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_notifications.system_announcements"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      System Announcements
                    </FormLabel>
                    <FormDescription>
                      Important updates about the platform, new features, and maintenance notifications
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="email_notifications.digest_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Email Digest Frequency
                  </FormLabel>
                  <FormDescription>
                    How often would you like to receive a summary of your notifications?
                  </FormDescription>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>In-App Notifications</CardTitle>
            </div>
            <CardDescription>
              Customize how notifications appear while you're using the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="app_notifications.play_sound"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 flex items-center space-x-3">
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <FormLabel className="text-base font-medium">
                        Play Notification Sound
                      </FormLabel>
                      <FormDescription>
                        Play a sound when you receive new notifications
                      </FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="app_notifications.show_toasts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <FormLabel className="text-base font-medium">
                        Show Toast Notifications
                      </FormLabel>
                      <FormDescription>
                        Display popup notifications in the corner of your screen
                      </FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </Form>
  );
}