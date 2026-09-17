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
  const principal = Number(loan.principalAmount || loan.totalAmount) || 0;
  const rate = Number(loan.interestRate) || 0;
  const tenure = Math.max(1, Number(loan.tenureMonths) || 12);
  
  // Calculate total with interest if not explicitly defined
  let totalPayable = Number(loan.totalWithInterest);
  if (!totalPayable || totalPayable < principal) {
    if (rate === 0) {
      totalPayable = principal;
    } else {
      // Standard simple/amortized approximate interest
      totalPayable = Math.round(principal * (1 + (rate * (tenure / 12)) / 100));
    }
  }

  const paid = Number(loan.paidAmount) || 0;
  const due = Math.max(0, totalPayable - paid);
  const percentPaid = totalPayable > 0 ? Math.min(100, Math.round((paid / totalPayable) * 100)) : 100;
  
  // Monthly EMI
  let emi = Number(loan.monthlyEmi || loan.emiAmount) || 0;
  if (!emi) {
    if (rate === 0) {
      emi = Math.round(totalPayable / tenure);
    } else {
      const monthlyRate = rate / 12 / 100;
      emi = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
    }
  }

  // EMIs left
  let emisLeft = typeof loan.emisLeft === 'number' ? loan.emisLeft : (emi > 0 ? Math.ceil(due / emi) : 0);
  if (due === 0) emisLeft = 0;

  const isEnded = (loan.status && loan.status.toLowerCase() === 'ended') || due === 0;
  const status = isEnded ? 'Ended' : 'Active';

  return {
    ...loan,
    principalAmount: principal,
    totalAmount: principal,
    totalWithInterest: totalPayable,
    paidAmount: paid,
    dueAmount: due,
    monthlyEmi: isEnded ? 0 : emi,
    emiAmount: isEnded ? 0 : emi,
    emisLeft,
    percentPaid,
    status,
    isFullyPaid: due === 0
  };
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Get all schemes (supports search & category filters)
app.get('/api/schemes', (req, res) => {
  const { search = '', category = 'all' } = req.query;
  let schemes = readJson(SCHEMES_FILE, []);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    schemes = schemes.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      (s.tagline && s.tagline.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
  }

  if (category && category !== 'all') {
    schemes = schemes.filter(s => {
      if (category === 'crop') return s.id === 'kcc' || s.id === 'miss' || s.id === 'pmfby';
      if (category === 'infra') return s.id === 'aif' || s.id === 'ahidf' || s.id === 'smam';
      if (category === 'income') return s.id === 'pm-kisan' || s.id === 'pm-kmy';
      if (category === 'more') return ['pm-kusum', 'pmfme', 'acabc'].includes(s.id);
      return true;
    });
  }

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
    district = '',
    landOwnership = 'owner', // 'owner', 'tenant', 'sharecropper', 'leaseholder'
    mainActivity = 'crop', // 'crop', 'dairy', 'poultry', 'fisheries', 'infra'
    hasKcc = 'yes',
    hasAadhaar = 'yes'
  } = req.body;

  const schemes = readJson(SCHEMES_FILE, []);
  const normalizedCrop = String(cropType).trim().toLowerCase();
  const income = Number(annualIncome) || 0;
  const isAadhaarLinked = String(hasAadhaar).toLowerCase() === 'yes' || hasAadhaar === true;
  const isKccHolder = String(hasKcc).toLowerCase() === 'yes' || hasKcc === true;

  const results = schemes.map(scheme => {
    let eligible = true;
    const reasons = [];
    const warnings = [];

    // 1. Aadhaar check
    if (scheme.eligibility && scheme.eligibility.requiresAadhaar && !isAadhaarLinked) {
      eligible = false;
      warnings.push('Aadhaar linking is mandatory for this scheme and interest subvention.');
    } else {
      reasons.push('Aadhaar is linked with bank account for direct subvention.');
    }

    // 2. Land Ownership / Farmer Category check
    const allowedTypes = scheme.eligibility ? scheme.eligibility.farmerTypes || [] : ['all'];
    if (!allowedTypes.includes(landOwnership) && !allowedTypes.includes('all')) {
      if (scheme.id === 'pm-kisan' && landOwnership !== 'owner') {
        eligible = false;
        warnings.push('PM-KISAN requires cultivable land in your own name; tenant and leaseholder farmers are not covered.');
      } else if ((landOwnership === 'tenant' || landOwnership === 'sharecropper') && (scheme.id === 'kcc' || scheme.id === 'miss')) {
        reasons.push('Eligible under tenant farmer & Joint Liability Group (JLG) guidelines.');
        warnings.push('Bank branch will require a registered tenancy agreement or local cultivation certificate.');
      } else if (scheme.id === 'aif' || scheme.id === 'ahidf') {
        reasons.push('Eligible as landholder, enterprise, or farmer group member.');
      }
    } else {
      reasons.push(`Matched landholding status: ${landOwnership.toUpperCase()}`);
    }

    // 3. Activity / Crop check
    if (scheme.id === 'ahidf' && mainActivity !== 'dairy' && mainActivity !== 'poultry' && !['dairy', 'meat', 'feed', 'cattle', 'milk'].some(k => normalizedCrop.includes(k))) {
      warnings.push('Specialized for dairy, animal husbandry, and feed processing infrastructure.');
    } else if (scheme.id === 'pm-kusum' && mainActivity === 'infra') {
      reasons.push('Solar pump installation qualifies for 60% capital subsidy.');
    } else if (scheme.id === 'smam') {
      reasons.push('40-50% subsidy available for tractors and farm machinery.');
    } else {
      reasons.push(`Supports activity: ${cropType || mainActivity.toUpperCase()}`);
    }

    // 4. KCC synergy
    if (scheme.id === 'miss') {
      if (isKccHolder) {
        reasons.push('Active KCC holder: eligible for immediate 3% prompt repayment subvention (4% net rate).');
      } else {
        warnings.push('Must be applied through or linked with a Kisan Credit Card (KCC) account.');
      }
    }

    // 5. Income Exclusions
    if (scheme.id === 'pm-kisan' && income > 2500000) {
      warnings.push('Higher income tax payers are excluded under statutory PM-KISAN guidelines.');
    }

    let badge = eligible ? 'Eligible' : 'Conditional / Review Needed';
    let subventionNote = scheme.highlights ? scheme.highlights[0] : scheme.tagline;

    return {
      scheme,
      eligible,
      badge,
      reasons,
      warnings,
      subventionNote
    };
  });

  res.json({
    success: true,
    userInput: { cropType, annualIncome: income, district, landOwnership, mainActivity, hasKcc, hasAadhaar },
    results
  });
});

