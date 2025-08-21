# Visual Button-Level Webhook System - Preview Mode

This directory contains the Phase 4 implementation of the Visual Button-Level Webhook System for OrganizePrime.

## Architecture Overview

The preview system consists of four main components working together:

### 1. PreviewController (`PreviewController.tsx`)
- **Purpose**: Core state management for preview mode
- **Features**:
  - Session storage persistence
  - Keyboard shortcuts (ESC to exit)
  - Global state management via React Context
  - Body class management for preview mode styling

### 2. PreviewToggle (`PreviewToggle.tsx`)
- **Purpose**: Header toggle button for super admins
- **Features**:
  - Visual status indicators (ON/OFF badge, configuration icon)
  - Tooltip with contextual help
  - Keyboard shortcut support (Ctrl/Cmd + Shift + P)
  - Role-based access control

### 3. ElementScanner (`ElementScanner.tsx`)
- **Purpose**: Detects and manages interactive elements
- **Features**:
  - Automatic scanning for interactive elements (buttons, forms, inputs)
  - Element signature generation for stable identification
  - Event handling for clicks and hover states
  - Dynamic DOM mutation observation
  - Integration with visual overlays

### 4. VisualOverlay (`VisualOverlay.tsx`)
- **Purpose**: Visual feedback and element highlighting
- **Features**:
  - Dynamic element highlighting with selection states
  - Contextual overlay information panels
  - Real-time position tracking and viewport adjustment
  - Global preview mode indicator

### 5. ConfigurationPanel (`ConfigurationPanel.tsx`)
- **Purpose**: Slide-out panel for webhook configuration
- **Features**:
  - Full CRUD operations for webhook configurations
  - Real-time webhook testing
  - Element registry integration
  - Form validation and error handling
  - Database persistence via Supabase

## Integration Points

### Database Schema
The system integrates with the new efficient database schema:
- `element_registry`: Stable element identification
- `element_webhooks`: Webhook configurations
- `webhook_executions`: Audit logging

### Authentication & Authorization
- Super admin only access via `useUserRole()` hook
- Organization-scoped data via RLS policies
- User tracking for audit purposes

### Element Identification
The system uses a content-based signature approach:
```typescript
const signature = generateElementSignature(element);
const contentHash = generateElementContentHash(element);
```

This provides stable identification even when DOM structure changes.

### Preview System UI Exclusion
The system automatically excludes its own UI elements from webhook detection:
- Preview toggle button and related controls
- Configuration panels and overlays
- Visual highlight elements
- Tooltip content and dropdown menus
- Any element with `data-preview-system="true"` attribute

This prevents the preview system from interfering with itself (e.g., clicking the preview toggle won't trigger webhook configuration).

## User Experience Flow

1. **Activation**: Super admin clicks the Preview toggle in the header
2. **Detection**: System scans the page for interactive elements
3. **Visualization**: Interactive elements are highlighted on hover
4. **Selection**: Clicking an element selects it and shows configuration options
5. **Configuration**: Slide-out panel opens for webhook setup
6. **Persistence**: Configurations are saved to database with element registry

## Security Features

- **Content-based hashing**: SHA256 hashes prevent element tampering
- **Organization isolation**: RLS policies ensure data separation
- **Role-based access**: Only super admins can access preview mode
- **Audit logging**: All webhook executions are tracked
- **Input validation**: Forms use Zod validation and sanitization

## Performance Optimizations

- **Efficient scanning**: Only scans when preview mode is active
- **Debounced updates**: DOM mutations are debounced to prevent excessive rescans
- **Session persistence**: Preview state survives navigation
- **Lazy loading**: Components only render when needed
- **Portal rendering**: Overlays use React portals for optimal performance

## Browser Compatibility

- **Modern browsers**: ES2020+ features used (Chrome 80+, Firefox 72+, Safari 14+)
- **Polyfill support**: No polyfills required for target browsers
- **Mobile responsive**: Touch-friendly interface for mobile devices
- **Screen reader**: ARIA labels and semantic HTML for accessibility

## Development Guidelines

### Adding New Interactive Element Types
1. Update `isInteractiveElement()` in `element-utils.ts`
2. Add appropriate event handling in `ElementScanner.tsx`
3. Update interaction type mapping in `getElementDisplayInfo()`

### Extending Configuration Options
1. Update `WebhookConfiguration` interface in `ConfigurationPanel.tsx`
2. Add database fields to `element_webhooks` table
3. Update form validation and UI components

### Performance Monitoring
- Use browser dev tools to monitor DOM mutation frequency
- Check React DevTools for unnecessary re-renders
- Monitor network requests during configuration saves

## Testing Strategy

### Unit Tests
- Element identification accuracy
- State management correctness
- Database operations

### Integration Tests
- End-to-end preview mode workflow
- Cross-browser compatibility
- Mobile responsiveness

### User Acceptance Tests
- Super admin can enable preview mode
- Elements are correctly identified and highlighted
- Webhook configurations persist and execute properly

## Deployment Considerations

- **Database migrations**: Ensure new schema is applied before deployment
- **Environment variables**: No new environment variables required
- **Feature flags**: Preview mode is controlled by user roles, no additional flags needed
- **Monitoring**: Consider adding webhook execution metrics to observability stack

## Future Enhancements

### Planned Features
- **Bulk configuration**: Configure multiple elements at once
- **Template system**: Reusable webhook configuration templates
- **Advanced filtering**: Filter elements by type, location, or attributes
- **Export/import**: Backup and restore webhook configurations

### Optimization Opportunities
- **WebWorker scanning**: Move element scanning to web worker for large pages
- **Virtual scrolling**: Handle pages with thousands of interactive elements
- **Caching**: Cache element signatures for faster subsequent scans