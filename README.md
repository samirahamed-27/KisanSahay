# 🌾 KisanSahay — Accessible Agricultural Finance & Loan Recommendation Engine

> **Smart Agricultural Loan Recommendation, Location Intelligence, and Debt Trap Prevention Platform for Indian Farmers**

---

## 📌 Overview

**KisanSahay** is a full-stack platform designed to empower Indian farmers by matching them with the best central and state government agricultural loan schemes, subsidies, and credit facilities. The platform pairs deep location intelligence (soil chemistry, land valuation benchmarks, regional crop trends) with fair, responsible lending safety checks to prevent rural debt distress.

Available in **15 Indian Languages**, with built-in voice audio readers and an intuitive, mobile-first interface tailored for smallholder farmers.

---

## 🚀 Key Features

### 1. Multi-Factor Scheme Scoring (0–100) & Strict Sequence Ranking
Matches farmers with **32+ official agricultural schemes** (including KCC, MISS, PM-KISAN, AIF, AHIDF, PM-KUSUM, SMAM, PMFBY, PKVY, etc.) using a 5-factor weighted algorithm:
- **Eligibility Match (35%)**: Landholding size, ownership type (owner, tenant, sharecropper, leaseholder, landless), Aadhaar/DBT linking, and caste/gender category.
- **Financial Benefit (25%)**: Net subsidized interest rates (down to 4% p.a.), capital subsidies (33% to 60%), collateral-free limits (up to ₹2 Lakh), and grant components.
- **Regional & State Suitability (15%)**: State-specific matching (Punjab, Maharashtra, Telangana, UP, MP, AP, Karnataka, Gujarat, Odisha, etc.).
- **Crop-Soil Suitability (15%)**: Compatibility of intended cultivation with regional soil type (Alluvial, Black Regur, Red Loam, Laterite), pH, and N-P-K benchmarks.
- **Application Simplicity (10%)**: Turnaround time, minimal document count, and online DBT speed.

#### Sequence Ranking Guarantees:
1. **1 Best Match** (Green `#15803d`): Top algorithmic recommendation with highest financial advantage.
2. **10–11 Good Alternatives** (Light Green `#16a34a`): Highly competitive secondary options (scores 75–89).
3. **Moderate Fit Schemes** (Orange `#d97706`): Schemes requiring additional documentation, FPO grouping, or partner bank vetting.
4. **Ineligible Schemes Listed LAST** (Red `#dc2626`): Unmet statutory criteria are displayed transparently so farmers know exactly why they do not qualify.

---

### 2. Location & Agricultural Intelligence
- **Soil Chemistry**: Soil classification, pH, organic carbon status, N-P-K balance, and customized soil health advisories.
- **Land Valuation Benchmarks**: Official circle rate benchmarks and estimated market value per acre and per square foot across Indian states and districts.
- **Crop Cultivation Trends**: Popular Kharif, Rabi, and Zaid crops with market stability and water requirements.
- **GPS Auto-Detection**: One-tap browser geolocation to identify state, district, and regional soil profiles.

---

### 3. Responsible Lending & Debt-Trap Prevention
- **Debt-to-Income (DTI) Analysis**: Evaluates monthly debt commitments against estimated farm income.
- **Debt Trap Alert**: If existing or projected debt payments exceed **50% of monthly income**, a high-visibility warning is triggered (`🚨 High Risk`), and max additional borrowing is capped at ₹0 to protect the farmer from predatory debt distress.
- **True Cost of Credit Breakdown**: Transparent display of effective APR, bank processing fees, 18% GST, and stamp duties.

---

### 4. Interactive OpenAPI / Swagger Documentation
Interactive API docs are hosted directly at:
```
http://localhost:3000/api/docs
```
JSON specification available at:
```
http://localhost:3000/api/docs.json
```

---

## 📡 REST API Reference

### `POST /api/recommend`
Generates ranked loan scheme recommendations and responsible lending assessments.
- **Rate Limit**: 60 requests / 5 minutes
- **Request Body**:
```json
{
  "state": "Punjab",
  "district": "Ludhiana",
  "landSizeAcres": 3.5,
  "cropType": "Wheat, Paddy",
  "landOwnership": "owner",
  "annualIncome": 280000,
  "category": "general",
  "existingLoans": 40000,
  "hasKcc": true,
  "hasAadhaar": true
}
```
- **Response**: Contains `farmer_location`, `farmer_context` (soil & land prices), `debt_safety_assessment`, `meta`, and `recommendations` array sorted in strict sequence.

### `GET /api/schemes`
Returns all agricultural schemes. Supports query filters:
- `category`: `crop`, `infra`, `income`, `irrigation`, `livestock`, etc.
- `state`: e.g. `Punjab`, `Maharashtra`
- `crop`: e.g. `Wheat`, `Cotton`
- `search`: Free-text keyword search

### `GET /api/schemes/:id`
Retrieves detailed information for a specific scheme (e.g. `/api/schemes/kcc`, `/api/schemes/aif`).

### `GET /api/context/location`
Retrieves soil health, land valuation benchmarks, and regional crop trends by state/district or GPS coordinates.
- Parameters: `state`, `district`, `pincode`, `latitude`, `longitude`, `cropType`

### `POST /api/ingest/refresh`
Triggers verified scraping and synchronization from official open data portals (`myscheme.gov.in`, `data.gov.in`), strictly respecting `robots.txt`.

---

## 🧪 Running Automated Tests

KisanSahay uses Node.js's native test runner (`node:test` and `node:assert/strict`).

To run the complete test suite:
```bash
npm test
```

### Verified Test Cases:
- **Debt Safety**: Safe DTI calculation, moderate burden threshold (30–50%), debt trap trigger (>50%), zero-income protection.
- **Location Context**: District and state lookup, GPS coordinate fallback, crop-soil suitability calculation.
- **Scoring Engine**: Score bounds [0, 100], strict sequence guarantees (1 Best, 11 Good, Moderate, Ineligible last), SC/ST and Women farmer subsidy bonuses.

---

## 💻 Local Setup & Execution

1. **Clone the repository**:
   ```bash
   git clone https://github.com/samirahamed-27/KisanSahay.git
   cd KisanSahay
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   Or for auto-reloading development:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Web App: `http://localhost:3000`
   - Swagger Documentation: `http://localhost:3000/api/docs`
