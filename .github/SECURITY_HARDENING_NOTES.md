# LE ROY FACTORY — Security hardening rollout

This branch must not be merged before the production migration steps are complete.

## Implemented
- Firebase Authentication for CRM agents.
- Server-side bearer-token validation for protected Cloud Functions.
- Firestore and Storage rules.
- OTP email verification for PRO tariff access and account updates.
- Private signed tariff links.
- Private commercial statistics loader and migration endpoint.
- RIB/Kbis server-side validation and protected access.
- JARVIS CRM authorization based on verified Firebase identity.
- Public-site SEO/RGPD hardening.
- Syntax/security CI checks.

## Required before merge
1. Enable Firebase Email/Password authentication.
2. Create/verify the authorized agent accounts.
3. Deploy Cloud Functions first.
4. Run `migrateLegacyStatistics` as an authenticated admin and verify all sources.
5. Run `migrateProTariffs` as an authenticated admin and verify every private PDF.
6. Deploy Firestore and Storage rules.
7. Test agent login, CRM CRUD, grouped mail, scheduled mail, JARVIS, account requests, attachments, statistics, PRO OTP and tariff download.
8. Remove public tariff PDFs only after migration verification.
9. Purge sensitive historical statistics/tariffs from Git history or move the operational repository to private access.
10. Merge only after the full regression check passes.
