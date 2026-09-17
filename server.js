const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'Data', 'Data');
const SCHEMES_FILE = path.join(DATA_DIR, 'schemes.json');
const LOANS_FILE = path.join(DATA_DIR, 'loans.json');

// Helper to read JSON files safely
function readJson(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

// Helper to write JSON files safely
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Calculate loan financials dynamically
function enrichLoan(loan) {
  const total = Number(loan.totalAmount) || 0;
  const paid = Number(loan.paidAmount) || 0;
  const due = Math.max(0, total - paid);
  const percentPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  
  // Calculate approximate monthly EMI based on remaining principal, interest rate & tenure
  const rate = Number(loan.interestRate) || 0;
  const tenure = Math.max(1, Number(loan.tenureMonths) || 12);
  let emi = 0;

  if (rate === 0) {
    emi = Math.round(total / tenure);
  } else {
    const monthlyRate = rate / 12 / 100;
    emi = Math.round((total * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
  }

  return {
    ...loan,
    totalAmount: total,
    paidAmount: paid,
    dueAmount: due,
    percentPaid,
    emiAmount: loan.emiAmount || emi,
    isFullyPaid: due === 0
  };
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Get all schemes from database
app.get('/api/schemes', (req, res) => {
  const schemes = readJson(SCHEMES_FILE, []);
  res.json({ success: true, count: schemes.length, data: schemes });
});

// 2. Get single scheme by ID
app.get('/api/schemes/:id', (req, res) => {
  const schemes = readJson(SCHEMES_FILE, []);
  const scheme = schemes.find(s => s.id === req.params.id);
  if (!scheme) {
    return res.status(404).json({ success: false, message: 'Scheme not found' });
  }
  res.json({ success: true, data: scheme });
});

// 3. Check Eligibility Engine
app.post('/api/eligibility', (req, res) => {
  const {
    cropType = '',
    annualIncome = 0,
    landSize = 0,
    farmerType = 'owner', // 'owner', 'tenant', 'sharecropper', 'entrepreneur'
    hasAadhaar = true
  } = req.body;

  const schemes = readJson(SCHEMES_FILE, []);
  const normalizedCrop = String(cropType).trim().toLowerCase();
  const income = Number(annualIncome) || 0;
  const land = Number(landSize) || 0;

  const results = schemes.map(scheme => {
    let eligible = true;
    const reasons = [];
    const warnings = [];

    // 1. Aadhaar check
    if (scheme.eligibility.requiresAadhaar && !hasAadhaar) {
      eligible = false;
      warnings.push('Aadhaar linking is mandatory for this scheme and interest subvention.');
    }

    // 2. Farmer type check
    const allowedTypes = scheme.eligibility.farmerTypes || [];
    if (!allowedTypes.includes(farmerType) && !allowedTypes.includes('all')) {
      if (scheme.id === 'pm-kisan' && farmerType !== 'owner') {
        eligible = false;
        warnings.push('PM-KISAN requires cultivable land in your own name; tenant and landless farmers are not eligible.');
      } else if (farmerType === 'tenant' && (scheme.id === 'kcc' || scheme.id === 'miss')) {
        // Tenant is eligible under policy, but note limitation
        reasons.push('Eligible under KCC / MISS guidelines.');
        warnings.push('Key Limitation: Formal land records/tenancy agreement may be requested by bank branches.');
      } else if (scheme.id === 'aif' || scheme.id === 'ahidf') {
        if (farmerType === 'owner' || farmerType === 'entrepreneur' || farmerType === 'fpo') {
          reasons.push('Eligible as agricultural landholder / entrepreneur / FPO.');
        } else {
          warnings.push('Requires project registration or FPO/enterprise affiliation.');
        }
      }
    } else {
      reasons.push(`Matched farmer category: ${farmerType.toUpperCase()}`);
    }

    // 3. Crop / Activity matching
    const schemeCrops = scheme.eligibility.crops || [];
    const isAllCrop = schemeCrops.includes('all');
    const matchesCrop = isAllCrop || schemeCrops.some(c => normalizedCrop.includes(c) || c.includes(normalizedCrop));

    if (matchesCrop) {
      reasons.push(`Supports crop/activity: ${cropType || 'General Agriculture'}`);
    } else if (scheme.id === 'ahidf') {
      if (['dairy', 'meat', 'feed', 'cattle', 'livestock', 'milk'].some(k => normalizedCrop.includes(k))) {
        reasons.push('Qualifies for Dairy & Animal Husbandry infrastructure subvention.');
      } else {
        warnings.push('AHIDF is specialized for dairy, meat, and animal feed value addition.');
      }
    }

    // 4. Land size check
    if (scheme.eligibility.minLand > 0 && land < scheme.eligibility.minLand) {
      if (scheme.id === 'pm-kisan') {
        eligible = false;
        warnings.push('Requires agricultural land ownership recorded in revenue records.');
      }
    }

    // 5. Income check / PM-KISAN exclusions
    if (scheme.id === 'pm-kisan' && income > 2500000) {
      warnings.push('Exclusion rule: Income tax payers and high income individuals are excluded from PM-KISAN.');
    }

    // Determine eligibility status & rate summary
    let badge = 'Eligible';
    let subventionNote = '';

    if (scheme.id === 'miss' || scheme.id === 'kcc') {
      subventionNote = 'Get loans at 4% effective interest (7% base - 3% prompt repayment incentive)';
    } else if (scheme.id === 'pm-kisan') {
      subventionNote = 'Receive ₹6,000 yearly in 3 direct bank transfers of ₹2,000';
    } else if (scheme.id === 'aif') {
      subventionNote = '3% interest subvention for loans up to ₹2 Crore + Credit Guarantee';
    } else if (scheme.id === 'ahidf') {
      subventionNote = 'Up to 90% project cost financing, 3% interest relief for 8 years + 2 yr moratorium';
    }

    return {
      scheme,
      eligible,
      badge: eligible ? 'Eligible' : 'Conditional / Review Needed',
      reasons,
      warnings,
      subventionNote
    };
  });

  res.json({
    success: true,
    userInput: { cropType, annualIncome: income, landSize: land, farmerType, hasAadhaar },
    results
  });
});

// 4. Get all active loans & summary
app.get('/api/loans', (req, res) => {
  const loans = readJson(LOANS_FILE, []).map(enrichLoan);
  
  const summary = loans.reduce((acc, l) => {
    acc.totalBorrowed += l.totalAmount;
    acc.totalPaid += l.paidAmount;
    acc.totalDue += l.dueAmount;
    acc.totalMonthlyEmi += l.dueAmount > 0 ? (l.emiAmount || 0) : 0;
    return acc;
  }, { totalBorrowed: 0, totalPaid: 0, totalDue: 0, totalMonthlyEmi: 0, activeCount: loans.filter(l => l.dueAmount > 0).length });

  res.json({
    success: true,
    count: loans.length,
    summary,
    data: loans
  });
});

// 5. Update amount already paid or record payment on a loan
app.put('/api/loans/:id/payment', (req, res) => {
  const { id } = req.params;
  const { paidAmount, paymentIncrement = 0, note = 'Online / Mandi payment' } = req.body;
  
  const loans = readJson(LOANS_FILE, []);
  const index = loans.findIndex(l => l.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Loan record not found' });
  }

  const loan = loans[index];
  
  if (typeof paidAmount !== 'undefined') {
    // Explicit paid amount set by user
    loan.paidAmount = Math.max(0, Math.min(loan.totalAmount, Number(paidAmount) || 0));
  } else if (paymentIncrement > 0) {
    // Additional payment added
    loan.paidAmount = Math.min(loan.totalAmount, (loan.paidAmount || 0) + Number(paymentIncrement));
  }

  // Record history
  if (!loan.payments) loan.payments = [];
  loan.payments.unshift({
    id: 'pay-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    amount: paymentIncrement > 0 ? Number(paymentIncrement) : Number(paidAmount),
    note
  });

  loans[index] = loan;
  writeJson(LOANS_FILE, loans);

  res.json({
    success: true,
    message: 'Payment updated successfully',
    data: enrichLoan(loan)
  });
});

// 6. Add a new loan or scheme to track
app.post('/api/loans', (req, res) => {
  const {
    schemeId = 'custom',
    schemeName = 'Custom Agriculture Loan',
    bankName = 'Gramin Bank',
    accountNumber = '•••• 1234',
    cropOrPurpose = 'Crop Cultivation',
    totalAmount = 50000,
    paidAmount = 0,
    interestRate = 4.0,
    tenureMonths = 12,
    installmentType = 'Monthly',
    dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  } = req.body;

  const loans = readJson(LOANS_FILE, []);
  
  const newLoan = {
    id: 'loan-' + Date.now(),
    schemeId,
    schemeName,
    bankName,
    accountNumber,
    cropOrPurpose,
    sanctionDate: new Date().toISOString().split('T')[0],
    totalAmount: Number(totalAmount) || 0,
    paidAmount: Number(paidAmount) || 0,
    interestRate: Number(interestRate) || 4.0,
    baseRate: 7.0,
    promptIncentive: 3.0,
    tenureMonths: Number(tenureMonths) || 12,
    installmentType,
    dueDate,
    status: 'Active',
    incentiveStatus: 'Prompt Repayment Eligible (3% Subsidy)',
    payments: paidAmount > 0 ? [{
      id: 'pay-initial',
      date: new Date().toISOString().split('T')[0],
      amount: Number(paidAmount),
      note: 'Initial paid amount recorded'
    }] : []
  };

  loans.push(newLoan);
  writeJson(LOANS_FILE, loans);

  res.status(201).json({
    success: true,
    message: 'Loan successfully added to tracker',
    data: enrichLoan(newLoan)
  });
});

// 7. Delete a loan
app.delete('/api/loans/:id', (req, res) => {
  let loans = readJson(LOANS_FILE, []);
  const initialLen = loans.length;
  loans = loans.filter(l => l.id !== req.params.id);

  if (loans.length === initialLen) {
    return res.status(404).json({ success: false, message: 'Loan not found' });
  }

  writeJson(LOANS_FILE, loans);
  res.json({ success: true, message: 'Loan removed from tracker' });
});

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🌾 KisanSahay Node Server is running on http://localhost:${PORT}`);
});
