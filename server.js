const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const apiRoutes = require('./src/routes/apiRoutes');
const docsRoutes = require('./src/routes/docsRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const { startScheduledIngestion } = require('./src/services/ingestionService');
const { startScheduledReminders } = require('./src/services/notificationService');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount Swagger Documentation & Core Agricultural Finance APIs
app.use('/api', docsRoutes);
app.use('/api', apiRoutes);

const DATA_DIR = path.join(__dirname, 'Data', 'Data');
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
    isFullyPaid: due === 0,
    provider_name: loan.provider_name || loan.bankName || 'Gramin Kisan Cooperative Bank & NABARD',
    source_name: loan.source_name || 'Ministry of Agriculture & Farmers Welfare / NABARD Portal',
    source_url: loan.source_url || 'https://www.nabard.org/content1.aspx?id=591&catid=23&mid=530',
    last_fetched_at: loan.last_fetched_at || '2026-09-18'
  };
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// REST API ROUTES (Core agricultural loans)
// -------------------------------------------------------------

// Get all loans (supports ?status=active|ended|all)
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
    provider_name,
    source_name,
    source_url,
    last_fetched_at,
    checklistCompleted = true,
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

  // Enforce Document Checklist completion if applying through a scheme
  if (req.body.fromScheme && checklistCompleted === false) {
    return res.status(400).json({
      success: false,
      error: 'DOCUMENT_CHECKLIST_INCOMPLETE',
      message: 'You must verify and tick all required documents before applying for this loan.'
    });
  }

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
    provider_name: provider_name || bankName || 'Gramin Kisan Cooperative Bank & NABARD',
    source_name: source_name || 'NABARD Official Portal / KCC Subvention',
    source_url: source_url || 'https://www.nabard.org/content1.aspx?id=591&catid=23&mid=530',
    last_fetched_at: last_fetched_at || new Date().toISOString().split('T')[0],
    checklistCompleted: true,
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

// 8. Delete a loan (ACTIVE LOANS CANNOT BE REMOVED - HTTP 403 Forbidden)
app.delete('/api/loans/:id', (req, res) => {
  let loans = readJson(LOANS_FILE, []);
  const loan = loans.find(l => l.id === req.params.id);

  if (!loan) {
    return res.status(404).json({ success: false, message: 'Loan not found' });
  }

  // Enforce Protection: Active running loans cannot be removed
  const enriched = enrichLoan(loan);
  if (enriched.status === 'Active' || enriched.dueAmount > 0) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Active loans cannot be removed or deleted. Active loans only change status automatically when fully repaid.'
    });
  }

  // Only closed/ended loans with zero due can be archived
  loans = loans.filter(l => l.id !== req.params.id);
  writeJson(LOANS_FILE, loans);
  res.json({ success: true, message: 'Closed loan archived from tracker' });
});

// Centralized RFC 7807 Error Handler
app.use(errorHandler);

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🌾 KisanSahay Server running on http://localhost:${PORT}`);
  console.log(`📚 Interactive OpenAPI / Swagger Docs at: http://localhost:${PORT}/api/docs`);
  startScheduledIngestion();
  startScheduledReminders();
});

// Friendly error when the port is already in use (e.g. npm start is already running)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`   This usually means 'npm start' is already running in another terminal.`);
    console.error(`   To fix this, either:`);
    console.error(`     1. Stop the other server first (Ctrl+C in that terminal), then re-run 'npm run dev'`);
    console.error(`     2. Or run on a different port: PORT=3001 npm run dev`);
    console.error(`\n   App URL (if already running): http://localhost:${PORT}\n`);
    process.exit(1);
  } else {
    throw err;
  }
});


