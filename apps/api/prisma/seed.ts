import { createHash } from 'node:crypto'
import argon2 from 'argon2'
import { Prisma, PrismaClient } from '@prisma/client'
import { computeAuditEventHash, GENESIS_HASH, verifyIntegrity } from '../src/modules/audit/audit.service.js'

const prisma = new PrismaClient()
const DEMO = '[SYNTHETIC DEMO]'
const baseDate = new Date('2026-01-01T00:00:00.000Z')
const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`
const at = (minutes: number) => new Date(baseDate.getTime() + minutes * 60_000)
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const paise = (rupees: number) => rupees * 100
const correlation = (value: number) => `SYN-DEMO-CORR-${String(value).padStart(4, '0')}`
const json = (value: unknown) => value as Prisma.InputJsonValue

type OrgKey = 'vidya' | 'adarsh' | 'pragati' | 'gramin' | 'navjyoti' | 'shiksha'
type Purpose = 'SCHOOL_FEES' | 'BOOKS' | 'UNIFORMS' | 'STATIONERY' | 'EDUCATION_SUPPLIES'

const campaignFixtures: Array<{
  title: string
  slug: string
  org: OrgKey
  purpose: Purpose
  cluster: string
  narrative: string
  vendor: string
  city: string
  gstin: string
  invoice: string
  bill: string
  budget: number
  target: number
}> = [
  { title: 'Project Vidya Kit — NCERT Books & Geometry Sets for 600 Rural Students', slug: 'project-vidya-kit-ncert-books-geometry-sets', org: 'vidya', purpose: 'BOOKS', cluster: 'Nagpur & Wardha Cluster', narrative: 'A coordinated distribution of NCERT-aligned science and mathematics books, geometry kits, and graph materials for 600 anonymized rural learners across eight school clusters. Procurement is batch-controlled, photographed at dispatch, and reconciled against school receipt acknowledgements.', vendor: 'Saraswati Book Depot — Daryaganj, New Delhi', city: 'Daryaganj, New Delhi', gstin: '07AABCS1042F1ZQ', invoice: 'INV/SBD/2026/1042', bill: '600 NCERT Science & Math bundles × ₹1,180 = ₹7,08,000; freight 8 lots × ₹4,500 = ₹36,000; GST included in invoice total.', budget: 900000, target: 1200000 },
  { title: 'Digital Classroom & Raspberry Pi Computer Lab for Z.P. High School', slug: 'digital-classroom-raspberry-pi-zp-high-school', org: 'adarsh', purpose: 'EDUCATION_SUPPLIES', cluster: 'Pune Cluster', narrative: 'The digital classroom programme equips one Zilla Parishad high school with a supervised Raspberry Pi lab, backup power, LAN wiring, and teacher orientation. Device serial numbers and installation photographs are linked to each vendor payout.', vendor: 'Sahyadri EdTech Hardware Pvt Ltd — Pune', city: 'Pune', gstin: '27AABCS4411L1Z8', invoice: 'GST/SEH/2026/441', bill: '15 Raspberry Pi desktop workstations × ₹38,500 = ₹5,77,500; UPS units 5 × ₹12,800 = ₹64,000; LAN wiring 1 lot × ₹1,18,500 = ₹1,18,500.', budget: 1100000, target: 1450000 },
  { title: 'Winter Uniforms, School Shoes & Raincoats for Tribal Belt Primary Girls', slug: 'winter-uniforms-shoes-raincoats-tribal-girls', org: 'vidya', purpose: 'UNIFORMS', cluster: 'Gadchiroli & Melghat Cluster', narrative: 'Seasonal protection for 400 primary-school girls is delivered through a women-led uniform cooperative. Measurements are aggregated by cohort code, never by child name, and school distribution is verified by signed cluster registers.', vendor: 'Maharashtra Handloom & Uniform Co-op — Solapur', city: 'Solapur', gstin: '27AABCM0312C1Z3', invoice: 'INV/MHUC/2026/312', bill: '400 stitched cotton uniform sets × ₹1,420 = ₹5,68,000; footwear pairs 400 × ₹680 = ₹2,72,000; raincoats 400 × ₹520 = ₹2,08,000.', budget: 1250000, target: 1600000 },
  { title: 'STEM & Hands-On Robotics Science Lab Equipment for Senior Secondary', slug: 'stem-robotics-science-lab-senior-secondary', org: 'pragati', purpose: 'EDUCATION_SUPPLIES', cluster: 'Ambala & Kurukshetra Cluster', narrative: 'Senior-secondary learners receive a practical science lab upgrade with microscopy, optics, chemistry glassware, and entry-level robotics benches. The procurement plan separates durable equipment from consumables for auditability.', vendor: 'Bharat Scientific Instruments Co. — Ambala Cantt', city: 'Ambala Cantt', gstin: '06AABCB0905R1Z5', invoice: 'INV/BSI/2026/905', bill: '6 compound microscopes × ₹42,000 = ₹2,52,000; 4 physics optics benches × ₹58,500 = ₹2,34,000; chemistry glassware 12 kits × ₹18,500 = ₹2,22,000; robotics kits 10 × ₹24,500 = ₹2,45,000.', budget: 1400000, target: 1800000 },
  { title: 'Annual Tuition Fee & Board Exam Registration Sponsorship for 120 Orphans', slug: 'annual-tuition-board-exam-sponsorship-orphans', org: 'adarsh', purpose: 'SCHOOL_FEES', cluster: 'Jaipur Cluster', narrative: 'A ring-fenced fee sponsorship clears annual tuition and board registration for 120 anonymized residential-care learners. Payments go directly to the institutional nodal account in two batches and are matched to cohort-level fee ledgers.', vendor: 'State Board Examination & Fee Nodal Account — Jaipur', city: 'Jaipur', gstin: '08AABSS2026B1Z1', invoice: 'FEE/2026/BATCH-A and FEE/2026/BATCH-B', bill: '120 tuition sponsorships × ₹8,500 = ₹10,20,000; board registration 120 × ₹1,250 = ₹1,50,000; institutional settlement receipts attached by batch.', budget: 1400000, target: 1750000 },
  { title: 'Poshan & Mid-Day Morning Nutrition Supplement (Milk, Millets & Iron Fortification)', slug: 'poshan-midday-nutrition-milk-millets-iron', org: 'pragati', purpose: 'SCHOOL_FEES', cluster: 'Varanasi Cluster', narrative: 'For 90 school days, the nutrition supplement adds fortified ragi malt, dates, and pasteurized milk to morning meals. Delivery quantities are reconciled weekly against kitchen logs and anonymized attendance cohorts.', vendor: 'Kashi Agro & Dairy Federation — Varanasi', city: 'Varanasi', gstin: '09AABCK0771D1Z7', invoice: 'INV/KADF/2026/771', bill: 'Fortified ragi malt 1,800 kg × ₹118 = ₹2,12,400; dates 900 kg × ₹185 = ₹1,66,500; milk 27,000 litres × ₹54 = ₹14,58,000; cold-chain logistics 90 days × ₹3,500 = ₹3,15,000.', budget: 1800000, target: 2200000 },
  { title: 'Solar Rooftop Power & Smart Inverter Backup for Off-Grid Rural School', slug: 'solar-rooftop-smart-inverter-off-grid-school', org: 'gramin', purpose: 'EDUCATION_SUPPLIES', cluster: 'Jodhpur Cluster', narrative: 'A 5kW rooftop solar system gives an off-grid rural school reliable light, device charging, and evening study capacity. Installation certificates, inverter serials, and energy-generation readings are published as non-financial impact evidence.', vendor: 'SuryaKiran Solar Systems Pvt Ltd — Jaipur', city: 'Jaipur', gstin: '08AABCS0219P1Z6', invoice: 'INV/SKSS/2026/219', bill: '5kW solar panels 10 × ₹38,000 = ₹3,80,000; LiFePO4 battery bank 1 × ₹4,25,000 = ₹4,25,000; smart inverter 1 × ₹1,35,000 = ₹1,35,000; LED fans 24 × ₹4,800 = ₹1,15,200.', budget: 1250000, target: 1600000 },
  { title: 'Clean Drinking Water RO Plant & Girls Sanitation Block Renovation', slug: 'clean-water-ro-plant-girls-sanitation-renovation', org: 'gramin', purpose: 'EDUCATION_SUPPLIES', cluster: 'Bhopal Cluster', narrative: 'The water and sanitation upgrade combines a 250 LPH RO plant with a stainless-steel drinking station, plumbing, and a privacy-focused girls sanitation renovation. Water-quality tests and contractor milestones are attached to the payout record.', vendor: 'Narmada Water Tech & Civil Works — Bhopal', city: 'Bhopal', gstin: '23AABCN0554Q1Z2', invoice: 'INV/NWT/2026/554', bill: '250 LPH commercial RO purifier 1 × ₹2,85,000 = ₹2,85,000; stainless drinking station 1 × ₹1,45,000 = ₹1,45,000; plumbing and civil works 1 lot × ₹4,20,000 = ₹4,20,000.', budget: 1050000, target: 1350000 },
  { title: 'Braille Books, Audio Daisy Players & Assistive Learning Aids for Visually Impaired Children', slug: 'braille-books-audio-daisy-assistive-learning-aids', org: 'vidya', purpose: 'BOOKS', cluster: 'Mumbai & Thane Cluster', narrative: 'Accessible learning resources are supplied to 85 visually impaired learners through a specialist assistive-technology foundation. Each device is tagged to a cohort, while Braille materials are checked by an accessibility educator before release.', vendor: 'Saksham Assistive Tech Foundation — Mumbai', city: 'Mumbai', gstin: '27AABCS0118H1Z9', invoice: 'INV/SAT/2026/118', bill: '85 Braille tactile atlases × ₹3,800 = ₹3,23,000; 12 refreshable Braille displays × ₹42,000 = ₹5,04,000; audio Daisy learning kits 85 × ₹2,450 = ₹2,08,250.', budget: 1200000, target: 1500000 },
  { title: 'Anganwadi Early Childhood Foundational Literacy & Montessori Toy Library', slug: 'anganwadi-foundational-literacy-montessori-library', org: 'pragati', purpose: 'BOOKS', cluster: 'Indore Cluster', narrative: 'Early-years centres receive bilingual phonics materials, manipulatives, storybooks, and a rotating Montessori toy library. Facilitator demonstrations and monthly circulation logs connect procurement to actual classroom use.', vendor: 'Malwa Educational Toys & Print — Indore', city: 'Indore', gstin: '23AABCM0630J1Z4', invoice: 'INV/MET/2026/630', bill: 'Bilingual phonics flashcards 120 sets × ₹1,850 = ₹2,22,000; wooden abacus sets 120 × ₹1,250 = ₹1,50,000; storybooks 600 × ₹320 = ₹1,92,000; Montessori toy library 12 trunks × ₹18,500 = ₹2,22,000.', budget: 950000, target: 1250000 },
]

async function main() {
  const passwordHash = await argon2.hash('KindoraDemo!2026', { type: argon2.argon2id })
  await prisma.$transaction(async (tx) => {
    await tx.auditEvent.deleteMany()
    await tx.blockchainEvent.deleteMany()
    await tx.paymentWebhookEvent.deleteMany()
    await tx.impactReport.deleteMany()
    await tx.fraudCase.deleteMany()
    await tx.payout.deleteMany()
    await tx.evidenceFile.deleteMany()
    await tx.approval.deleteMany()
    await tx.expenseRequest.deleteMany()
    await tx.donation.deleteMany()
    await tx.vendor.deleteMany()
    await tx.allocation.deleteMany()
    await tx.campaign.deleteMany()
    await tx.organizationMembership.deleteMany()
    await tx.organization.deleteMany()
    await tx.session.deleteMany()
    await tx.user.deleteMany()

    const userRows = [
      ['donor1@demo.kindora.org', 'Demo Donor One', 'DONOR'],
      ['donor2@demo.kindora.org', 'Demo Donor Two', 'DONOR'],
      ['staff.vidya@demo.kindora.org', `${DEMO} Vidya Requester`, 'DONOR'],
      ['staff.pragati@demo.kindora.org', `${DEMO} Pragati Requester`, 'DONOR'],
      ['approver.a@demo.kindora.org', `${DEMO} Approver A`, 'DONOR'],
      ['approver.b@demo.kindora.org', `${DEMO} Approver B`, 'DONOR'],
      ['auditor@demo.kindora.org', `${DEMO} Compliance Auditor`, 'AUDITOR'],
      ['admin@demo.kindora.org', `${DEMO} Platform Admin`, 'PLATFORM_ADMIN'],
    ] as const
    const users = await Promise.all(userRows.map(([email, displayName, platformRole], index) => tx.user.create({ data: { id: id(index + 1), email, displayName, passwordHash, platformRole, isSyntheticDemo: true, createdAt: at(index) } })))
    const [donor1, donor2, vidyaStaff, pragatiStaff, approverA, approverB, auditor, admin] = users

    const orgRows: Array<[OrgKey, string, string, 'NGO' | 'SCHOOL', 'PENDING' | 'VERIFIED' | 'EXPIRED']> = [
      ['vidya', 'Vidya Setu Foundation', 'Vidya Setu Foundation', 'NGO', 'VERIFIED'],
      ['adarsh', 'Adarsh Gramin Vidyalaya Cluster', 'Adarsh Gramin Vidyalaya', 'SCHOOL', 'VERIFIED'],
      ['pragati', 'Pragati Public School Trust', 'Pragati Public School Trust', 'SCHOOL', 'VERIFIED'],
      ['gramin', 'Gramin Shiksha Abhiyan NGO', 'Gramin Shiksha Abhiyan', 'NGO', 'VERIFIED'],
      ['navjyoti', 'NavaJyoti Trust', 'NavaJyoti Trust', 'NGO', 'PENDING'],
      ['shiksha', 'Shiksha Kendra Society', 'Shiksha Kendra Society', 'NGO', 'EXPIRED'],
    ]
    const orgs = Object.fromEntries(await Promise.all(orgRows.map(async ([key, legalName, displayName, type, status], index) => [key, await tx.organization.create({ data: { id: id(100 + index), legalName: `${DEMO} ${legalName}`, displayName: `${DEMO} ${displayName} (${type})`, type, verificationStatus: status, registrationNumber: `REG/${2020 + index}/EDU/${String(index + 1).padStart(3, '0')}`, panOrDarpanRef: `DARPAN-${String(index + 1).padStart(5, '0')}-PAN`, privateDocRefsJson: json({ certificate: `${DEMO}-ORG-${index + 1}-registration.pdf`, pan: `${DEMO}-ORG-${index + 1}-pan.pdf` }), reviewNotes: `${DEMO} ${status.toLowerCase()} verification record; reviewer notes available for inspection.`, reviewerId: status === 'PENDING' ? null : auditor.id, reviewedAt: status === 'PENDING' ? null : at(20 + index), verificationExpiresAt: status === 'EXPIRED' ? new Date('2025-12-31T00:00:00Z') : status === 'VERIFIED' ? new Date(`2027-${String(index + 6).padStart(2, '0')}-28T00:00:00Z`) : null, isSyntheticDemo: true, createdAt: at(30 + index) } })]))) as Record<OrgKey, Awaited<ReturnType<typeof tx.organization.create>>>

    const membershipData = [
      [vidyaStaff.id, orgs.vidya.id, 'ORG_STAFF'], [pragatiStaff.id, orgs.pragati.id, 'ORG_STAFF'], [vidyaStaff.id, orgs.adarsh.id, 'ORG_STAFF'], [pragatiStaff.id, orgs.gramin.id, 'ORG_STAFF'],
      [approverA.id, orgs.vidya.id, 'APPROVER_A'], [approverB.id, orgs.vidya.id, 'APPROVER_B'], [approverA.id, orgs.adarsh.id, 'APPROVER_A'], [approverB.id, orgs.adarsh.id, 'APPROVER_B'],
      [approverA.id, orgs.pragati.id, 'APPROVER_A'], [approverB.id, orgs.pragati.id, 'APPROVER_B'], [approverA.id, orgs.gramin.id, 'APPROVER_A'], [approverB.id, orgs.gramin.id, 'APPROVER_B'],
      [auditor.id, orgs.vidya.id, 'AUDITOR'], [auditor.id, orgs.adarsh.id, 'AUDITOR'], [auditor.id, orgs.pragati.id, 'AUDITOR'], [auditor.id, orgs.gramin.id, 'AUDITOR'],
      [pragatiStaff.id, orgs.navjyoti.id, 'ORG_STAFF'], [auditor.id, orgs.navjyoti.id, 'AUDITOR'], [pragatiStaff.id, orgs.shiksha.id, 'ORG_STAFF'], [auditor.id, orgs.shiksha.id, 'AUDITOR'],
    ] as const
    await tx.organizationMembership.createMany({ data: membershipData.map(([userId, organizationId, role]) => ({ userId, organizationId, role })) })

    const campaigns = await Promise.all(campaignFixtures.map((fixture, index) => tx.campaign.create({ data: { id: id(200 + index), organizationId: orgs[fixture.org].id, slug: fixture.slug, title: `${DEMO} ${fixture.title}`, description: `${fixture.narrative} Procurement cluster: ${fixture.cluster}. Vendor bill summary: ${fixture.bill}`, purposeCategory: fixture.purpose, targetAmountPaise: paise(fixture.target), confirmedRaisedPaise: paise(Math.round(fixture.target * 0.62)), status: 'ACTIVE', isPublic: true, isSyntheticDemo: true, createdAt: at(50 + index) } })))

    const allocations = await Promise.all(campaignFixtures.flatMap((fixture, index) => [
      tx.allocation.create({ data: { id: id(300 + index * 2), correlationId: correlation(300 + index * 2), campaignId: campaigns[index].id, organizationId: orgs[fixture.org].id, purpose: fixture.purpose, approvedBudgetPaise: paise(fixture.budget), reservedPaise: paise(Math.round(fixture.budget * 0.08)), disbursedPaise: paise(Math.round(fixture.budget * 0.42)), createdAt: at(80 + index) } }),
      tx.allocation.create({ data: { id: id(301 + index * 2), correlationId: correlation(301 + index * 2), campaignId: campaigns[index].id, organizationId: orgs[fixture.org].id, purpose: (index % 2 === 0 ? 'STATIONERY' : fixture.purpose === 'SCHOOL_FEES' ? 'BOOKS' : 'SCHOOL_FEES'), approvedBudgetPaise: paise(Math.round(fixture.budget * 0.22)), reservedPaise: paise(Math.round(fixture.budget * 0.03)), disbursedPaise: paise(Math.round(fixture.budget * 0.09)), status: index === 2 ? 'FROZEN' : 'ACTIVE', freezeReason: index === 2 ? `${DEMO} duplicate evidence review lock.` : null, frozenByUserId: index === 2 ? auditor.id : null, frozenAt: index === 2 ? at(100 + index) : null, version: index === 2 ? 2 : 1, createdAt: at(81 + index) } }),
    ]))

    const vendorRows = campaignFixtures.map((fixture, index) => tx.vendor.create({ data: { id: id(500 + index), organizationId: orgs[fixture.org].id, legalName: `${DEMO} ${fixture.vendor}`, gstinOrPan: fixture.gstin, verificationStatus: 'VERIFIED', verificationExpiresAt: new Date('2027-12-31T00:00:00Z'), encryptedPayoutDestRef: `synthetic.encrypted.BANK-${String(index + 1).padStart(4, '0')}`, createdAt: at(120 + index) } }))
    const vendors = await Promise.all(vendorRows)

    const donationRows = Array.from({ length: 30 }, (_, index) => {
      const campaignIndex = index % campaigns.length
      const status: 'FAILED' | 'REFUNDED' | 'PENDING' | 'CONFIRMED' = index % 13 === 0 ? 'FAILED' : index % 11 === 0 ? 'REFUNDED' : index % 7 === 0 ? 'PENDING' : 'CONFIRMED'
      const donorUserId = index % 3 === 0 ? donor1.id : index % 3 === 1 ? donor2.id : null
      return { id: id(600 + index), correlationId: correlation(600 + index), donorUserId, donorDisplayName: donorUserId ? `${DEMO} donor` : null, isAnonymous: !donorUserId, campaignId: campaigns[campaignIndex].id, amountPaise: paise(500 + (index % 6) * 750), currency: 'INR', paymentProvider: index % 2 ? 'SANDBOX' as const : 'RAZORPAY' as const, providerOrderId: `SYN-ORDER-${String(index + 1).padStart(3, '0')}`, providerPaymentId: status === 'CONFIRMED' || status === 'REFUNDED' ? `SYN-PAY-${String(index + 1).padStart(3, '0')}` : null, idempotencyKey: `SYN-IDEMP-${String(index + 1).padStart(3, '0')}`, status, isTestMode: true, verifiedAt: status === 'CONFIRMED' ? at(150 + index) : null, createdAt: at(150 + index) }
    })
    await tx.donation.createMany({ data: donationRows })
    await tx.paymentWebhookEvent.createMany({ data: Array.from({ length: 12 }, (_, index) => ({ id: id(700 + index), provider: index % 2 ? 'SANDBOX' as const : 'RAZORPAY' as const, providerEventId: `SYN-WEBHOOK-${String(index + 1).padStart(3, '0')}`, eventType: index % 5 === 0 ? 'refund.processed' : 'payment.succeeded', payloadSha256: hash(`SYN-WEBHOOK-PAYLOAD-${index}`), status: index === 3 ? 'IGNORED_DUPLICATE' as const : 'PROCESSED' as const, receivedAt: at(190 + index), processedAt: at(191 + index) })) })

    const expenseStatuses = ['PAID', 'PAID', 'APPROVED', 'APPROVED', 'PENDING_APPROVALS', 'PENDING_APPROVALS', 'PENDING_APPROVALS', 'PENDING_APPROVALS', 'PENDING_APPROVALS', 'PAID', 'REJECTED', 'FROZEN', 'PAYOUT_FAILED', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'AMBIGUOUS_RECONCILIATION_REQUIRED', 'FROZEN'] as const
    const expenses = await Promise.all(expenseStatuses.map((status, index) => {
      const campaignIndex = index % campaigns.length
      const fixture = campaignFixtures[campaignIndex]
      const allocation = allocations[campaignIndex * 2 + (index % 2)]
      const requesterId = fixture.org === 'vidya' || fixture.org === 'adarsh' ? vidyaStaff.id : pragatiStaff.id
      const vendor = vendors[campaignIndex]
      return tx.expenseRequest.create({ data: { id: id(800 + index), correlationId: correlation(800 + index), organizationId: orgs[fixture.org].id, allocationId: allocation.id, requesterId, vendorId: vendor.id, amountPaise: paise(18000 + index * 1750), purpose: fixture.purpose, description: `${DEMO} itemized bill for ${fixture.title}. Purchased from ${fixture.vendor}. City: ${fixture.city}. ${fixture.bill} Requested by ${requesterId === vidyaStaff.id ? 'Vidya Setu field coordinator' : 'Pragati Public School procurement coordinator'}; invoice ${fixture.invoice}; quantity, unit rate, GST, delivery and receipt acknowledgement verified at cohort level. Approval trail: Approver A and Approver B are distinct institutional signatories; their decision and timestamp are recorded against the request version.`, invoiceReference: index === 12 || index === 13 ? 'INV-2026-DUP-99' : `${fixture.invoice}-${String(index + 1).padStart(2, '0')}`, version: index === 4 ? 2 : 1, status: status === 'AMBIGUOUS_RECONCILIATION_REQUIRED' ? 'PAYOUT_PENDING' : status, isSyntheticDemo: true, freezeReason: status === 'FROZEN' ? `${DEMO} blocked by allocation/fraud review.` : null, frozenById: status === 'FROZEN' ? auditor.id : null, frozenAt: status === 'FROZEN' ? at(240 + index) : null, createdAt: at(220 + index) } })
    }))

    const approvalRows: Prisma.ApprovalCreateManyInput[] = []
    expenses.forEach((expense, index) => {
      if (index < 5) approvalRows.push({ expenseRequestId: expense.id, requestVersion: expense.version, approverId: approverA.id, slot: 'APPROVER_A', decision: 'APPROVED', reason: `${DEMO} Approver A signed after vendor, budget and evidence pre-flight.` })
      if ([0, 1, 2, 13, 14, 15, 16, 17, 18].includes(index)) approvalRows.push({ expenseRequestId: expense.id, requestVersion: expense.version, approverId: approverB.id, slot: 'APPROVER_B', decision: 'APPROVED', reason: `${DEMO} Approver B independently approved the current request version.` })
      if (index === 10) approvalRows.push({ expenseRequestId: expense.id, requestVersion: 1, approverId: approverA.id, slot: 'APPROVER_A', decision: 'REJECTED', reason: `${DEMO} rejection retained for audit history.` })
      if (index === 4) approvalRows.push({ expenseRequestId: expense.id, requestVersion: 1, approverId: approverB.id, slot: 'APPROVER_B', decision: 'APPROVED', reason: `${DEMO} historical v1 approval invalidated by material edit.` })
    })
    await tx.approval.createMany({ data: approvalRows })

    await tx.evidenceFile.createMany({ data: expenses.map((expense, index) => ({ id: id(900 + index), expenseRequestId: expense.id, uploaderId: expense.requesterId, originalFilename: `${DEMO}-${campaignFixtures[index % campaignFixtures.length].invoice.replaceAll('/', '-')}.pdf`, privateObjectKey: `synthetic-demo/evidence/${expense.id}.pdf`, sha256Hash: index === 5 || index === 6 ? hash('duplicate-receipt-exp-06-exp-07') : hash(`receipt-${expense.id}-${index}`), mimeType: 'application/pdf', sizeBytes: 12000 + index * 317, verificationStatus: index % 9 === 0 ? 'FLAGGED' : index % 7 === 0 ? 'PENDING' : 'VERIFIED', verifiedById: index % 9 === 0 || index % 7 === 0 ? null : auditor.id, verifiedAt: index % 9 === 0 || index % 7 === 0 ? null : at(280 + index), createdAt: at(270 + index) })) })

    const fraudRows = [
      [0, 'RULE_01_DUPLICATE_EVIDENCE_HASH', 'CRITICAL_CONFIRMED_BLOCKING', true, 'Two expense claims reuse the exact same receipt SHA-256 hash.'],
      [1, 'RULE_02_DUPLICATE_INVOICE_REF', 'HIGH_SUSPICIOUS', true, 'Invoice reference collision detected across different receipt hashes.'],
      [2, 'RULE_06_FROZEN_ALLOCATION', 'CRITICAL_CONFIRMED_BLOCKING', true, 'Expense points to an allocation frozen by compliance review.'],
      [3, 'RULE_08_OVERSPENT_ALLOCATION', 'CRITICAL_CONFIRMED_BLOCKING', true, 'Claim amount exceeds the available purpose-bound allocation balance.'],
      [4, 'RULE_09_INVALID_APPROVAL_SEQUENCE', 'CRITICAL_CONFIRMED_BLOCKING', true, 'Requester attempted to approve their own expense request.'],
      [5, 'RULE_03_UNVERIFIED_ISSUER', 'MEDIUM_SUSPICIOUS', false, 'Issuer GSTIN was not present in the verified vendor directory at submission.'],
      [6, 'RULE_05_AMOUNT_MISMATCH', 'HIGH_SUSPICIOUS', true, 'Invoice total and requested payout amount do not reconcile.'],
      [7, 'RULE_10_PAYOUT_AMOUNT_MISMATCH', 'LOW_INDICATOR', false, 'Provider settlement amount differs from the expected test transfer amount.'],
    ] as const
    await tx.fraudCase.createMany({ data: fraudRows.map(([index, ruleCode, severity, isBlocking, explanation], row) => ({ id: id(1000 + row), organizationId: expenses[index].organizationId, expenseRequestId: expenses[index].id, ruleCode, ruleName: `${DEMO} ${ruleCode}`, severity, isBlocking, explanation: `${DEMO} ${explanation}`, status: row === 5 ? 'UNDER_REVIEW' : 'OPEN', createdAt: at(310 + row) })) })

    const payoutIndexes = [0, 1, 13, 14, 15, 16, 17, 18, 12, 20, 9, 19, 10, 11]
    await tx.payout.createMany({ data: payoutIndexes.map((expenseIndex, row) => { const expense = expenses[expenseIndex]; const failed = expenseIndex === 12 || expenseIndex === 10; const ambiguous = expenseIndex === 20 || expenseIndex === 11; return { id: id(1100 + row), correlationId: expense.correlationId, expenseRequestId: expense.id, approvedVersion: expense.version, amountPaise: expense.amountPaise, provider: 'SIMULATION' as const, providerTransferRef: failed ? null : `SIM-TRANSFER-${String(row + 1).padStart(3, '0')}`, idempotencyKey: `payout:${expense.id}:v${expense.version}`, status: failed ? 'FAILED' as const : ambiguous ? 'AMBIGUOUS_RECONCILIATION_REQUIRED' as const : 'PAID' as const, isSimulated: true, initiatedAt: at(340 + row), reconciledAt: failed || ambiguous ? null : at(341 + row), failureReason: failed ? `${DEMO} simulated provider timeout/failure for reconciliation testing.` : ambiguous ? `${DEMO} provider response ambiguous; status reconciliation required.` : null, createdAt: at(340 + row) } }) })

    await tx.impactReport.createMany({ data: campaigns.map((campaign, index) => ({ id: id(1200 + index), organizationId: campaign.organizationId, campaignId: campaign.id, title: `${DEMO} ${campaign.title} — Outcome Report`, narrative: `The ${campaignFixtures[index].cluster} cohort received documented educational support. Attendance, distribution and usage were reviewed against anonymized school registers. No beneficiary names or personal records are stored.`, beneficiaryCountAnonymized: 85 + index * 37, metricsJson: json({ attendanceIncreasePercent: 6 + index, booksDistributed: 600 + index * 42, labHoursCompleted: 120 + index * 18, cohort: `BEN-COHORT-2026-${String.fromCharCode(65 + index)}`, vendorInvoice: campaignFixtures[index].invoice }), evidenceFileIdsJson: json([id(900 + index), id(900 + ((index + 1) % expenses.length))]), reviewStatus: index < 7 ? 'VERIFIED_PUBLISHED' : 'PENDING_REVIEW', reviewerId: index < 7 ? auditor.id : null, publishedAt: index < 7 ? at(390 + index) : null, createdAt: at(380 + index) })) })

    const auditRows: Prisma.AuditEventCreateManyInput[] = []
    let previous = GENESIS_HASH
    for (let sequenceNumber = 1; sequenceNumber <= 60; sequenceNumber += 1) {
      const entityType = sequenceNumber <= 10 ? 'Campaign' : sequenceNumber <= 30 ? 'ExpenseRequest' : sequenceNumber <= 42 ? 'Donation' : sequenceNumber <= 52 ? 'Payout' : 'ImpactReport'
      const entityId = sequenceNumber <= 10 ? campaigns[(sequenceNumber - 1) % campaigns.length].id : expenses[(sequenceNumber - 1) % expenses.length].id
      const action = sequenceNumber % 11 === 0 ? 'EVIDENCE_HASHED' : sequenceNumber % 7 === 0 ? 'RELEASE_APPROVED' : sequenceNumber % 5 === 0 ? 'PAYOUT_RECONCILED' : 'DONATION_CREATED'
      const correlationId = correlation(1300 + sequenceNumber)
      const current = computeAuditEventHash({ previousEventHash: previous, correlationId, action, entityType, entityId, sequenceNumber })
      auditRows.push({ id: id(1300 + sequenceNumber), sequenceNumber, correlationId, actorUserId: sequenceNumber % 3 === 0 ? admin.id : auditor.id, actorRole: sequenceNumber % 3 === 0 ? 'PLATFORM_ADMIN' : 'AUDITOR', action, entityType, entityId, redactedMetadataJson: json({ label: DEMO, sequenceNumber, source: 'master-seed' }), previousEventHash: previous, currentEventHash: current, createdAt: at(430 + sequenceNumber) })
      previous = current
    }
    await tx.auditEvent.createMany({ data: auditRows })

    const localBlockchainRows = Array.from({ length: 15 }, (_, index) => ({
      id: id(1500 + index),
      correlationId: correlation(1301 + index),
      eventType: index === 14 ? 'AUDIT_ROOT_ANCHORED' : 'LOCAL_COMMITMENT_RECORDED',
      environment: 'LOCAL_EVM' as const,
      chainId: 31337,
      contractAddress: '0x0000000000000000000000000000000000000001',
      txHash: `0x${hash(`local-evm-${index}`).slice(0, 64)}`,
      blockNumber: BigInt(100 + index),
      payloadCommitmentHash: hash(`local-payload-${index}`),
      metadataJson: json({ label: DEMO, mode: 'LOCAL_EVM', sequenceNumber: index + 1 }),
      createdAt: at(500 + index),
    }))
    const simulatedBlockchainRows = Array.from({ length: 8 }, (_, index) => ({
      id: id(1520 + index),
      correlationId: correlation(1400 + index),
      eventType: ['SIMULATED_SOURCE_EVENT', 'SIMULATED_BRIDGE_INITIATED', 'SIMULATED_DESTINATION_EVENT', 'SIMULATED_BRIDGE_COMPLETED'][index % 4],
      environment: 'SIMULATED_CROSS_CHAIN' as const,
      chainId: 31337,
      contractAddress: null,
      txHash: `SIM-NO-TX-${String(index + 1).padStart(4, '0')}`,
      blockNumber: null,
      payloadCommitmentHash: hash(`simulated-payload-${index}`),
      metadataJson: json({ label: DEMO, simulationOnly: true, amountDisplay: '50 ETH', sourceChain: 'Ethereum test architecture' }),
      createdAt: at(520 + index),
    }))
    await tx.blockchainEvent.createMany({ data: [...localBlockchainRows, ...simulatedBlockchainRows] })

    const integrityEvents = await tx.auditEvent.findMany({ orderBy: { sequenceNumber: 'asc' } })
    const integrity = verifyIntegrity(integrityEvents)
    if (!integrity.valid) throw new Error(`Seed audit chain is invalid at sequence ${integrity.brokenAtSequence}.`)
    console.log(JSON.stringify({ seeded: true, campaigns: campaigns.length, allocations: allocations.length, donations: donationRows.length, expenses: expenses.length, evidence: expenses.length, fraudCases: fraudRows.length, payouts: payoutIndexes.length, impactReports: campaigns.length, auditEvents: integrity.totalEventsChecked, integrity }, null, 2))
  })
}

main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
