-- Check the actual policy definitions
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'attendance_register_imports';
