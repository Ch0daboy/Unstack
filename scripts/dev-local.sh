#!/bin/bash

# Local Development Script for BookGen with Supabase
# This script helps manage the local development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Start Supabase local environment
start_supabase() {
    print_status "Starting Supabase local environment..."
    
    if npx supabase start; then
        print_success "Supabase started successfully"
        print_status "Services available at:"
        echo "  - API: http://127.0.0.1:54321"
        echo "  - Studio: http://127.0.0.1:54323"
        echo "  - Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        echo "  - Inbucket (Email): http://127.0.0.1:54324"
    else
        print_error "Failed to start Supabase"
        exit 1
    fi
}

# Stop Supabase local environment
stop_supabase() {
    print_status "Stopping Supabase local environment..."
    npx supabase stop
    print_success "Supabase stopped"
}

# Reset database
reset_db() {
    print_warning "This will reset the local database and all data will be lost!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting database..."
        npx supabase db reset
        print_success "Database reset complete"
    else
        print_status "Database reset cancelled"
    fi
}

# Start development server
start_dev() {
    print_status "Starting development server with local environment..."
    
    # Copy local env file
    if [ -f ".env.local" ]; then
        cp .env.local .env
        print_success "Using local environment configuration"
    else
        print_warning ".env.local not found, using existing .env"
    fi
    
    # Start the development server
    npm run dev
}

# Show status
show_status() {
    print_status "Checking Supabase status..."
    npx supabase status
}

# Show help
show_help() {
    echo "BookGen Local Development Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start Supabase and development server"
    echo "  stop      - Stop Supabase"
    echo "  restart   - Restart Supabase"
    echo "  reset     - Reset database (WARNING: destroys all data)"
    echo "  status    - Show Supabase status"
    echo "  studio    - Open Supabase Studio in browser"
    echo "  logs      - Show Supabase logs"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start everything for development"
    echo "  $0 studio   # Open database management interface"
    echo "  $0 reset    # Reset database and start fresh"
}

# Open Supabase Studio
open_studio() {
    print_status "Opening Supabase Studio..."
    if command -v xdg-open > /dev/null; then
        xdg-open http://127.0.0.1:54323
    elif command -v open > /dev/null; then
        open http://127.0.0.1:54323
    else
        print_status "Please open http://127.0.0.1:54323 in your browser"
    fi
}

# Show logs
show_logs() {
    print_status "Showing Supabase logs..."
    npx supabase logs
}

# Main script logic
case "${1:-help}" in
    "start")
        check_docker
        start_supabase
        start_dev
        ;;
    "stop")
        stop_supabase
        ;;
    "restart")
        check_docker
        stop_supabase
        start_supabase
        ;;
    "reset")
        check_docker
        reset_db
        ;;
    "status")
        show_status
        ;;
    "studio")
        open_studio
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_help
        ;;
esac
