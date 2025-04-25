"""
WSGI config for map_navigation_project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys

# Make sure your project base directory is in the path
path = '/home/PrashantXKumar/hospital-pwa'
if path not in sys.path:
    sys.path.insert(0, path)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'map_navigation_project.settings')

# Load WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
