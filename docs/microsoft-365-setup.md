# Microsoft 365 Login Setup

Analogue Pro uses Supabase Auth with the `azure` OAuth provider for Microsoft 365 sign-in.

## 1. Create Azure App Registration

1. Open Microsoft Azure Portal.
2. Go to Microsoft Entra ID > App registrations > New registration.
3. Choose supported account type:
   - Single tenant: only your company users.
   - Multitenant: users from other Microsoft 365 tenants too.
4. Add this Redirect URI as a Web redirect:

```text
https://rjswgphselvghvxjnbyu.supabase.co/auth/v1/callback
```

5. After creating the app, copy:
   - Application (client) ID
   - Directory (tenant) ID

## 2. Create Client Secret

1. In the app registration, go to Certificates & secrets.
2. Create a new client secret.
3. Copy the secret value immediately.

## 3. Enable Provider In Supabase

1. Open Supabase Dashboard.
2. Go to Authentication > Providers.
3. Enable Azure.
4. Fill:
   - Client ID: Azure Application (client) ID
   - Client Secret: Azure client secret value
   - Azure tenant URL / tenant ID: use your Directory (tenant) ID if Supabase asks for it
5. Save.

## 4. Link Microsoft Users To Employees

After the first Microsoft sign-in, Supabase creates a user in `auth.users`.

For an existing employee to enter the app, `employees.user_id` must match that Supabase Auth user id.

Example:

```sql
update employees
set user_id = 'SUPABASE_AUTH_USER_ID'
where email = 'employee@your-company.com';
```

The app will then continue into the existing PIN screen and RBAC flow.

## 5. Local Development URL

For local testing, add this URL in Supabase Auth URL settings if needed:

```text
http://127.0.0.1:5174
```

The app redirects OAuth back to `window.location.origin`, so use the same local origin you opened in the browser.

## Next Integrations

Once login works, the same Microsoft identity can be extended for:

- Outlook email notifications
- Calendar leave events
- Teams notifications
- OneDrive / SharePoint document storage
- Entra ID employee sync
