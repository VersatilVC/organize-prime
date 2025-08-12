# **OrganizePrime - Progressive Feature Development Platform**

## **Platform Architecture & Progressive Development Methodology**

### **Core Development Philosophy: Progressive Feature Building**
OrganizePrime uses a sophisticated database-driven feature system that enables progressive development through focused, incremental prompts. This approach ensures maintainable code, consistent patterns, and scalable architecture.

**Key Principles:**
- **Single-Focus Prompts:** Each development request should target one specific functionality
- **Layer-by-Layer Building:** Database → Types → Hooks → Components → UI → Integration
- **Consistent Patterns:** Follow established conventions for hooks, components, and services
- **Performance-First:** All features built with caching, memoization, and optimization from start

### **Current Platform State**
- **Production-Ready:** Multi-tenant SaaS with 21 database tables and comprehensive RLS
- **Feature System:** Dynamic app marketplace with database-driven navigation and routing
- **Knowledge Base Status:** Basic structure implemented, internal functionality in active development
- **Architecture:** React 18 + TypeScript + Supabase + TanStack Query with advanced performance optimizations

## **Progressive Development Guidelines**

### **✅ Effective Progressive Prompts**
```
"Implement file upload functionality for Knowledge Base with progress tracking"
"Add real-time chat interface with message history for KB conversations"
"Create analytics dashboard showing KB usage statistics"
"Build search functionality with filters and result highlighting"
```

### **❌ Avoid Monolithic Requests**
```
"Build the entire Knowledge Base app with all features"
"Implement everything for KB including files, chat, search, and analytics"
"Create a complete document management system"
```

### **Recommended Development Sequence**
1. **Core Infrastructure** (Database tables, types, base hooks)
2. **Data Management** (CRUD operations, caching, validation)
3. **UI Components** (Forms, lists, cards, modals)
4. **Feature Integration** (N8N webhooks, file processing, AI chat)
5. **Advanced Features** (Analytics, search, real-time updates)

## **Knowledge Base Feature - Current Implementation Status**

### **Database Architecture (Progressive Implementation)**

**Currently Implemented:**
- `system_feature_configs` - Feature configuration with dynamic navigation
- `organization_feature_configs` - Organization-level feature settings
- `kb_configurations` - Knowledge base instances per organization

**Next Phase (Core Tables):**
```sql
-- Files and documents
kb_files, kb_documents, kb_vectors

-- Chat and conversations  
kb_conversations, kb_messages

-- Analytics and tracking
kb_analytics, kb_searches
```

**Future Phases:**
- Advanced analytics tables
- Integration-specific tables
- Performance optimization tables

### **Component Architecture (Progressive Structure)**

**Current Structure:**
```
src/apps/knowledge-base/
├── components/ (Basic layout components)
├── pages/ (6 page placeholders with navigation)
├── hooks/ (Placeholder hooks for data fetching)
├── types/ (Basic TypeScript interfaces)
├── services/ (N8N webhook service scaffolds)
└── config/ (App configuration and defaults)
```

**Progressive Development Pattern:**
1. **Hooks First:** Build data fetching and state management
2. **Types:** Define comprehensive TypeScript interfaces
3. **Services:** Implement API clients and external integrations
4. **Components:** Create reusable UI components
5. **Pages:** Assemble components into full page experiences

### **N8N Webhook Integration Strategy**

**Current Webhooks (Configured):**
- `/webhook/kb-process-file` - File processing automation
- `/webhook/kb-ai-chat` - AI chat conversation handling

**Progressive Implementation:**
1. **Phase 1:** Basic webhook triggers and response handling
2. **Phase 2:** Advanced workflow automation and data processing
3. **Phase 3:** Real-time updates and event streaming

## **Technology Stack & Performance Standards**

### **Core Technologies**
- **Frontend:** React 18 + TypeScript 5.5 + Vite (SWC compiler)
- **UI:** Tailwind CSS + shadcn/ui (fully tree-shaken)
- **Backend:** Supabase (PostgreSQL 15, RLS, Storage, Edge Functions)
- **State:** TanStack Query v5 + React Context (split by update frequency)
- **Performance:** Code splitting, lazy loading, intelligent caching

### **Required Performance Patterns**
- **React.memo** for all list components and complex props
- **Debounced inputs** (300ms standard) for all form fields
- **Intelligent caching** with stale-while-revalidate patterns
- **Lazy loading** for routes and heavy third-party components
- **Error boundaries** with graceful fallbacks at feature level

