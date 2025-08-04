// Centralized service layer for better organization and testing
import { supabase } from '@/integrations/supabase/client';
import { User, Organization, Invitation, InvitationRequest, InvitationResponse } from '@/types/api';

// Custom error classes for better error handling
export class ServiceError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public validationErrors?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

// User Service
export class UserService {
  private static instance: UserService;
  
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    // Use the existing optimized function that's already working
    const { data, error } = await supabase.rpc('get_users_optimized', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_organization_id: organizationId,
      p_page: 0,
      p_page_size: 100
    });

    if (error) {
      throw new ServiceError('Failed to fetch users', error);
    }

    return data?.map((user: any) => ({
      id: user.user_id,
      full_name: user.full_name || '',
      username: user.username || '',
      avatar_url: user.avatar_url,
      email: user.email || '',
      role: user.role as 'admin' | 'user',
      status: user.status as 'active' | 'inactive',
      joinedAt: user.joined_at,
      lastLoginAt: user.last_login_at
    })) || [];
  }

  async inviteUser(invitationData: InvitationRequest): Promise<InvitationResponse> {
    // Basic validation
    if (!invitationData.email || !invitationData.organizationId) {
      throw new ValidationError('Email and organization ID are required');
    }

    // Check if user already exists in the organization
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id, profiles!inner(id)')
      .eq('organization_id', invitationData.organizationId)
      .eq('status', 'active')
      .eq('profiles.id', invitationData.invitedBy)
      .maybeSingle();

    // Generate secure token
    const token = crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');

    // Create invitation
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: invitationData.email,
        organization_id: invitationData.organizationId,
        role: invitationData.role,
        invited_by: invitationData.invitedBy,
        token,
        message: invitationData.message,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BusinessLogicError('User has already been invited to this organization');
      }
      throw new ServiceError('Failed to create invitation', error);
    }

    // Send invitation email via edge function
    await this.sendInvitationEmail(data);

    return {
      id: data.id,
      email: data.email,
      expiresAt: data.expires_at
    };
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        username: data.username,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new ServiceError('Failed to update user profile', error);
    }

    return {
      id: updatedProfile.id,
      full_name: updatedProfile.full_name || '',
      username: updatedProfile.username || '',
      avatar_url: updatedProfile.avatar_url,
      email: '',
      role: data.role,
      status: data.status,
      lastLoginAt: updatedProfile.last_login_at
    };
  }

  async updateUserRole(userId: string, organizationId: string, role: 'admin' | 'user'): Promise<void> {
    const { error } = await supabase
      .from('memberships')
      .update({ role })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ServiceError('Failed to update user role', error);
    }
  }

  async removeUserFromOrganization(userId: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('memberships')
      .update({ status: 'inactive' })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ServiceError('Failed to remove user from organization', error);
    }
  }

  private async sendInvitationEmail(invitation: any): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitation_id: invitation.id,
          email: invitation.email,
          token: invitation.token
        }
      });

      if (error) {
        console.error('Failed to send invitation email:', error);
        // Don't throw here - invitation is created, email is secondary
      }
    } catch (error) {
      console.error('Email service error:', error);
    }
  }
}

// Organization Service
export class OrganizationService {
  private static instance: OrganizationService;
  
  static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService();
    }
    return OrganizationService.instance;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        role,
        organizations!inner(
          id,
          name,
          slug,
          logo_url,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new ServiceError('Failed to fetch user organizations', error);
    }

    return memberships?.map(membership => ({
      id: membership.organizations.id,
      name: membership.organizations.name,
      slug: membership.organizations.slug,
      logo_url: membership.organizations.logo_url,
      userRole: membership.role as 'admin' | 'user',
      createdAt: membership.organizations.created_at
    })) || [];
  }

  async createOrganization(name: string, userId: string): Promise<Organization> {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug
      })
      .select()
      .single();

    if (orgError) {
      throw new ServiceError('Failed to create organization', orgError);
    }

    // Create membership for the creator as admin
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        organization_id: organization.id,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString()
      });

    if (membershipError) {
      throw new ServiceError('Failed to create organization membership', membershipError);
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo_url: organization.logo_url,
      userRole: 'admin',
      createdAt: organization.created_at
    };
  }
}

// Feedback Service
export class FeedbackService {
  private static instance: FeedbackService;
  
  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  async createFeedback(feedbackData: {
    subject: string;
    description: string;
    type: string;
    category?: string;
    priority?: string;
    userId: string;
    organizationId: string;
  }) {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        subject: feedbackData.subject,
        description: feedbackData.description,
        type: feedbackData.type,
        category: feedbackData.category,
        priority: feedbackData.priority || 'medium',
        user_id: feedbackData.userId,
        organization_id: feedbackData.organizationId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new ServiceError('Failed to create feedback', error);
    }

    return data;
  }

  async getFeedbackByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        profiles!inner(
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ServiceError('Failed to fetch feedback', error);
    }

    return data;
  }

  async updateFeedbackStatus(feedbackId: string, status: string, adminResponse?: string) {
    const updateData: any = { status };
    if (adminResponse) {
      updateData.admin_response = adminResponse;
      updateData.responded_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      throw new ServiceError('Failed to update feedback status', error);
    }

    return data;
  }
}

// Export service instances
export const userService = UserService.getInstance();
export const organizationService = OrganizationService.getInstance();
export const feedbackService = FeedbackService.getInstance();