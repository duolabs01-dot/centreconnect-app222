import { sendEmail } from '@/lib/email/send'
import { shouldAttemptDirectEmailForRecipient } from '@/lib/email/send'
import { deliverTransactionalEmail } from '@/lib/email/delivery'

async function runTests() {
  console.log('📧 Starting Email Tests...\n')
  console.log('SMTP Config Check:')
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`)
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`)
  console.log(`  SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`)
  console.log(`  SMTP_FROM: ${process.env.SMTP_FROM || 'NOT SET'}`)
  
  const testEmail = 'themba@centreconnect.co.za'
  const results: Array<{ test: string; passed: boolean; details: string }> = []
  
  // Test 1: Check eligibility
  console.log('\n\n=== Test 1: SMTP Eligibility ===')
  const eligibility = shouldAttemptDirectEmailForRecipient(testEmail)
  console.log(`  Eligible: ${eligibility.allowed}`)
  if (!eligibility.allowed) {
    console.log(`  Reason: ${eligibility.reason}`)
    results.push({ test: 'SMTP Eligibility', passed: false, details: eligibility.reason || 'Not eligible' })
  } else {
    results.push({ test: 'SMTP Eligibility', passed: true, details: 'SMTP configured correctly' })
  }
  
  // Test 2: Basic sendEmail
  console.log('\n\n=== Test 2: Basic sendEmail ===')
  const result1 = await sendEmail({
    to: testEmail,
    subject: '[TEST] Basic sendEmail test',
    html: '<p>This is a test</p>',
  })
  console.log(`  Success: ${result1.success}`)
  if (!result1.success) console.log(`  Error: ${result1.error}`)
  results.push({ test: 'Basic sendEmail', passed: result1.success, details: result1.error || 'OK' })
  
  // Test 3: deliverTransactionalEmail (fallback ok)
  console.log('\n\n=== Test 3: deliverTransactionalEmail (fallback ok) ===')
  const result2 = await deliverTransactionalEmail({
    to: testEmail,
    subject: '[TEST] deliverTransactionalEmail fallback test',
    html: '<p>This is a test</p>',
    requireDirectDelivery: false,
  })
  console.log(`  Status: ${result2.status}`)
  console.log(`  Direct sent: ${result2.directSent}`)
  if (result2.directErrors.length) console.log(`  Errors: ${result2.directErrors.join(', ')}`)
  results.push({ 
    test: 'deliverTransactionalEmail (fallback)', 
    passed: result2.status !== 'failed', 
    details: result2.status 
  })
  
  // Test 4: deliverTransactionalEmail (requireDirectDelivery)
  console.log('\n\n=== Test 4: deliverTransactionalEmail (requireDirectDelivery) ===')
  const result3 = await deliverTransactionalEmail({
    to: testEmail,
    subject: '[TEST] deliverTransactionalEmail direct required test',
    html: '<p>This is a test</p>',
    requireDirectDelivery: true,
  })
  console.log(`  Status: ${result3.status}`)
  console.log(`  Direct sent: ${result3.directSent}`)
  if (result3.directErrors.length) console.log(`  Errors: ${result3.directErrors.join(', ')}`)
  results.push({ 
    test: 'deliverTransactionalEmail (direct required)', 
    passed: result3.directSent, 
    details: result3.status 
  })
  
  console.log('\n\n📊 RESULTS:')
  results.forEach((r: { test: string; passed: boolean; details: string }) => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}: ${r.details}`)
  })
  
  const allPassed = results.every((r: { test: string; passed: boolean; details: string }) => r.passed)
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  process.exit(allPassed ? 0 : 1)
}

runTests().catch(console.error)
