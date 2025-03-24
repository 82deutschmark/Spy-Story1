
# Port Configuration Guide for Deployment

## Overview

This document outlines the port configuration requirements for properly deploying the application using Replit's Autoscale Deployment service. It explains the recent port configuration issues, their resolution, and best practices for maintaining deployment stability.

## Port Configuration Issues & Resolution

### Problem

The application was experiencing deployment failures due to several port configuration issues:

1. **Port Mismatch**: The application was running on port 5000, but Autoscale deployments require port 80 to be the primary exposed port.
2. **Duplicate Port Entries**: The `.replit` file had duplicate entries for port 5000, creating configuration conflicts.
3. **Missing Port 80 Configuration**: The application wasn't properly configured to listen on port 80 as required by Autoscale.

### Solution

We implemented the following changes to resolve these issues:

1. **Environment-Aware Port Configuration**: The application now uses the `PORT` environment variable to determine which port to use, with appropriate defaults:
   - For development: Default to port 5000
   - For deployment: Use port 80 via the `PORT` environment variable

2. **Correct Deployment Configuration**: The deployment configuration now explicitly sets `PORT=80` and binds gunicorn to `0.0.0.0:80`.

3. **Fixed Port Configuration in `.replit`**: Removed duplicate port entries and properly configured port 80.

## Files Modified

1. **main.py**: Updated to use the `PORT` environment variable
2. **wsgi.py**: Configured to adapt to the `PORT` environment variable
3. **.replit**: Fixed duplicate port definitions and added proper port 80 configuration
4. **Deployment Configuration**: Updated to explicitly use port 80

## Technical Details

### Port Binding

When starting the application, it's critical to:
1. Bind to `0.0.0.0` (all interfaces), not just `localhost` or `127.0.0.1`
2. Use the port specified by the `PORT` environment variable if available

```python
# Example code in main.py and wsgi.py
port = int(os.environ.get('PORT', 5000))  # Default to 5000 for development
app.run(host='0.0.0.0', port=port)
```

### Deployment Configuration

The deployment configuration must:
1. Set the `PORT` environment variable to `80`
2. Bind the server to `0.0.0.0:80`

```
PORT=80 gunicorn --bind 0.0.0.0:80 'wsgi:app' --access-logfile '-' --log-level info --timeout 120
```

### Port Forwarding

For Autoscale deployments, Replit requires:
1. Requests be served on port 80
2. The `.replit` file must have proper port configuration
3. No duplicate port entries

## Best Practices

1. **Always Use Environment Variables**: Never hardcode port values; use environment variables with sensible defaults.
2. **Explicit Port Configuration**: When configuring deployment, be explicit about port settings.
3. **Check for Conflicts**: Regularly check `.replit` for duplicate port entries.
4. **Test Deployment Locally**: Test deployment configuration locally before deploying.

## Troubleshooting

If deployment issues persist, check:

1. **Logs**: Look for startup errors, particularly around port binding
2. **Port Configuration**: Ensure `.replit` contains correct port configurations
3. **Startup Time**: Make sure your application starts up within the required timeframe
4. **Binding Address**: Verify the application binds to `0.0.0.0` not just `localhost`

## Related Resources

- [Replit Autoscale Deployment Documentation](https://docs.replit.com/cloud-services/deployments/autoscale-deployments)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/2.0.x/deploying/)
- [Gunicorn Configuration](https://docs.gunicorn.org/en/stable/settings.html)