// 4. Get all loans (supports ?status=active|ended|all)
app.get('/api/loans', (req, res) => {
  const { status = 'all' } = req.query;
  const rawLoans = readJson(LOANS_FILE, []);
  const enrichedLoans = rawLoans.map(enrichLoan);

  const activeLoans = enrichedLoans.filter(l => l.status === 'Active');
  const endedLoans = enrichedLoans.filter(l => l.status === 'Ended');

  // Compute metrics specifically for active running loans (matching Screenshot 1)
  const summary = activeLoans.reduce((acc, l) => {
    acc.totalBorrowed += l.principalAmount || l.totalAmount;
    acc.totalPaid += l.paidAmount;
    acc.totalDue += l.dueAmount;
    acc.totalMonthlyEmi += l.monthlyEmi || 0;
    return acc;
  }, {
    totalBorrowed: 0,
    totalPaid: 0,
    totalDue: 0,
    totalMonthlyEmi: 0,
    activeCount: activeLoans.length,
    endedCount: endedLoans.length,
    allCount: enrichedLoans.length
  });

  let filtered = enrichedLoans;
  if (status === 'active') {
    filtered = activeLoans;
  } else if (status === 'ended') {
    filtered = endedLoans;
  }

  res.json({
    success: true,
    count: filtered.length,
    summary,
    data: filtered
  });
});

