import { useEffect } from 'react';
import { useSystemFeatures } from '@/hooks/database/useSystemFeatures';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Auto-sync mechanism for features that don't have pages in database
export function useFeatureSync() {
  const { features } = useSystemFeatures();

  useEffect(() => {
    const syncFeatures = async () => {
      if (!features) return;

      for (const feature of features) {
        // Check if feature has pages in navigation_config
        if (!feature.navigation_config?.pages && feature.slug === 'knowledge-base') {
          console.log(`🔄 Auto-syncing ${feature.slug} with default pages...`);
          
          try {
            // Update the feature with default pages structure
            const { error } = await supabase
              .from('system_feature_configs')
              .update({
                navigation_config: {
                  pages: [
                    {
                      id: "dashboard",
                      title: "Dashboard", 
                      route: "/apps/knowledge-base/dashboard",
                      component: "KBDashboard",
                      permissions: [],
                      icon: "home",
                      menuOrder: 0,
                      isDefault: true
                    },
                    {
                      id: "databases",
                      title: "Knowledge Bases",
                      route: "/apps/knowledge-base/databases", 
                      component: "KBDatabases",
                      permissions: [],
                      icon: "database",
                      menuOrder: 1,
                      isDefault: false
                    },
                    {
                      id: "files", 
                      title: "Files",
                      route: "/apps/knowledge-base/files",
                      component: "KBFiles", 
                      permissions: [],
                      icon: "file",
                      menuOrder: 2,
                      isDefault: false
                    },
                    {
                      id: "chat",
                      title: "AI Chat",
                      route: "/apps/knowledge-base/chat",
                      component: "KBChat",
                      permissions: [],
                      icon: "message-square", 
                      menuOrder: 3,
                      isDefault: false
                    },
                    {
                      id: "analytics",
                      title: "Analytics",
                      route: "/apps/knowledge-base/analytics",
                      component: "KBAnalytics",
                      permissions: ["admin"],
                      icon: "bar-chart-3",
                      menuOrder: 4,
                      isDefault: false
                    },
                    {
                      id: "settings",
                      title: "Settings", 
                      route: "/apps/knowledge-base/settings",
                      component: "KBSettings",
                      permissions: ["admin"],
                      icon: "settings",
                      menuOrder: 5,
                      isDefault: false
                    }
                  ]
                }
              })
              .eq('feature_slug', feature.slug);

            if (error) {
              console.error(`Error syncing ${feature.slug}:`, error);
            } else {
              console.log(`✅ Successfully synced ${feature.slug}`);
            }
          } catch (error) {
            console.error(`Error syncing ${feature.slug}:`, error);
          }
        }
      }
    };

    syncFeatures();
  }, [features]);
}