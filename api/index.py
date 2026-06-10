# Vercel entrypoint and Uvicorn bridge
# Re-exports the FastAPI app from backend.app

import os
import sys

# Ensure project root is in the Python search path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.app import app
