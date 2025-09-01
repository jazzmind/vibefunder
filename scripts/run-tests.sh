#!/bin/bash

# Simple test runner that starts server and runs tests

echo "🚀 Starting VibeFunder Test Suite"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    # Kill the test server
    lsof -ti:3101 | xargs kill -9 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Start the test server in background
echo -e "${YELLOW}Starting test server on port 3101...${NC}"
npm run dev:test &
SERVER_PID=$!

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server to be ready...${NC}"
COUNT=0
MAX_WAIT=30

while [ $COUNT -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3101 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
    COUNT=$((COUNT + 1))
done

if [ $COUNT -eq $MAX_WAIT ]; then
    echo -e "\n${RED}✗ Server failed to start${NC}"
    exit 1
fi

# Run the tests
echo -e "\n${GREEN}Running tests...${NC}"
echo "================================"
npm test

# Capture test exit code
TEST_EXIT_CODE=$?

# Show result
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
fi

exit $TEST_EXIT_CODE