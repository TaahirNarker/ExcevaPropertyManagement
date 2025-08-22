# 🔐 SSH Key Setup for GitHub Actions Auto-Deploy

## Overview
This guide will help you set up secure SSH key authentication for the GitHub Actions auto-deploy workflow.

## 🔑 SSH Keys Generated

### Public Key (Add to Server)
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPrrMzgQ1XcJfpOdh6rdyrqkh1HUX18xF+E0E17MQvTB github-actions-deploy
```

### Private Key (Add to GitHub Secrets)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACD66zM4ENV3CX6TnYeq3cq6pIdR1F9fMRfhNBNezEL0wQAAAJgvfOHjL3zh
4wAAAAtzc2gtZWQyNTUxOQAAACD66zM4ENV3CX6TnYeq3cq6pIdR1F9fMRfhNBNezEL0wQ
AAAECDKZs3wytdW9fxYAwAuOAQPLSvryJdNPl3n9wOr58hmvrrMzgQ1XcJfpOdh6rdyrqk
h1HUX18xF+E0E17MQvTBAAAAFWdpdGh1Yi1hY3Rpb25zLWRlcGxveQ==
-----END OPENSSH PRIVATE KEY-----
```

## 🚀 Setup Instructions

### Step 1: Add Public Key to Server

SSH into your production server and add the public key:

```bash
# SSH to server
ssh ubuntu@150.230.123.106

# Add the public key to authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPrrMzgQ1XcJfpOdh6rdyrqkh1HUX18xF+E0E17MQvTB github-actions-deploy" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Test the key (from your local machine)
ssh -i ~/.ssh/github_actions_deploy ubuntu@150.230.123.106
```

### Step 2: Add Private Key to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/TaahirNarker/ExcevaPropertyManagement`
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SERVER_HOST` | `150.230.123.106` | Your server IP |
| `SERVER_USER` | `ubuntu` | Server username |
| `SERVER_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | The private key above |

### Step 3: Test SSH Connection

From your local machine, test the SSH connection:

```bash
# Test with the new key
ssh -i ~/.ssh/github_actions_deploy ubuntu@150.230.123.106

# You should see a welcome message and be logged in
```

### Step 4: Test Auto-Deploy

1. Make a small change to any file
2. Commit and push to `main` branch
3. Check GitHub Actions tab for deployment status

## 🔒 Security Benefits

### ✅ SSH Key Authentication
- **More Secure**: No passwords transmitted
- **No 2FA Issues**: Works with 2FA enabled
- **Key Rotation**: Easy to rotate keys
- **Audit Trail**: Clear authentication logs

### ✅ GitHub Actions Security
- **Encrypted Secrets**: All secrets are encrypted
- **Access Control**: Repository-level permissions
- **Audit Logs**: All actions are logged

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Check SSH permissions on server
   ls -la ~/.ssh/
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh/
   ```

2. **Key Not Found**
   ```bash
   # Verify key is in authorized_keys
   cat ~/.ssh/authorized_keys | grep github-actions-deploy
   ```

3. **Connection Refused**
   ```bash
   # Check if SSH is running
   sudo systemctl status ssh
   sudo systemctl start ssh
   ```

### Testing Commands

```bash
# Test SSH connection with verbose output
ssh -v -i ~/.ssh/github_actions_deploy ubuntu@150.230.123.106

# Check SSH configuration
ssh -T -i ~/.ssh/github_actions_deploy ubuntu@150.230.123.106
```

## 📊 Verification

After setup, verify everything works:

1. **SSH Connection**: ✅ Can connect with key
2. **GitHub Secrets**: ✅ All secrets configured
3. **Auto-Deploy**: ✅ GitHub Actions workflow runs
4. **Deployment**: ✅ Code deploys successfully

## 🔄 Key Rotation

To rotate keys in the future:

1. Generate new key pair
2. Add new public key to server
3. Update GitHub secret with new private key
4. Remove old key from server

---

**Need Help?** Check the GitHub Actions logs for detailed error messages.
