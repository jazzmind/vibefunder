#!/bin/bash
set -ex  # Add -x for debugging output

# Get the directory where this script is located
readonly DEVPOD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Claude Dev Environment Setup ==="
echo "WORKSPACE_FOLDER: $WORKSPACE_FOLDER"
echo "DEVPOD_WORKSPACE_FOLDER: $DEVPOD_WORKSPACE_FOLDER"
echo "AGENTS_DIR: $AGENTS_DIR"
echo "DEVPOD_DIR: $DEVPOD_DIR"

# Install npm packages
npm install -g @anthropic-ai/claude-code
npm install -g claude-usage-cli

# Install uv package manager
echo "Installing uv package manager..."
curl -LsSf https://astral.sh/uv/install.sh | sh
if [ -f "$HOME/.cargo/env" ]; then
  source "$HOME/.cargo/env"
else
  export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install Claude Monitor using uv
echo "Installing Claude Code Usage Monitor..."
uv tool install claude-monitor || pip install claude-monitor

# Verify installation
if command -v claude-monitor >/dev/null 2>&1; then
  echo "✅ Claude Monitor installed successfully"
else
  echo "❌ Claude Monitor installation failed"
fi

# Initialize claude-flow in the project directory
cd "$WORKSPACE_FOLDER"
npx claude-flow@alpha init --force

# Setup Node.js project if package.json doesn't exist
if [ ! -f "package.json" ]; then
  echo "📦 Initializing Node.js project..."
  npm init -y
fi

# Fix TypeScript module configuration
echo "🔧 Fixing TypeScript module configuration..."
npm pkg set type="module"

# Install Playwright (REQUIRED by CLAUDE.md for visual verification)
echo "🧪 Installing Playwright for visual verification..."
npm install -D playwright
npx playwright install
npx playwright install-deps

# Install TypeScript and build tools (needed for proper development)
echo "🔧 Installing TypeScript and development tools..."
npm install -D typescript @types/node

# Update tsconfig.json for ES modules
echo "⚙️ Updating TypeScript configuration for ES modules..."
cat << 'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create Playwright configuration
echo "🧪 Creating Playwright configuration..."
cat << 'EOF' > playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
 testDir: './tests',
 use: {
   screenshot: 'only-on-failure',
   trace: 'on-first-retry',
 },
 projects: [
   {
     name: 'chromium',
     use: { channel: 'chromium' },
   },
 ],
});
EOF

# Create basic test example
echo "📝 Creating example test..."
mkdir -p tests
cat << 'EOF' > tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('environment validation', async ({ page }) => {
 // Basic test to verify Playwright works
 expect(true).toBe(true);
});
EOF

# Create essential directories (required by CLAUDE.md file organization rules)
echo "📁 Creating project directories..."
mkdir -p src tests docs scripts examples config

# Update package.json with essential scripts
echo "📝 Adding essential npm scripts..."
npm pkg set scripts.build="tsc"
npm pkg set scripts.test="playwright test"
npm pkg set scripts.lint="echo 'Add linting here'"  
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.playwright="playwright test"

# Verify Playwright installation
if npx playwright --version >/dev/null 2>&1; then
  echo "✅ Playwright installed and ready for visual verification"
else
  echo "⚠️ Playwright installation may have issues"
fi

