#!/usr/bin/env python3
"""
Script to update all email templates in lib/email.ts to use premium styling
"""

import re

# Read the file
with open('lib/email.ts', 'r') as f:
    content = f.read()

# Define old style patterns to replace
old_styles = [
    # Simple header
    r'\.header \{ background: #502B30; color: #FFF5E1; padding: 20px; text-align: center; \}',
    # Simple container
    r'\.container \{ max-width: 600px; margin: 0 auto; padding: 20px; \}',
    # Simple content
    r'\.content \{ background: #fff; padding: 30px; border: 1px solid #ddd; \}',
    # Simple details
    r'\.details \{ background: #f9f9f9; padding: 15px; border-left: 4px solid #502B30; margin: 20px 0; \}',
    # Simple footer
    r'\.footer \{ text-align: center; padding: 20px; color: #666; font-size: 12px; \}',
]

# Replace inline styles with reference to PREMIUM_EMAIL_STYLES
content = re.sub(
    r'<style>\s*body \{[^}]+\}.*?</style>',
    '<style>${PREMIUM_EMAIL_STYLES}</style>',
    content,
    flags=re.DOTALL
)

# Replace simple headers with premium headers
content = re.sub(
    r'<h1>🔥 INIPI Saunagus</h1>',
    '<h1>🔥 INIPI</h1>\n          <p>"Kom som du er, gå hjem som dig selv"</p>',
    content
)

# Replace simple footers with premium footers
content = re.sub(
    r'<p>INIPI Saunagus<br>\s*Havkajakvej, Amagerstrand</p>',
    '<strong>INIPI Saunagus</strong><br>\n          Havkajakvej, Amagerstrand<br>\n          <a href="https://inipi.dk" style="color: #502B30; text-decoration: none;">inipi.dk</a>',
    content
)

# Write back
with open('lib/email.ts', 'w') as f:
    f.write(content)

print("Email templates updated successfully!")
