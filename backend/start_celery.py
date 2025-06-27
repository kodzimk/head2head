#!/usr/bin/env python3
"""
Script to start Celery worker for manual quiz generation
"""

import os
import sys
import subprocess

def main():
    # Add the src directory to Python path
    src_path = os.path.join(os.path.dirname(__file__), 'src')
    sys.path.insert(0, src_path)
    
    # Set working directory to src
    os.chdir(src_path)
    
    # Start Celery worker
    cmd = [
        'celery', '-A', 'celery_app', 'worker',
        '--loglevel=info',
        '--concurrency=4',
        '--queues=default,manual_quiz'
    ]
    
    print("Starting Celery worker for manual quiz generation...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nCelery worker stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"Error starting Celery worker: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 