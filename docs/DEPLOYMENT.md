OCI deployment and GitHub Actions CI/CD

Overview
--------
This repository now includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that will:

- Build backend and frontend Docker images and push them to GitHub Container Registry (GHCR).
- Template and upload a `docker-compose.prod.yml` file to the OCI host and instruct the host to pull and run the images.
- Run simple smoke checks (backend `/health`, frontend index) and fail the run if checks do not pass.

What you must prepare on the OCI host (one-time)
-----------------------------------------------
1. Linux VM (OCI Compute) with Docker Engine and Docker Compose plugin installed.
   - Instructions (example for Ubuntu):
     - sudo apt update && sudo apt install -y ca-certificates curl gnupg lsb-release
     - curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
     - sudo usermod -aG docker $USER (log out/in)
     - Install Docker Compose plugin (if not present): sudo apt install docker-compose-plugin

2. Create a deploy directory and place a `.env.production` file there with your production secrets:
   - /home/<deploy_user>/cbt-platform/.env.production
   - It must include DB credentials, JWT secret, email config, etc. (do NOT commit this file to GitHub):
     - DB_HOST=db
     - DB_PORT=5432
     - DB_NAME=cbt_platform
     - DB_USER=postgres
     - DB_PASSWORD=<secure_password>
     - JWT_SECRET=<secure>
     - (other env vars as needed)

3. Ensure the deploy user can run Docker and has sufficient disk space.

4. (Optional but recommended) Create a systemd unit so the stack comes up on reboot.
   - Example unit: `/etc/systemd/system/cbt-platform.service` that runs `docker compose -f /home/<user>/cbt-platform/docker-compose.prod.yml up -d` on start.

GitHub repository secrets (required)
-----------------------------------
Add the following repository secrets (Settings → Secrets → Actions):

- OCI_HOST: Public IP or hostname of the OCI VM
- OCI_USER: SSH user on the OCI VM (the deploy user)
- OCI_SSH_PRIVATE_KEY: Private SSH key for the deploy user (no password prompt)
- OCI_SSH_PORT: (optional) default 22
- GHCR_USER: Username for ghcr.io login (usually your GitHub username)
- GHCR_PAT: Personal Access Token with `write:packages, read:packages` (used to push and allow the server to pull images)

How the deploy works
--------------------
- When you push to `main`, GitHub Actions builds the backend and frontend images and pushes them to `ghcr.io/<your-org>/...`.
- The workflow templates the production compose with the right GHCR owner, uploads it to your OCI VM, logs into GHCR on the server, pulls the new images and restarts the stack.
- The workflow runs simple smoke checks and stops on failure.

Rollback
--------
- Because images are tag-based, you can rollback by ssh'ing into the server and `docker pull ghcr.io/<owner>/cbt-platform-backend:<older-tag>` and updating `docker-compose.prod.yml` to reference that tag and `docker compose up -d` or by running `docker compose -f docker-compose.prod.yml pull` if you manage tags.

Security notes
--------------
- Keep `.env.production` on the server and out of the repo.
- Use a small-scope GitHub PAT for GHCR and rotate it periodically.
- Secure the deploy SSH key and restrict its usage to the deploy user.

If you want, I can:
- Create example `systemd` unit and `deploy` helper script and add them to the docs.
- Optionally implement a Slack/Teams notification step in the workflow.
- Or set up a self-hosted runner on the OCI VM instead of SSH-based deploy (that removes the need for copying files).

Which additions would you like me to implement next?
