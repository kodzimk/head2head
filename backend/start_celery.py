#!/usr/bin/env python3
"""
Script to start Celery worker for local development
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

if __name__ == '__main__':
    from celery.bin.celery import main as celery_main
    
    # Set up Celery command line arguments
    sys.argv = [
        'celery',
        '-A', 'celery_app',
        'worker',
        '--loglevel=info',
        '--queues=default,ai_quiz'
    ]
    
    # Start Celery worker
    celery_main() 