// 5. Record Payment on a Loan (farmer pays money)
app.put('/api/loans/:id/payment', (req, res) => {
  const { id } = req.params;
  const { amount = 0, paidAmount, note = 'Farmer payment made' } = req.body;

  const loans = readJson(LOANS_FILE, []);
  const index = loans.findIndex(l => l.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Loan record not found' });
  }

  const loan = loans[index];
  const total = Number(loan.totalWithInterest || loan.totalAmount || loan.principalAmount) || 0;
  let currentPaid = Number(loan.paidAmount) || 0;

  let addedPayment = 0;
  if (typeof paidAmount !== 'undefined') {
    // Explicit paid amount
    const targetPaid = Math.max(0, Math.min(total, Number(paidAmount) || 0));
    addedPayment = Math.max(0, targetPaid - currentPaid);
    loan.paidAmount = targetPaid;
  } else if (amount > 0) {
    addedPayment = Number(amount);
    loan.paidAmount = Math.min(total, currentPaid + addedPayment);
  }

  // Recalculate due
  loan.dueAmount = Math.max(0, total - loan.paidAmount);

  // Recalculate EMIs left
  const emi = Number(loan.monthlyEmi || loan.emiAmount) || 1;
  loan.emisLeft = loan.dueAmount > 0 ? Math.ceil(loan.dueAmount / emi) : 0;

  // Auto-mark as Ended if fully paid
  if (loan.dueAmount === 0) {
    loan.status = 'Ended';
    loan.completedDate = new Date().toISOString().split('T')[0];
    loan.monthlyEmi = 0;
    loan.emisLeft = 0;
  } else {
    loan.status = 'Active';
  }

  // Record payment in ledger
  if (!loan.payments) loan.payments = [];
  loan.payments.unshift({
    id: 'pay-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    amount: addedPayment > 0 ? addedPayment : Number(loan.paidAmount),
    note
  });

  loans[index] = loan;
  writeJson(LOANS_FILE, loans);

  res.json({
    success: true,
    message: loan.dueAmount === 0 ? '🎉 Loan paid in full! Moved to Ended Loans.' : 'Payment recorded successfully',
    data: enrichLoan(loan)
  });
});

// 6. Toggle or Update Loan Status (Active <-> Ended)
app.put('/api/loans/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const loans = readJson(LOANS_FILE, []);
  const index = loans.findIndex(l => l.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Loan not found' });
  }

  const loan = loans[index];
  const newStatus = status === 'Ended' ? 'Ended' : 'Active';
  loan.status = newStatus;
  
  if (newStatus === 'Ended') {
    loan.completedDate = new Date().toISOString().split('T')[0];
    loan.monthlyEmi = 0;
    loan.emisLeft = 0;
  }

  loans[index] = loan;
  writeJson(LOANS_FILE, loans);

  res.json({
    success: true,
    message: `Loan status updated to ${newStatus}`,
    data: enrichLoan(loan)
  });
});

// 7. Add a new Loan / Scheme to Tracker
app.post('/api/loans', (req, res) => {
  const {
    schemeId = 'custom',
    schemeName = 'Custom Agriculture Loan',
    schemeSub = 'Agri Loan',
    bankName = 'State Bank of India',
    accountNumber = '•••• ' + Math.floor(1000 + Math.random() * 9000),
    cropOrPurpose = 'Crop Cultivation',
    principalAmount = 100000,
    totalAmount,
    totalWithInterest,
    paidAmount = 0,
    interestRate = 7.0,
    tenureMonths = 36,
    status = 'Active',
    dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  } = req.body;

  const principal = Number(principalAmount || totalAmount) || 100000;
  const rate = Number(interestRate) || 7.0;
  const tenure = Math.max(1, Number(tenureMonths) || 12);

  // Amortized EMI & Total payable
  const monthlyRate = rate / 12 / 100;
  let emi = 0;
  let totalPayable = Number(totalWithInterest);

  if (rate === 0) {
    emi = Math.round(principal / tenure);
    if (!totalPayable) totalPayable = principal;
  } else {
    emi = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
    if (!totalPayable) totalPayable = emi * tenure;
  }

  const paid = Math.max(0, Number(paidAmount) || 0);
  const due = Math.max(0, totalPayable - paid);
  const emisLeft = due > 0 ? Math.ceil(due / emi) : 0;
  const finalStatus = due === 0 ? 'Ended' : (status === 'Ended' ? 'Ended' : 'Active');

  const loans = readJson(LOANS_FILE, []);

  const newLoan = {
    id: 'loan-' + Date.now(),
    schemeId,
    schemeName,
    schemeSub: schemeSub || `${schemeName.slice(0, 8)} - Loan`,
    bankName,
    accountNumber,
    cropOrPurpose,
    sanctionDate: new Date().toISOString().split('T')[0],
    principalAmount: principal,
    totalAmount: principal,
    totalWithInterest: totalPayable,
    paidAmount: paid,
    dueAmount: due,
    monthlyEmi: emi,
    emisLeft,
    interestRate: rate,
    tenureMonths: tenure,
    status: finalStatus,
    dueDate,
    payments: paid > 0 ? [{
      id: 'pay-initial',
      date: new Date().toISOString().split('T')[0],
      amount: paid,
      note: 'Initial down payment or installments recorded'
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

// 8. Delete a loan
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
  console.log(`🌾 KisanSahay Server running on http://localhost:${PORT}`);
});
