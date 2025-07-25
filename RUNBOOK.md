# NEXUS Grid Runbook

## Common Failures & Troubleshooting

### Problem: Server fails to start with SSL error
- **Symptom:** Log shows "Error: ENOENT: no such file or directory, open './certs/key.pem'".
- **Cause:** SSL certificates are missing.
- **Solution:** Run `npm run generate:certs` from the project root.

### Problem: API returns 503 Service Unavailable on /health
- **Symptom:** Docker container for `nexus-server` is restarting. `docker logs nexus-server` shows DB connection errors.
- **Cause:** The database container (`nexus-db`) is not healthy or accessible.
- **Solution:**
  1. Check database logs: `docker logs nexus-db`.
  2. Ensure `.env` variables for the database are correct.
  3. Restart the stack: `docker-compose down && docker-compose up -d`.