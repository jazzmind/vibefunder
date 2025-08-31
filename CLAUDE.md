# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")
  
  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }
  
  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")
  
  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}
  
  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.

================================
Contents of CLAUDE-React.md file
================================

# Claude Code Configuration for React Projects

## 🚨 CRITICAL: REACT PARALLEL EXECUTION PATTERNS

**MANDATORY RULE**: React projects require component-based coordination with concurrent rendering and state management.

## 🚨 CRITICAL: CONCURRENT EXECUTION FOR ALL REACT OPERATIONS

**ABSOLUTE RULE**: ALL React operations MUST be concurrent/parallel in a single message:

### 🔴 MANDATORY CONCURRENT PATTERNS FOR REACT:

1. **Component Creation**: ALWAYS batch ALL component files in ONE message
2. **State Management**: ALWAYS batch ALL Redux/Context setup together
3. **Testing**: ALWAYS run ALL React Testing Library suites in parallel
4. **Build Operations**: ALWAYS batch ALL webpack/Vite operations
5. **Styling**: ALWAYS batch ALL CSS/styled-components together

### ⚡ REACT GOLDEN RULE: "1 MESSAGE = ALL COMPONENT ECOSYSTEM OPERATIONS"

**Examples of CORRECT React concurrent execution:**

```jsx
// ✅ CORRECT: Everything in ONE message
[Single Message]:
  - TodoWrite { todos: [10+ todos with all React tasks] }
  - Task("You are React architect. Coordinate via hooks for component design...")
  - Task("You are State manager. Coordinate via hooks for Redux/Context...")
  - Task("You are UI designer. Coordinate via hooks for styling...")
  - Bash("npx create-react-app my-app --template typescript")
  - Bash("cd my-app && npm install @reduxjs/toolkit react-redux")
  - Bash("cd my-app && npm install --save-dev @testing-library/react @testing-library/jest-dom")
  - Write("components/UserCard.tsx", userCardComponent)
  - Write("components/UserList.tsx", userListComponent)
  - Write("hooks/useUsers.ts", customHook)
  - Write("store/userSlice.ts", reduxSlice)
  - Write("context/AppContext.tsx", reactContext)
  - Write("services/api.ts", apiService)
  - Write("tests/UserCard.test.tsx", componentTests)
  - Bash("cd my-app && npm test -- --watchAll=false && npm run build")
```

## 🎯 REACT-SPECIFIC SWARM PATTERNS

### ⚛️ React Setup Coordination

**React Project Setup Strategy:**
```bash
# Always batch React setup
npx create-react-app my-app --template typescript
npm install @reduxjs/toolkit react-redux
npm install react-router-dom @types/react-router-dom
npm install styled-components @types/styled-components
npm start
```

**Parallel Development Setup:**
```jsx
// ✅ CORRECT: All setup in ONE message
[BatchTool]:
  - Bash("npx create-react-app react-app --template typescript")
  - Bash("cd react-app && npm install @reduxjs/toolkit react-redux react-router-dom")
  - Bash("cd react-app && npm install --save-dev @testing-library/react @testing-library/user-event")
  - Write("App.tsx", mainAppComponent)
  - Write("components/Header.tsx", headerComponent)
  - Write("components/Footer.tsx", footerComponent)
  - Write("pages/HomePage.tsx", homePageComponent)
  - Write("store/index.ts", reduxStore)
  - Write("types/index.ts", typeDefinitions)
  - Write("package.json", updatedPackageJson)
  - Bash("cd react-app && npm start")
```

### 🏗️ React Agent Specialization

**Agent Types for React Projects:**

1. **Component Architect Agent** - Component design, composition patterns
2. **State Management Agent** - Redux, Context, Zustand coordination
3. **UI/UX Agent** - Styling, animations, responsive design
4. **Testing Agent** - React Testing Library, Jest, E2E testing
5. **Performance Agent** - React.memo, useMemo, lazy loading
6. **Routing Agent** - React Router, navigation, protected routes

### 📱 Component Architecture Coordination

**Component Structure Setup:**
```jsx
// React component architecture
[BatchTool]:
  - Write("components/UI/Button.tsx", reusableButton)
  - Write("components/UI/Input.tsx", reusableInput)
  - Write("components/UI/Modal.tsx", modalComponent)
  - Write("components/Layout/Header.tsx", headerLayout)
  - Write("components/Layout/Sidebar.tsx", sidebarLayout)
  - Write("components/Features/UserProfile.tsx", featureComponent)
  - Write("components/Features/Dashboard.tsx", dashboardComponent)
  - Write("types/components.ts", componentTypes)
  - Bash("npm run storybook")
```

### 🔄 State Management Coordination

**Redux Toolkit Setup:**
```jsx
// Redux state management coordination
[BatchTool]:
  - Write("store/index.ts", configuredStore)
  - Write("store/slices/userSlice.ts", userReduxSlice)
  - Write("store/slices/authSlice.ts", authReduxSlice)
  - Write("store/slices/uiSlice.ts", uiReduxSlice)
  - Write("hooks/useAppDispatch.ts", typedDispatchHook)
  - Write("hooks/useAppSelector.ts", typedSelectorHook)
  - Write("types/store.ts", storeTypes)
  - Bash("npm test store/ && npm run build")
```

