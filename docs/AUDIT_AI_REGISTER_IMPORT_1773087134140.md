# AI Register Import E2E Audit

1. Creating test user: audit-ecd-1773087134140-k9p4xz@example.com
   - WARNING: Temporarily elevating user to service_role to bypass RLS policy issue.
   - SUCCESS: User ID 8eeb0d18-e55a-476e-8281-c3d397f11486 created and linked to Bajabulile.

   - WARNING: Using temporary 'ecd-media-testing' bucket due to RLS policy issues on 'ecd-media'.
2. Uploading test image: public/centres/bajabulile/hero.jpg

❌ E2E test FAILED: Upload failed: new row violates row-level security policy

5. Cleaning up test data...
   - DELETED: User 8eeb0d18-e55a-476e-8281-c3d397f11486
   - SUCCESS: Cleanup complete.