#!/usr/bin/env bash
# ON THE SERVER, once, at first boot: given to EC2 as "user data" when the server is
# created (docs/aws.md §9, step 8). It prepares Ubuntu 24.04 for deploy.sh. Its output
# is in /var/log/cloud-init-output.log on the server.
#
# Safe to run again by hand (sudo bash server-setup.sh): every step checks first.
set -euo pipefail

# 1. A 2 GB swap file: a cushion for the 2 GB of memory, so a short spike slows things
#    down instead of killing a container. swappiness 10: use it only when really needed.
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon -a
echo 'vm.swappiness=10' > /etc/sysctl.d/99-trellis.conf
sysctl --system >/dev/null

# 2. Docker and the compose plugin, from Ubuntu's own packages (security updates come
#    with the system's). The AWS CLI, for ECR sign-in and Parameter Store.
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q docker.io docker-compose-v2 unattended-upgrades
systemctl enable --now docker
snap list aws-cli >/dev/null 2>&1 || snap install aws-cli --classic

# 3. Security updates install themselves every day (Ubuntu's unattended-upgrades). The
#    server is never rebooted automatically: a reboot is a short outage, done by hand.
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# 4. Where the compose file, Caddyfile, scripts and .env live. Root-only: .env holds the
#    secrets. release.sh copies the files in on each deploy.
mkdir -p /opt/trellis
chmod 700 /opt/trellis

echo "Trellis server setup done."