## 🧪 REACT TESTING COORDINATION

### ⚡ React Testing Library Strategy

**Component Testing Setup:**
```jsx
// Test coordination pattern
[BatchTool]:
  - Write("setupTests.ts", testSetupConfig)
  - Write("tests/components/UserCard.test.tsx", componentTests)
  - Write("tests/hooks/useUsers.test.ts", hookTests)
  - Write("tests/pages/HomePage.test.tsx", pageTests)
  - Write("tests/utils/testUtils.tsx", testingUtilities)
  - Write("tests/mocks/apiMocks.ts", apiMockHandlers)
  - Write("jest.config.js", jestConfiguration)
  - Bash("npm test -- --coverage --watchAll=false")
  - Bash("npm run test:components")
```

### 🔬 Advanced Testing Patterns

**E2E and Integration Testing:**
```jsx
[BatchTool]:
  - Write("cypress/integration/userFlow.spec.ts", e2eTests)
  - Write("cypress/support/commands.ts", customCommands)
  - Write("tests/integration/userFlow.test.tsx", integrationTests)
  - Bash("npm run cy:run && npm run test:integration")
```

## 🎨 REACT STYLING COORDINATION

### 💅 Styled Components Coordination

**Styling System Setup:**
```jsx
// Styled components coordination
[BatchTool]:
  - Write("styles/theme.ts", themeDefinition)
  - Write("styles/GlobalStyles.ts", globalStyling)
  - Write("components/UI/Button.styled.ts", styledButton)
  - Write("components/UI/Card.styled.ts", styledCard)
  - Write("utils/breakpoints.ts", responsiveBreakpoints)
  - Write("types/styled.d.ts", styledComponentTypes)
  - Bash("npm install styled-components @types/styled-components")
  - Bash("npm run build:styles")
```

### 🎯 CSS Modules Coordination

**CSS Modules Setup:**
```jsx
// CSS Modules coordination
[BatchTool]:
  - Write("components/UserCard.module.css", componentStyles)
  - Write("pages/HomePage.module.css", pageStyles)
  - Write("styles/variables.css", cssVariables)
  - Write("styles/mixins.css", cssMixins)
  - Write("types/css-modules.d.ts", cssModuleTypes)
  - Bash("npm run build:css")
```

## 🚀 REACT PERFORMANCE COORDINATION

### ⚡ Performance Optimization

**Performance Enhancement Batch:**
```jsx
[BatchTool]:
  - Write("components/VirtualizedList.tsx", virtualizedComponent)
  - Write("hooks/useDebounce.ts", debounceHook)
  - Write("hooks/useThrottle.ts", throttleHook)
  - Write("utils/lazyLoader.tsx", lazyLoadingUtils)
  - Write("components/Suspense/LoadingFallback.tsx", suspenseFallback)
  - Write("webpack.config.js", optimizedWebpackConfig)
  - Bash("npm run analyze && npm run build:prod")
```

### 🔄 Code Splitting Coordination

**Code Splitting Setup:**
```jsx
// Code splitting batch
[BatchTool]:
  - Write("pages/LazyHomePage.tsx", lazySuspenseComponent)
  - Write("routes/LazyRoutes.tsx", lazyRoutingSetup)
  - Write("utils/loadable.tsx", loadableWrapper)
  - Bash("npm run build && npm run analyze-bundle")
```

## 🌐 REACT ROUTING COORDINATION

### 🛣️ React Router Setup

**Routing Configuration:**
```jsx
// React Router coordination
[BatchTool]:
  - Write("routes/AppRouter.tsx", mainRouter)
  - Write("routes/ProtectedRoute.tsx", authProtectedRoutes)
  - Write("routes/PublicRoute.tsx", publicRoutes)
  - Write("pages/HomePage.tsx", homePageComponent)
  - Write("pages/ProfilePage.tsx", profilePageComponent)
  - Write("pages/NotFoundPage.tsx", notFoundComponent)
  - Write("hooks/useAuth.ts", authenticationHook)
  - Bash("npm install react-router-dom @types/react-router-dom")
```

## 🔒 REACT SECURITY COORDINATION

### 🛡️ Security Best Practices

**Security Implementation Batch:**
```jsx
[BatchTool]:
  - Write("utils/sanitizer.ts", inputSanitization)
  - Write("hooks/useAuth.ts", secureAuthHook)
  - Write("components/SecureRoute.tsx", routeProtection)
  - Write("utils/csrf.ts", csrfProtection)
  - Write("services/secureApi.ts", secureApiClient)
  - Write("types/security.ts", securityTypes)
  - Bash("npm install dompurify @types/dompurify")
  - Bash("npm audit fix")
```

**React Security Checklist:**
- XSS prevention (DOMPurify)
- CSRF protection
- Secure authentication
- Input validation
- Safe dangerouslySetInnerHTML usage
- Secure API communication
- Environment variable protection
- Content Security Policy

## 📱 REACT MOBILE COORDINATION

### 📲 React Native Integration

