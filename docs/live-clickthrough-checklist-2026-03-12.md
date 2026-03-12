# Live Click-through Checklist — Parent + ECD

## Parent (executed)
- `npm run test:parent-live` ✅
  - create parent auth user
  - create child profile
  - create emergency contact
  - cleanup

## Parent UAT hard-pass (executed)
- `npm run test:parent-uat` ✅

## ECD (current status)
No dedicated automated live ECD browser script exists yet in package scripts.

### Interim verification done
- Full app build/type/lint passes ✅
- ECD route compile coverage via Next build ✅
- ECD extraction flows patched for crash-safe behavior ✅

### Required next step
Create automated ECD live smoke script with these checks:
1. Login as ECD owner/admin
2. Open dashboard, attendance, children, calendar, communications
3. Run register OCR upload (single page)
4. Review extracted names list and save at least one row
5. Verify tier-gated routes redirect correctly for Starter

This script should be added as `npm run test:ecd-live`.
