import requests
import json
import time

URL = "http://localhost:8000/chat"

def test_chat():
    try:
        payload = {
            "message": "Hello, this is a test.",
            "history": [],
            "model": "glm-5:cloud"
        }
        print(f"Sending request to {URL}...")
        with requests.post(URL, json=payload, stream=True) as r:
            for line in r.iter_lines():
                if line:
                    print(line.decode('utf-8'))
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_chat()
