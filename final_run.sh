#!/bin/bash
# Install dependencies
python3 -m pip install -q Flask numpy Pillow

# Run the app
cd "$(dirname "$0")"
python3 app.py
