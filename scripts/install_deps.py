import subprocess
import sys
import os

def install_dependencies():
    print("Installing python dependencies programmatically...")
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    req_path = os.path.join(project_root, "requirements.txt")
    
    if not os.path.exists(req_path):
        print(f"[ERROR] requirements.txt not found at {req_path}")
        return
        
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_path])
        print("Dependencies installed successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to install dependencies: {e}")

if __name__ == "__main__":
    install_dependencies()
