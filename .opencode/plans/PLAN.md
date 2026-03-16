# CentreConnect Enhancement Plan

## Overview
This plan addresses three key enhancement requests:
1. Prevent duplicate child entries during OCR scanning
2. Modify attendance register for DOE report generation
3. Extend children table for payment tracking

## 1. Duplicate Prevention for OCR Scanning

### Current Issue
When users scan attendance registers using Gemini OCR, duplicate entries are created for children who were already enrolled manually.

### Solution Approach
Modify the `bulkCreateExistingChildrenAction` function to check for existing children before creating new ones.

### Implementation Details

#### File to Modify
`app/ecd/(portal)/children/new/actions.ts`

#### Changes Required
1. Add a pre-check function to identify existing children by name/DOB
2. Modify `bulkCreateExistingChildrenAction` to:
   - Check each extracted child against existing records
   - Skip children that already exist (exact match on first_name, last_name, date_of_birth)
   - Only create new children for those not found
   - Return information about both created and skipped children

#### Technical Approach
- Use existing `checkChildIdentityDuplicates` function from `lib/parent/child-identity.ts`
- Create a helper function to check for existing children before insertion
- Maintain backward compatibility with existing API

### Expected Outcome
- No duplicate children created during OCR bulk import
- Clear feedback to user about which children were skipped vs created
- Preservation of existing child data integrity

## 2. DOE Report Generation Enhancement

### Current Issue
The attendance register needs to be modified to generate DOE-compliant reports matching the Bajabulile sample format.

### Solution Approach
Enhance the existing attendance register page to include DOE-specific formatting and fields.

### Implementation Details

#### Files to Modify
1. `app/ecd/(portal)/attendance/page.tsx` - Main attendance page
2. `app/ecd/(portal)/attendance/attendance-grid-client.tsx` - Attendance grid component

#### Changes Required
1. Add DOE report toggle/switch in attendance page
2. Modify AttendanceGridClient to support DOE format when enabled:
   - Adjust column headers to match DOE requirements
   - Modify footer section for DOE signatures
   - Adjust date formatting to match DOE standards
   - Include additional required fields (center details, practitioner info, etc.)
3. Update print CSS for DOE-specific layout

#### DOE Report Requirements (based on Bajabulile sample)
- Official header with "Department of Education" or "DOE/DSD" designation
- Center name, registration number, period covered
- Practitioner/principal signature lines with dates
- Monthly summary statistics
- Proper column labeling for attendance codes

### Expected Outcome
- Attendance register can generate DOE-compliant reports with toggle
- Maintains existing functionality for regular attendance tracking
- Reports match the exact format required for government submission

## 3. Payment Tracking Extension

### Current Issue
Need to track parent payment status (paid, unpaid, advance) for children.

### Solution Approach
Extend the children table with payment tracking fields.

### Implementation Details

#### Database Migration
Create new migration file: `supabase/migrations/20260316_001_children_payment_tracking.sql`

#### Fields to Add
- `payment_status` (enum: 'paid', 'unpaid', 'advance', 'partial')
- `amount_paid` (decimal)
- `amount_due` (decimal)
- `payment_date` (date)
- `next_payment_date` (date)
- `payment_notes` (text)
- `fee_amount` (decimal) - if not already present

#### Backend Changes
1. Update Supabase table schema via migration
2. Modify child creation/update functions to handle payment fields
3. Add payment validation and calculation logic
4. Update relevant API endpoints if needed

#### Frontend Changes
1. Update child enrollment forms to include payment information
2. Add payment tracking views in ECD portal
3. Create payment reporting capabilities

### Expected Outcome
- Ability to track and manage parent payments per child
- Clear visibility of payment status in child profiles
- Reporting capabilities for payment follow-up
- Integration with existing billing/invoicing systems

## Integration Points

### 1. Duplicate Prevention + DOE Reports
- Duplicate prevention ensures clean data for accurate DOE reporting
- Both features operate independently but benefit from data integrity

### 2. Payment Tracking + Child Management
- Payment fields will be visible in child profiles
- Payment status can influence enrollment status/reminders
- Payment data can be included in DOE reports if required

### 3. All Features + User Experience
- All enhancements designed to maintain existing workflows
- Minimal disruption to current users
- Clear feedback mechanisms for all operations

## Implementation Priority
1. Duplicate prevention (highest impact on data quality)
2. DOE report generation (regulatory compliance)
3. Payment tracking (operational efficiency)

## Risk Mitigation
- All changes will be backward compatible
- Database migrations will be additive only
- Extensive testing recommended before deployment
- Feature flags can be used for DOE report toggle

## Next Steps
1. Begin with duplicate prevention implementation
2. Proceed to DOE report enhancements
3. Complete with payment tracking extension
4. Test all features with Bajabulile Day Care Centre data
5. Deploy to production with monitoring