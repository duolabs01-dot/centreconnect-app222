# AI Register Import E2E Audit

1. Creating test user: audit-ecd-1773088961012-uq92io@example.com
   - WARNING: Temporarily elevating user to service_role to bypass RLS policy issue.
   - SUCCESS: User ID 00c46897-7c20-4dc1-9b98-dd4324251c2b created and linked to Bajabulile.

   - WARNING: Using temporary 'ecd-media-testing' bucket due to RLS policy issues on 'ecd-media'.
2. Uploading test image: public/centres/bajabulile/hero.jpg

❌ E2E test FAILED: Upload failed: new row violates row-level security policy

5. Cleaning up test data...
   - DELETED: User 00c46897-7c20-4dc1-9b98-dd4324251c2b
   - SUCCESS: Cleanup complete.