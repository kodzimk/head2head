#!/usr/bin/env python3
"""
Simple CORS test script to verify avatar upload endpoint
"""
import requests
import json

def test_cors_preflight():
    """Test CORS preflight request"""
    url = "https://api.head2head.dev/db/upload-avatar"
    
    headers = {
        "Origin": "https://www.head2head.dev",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization"
    }
    
    try:
        response = requests.options(url, headers=headers)
        print(f"Preflight Response Status: {response.status_code}")
        print(f"Preflight Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ CORS preflight successful")
        else:
            print("❌ CORS preflight failed")
            
    except Exception as e:
        print(f"❌ Error testing CORS preflight: {e}")

def test_health_endpoint():
    """Test health endpoint to verify server is accessible"""
    url = "https://api.head2head.dev/health"
    
    try:
        response = requests.get(url)
        print(f"Health Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Health endpoint accessible")
            data = response.json()
            print(f"Server Status: {data.get('status', 'unknown')}")
        else:
            print("❌ Health endpoint failed")
            
    except Exception as e:
        print(f"❌ Error testing health endpoint: {e}")

if __name__ == "__main__":
    print("Testing CORS Configuration...")
    print("=" * 50)
    
    test_health_endpoint()
    print()
    test_cors_preflight() 