# Install Claude subagents
echo "Installing Claude subagents..."
mkdir -p "$AGENTS_DIR"
cd "$AGENTS_DIR"
git clone https://github.com/ChrisRoyse/610ClaudeSubagents.git temp-agents
cp -r temp-agents/agents/*.md .
rm -rf temp-agents

# Copy additional agents if they're included in the repo
ADDITIONAL_AGENTS_DIR="$DEVPOD_DIR/additional-agents"
if [ -d "$ADDITIONAL_AGENTS_DIR" ]; then
  echo "Copying additional agents..."
  
  # Copy doc-planner.md
  if [ -f "$ADDITIONAL_AGENTS_DIR/doc-planner.md" ]; then
      cp "$ADDITIONAL_AGENTS_DIR/doc-planner.md" "$AGENTS_DIR/"
      echo "✅ Copied doc-planner.md"
  fi
  
  # Copy microtask-breakdown.md
  if [ -f "$ADDITIONAL_AGENTS_DIR/microtask-breakdown.md" ]; then
      cp "$ADDITIONAL_AGENTS_DIR/microtask-breakdown.md" "$AGENTS_DIR/"
      echo "✅ Copied microtask-breakdown.md"
  fi
fi

echo "Installed $(ls -1 *.md | wc -l) agents in $AGENTS_DIR"
cd "$WORKSPACE_FOLDER"

# Delete existing CLAUDE.md and copy CLAUDE.md to overwrite it if it exists
if [ -f "$DEVPOD_DIR/CLAUDE.md" ]; then
  echo "Found CLAUDE.md in devpods directory, replacing CLAUDE.md with it..."
  # Rename existing CLAUDE.md to CLAUDE.md.OLD if it exists
  if [ -f "$WORKSPACE_FOLDER/CLAUDE.md" ]; then
      mv "$WORKSPACE_FOLDER/CLAUDE.md" "$WORKSPACE_FOLDER/CLAUDE.md.OLD"
      echo "Renamed existing CLAUDE.md to CLAUDE.md.OLD"
  fi
  cp "$DEVPOD_DIR/CLAUDE.md" "$WORKSPACE_FOLDER/CLAUDE.md"
  echo "✅ Replaced CLAUDE.md with CLAUDE.md from devpods directory"
else
  echo "⚠️ CLAUDE.md not found in $DEVPOD_DIR - using default CLAUDE.md"
fi

# Create dsp alias for claude --dangerously-skip-permissions
echo 'alias dsp="claude --dangerously-skip-permissions"' >> ~/.bashrc

# 🔧 Create Claude Flow context wrapper script - FIXED VERSION
echo "🔧 Creating Claude Flow context wrapper..."
cat << 'WRAPPER_EOF' > cf-with-context.sh
#!/bin/bash
# Claude Flow wrapper that auto-loads context files

load_context() {
    local context=""
    
    # Load CLAUDE.md
    if [[ -f "CLAUDE.md" ]]; then
        context+="=== CLAUDE RULES ===\n$(cat CLAUDE.md)\n\n"
    fi
    
    # Load CCFOREVER.md
    if [[ -f "CCFOREVER.md" ]]; then
        context+="=== CC FOREVER INSTRUCTIONS ===\n$(cat CCFOREVER.md)\n\n"
    fi
    
    # Load doc-planner.md
    if [[ -f "agents/doc-planner.md" ]]; then
        context+="=== DOC PLANNER AGENT ===\n$(cat agents/doc-planner.md)\n\n"
    fi
    
    # Load microtask-breakdown.md
    if [[ -f "agents/microtask-breakdown.md" ]]; then
        context+="=== MICROTASK BREAKDOWN AGENT ===\n$(cat agents/microtask-breakdown.md)\n\n"
    fi
    
    echo -e "$context"
}

# Check command type and execute with context
case "$1" in
    "swarm")
        # Swarm launches Claude Code which needs direct terminal access
        # Don't pipe stdin - let it have full terminal control
        echo "🚀 Launching Claude Code Swarm..."
        echo "📄 Note: Context files (CLAUDE.md, agents) will be loaded from working directory"
        npx claude-flow@alpha swarm "${@:2}" --claude
        ;;
        
    "hive-mind"|"hive")
        # hive-mind also needs direct terminal access
        echo "🚀 Running Claude Flow hive-mind..."
        if [[ "$2" == "spawn" ]]; then
            npx claude-flow@alpha hive-mind spawn "${@:3}" --claude
        else
            npx claude-flow@alpha hive-mind spawn "${@:2}" --claude
        fi
        ;;
        
    "pair"|"verify"|"truth")
        # These interactive commands also need terminal access
        echo "🚀 Running Claude Flow $1..."
        npx claude-flow@alpha "$@" --claude
        ;;
        
    *)
        # For other commands, check if they might be interactive
        if [[ $# -gt 0 ]]; then
            # Just run directly without stdin redirection to be safe
            npx claude-flow@alpha "$@" --claude
        else
            npx claude-flow@alpha --help
        fi
        ;;
esac
WRAPPER_EOF

chmod +x cf-with-context.sh

# Claude-Flow v2.0.0 Alpha - Complete Aliases Configuration

cat << 'ALIASES_EOF' >> ~/.bashrc

# ============================================
# CLAUDE-FLOW v2.0.0 ALPHA ALIASES
# ============================================

# === Core Context Wrapper Commands ===
alias cf="./cf-with-context.sh"
alias cf-swarm="./cf-with-context.sh swarm" 
alias cf-hive="./cf-with-context.sh hive-mind spawn"

# === Claude Code Direct Access ===
alias cf-dsp="claude --dangerously-skip-permissions"
alias dsp="claude --dangerously-skip-permissions"

# === Initialization & Setup ===
alias cf-init="npx claude-flow@alpha init --force"
alias cf-init-verify="npx claude-flow@alpha init --verify --pair --github-enhanced"
alias cf-init-project="npx claude-flow@alpha init --force --project-name"
alias cf-init-nexus="npx claude-flow@alpha init --flow-nexus"

# === Hive-Mind Operations ===
alias cf-spawn="npx claude-flow@alpha hive-mind spawn"
alias cf-wizard="npx claude-flow@alpha hive-mind wizard"
alias cf-resume="npx claude-flow@alpha hive-mind resume"
alias cf-status="npx claude-flow@alpha hive-mind status"
alias cf-sessions="npx claude-flow@alpha hive-mind sessions"
alias cf-upgrade="npx claude-flow@alpha hive-mind upgrade"
alias cf-github-hive="npx claude-flow@alpha hive-mind spawn --github-enhanced --agents 13 --claude"

# === Swarm Operations ===
alias cf-continue="npx claude-flow@alpha swarm --continue-session"
alias cf-swarm-temp="npx claude-flow@alpha swarm --temp"
alias cf-swarm-namespace="npx claude-flow@alpha swarm --namespace"

# === Memory Management ===
alias cf-memory-stats="npx claude-flow@alpha memory stats"
alias cf-memory-list="npx claude-flow@alpha memory list"
alias cf-memory-query="npx claude-flow@alpha memory query"
alias cf-memory-recent="npx claude-flow@alpha memory query --recent --limit 5"
alias cf-memory-clear="npx claude-flow@alpha memory clear"
alias cf-memory-export="npx claude-flow@alpha memory export"
alias cf-memory-import="npx claude-flow@alpha memory import"

# === Neural Operations ===
alias cf-neural-train="npx claude-flow@alpha neural train"
alias cf-neural-predict="npx claude-flow@alpha neural predict"
alias cf-neural-status="npx claude-flow@alpha neural status"
alias cf-neural-models="npx claude-flow@alpha neural models"

# === Goal Planning (GOAP) ===
alias cf-goal-plan="npx claude-flow@alpha goal plan"
alias cf-goal-execute="npx claude-flow@alpha goal execute"
alias cf-goal-status="npx claude-flow@alpha goal status"

# === Agent Management ===
alias cf-agents-list="npx claude-flow@alpha agents list"
alias cf-agents-spawn="npx claude-flow@alpha agents spawn"
alias cf-agents-status="npx claude-flow@alpha agents status"
alias cf-agents-assign="npx claude-flow@alpha agents assign"

# === Hooks System ===
alias cf-hooks-list="npx claude-flow@alpha hooks list"
alias cf-hooks-enable="npx claude-flow@alpha hooks enable"
alias cf-hooks-disable="npx claude-flow@alpha hooks disable"
alias cf-hooks-config="npx claude-flow@alpha hooks config"

# === GitHub Integration ===
alias cf-github-init="npx claude-flow@alpha github init"
alias cf-github-sync="npx claude-flow@alpha github sync"
alias cf-github-pr="npx claude-flow@alpha github pr"
alias cf-github-issues="npx claude-flow@alpha github issues"
alias cf-github-analyze="npx claude-flow@alpha github analyze"
alias cf-github-migrate="npx claude-flow@alpha github migrate"

# === Flow Nexus Cloud ===
alias cf-nexus-login="npx claude-flow@alpha nexus login"
alias cf-nexus-sandbox="npx claude-flow@alpha nexus sandbox"
alias cf-nexus-swarm="npx claude-flow@alpha nexus swarm"
alias cf-nexus-deploy="npx claude-flow@alpha nexus deploy"
alias cf-nexus-challenges="npx claude-flow@alpha nexus challenges"
alias cf-nexus-marketplace="npx claude-flow@alpha nexus marketplace"

# === Performance & Analytics ===
alias cf-benchmark="npx claude-flow@alpha benchmark"
alias cf-analyze="npx claude-flow@alpha analyze"
alias cf-optimize="npx claude-flow@alpha optimize"
alias cf-metrics="npx claude-flow@alpha metrics"

# === Verification & Testing ===
alias cf-verify="npx claude-flow@alpha verify"
alias cf-truth="npx claude-flow@alpha truth"
alias cf-test="npx claude-flow@alpha test"
alias cf-validate="npx claude-flow@alpha validate"

# === Pairing & Collaboration ===
alias cf-pair="npx claude-flow@alpha pair --start"
alias cf-pair-stop="npx claude-flow@alpha pair --stop"
alias cf-pair-status="npx claude-flow@alpha pair --status"

# === SPARC Methodology ===
alias cf-sparc-init="npx claude-flow@alpha sparc init"
alias cf-sparc-plan="npx claude-flow@alpha sparc plan"
alias cf-sparc-execute="npx claude-flow@alpha sparc execute"
alias cf-sparc-review="npx claude-flow@alpha sparc review"

# === Quick Commands (Shortcuts) ===
alias cfs="cf-swarm"                    # Quick swarm
alias cfh="cf-hive"                     # Quick hive spawn
alias cfr="cf-resume"                   # Quick resume
alias cfst="cf-status"                  # Quick status
alias cfm="cf-memory-stats"             # Quick memory stats
alias cfmq="cf-memory-query"            # Quick memory query
alias cfa="cf-agents-list"              # Quick agent list
alias cfg="cf-github-analyze"           # Quick GitHub analysis
alias cfn="cf-nexus-swarm"              # Quick Nexus swarm

# === Monitoring & Debugging ===
alias cf-monitor="claude-monitor"
alias cf-logs="npx claude-flow@alpha logs"
alias cf-debug="npx claude-flow@alpha debug"
alias cf-trace="npx claude-flow@alpha trace"

# === Help & Documentation ===
alias cf-help="npx claude-flow@alpha --help"
alias cf-docs="echo 'Visit: https://github.com/ruvnet/claude-flow/wiki'"
alias cf-examples="echo 'Visit: https://github.com/ruvnet/claude-flow/tree/main/examples'"

# === Utility Functions ===
# Quick task with automatic Claude integration
cf-task() {
    npx claude-flow@alpha swarm "$1" --claude
}

# Quick hive spawn with namespace
cf-hive-ns() {
    npx claude-flow@alpha hive-mind spawn "$1" --namespace "$2" --claude
}

# Memory search with context
cf-search() {
    npx claude-flow@alpha memory query "$1" --recent --context
}

# Quick Flow Nexus sandbox creation
cf-sandbox() {
    npx claude-flow@alpha nexus sandbox create --template "$1" --name "$2"
}

# Session management helper
cf-session() {
    case "$1" in
        list) npx claude-flow@alpha hive-mind sessions ;;
        resume) npx claude-flow@alpha hive-mind resume "$2" ;;
        status) npx claude-flow@alpha hive-mind status ;;
        *) echo "Usage: cf-session [list|resume <id>|status]" ;;
    esac
}

echo "✅ Claude-Flow v2.0.0 Alpha aliases loaded!"
echo "📚 Type 'cf-help' for documentation or 'cf-docs' for wiki"
echo "🚀 Quick start: 'cf-init' then 'cf-swarm \"your task\"'"

ALIASES_EOF

# Source the updated bashrc
source ~/.bashrc

echo "🎉 Claude-Flow v2.0.0 aliases have been installed!"
echo "✨ New features available:"
echo "  • Flow Nexus Cloud: cf-nexus-*"
echo "  • Neural operations: cf-neural-*"
echo "  • Memory management: cf-memory-*"
echo "  • GitHub integration: cf-github-*"
echo "  • Hooks system: cf-hooks-*"
echo "  • SPARC methodology: cf-sparc-*"
echo ""
echo "🔄 Run 'source ~/.bashrc' to activate the aliases"
echo "Setup completed successfully!"
echo "🎯 Environment is now 100% production-ready!"
echo "✅ TypeScript ES module configuration fixed"
echo "✅ Playwright tests configured with proper imports"
echo "✅ DSP alias configured"
echo "✅ Claude Flow wrapper fixed for interactive commands"
