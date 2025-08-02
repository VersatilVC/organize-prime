// Notification template variable replacement utility

export interface NotificationVariables {
  user_name?: string;
  organization_name?: string;
  app_name?: string;
  new_user_name?: string;
  inviter_name?: string;
  [key: string]: string | undefined;
}

/**
 * Replace template variables in notification content
 * Supports variables in format: {{variable_name}}
 */
export function replaceTemplateVariables(
  content: string,
  variables: NotificationVariables = {}
): string {
  if (!content) return content;

  return content.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];
    if (value !== undefined) {
      return value;
    }
    
    // Return placeholder for missing variables
    return `[${variableName}]`;
  });
}

/**
 * Generate preview data for template testing
 */
export function getPreviewVariables(): NotificationVariables {
  return {
    user_name: 'John Doe',
    organization_name: 'Acme Corporation',
    app_name: 'The Ultimate B2B App',
    new_user_name: 'Jane Smith',
    inviter_name: 'Bob Johnson'
  };
}

/**
 * Validate template syntax and return any issues
 */
export function validateTemplate(content: string): string[] {
  const issues: string[] = [];
  
  if (!content) {
    issues.push('Template content is empty');
    return issues;
  }

  // Check for unclosed variables
  const openBraces = (content.match(/\{\{/g) || []).length;
  const closeBraces = (content.match(/\}\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    issues.push('Mismatched template variable braces');
  }

  // Check for empty variables
  const emptyVariables = content.match(/\{\{\s*\}\}/g);
  if (emptyVariables) {
    issues.push('Empty template variables found');
  }

  return issues;
}

/**
 * Extract all variable names from template content
 */
export function extractVariables(content: string): string[] {
  if (!content) return [];
  
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  return matches.map(match => match.replace(/[\{\}]/g, ''));
}

/**
 * Check if a notification is a first login welcome notification
 */
export function isWelcomeNotification(notification: { type: string; category?: string | null }): boolean {
  return notification.type === 'welcome_first_login' || 
         notification.category === 'welcome' ||
         notification.type.includes('welcome');
}