**React Native Setup:**
```jsx
// React Native coordination
[BatchTool]:
  - Write("components/mobile/MobileHeader.tsx", mobileComponent)
  - Write("hooks/useDeviceDetection.ts", deviceDetectionHook)
  - Write("styles/responsive.ts", responsiveStyles)
  - Write("utils/platform.ts", platformUtilities)
  - Bash("npm install react-native-web")
  - Bash("npm run build:mobile")
```

## 🧰 REACT ECOSYSTEM COORDINATION

### 📚 Popular Libraries Integration

**Third-party Libraries Batch:**
```jsx
[BatchTool]:
  - Write("components/forms/FormikForm.tsx", formikIntegration)
  - Write("components/charts/ChartComponent.tsx", chartjsIntegration)
  - Write("components/animations/AnimatedCard.tsx", framerMotionAnimation)
  - Write("utils/dateHelpers.ts", dateFnsUtilities)
  - Bash("npm install formik yup react-chartjs-2 framer-motion date-fns")
  - Bash("npm run build:with-deps")
```

### 🎭 UI Component Libraries

**UI Library Integration:**
```jsx
// UI library coordination
[BatchTool]:
  - Write("theme/materialTheme.ts", materialUITheme)
  - Write("components/MaterialButton.tsx", materialUIComponent)
  - Write("components/AntdTable.tsx", antDesignComponent)
  - Write("styles/chakraTheme.ts", chakraUITheme)
  - Bash("npm install @mui/material @emotion/react @emotion/styled")
  - Bash("npm install antd chakra-ui")
```

## 🔄 REACT CI/CD COORDINATION

### 🏗️ GitHub Actions for React

**CI/CD Pipeline Batch:**
```jsx
[BatchTool]:
  - Write(".github/workflows/react.yml", reactCI)
  - Write(".github/workflows/deploy.yml", netlifyDeployment)
  - Write("scripts/build.sh", buildScript)
  - Write("scripts/test.sh", testScript)
  - Write("netlify.toml", netlifyConfig)
  - Bash("npm run build && npm test -- --coverage && npm run lint")
```

### 🚀 Deployment Coordination

**Production Deployment:**
```jsx
[BatchTool]:
  - Write("Dockerfile", reactDockerfile)
  - Write("nginx.conf", nginxConfiguration)
  - Write("docker-compose.yml", dockerComposeReact)
  - Write("scripts/deploy.sh", deploymentScript)
  - Bash("npm run build:prod")
  - Bash("docker build -t react-app:latest .")
  - Bash("docker-compose up -d")
```

## 📊 REACT MONITORING COORDINATION

### 📈 Performance Monitoring

**Monitoring Setup:**
```jsx
[BatchTool]:
  - Write("utils/analytics.ts", analyticsIntegration)
  - Write("hooks/usePerformance.ts", performanceHook)
  - Write("components/ErrorBoundary.tsx", errorBoundaryComponent)
  - Write("utils/logger.ts", clientSideLogging)
  - Bash("npm install @sentry/react web-vitals")
  - Bash("npm run build:with-monitoring")
```

## 💡 REACT BEST PRACTICES

### 📝 Component Design Principles

1. **Single Responsibility**: One component, one purpose
2. **Composition over Inheritance**: Prefer composition patterns
3. **Props Interface Design**: Clear, typed prop interfaces
4. **Custom Hooks**: Extract reusable logic
5. **Error Boundaries**: Graceful error handling
6. **Accessibility**: ARIA labels, semantic HTML

### 🎯 Performance Optimization

1. **React.memo**: Prevent unnecessary re-renders
2. **useMemo/useCallback**: Memoize expensive operations
3. **Code Splitting**: Lazy load components
4. **Virtual Scrolling**: Handle large lists efficiently
5. **Bundle Analysis**: Optimize bundle size
6. **Image Optimization**: Lazy loading, WebP format

## 📚 REACT LEARNING RESOURCES

### 🎓 Recommended Topics

1. **Core React**: Components, hooks, state management
2. **Advanced Patterns**: Render props, compound components
3. **State Management**: Redux, Context, Zustand
4. **Testing**: React Testing Library, Jest, Cypress
5. **Performance**: Profiling, optimization techniques
6. **Ecosystem**: Router, forms, UI libraries

### 🔧 Essential Tools

1. **Development**: Create React App, Vite, Next.js
2. **State Management**: Redux Toolkit, Zustand, Jotai
3. **Styling**: Styled Components, Emotion, Tailwind CSS
4. **Testing**: React Testing Library, Jest, Cypress
5. **Build Tools**: Webpack, Vite, Rollup
6. **Dev Tools**: React DevTools, Redux DevTools

### 🌟 Advanced Features

1. **Concurrent Features**: Suspense, Transitions
2. **Server Components**: Next.js App Router
3. **Streaming**: Progressive rendering
4. **Micro-frontends**: Module federation
5. **PWA**: Service workers, offline support
6. **Native Integration**: React Native, Expo

---

**Remember**: React swarms excel with component-based coordination, parallel state management, and concurrent testing. Always batch component creation and leverage React's ecosystem for scalable, maintainable applications.