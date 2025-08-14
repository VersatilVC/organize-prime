# Comprehensive Debugging Manual for Lovable

## Before You Begin

This debugging manual is organized by error types to help you systematically troubleshoot issues in your Lovable project. 

**How to use this manual:**

1. Read this document and identify which error category your issue falls into
2. Use the provided prompt template for your specific error type
3. When Lovable gives you a prompt or suggested fix, add this to the very end of your message:

   > "Before you proceed, answer me in great detail - Why do you think this will work? Wait for my approval."

## Additional Debugging Approaches

When dealing with persistent issues, try these approaches:

- **Refactor the file**: Split large files into smaller chunks to make them easier for Lovable to process
- **Use external AI tools**: Download the problematic files and load them into Claude 3.7 or ChatGPT for line-by-line code generation
- **Add more console logs**: Ask Lovable to add console logs after each critical step for granular diagnosis
- **Ask Lovable for better prompts**: Request Lovable to analyze the issue and provide a better debugging prompt

---

## Type Mismatches & TypeScript Errors

### Prompt Template:
```
Please analyze this TypeScript error:
1. Show the relevant type definitions from both DB schema and TypeScript
2. Trace the data transformation pipeline
3. Identify where types diverge
4. Suggest fixes that maintain type safety
```

### Understanding Type Errors

When you encounter a TypeScript error, it's crucial to understand what the compiler is telling you:

