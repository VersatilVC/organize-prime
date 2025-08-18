import { supabase } from '@/integrations/supabase/client';

// Ensure Knowledge Base feature is properly configured in database
export async function ensureKBFeatureConfig() {
  try {
    // Check if knowledge-base feature exists in system_feature_configs
    const { data: existingFeature, error: fetchError } = await supabase
      .from('system_feature_configs')
      .select('*')
      .eq('feature_slug', 'knowledge-base')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // If feature doesn't exist, create it
    if (!existingFeature) {
      const kbConfig = {
        feature_slug: 'knowledge-base',
        display_name: 'Knowledge Base',
        description: 'AI-powered document search and knowledge management',
        category: 'productivity',
        icon_name: 'database',
        color_hex: '#0ea5e9',
        is_enabled_globally: true,
        is_marketplace_visible: true,
        system_menu_order: 1,
        feature_pages: [
          {
            path: '',
            component: 'KBApp',
            title: 'Knowledge Base',
            layout: 'fullscreen'
          },
          {
            path: '*',
            component: 'KBApp',
            title: 'Knowledge Base',
            layout: 'fullscreen'
          }
        ],
        navigation_config: {
          menu_items: [
            {
              label: 'Dashboard',
              path: '/dashboard',
              icon: 'home'
            },
            {
              label: 'Documents',
              path: '/documents',
              icon: 'file'
            },
            {
              label: 'Search',
              path: '/search',
              icon: 'search'
            },
            {
              label: 'Collections',
              path: '/collections',
              icon: 'folder'
            },
            {
              label: 'Settings',
              path: '/settings',
              icon: 'settings',
              requiresRole: 'admin'
            }
          ]
        }
      };

      const { error: insertError } = await supabase
        .from('system_feature_configs')
        .insert([kbConfig]);

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Knowledge Base feature configuration created successfully');
    } else {
      console.log('✅ Knowledge Base feature configuration already exists');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to ensure KB feature config:', error);
    return false;
  }
}

// Check if other common features exist and create them if needed
export async function ensureCommonFeatureConfigs() {
  const commonFeatures = [
    {
      feature_slug: 'content-creation',
      display_name: 'Content Engine',
      description: 'Advanced content creation and management platform',
      category: 'productivity',
      icon_name: 'edit',
      color_hex: '#10b981',
      system_menu_order: 2,
      feature_pages: [
        { path: '', component: 'FeatureDashboard', title: 'Dashboard' },
        { path: 'dashboard', component: 'FeatureDashboard', title: 'Dashboard' },
        { path: 'projects', component: 'FeatureContent', title: 'Projects' },
        { path: 'library', component: 'FeatureContent', title: 'Library' },
        { path: 'templates', component: 'FeatureContent', title: 'Templates' },
        { path: 'settings', component: 'FeatureSettings', title: 'Settings', requiresRole: 'admin' }
      ],
      navigation_config: {
        menu_items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'home' },
          { label: 'Projects', path: '/projects', icon: 'briefcase' },
          { label: 'Library', path: '/library', icon: 'library' },
          { label: 'Templates', path: '/templates', icon: 'layout' },
          { label: 'Settings', path: '/settings', icon: 'settings', requiresRole: 'admin' }
        ]
      }
    },
    {
      feature_slug: 'market-intel',
      display_name: 'Market Intelligence',
      description: 'Real-time market analysis and competitive intelligence',
      category: 'analytics',
      icon_name: 'trendingUp',
      color_hex: '#8b5cf6',
      system_menu_order: 3,
      feature_pages: [
        { path: '', component: 'FeatureDashboard', title: 'Dashboard' },
        { path: 'dashboard', component: 'FeatureDashboard', title: 'Dashboard' },
        { path: 'funding', component: 'FeatureContent', title: 'Funding' },
        { path: 'competitors', component: 'FeatureContent', title: 'Competitors' },
        { path: 'signals', component: 'FeatureContent', title: 'Signals' },
        { path: 'reports', component: 'FeatureContent', title: 'Reports' },
        { path: 'settings', component: 'FeatureSettings', title: 'Settings', requiresRole: 'admin' }
      ],
      navigation_config: {
        menu_items: [
          { label: 'Dashboard', path: '/dashboard', icon: 'home' },
          { label: 'Funding', path: '/funding', icon: 'dollarSign' },
          { label: 'Competitors', path: '/competitors', icon: 'users' },
          { label: 'Signals', path: '/signals', icon: 'radar' },
          { label: 'Reports', path: '/reports', icon: 'fileText' },
          { label: 'Settings', path: '/settings', icon: 'settings', requiresRole: 'admin' }
        ]
      }
    }
  ];

  for (const feature of commonFeatures) {
    try {
      const { data: existing } = await supabase
        .from('system_feature_configs')
        .select('id')
        .eq('feature_slug', feature.feature_slug)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('system_feature_configs')
          .insert([{
            ...feature,
            is_enabled_globally: true,
            is_marketplace_visible: true
          }]);

        if (error) {
          console.error(`Failed to create ${feature.feature_slug}:`, error);
        } else {
          console.log(`✅ Created ${feature.feature_slug} feature configuration`);
        }
      }
    } catch (error) {
      console.error(`Error checking ${feature.feature_slug}:`, error);
    }
  }
}