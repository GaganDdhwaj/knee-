#!/usr/bin/env python3
import subprocess
import sys

# Execute git commands directly from current working directory
print("[v0] Current directory:", subprocess.run(["pwd"], capture_output=True, text=True).stdout.strip())

# List files to commit
print("\n[v0] Files to commit:")
subprocess.run(["ls", "-la", "*.py", "requirements.txt", "FIXES_APPLIED.md"], shell=True)

# Git status
print("\n[v0] Git status:")
subprocess.run(["git", "status"])

# Add all changes
print("\n[v0] Adding files...")
subprocess.run(["git", "add", "-A"])

# Commit
print("\n[v0] Committing...")
result = subprocess.run([
    "git", "commit", "-m",
    "fix: Improve error handling and optimize for Render\n\n- Add TensorFlow fallback\n- Request GEMINI_API_KEY env var\n- Reduce build size by removing TensorFlow dependency"
], capture_output=True, text=True)

print(result.stdout)
if result.returncode != 0:
    print("[v0] Commit message:", result.stderr)
    if "nothing to commit" in result.stderr:
        print("[v0] No changes to commit - that's ok!")

# Push
print("\n[v0] Pushing to GitHub...")
result = subprocess.run(["git", "push", "origin", "run-and-fix"], capture_output=True, text=True)
print(result.stdout)
if result.returncode == 0:
    print("[v0] ✅ Successfully pushed!")
else:
    print("[v0] Push output:", result.stderr)

# Show latest commit
print("\n[v0] Latest commits:")
subprocess.run(["git", "log", "--oneline", "-3"])
