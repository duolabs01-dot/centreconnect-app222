# AI Register Import E2E Audit

1. Creating test user: audit-ecd-1773086991261-y5o9is@example.com
   - WARNING: Temporarily elevating user to service_role to bypass RLS policy issue.
   - SUCCESS: User ID 3f00152d-c533-42c0-a0bb-24c908e4c04a created and linked to Bajabulile.
2. Uploading test image: public/centres/bajabulile/hero.jpg

❌ E2E test FAILED: Upload failed: new row violates row-level security policy

5. Cleaning up test data...
   - DELETED: User 3f00152d-c533-42c0-a0bb-24c908e4c04a
   - SUCCESS: Cleanup complete.