# Smart Urea Management System

## Admin account setup

Admin accounts are not created through public registration. To set up the first
admin account, run this command from the project root:

```powershell
.\.venv\Scripts\python.exe -m scripts.bootstrap_admin
```

The script can promote an already registered active account (including an
account created earlier from the registration page), or create a new admin
account if none exists. Promoting a specified existing account is allowed even
if another admin account is already present. Sign in at `frontend/login.html`
using the Admin role and the account's email and password.

Public registration supports farmer and dealer accounts.