1. **Property Missing Errors**: Your object shape doesn't match what's expected (like a puzzle piece missing a tab)
2. **Possible Undefined Errors**: TypeScript thinks a value might not exist (check before accessing)
3. **Type Assignment Errors**: Trying to put a square peg in a round hole (shapes don't match)

### Debugging Strategy

**Step 1: Identify the Source**
- Look at where the data originates (database, API, user input)
- Track how it flows through your application
- Find where the type mismatch first occurs

**Step 2: Compare Types**
- Look at your database schema
- Check your TypeScript interfaces
- Compare them side by side for mismatches in:
  - Property names
  - Data types
  - Optional vs required fields

**Step 3: Check Data Transformations**
- Look for places where data is transformed
- Verify that transformations maintain type safety
- Check for implicit type conversions

**Step 4: Common Patterns**
Think about these common scenarios:
- Database numbers coming in as strings
- Dates needing parsing
- Nullable fields not being handled
- Optional properties being treated as required

### Best Practices

- **Type Safety First**: Always define expected shapes, don't use 'any' as an escape hatch
- **Consistent Naming**: Use the same property names throughout, be consistent with casing
- **Documentation**: Comment complex type relationships and explain special handling
- **Testing**: Test with real data shapes, verify edge cases, check null/undefined handling

---

## Data Flow Issues (UI not reflecting DB)

### Prompt Template:
```
I have a mismatch between database and UI values. Please:
1. Show the data flow: DB → API → State → UI
2. Check query/mutation invalidation patterns
3. Verify data transformations at each step
4. Add console.logs at critical points
5. Review RLS policies that might affect data access
```

### Understanding Data Flow Problems

Think of data flow like a river system:
- **Database**: The source (lake)
- **API calls**: The rivers
- **State management**: Reservoirs
- **UI components**: Irrigation systems

When your UI isn't showing the right data, there's a blockage somewhere in this system.

### Common Data Flow Issues

1. **Stale Data**: UI doesn't update when database changes
2. **Data Transformation Problems**: Data changes shape unexpectedly
3. **State Management Issues**: State updates don't trigger re-renders

### How to Debug Data Flow

1. **Follow the Data Journey**: Start at the database and check each step
2. **Check the Timing**: When should data update? What triggers updates?
3. **Verify Data Shapes**: What does data look like at each transformation point?

### Best Practices

- **Monitoring**: Add strategic console logs, track state changes
- **Testing**: Test data transformations, verify state updates
- **Error Handling**: Implement graceful degradation and user feedback

---

## Supabase-Specific Issues

### Prompt Template:
```
I'm encountering a Supabase error. Please:
1. Show the relevant table schemas and RLS policies
2. Check foreign key relationships
3. Verify data types between Supabase and TypeScript
4. Review query syntax for Supabase client
5. Check edge function logs if relevant
```

### Understanding Supabase Architecture

Think of Supabase like a house:
- **Tables**: Rooms
- **RLS policies**: Security guards
- **Foreign keys**: Doorways between rooms
- **Triggers**: Automatic systems

### Common Supabase Issues

1. **Authentication Problems**: Token expiration, missing RLS policies, wrong role permissions
2. **Data Access Issues**: RLS blocking requests, foreign key failures, type mismatches

### Debugging Steps

1. **Check Access Rights**: Review RLS policies, verify user roles, check token validity
2. **Data Integrity**: Examine table relationships, verify constraints, check data types

### Best Practices

- **RLS Policy Design**: Start restrictive, add permissions gradually
- **Data Modeling**: Plan relationships carefully, use appropriate data types
- **Error Handling**: Catch specific Supabase errors, provide meaningful feedback

---

## State Management Problems

### Prompt Template:
```
My component state isn't working as expected. Please:
1. Show the state management flow
2. Check React Query invalidation patterns
3. Verify effect dependencies
4. Review component re-render triggers
5. Check for race conditions in async operations
```

### Understanding React State Flow

Think of state like a building's electrical system:
- **Global state**: Main power supply
- **Local state**: Individual room circuits
- **Props**: Power outlets
- **Effects**: Automatic switches

### Common State Issues

1. **State Updates Not Reflecting**: Component not re-rendering, stale closures
2. **React Query Problems**: Cache invalidation timing, stale data handling
3. **State Synchronization**: Multiple sources of truth, race conditions

### Best Practices

- **State Organization**: Keep state close to usage, split complex state
- **Performance Optimization**: Use appropriate hooks, implement memoization
- **Testing Strategy**: Test state transitions, verify update flows

---

## Performance Issues

### Prompt Template:
```
My application is experiencing performance issues. Please:
1. Review query caching strategy
2. Check unnecessary re-renders
3. Analyze data fetching patterns
4. Review component memoization
5. Check for N+1 query problems
```

### Understanding Performance Bottlenecks

Think of performance like a car's efficiency:
- **CPU usage**: Engine power
- **Memory usage**: Fuel consumption
- **Network calls**: Pit stops
- **Rendering**: Acceleration

### Common Performance Problems

1. **Rendering Issues**: Too many re-renders, heavy components, unoptimized lists
2. **Data Loading Problems**: Waterfall requests, over-fetching, cache mismanagement
3. **Network Performance**: Too many API calls, large payloads, slow response times

### Best Practices

- **Code Optimization**: Use proper hooks, implement virtualization, optimize bundle size
- **Data Management**: Implement caching, batch requests, use pagination
- **Asset Optimization**: Compress images, lazy load resources, use CDNs

---

## Authentication/Authorization Issues

### Prompt Template:
```
I'm having auth-related problems. Please:
1. Show the auth flow
2. Check RLS policies
3. Verify token handling
4. Review auth state management
5. Check role-based access control
```

### Understanding Auth Flow

Think of auth like a secure building:
- **Authentication**: ID check at entrance
- **Authorization**: Access cards for different areas
- **Tokens**: Temporary visitor badges
- **Roles**: Security clearance levels

### Common Auth Problems

1. **Authentication Issues**: Failed login attempts, token expiration, session management
2. **Authorization Problems**: Missing permissions, role confusion, access control gaps

### Best Practices

- **Security First**: Implement proper validation, use secure token storage
- **User Experience**: Clear error messages, smooth auth flow
- **Maintenance**: Regular token cleanup, policy reviews

---

## Edge Function Problems

### Prompt Template:
```
My edge function isn't working correctly. Please:
1. Show the edge function logs
2. Verify CORS configuration
3. Check secret/environment variable access
4. Review error handling
5. Verify function deployment status
```

### Understanding Edge Functions

Think of edge functions like local branches of a business:
- Closer to the customer (user)
- Faster response times
- Local processing
- Distributed computing

### Common Edge Function Issues

1. **Deployment Problems**: Function not updating, environment variables missing
2. **Integration Issues**: CORS configuration, API gateway problems

### Best Practices

- **Development**: Local testing, error handling, logging strategy
- **Deployment**: Environment management, secret handling, version control
- **Maintenance**: Regular updates, performance monitoring

---

## Database Constraints

### Prompt Template:
```
I'm getting database constraint errors. Please:
1. Show the relevant table schemas
2. Check foreign key relationships
3. Verify unique constraints
4. Review default values
5. Check null constraints
```

### Understanding Database Constraints

Think of database constraints like rules in a board game:
- **Primary keys**: Unique player IDs
- **Foreign keys**: Card relationships
- **Unique constraints**: One-of-a-kind items
- **Not null constraints**: Required moves

### Types of Constraints

1. **Primary Key Constraints**: Must be unique, cannot be null
2. **Foreign Key Constraints**: References other tables, maintains data integrity
3. **Unique Constraints**: No duplicates allowed
4. **Check Constraints**: Validates data values, enforces business rules

### Best Practices

- **Design Phase**: Plan constraints early, document requirements
- **Implementation**: Clear naming conventions, proper error messages
- **Maintenance**: Regular validation, performance monitoring

---

## Component Structure Issues

### Prompt Template:
```
My component structure isn't working. Please:
1. Show the component hierarchy
2. Review prop drilling patterns
3. Check context usage
4. Verify event handling
5. Review lifecycle methods
```

### Understanding Component Architecture

Think of components like building blocks:
- **Parent components**: Foundation blocks
- **Child components**: Specialized pieces
- **Props**: Connecting pins
- **State**: Internal wiring

### Common Component Issues

1. **Prop Drilling**: Props going through multiple levels unnecessarily
2. **Component Communication**: Problems with parent-child or sibling communication
3. **State Management**: Issues with local vs global state

### Best Practices

- **Component Design**: Single responsibility, clear interfaces
- **State Management**: Minimize prop drilling, use appropriate context
- **Performance**: Implement memoization, lazy loading

---

## API Integration Problems

### Prompt Template:
```
My API integration isn't working. Please:
1. Show the API call flow
2. Check error handling
3. Verify request/response types
4. Review authentication headers
5. Check CORS configuration
```

### Understanding API Architecture

Think of APIs like a restaurant service system:
- **Endpoints**: Menu items
- **Parameters**: Customization options
- **Headers**: Order specifications
- **Responses**: Delivered meals

### Common API Issues

1. **Request Problems**: Authentication failures, invalid parameters, CORS issues
2. **Response Handling**: Parsing errors, unexpected data formats, timeout issues

### Best Practices

- **Error Handling**: Catch specific errors, provide feedback, implement retries
- **Performance**: Implement caching, optimize queries, batch requests
- **Security**: Secure credentials, validate input, use HTTPS

---

## General Debugging Guide

### General Debugging Checklist:

1. Identify the error type from above categories
2. Use the relevant prompt template
3. Follow the step-by-step analysis
4. Check console logs at each step
5. Verify types match throughout the pipeline
6. Review relevant documentation
7. Test proposed solutions in isolation
8. Verify fix doesn't break other functionality

### Best Practices for Error Reports:

- Include full error message
- Show relevant code snippets
- Include console logs
- Describe expected vs actual behavior
- List recent changes that might have caused the issue
- Specify the environment (dev/prod)

### Systematic Approach

**The Scientific Method for Debugging:**

Think of debugging like being a detective:
1. **Observe** the problem (collect evidence)
2. **Form a hypothesis** (what might be wrong)
3. **Test the hypothesis** (investigate)
4. **Analyze results** (evaluate findings)
5. **Draw conclusions** (solve the case)

### Tools and Techniques

**Browser Developer Tools:**
- Console tab for logs
- Network tab for requests
- Elements tab for DOM
- Sources for breakpoints
- Performance for timing

**React Developer Tools:**
- Components tab
- Props inspection
- State viewing
- Hook examination
- Profiler tab

### Advanced Debugging

**Performance Debugging:**
- React Profiler
- Chrome Performance tab
- Memory usage
- Network waterfall

**State Debugging:**
- Redux DevTools
- React Query DevTools
- Local Storage
- Session Storage

**Network Debugging:**
- Network tab
- Request/Response inspection
- Headers examination
- Payload analysis

---

## Prevention Best Practices

### Code Organization
- Clear component structure
- Consistent naming
- Proper error handling
- Clean code principles

### Documentation
- Error logs
- Bug reports
- Solution documentation
- Pattern recognition

### Prevention
- Unit tests
- Integration tests
- Error boundaries
- Type checking

---

*Remember: When using this manual with Lovable, always ask for detailed explanations before implementing suggested fixes. This ensures you understand the solution and can verify it will work for your specific case.*
