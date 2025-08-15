import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Global function to verify demo user - accessible from browser console
(window as any).checkDemoUser = async () => {
  console.log('🔍 Checking demo user status...');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No user logged in');
      return false;
    }
    
    console.log('👤 Current user:', user.email, user.id);
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return false;
    }
    
    console.log('👤 Profile:', profile);
    
    // Check memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id);
      
    if (membershipError) {
      console.error('❌ Membership error:', membershipError);
    } else {
      console.log('🏢 Memberships:', memberships);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Check error:', error);
    return false;
  }
};

// Global function to fix demo user - accessible from browser console
(window as any).fixDemoUser = async () => {
  console.log('🔧 Fixing demo user...');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No user logged in');
      return false;
    }
    
    console.log('👤 Fixing user:', user.email);
    
    // Update profile to ensure super admin
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        is_super_admin: true,
        full_name: 'Demo Super Admin',
        username: 'demo_admin'
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return false;
    }
    
    console.log('✅ Profile updated:', profile);
    console.log('🔄 Please refresh the page to see changes');
    return true;
  } catch (error) {
    console.error('❌ Fix error:', error);
    return false;
  }
};

// Global function to create demo user - accessible from browser console
(window as any).createDemoUser = async () => {
  console.log('🚀 Creating demo super admin user...');
  
  try {
    // Sign up the demo user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@demo.com',
      password: 'Demo123!',
      options: {
        data: {
          full_name: 'Demo Super Admin',
          username: 'demo_admin'
        }
      }
    });

    if (signUpError) {
      console.error('❌ SignUp error:', signUpError);
      
      // If user already exists, try to sign in to test
      if (signUpError.message.includes('already registered')) {
        console.log('👤 User already exists, testing login...');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@demo.com',
          password: 'Demo123!'
        });
        
        if (signInError) {
          console.error('❌ Login test failed:', signInError.message);
          return false;
        } else {
          console.log('✅ Demo user exists and login works!');
          await supabase.auth.signOut(); // Sign out after test
          return true;
        }
      }
      
      return false;
    }

    if (authData.user) {
      console.log('👤 User created, setting up profile...');
      
      // Update profile to make super admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_super_admin: true,
          full_name: 'Demo Super Admin',
          username: 'demo_admin'
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('⚠️ Profile update error:', updateError);
      } else {
        console.log('✅ Profile updated with super admin privileges');
      }

      // Create demo organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Demo Organization',
          domain: 'demo.com',
          settings: { allow_external_invites: true }
        })
        .select()
        .single();

      if (orgError && !orgError.message.includes('duplicate')) {
        console.error('⚠️ Organization creation error:', orgError);
      } else {
        console.log('🏢 Demo organization created');
      }

      // Create membership if organization was created
      if (orgData) {
        const { error: membershipError } = await supabase
          .from('memberships')
          .insert({
            user_id: authData.user.id,
            organization_id: orgData.id,
            role: 'admin',
            status: 'active'
          });

        if (membershipError) {
          console.error('⚠️ Membership creation error:', membershipError);
        } else {
          console.log('👥 Membership created');
        }
      }

      // Sign out the user so they can log in normally
      await supabase.auth.signOut();
      
      console.log('✅ Demo super admin user created successfully!');
      console.log('📧 Email: admin@demo.com');
      console.log('🔑 Password: Demo123!');
      console.log('🎯 You can now log in at /auth');
      return true;
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
};

export function DemoUserSetup() {
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');

  const createDemoUser = async () => {
    setIsCreating(true);
    try {
      // Sign up the demo user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: 'admin@demo.com',
        password: 'Demo123!',
        options: {
          data: {
            full_name: 'Demo Super Admin',
            username: 'demo_admin'
          }
        }
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        
        // If user already exists, try to sign in
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: 'admin@demo.com',
            password: 'Demo123!'
          });
          
          if (signInError) {
            setMessage(`Demo user exists but login failed: ${signInError.message}`);
          } else {
            setMessage('✅ Demo user already exists - you can log in with admin@demo.com / Demo123!');
          }
          return;
        }
        
        setMessage(`❌ Error creating demo user: ${signUpError.message}`);
        return;
      }

      if (authData.user) {
        // Update profile to make super admin
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            is_super_admin: true,
            full_name: 'Demo Super Admin',
            username: 'demo_admin'
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
        }

        // Create demo organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: 'Demo Organization',
            domain: 'demo.com',
            settings: { allow_external_invites: true }
          })
          .select()
          .single();

        if (orgError && !orgError.message.includes('duplicate')) {
          console.error('Organization creation error:', orgError);
        }

        // Create membership if organization was created
        if (orgData) {
          const { error: membershipError } = await supabase
            .from('memberships')
            .insert({
              user_id: authData.user.id,
              organization_id: orgData.id,
              role: 'admin',
              status: 'active'
            });

          if (membershipError) {
            console.error('Membership creation error:', membershipError);
          }
        }

        setMessage('✅ Demo super admin user created successfully!\n📧 Email: admin@demo.com\n🔑 Password: Demo123!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage(`❌ Unexpected error: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-md z-50">
      <h3 className="font-semibold mb-2">Demo User Setup</h3>
      
      <button
        onClick={createDemoUser}
        disabled={isCreating}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mb-2"
      >
        {isCreating ? 'Creating...' : 'Create Demo Super Admin'}
      </button>
      
      {message && (
        <div className="text-sm whitespace-pre-line p-2 bg-gray-50 rounded">
          {message}
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        This will create admin@demo.com with password Demo123!
      </div>
    </div>
  );
}