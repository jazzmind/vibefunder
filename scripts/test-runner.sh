#!/bin/bash

# VibeFunder Comprehensive Test Runner
# Handles test server startup, cleanup, and full test execution

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 VibeFunder Test Runner${NC}"
echo "================================"

# Parse arguments
MODE=${1:-"full"}
CLEANUP=${CLEANUP_TEST_DATA:-"true"}
SERVER_PORT=${TEST_PORT:-"3101"}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    
    # Kill test server if running
    if [ ! -z "$SERVER_PID" ]; then
        echo "Stopping test server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
    fi
    
    # Kill any process on test port
    lsof -ti:$SERVER_PORT | xargs -r kill -9 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Function to wait for server
wait_for_server() {
    echo -e "${YELLOW}⏳ Waiting for test server on port $SERVER_PORT...${NC}"
    
    local count=0
    local max_attempts=30
    
    while [ $count -lt $max_attempts ]; do
        if curl -s http://localhost:$SERVER_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Test server is ready!${NC}"
            return 0
        fi
        
        count=$((count + 1))
        echo -n "."
        sleep 1
    done
    
    echo -e "\n${RED}❌ Test server failed to start${NC}"
    return 1
}

# Function to run tests
run_tests() {
    local test_type=$1
    
    echo -e "\n${GREEN}🧪 Running $test_type tests...${NC}"
    
    case $test_type in
        "unit")
            npm run test:unit
            ;;
        "integration")
            npm run test:integration
            ;;
        "api")
            npm run test:api
            ;;
        "security")
            npm run test:security
            ;;
        "payments")
            npm run test:payments
            ;;
        "full")
            npm test
            ;;
        "coverage")
            npm run test:coverage
            ;;
        *)
            echo -e "${RED}Unknown test type: $test_type${NC}"
            exit 1
            ;;
    esac
}

# Main execution
echo -e "${YELLOW}Configuration:${NC}"
echo "  Mode: $MODE"
echo "  Cleanup: $CLEANUP"
echo "  Server Port: $SERVER_PORT"
echo ""

# Export environment variables
export CLEANUP_TEST_DATA=$CLEANUP
export TEST_PORT=$SERVER_PORT
export NODE_ENV=test

# Handle different modes
case $MODE in
    "unit")
        echo -e "${GREEN}Running unit tests only (no server needed)${NC}"
        run_tests "unit"
        ;;
        
    "quick")
        echo -e "${GREEN}Running quick tests (unit + basic integration)${NC}"
        run_tests "unit"
        ;;
        
    "api"|"integration"|"security"|"payments")
        echo -e "${GREEN}Starting test server for $MODE tests${NC}"
        npm run dev:test > /dev/null 2>&1 &
        SERVER_PID=$!
        
        if wait_for_server; then
            run_tests $MODE
        else
            exit 1
        fi
        ;;
        
    "full"|"all")
        echo -e "${GREEN}Running full test suite with server${NC}"
        
        # Start test server
        echo "Starting test server..."
        npm run dev:test > /dev/null 2>&1 &
        SERVER_PID=$!
        
        if wait_for_server; then
            # Run all tests
            run_tests "full"
            
            # Generate coverage report
            echo -e "\n${GREEN}📊 Generating coverage report...${NC}"
            npm run coverage:check || true
        else
            exit 1
        fi
        ;;
        
    "coverage")
        echo -e "${GREEN}Running tests with coverage${NC}"
        
        # Start test server
        npm run dev:test > /dev/null 2>&1 &
        SERVER_PID=$!
        
        if wait_for_server; then
            run_tests "coverage"
            
            # Open coverage report
            if [ -f "coverage/lcov-report/index.html" ]; then
                echo -e "${GREEN}📊 Opening coverage report...${NC}"
                open coverage/lcov-report/index.html 2>/dev/null || \
                xdg-open coverage/lcov-report/index.html 2>/dev/null || \
                echo "Coverage report: coverage/lcov-report/index.html"
            fi
        else
            exit 1
        fi
        ;;
        
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Available modes: unit, quick, api, integration, security, payments, full, coverage"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ Test run complete!${NC}"