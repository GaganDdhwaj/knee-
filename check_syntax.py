#!/usr/bin/env python3
import ast
import sys

try:
    with open("minimal_app.py", "r") as f:
        code = f.read()
    ast.parse(code)
    print("[v0] Syntax OK!")
    sys.exit(0)
except SyntaxError as e:
    print(f"[v0] Syntax Error: {e}")
    print(f"[v0] Line {e.lineno}: {e.text}")
    sys.exit(1)
except Exception as e:
    print(f"[v0] Error: {e}")
    sys.exit(1)