### **Caching Strategy (By Data Type)**
```typescript
// Static data: 5min stale, 30min GC
useQuery('kb-configurations', { staleTime: 5 * 60 * 1000 })

// Dynamic data: 30s stale, 5min GC  
useQuery('kb-messages', { staleTime: 30 * 1000 })

// Real-time: 10s stale, background refetch
useQuery('kb-analytics', { staleTime: 10 * 1000 })
```

## **Development Standards & Code Quality**

### **File Structure Conventions**
```
src/apps/knowledge-base/
├── hooks/
│   ├── useKB[Feature].ts (e.g., useKBFiles, useKBChat)
│   └── useKB[Feature]Mutations.ts (for write operations)
├── components/
│   ├── [Feature]/ (e.g., Files/, Chat/, Analytics/)
│   └── shared/ (reusable KB components)
├── services/
│   ├── [feature]Service.ts (API clients)
│   └── [feature]ProcessingService.ts (N8N integration)
├── types/
│   └── [Feature]Types.ts (comprehensive interfaces)
└── pages/
    └── KB[Feature].tsx (page assembly)
```

### **Component Development Patterns**
```typescript
// 1. Always use React.memo for performance
export const KBFileCard = React.memo(({ file, onAction }: KBFileCardProps) => {
  // 2. Implement proper loading and error states
  const { data: fileData, isLoading, error } = useKBFile(file.id);
  
  // 3. Use semantic design tokens
  return (
    <Card className="bg-card border-border hover:bg-accent/50">
      {/* Implementation */}
    </Card>
  );
});

// 4. Proper TypeScript interfaces
interface KBFileCardProps {
  file: KBFile;
  onAction: (action: string, fileId: string) => void;
}
```

### **Database Integration Patterns**
```typescript
// 1. Use custom hooks for all DB operations
export function useKBFiles(orgId: string) {
  return useQuery({
    queryKey: ['kb-files', orgId],
    queryFn: () => kbService.listFiles(orgId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// 2. Implement mutations with optimistic updates
export function useKBFileMutations(orgId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: kbService.uploadFile,
    onMutate: async (newFile) => {
      // Optimistic update implementation
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['kb-files', orgId]);
    },
  });
}
```

## **Security & RLS Implementation**

### **Knowledge Base Security Model**
- **Organization Isolation:** All KB data scoped to organization_id
- **Role-Based Access:** admin (full access), user (read + limited write)
- **File Security:** Organization-scoped storage with signed URLs
- **API Security:** Rate limiting and input validation on all endpoints

### **Required RLS Patterns**
```sql
-- Example RLS policy for KB tables
CREATE POLICY "Users can access org KB data" ON kb_files
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = kb_files.organization_id 
    AND status = 'active'
  )
);
```

## **Knowledge Base Feature Roadmap**

### **Phase 1: Core Infrastructure (Current)**
- [x] Basic app structure and navigation
- [x] Database schema foundation
- [x] N8N webhook scaffolding
- [ ] File management system
- [ ] Document processing pipeline

### **Phase 2: User Functionality (Next 2-4 weeks)**
- [ ] File upload with progress tracking
- [ ] Document viewing and management
- [ ] Basic search functionality
- [ ] AI chat interface with conversation history

### **Phase 3: Advanced Features (1-2 months)**
- [ ] Advanced analytics dashboard
- [ ] Real-time collaboration features  
- [ ] Workflow automation integration
- [ ] Advanced search with filtering

### **Phase 4: Enterprise Features (2-3 months)**
- [ ] API key management for external access
- [ ] Bulk operations and data import
- [ ] Advanced security and audit logging
- [ ] Integration marketplace

## **Development Best Practices**

### **Prompt Structure for Maximum Efficiency**
1. **Context:** Brief description of what you're building
2. **Specific Goal:** Single, focused functionality to implement
3. **Technical Requirements:** Performance, security, or integration needs
4. **Expected Outcome:** What success looks like

### **Code Quality Standards**
- **TypeScript Strict Mode:** Zero tolerance for implicit any
- **Component Testing:** React Testing Library for all UI components
- **Performance Testing:** Bundle size and render performance monitoring
- **Security Testing:** RLS policy verification and input validation

### **Integration Guidelines**
- **N8N Webhooks:** Always implement retry logic and error handling
- **File Processing:** Use background jobs with progress tracking
- **Real-time Features:** Implement with Supabase realtime subscriptions
- **External APIs:** Include rate limiting and circuit breaker patterns

This knowledge base serves as the foundation for all Knowledge Base feature development, ensuring consistent, scalable, and maintainable code while following progressive development methodology.