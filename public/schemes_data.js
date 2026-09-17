window.KISAN_SCHEMES_DATA = [
  {
    "id": "miss",
    "name": "Modified Interest Subvention Scheme",
    "shortName": "MISS",
    "category": "CROP LOAN",
    "icon": "🌾",
    "badge": "Crop Loan",
    "badgeColor": "green",
    "tagline": "A short-term working capital loan scheme for crop cultivation and allied activities, accessed primarily through the Kisan Credit Card (KCC). Provides affordable credit for seeds, fertilizer, and input costs.",
    "baseRate": 7.0,
    "effectiveRate": 4.0,
    "promptIncentive": 3.0,
    "maxLimit": 300000,
    "alliedLimit": 200000,
    "highlights": [
      "7% base, 4% effective on timely repayment",
      "Up to ₹3 lakh (₹2 lakh for allied-only activities)"
    ],
    "collateralFreeLimit": 200000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "tenant",
        "sharecropper",
        "shg",
        "jlg"
      ],
      "crops": [
        "all",
        "wheat",
        "paddy",
        "rice",
        "cotton",
        "sugarcane",
        "pulses",
        "oilseeds",
        "maize",
        "dairy",
        "fisheries"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A short-term working capital loan scheme for crop cultivation and allied activities, accessed primarily through the Kisan Credit Card (KCC). Provides affordable credit for seeds, fertilizer, and input costs.",
    "benefits": "Provides 1.5% interest subvention to lending institutions and 3% prompt repayment incentive to farmers, bringing effective interest rate down to 4% per annum. Also provides post-harvest storage loans against negotiable warehouse receipts for up to 6 months.",
    "pros": [
      "Ultra-low effective 4% interest rate on timely repayment",
      "Protects farmers from predatory informal moneylenders charging 24%+",
      "Covers seeds, fertilizers, pesticides, labor, and harvesting",
      "Includes post-harvest storage credit against warehouse receipts"
    ],
    "cons": [
      "Capped at ₹3 lakh for crops (₹2 lakh for animal husbandry/fisheries)",
      "Strict deadline: 3% subvention is lost if repayment is delayed by even one day",
      "Requires active Aadhaar linkage and KCC account"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Mandatory for interest subvention DBT"
      },
      {
        "id": "doc-kcc",
        "name": "Active KCC Account Proof",
        "required": true,
        "desc": "Facility routed through Kisan Credit Card"
      },
      {
        "id": "doc-land",
        "name": "Land Record / Cultivation Proof",
        "required": true,
        "desc": "Khasra/Khatauni or tenancy agreement"
      },
      {
        "id": "doc-sowing",
        "name": "Crop Sowing Declaration Form",
        "required": true,
        "desc": "Details of crops sown in the current agricultural season"
      }
    ]
  },
  {
    "id": "aif",
    "name": "Agriculture Infrastructure Fund",
    "shortName": "AIF",
    "category": "INFRASTRUCTURE LOAN",
    "icon": "🏭",
    "badge": "Infrastructure Loan",
    "badgeColor": "orange",
    "tagline": "A medium-to-long-term debt financing facility for building post-harvest infrastructure like warehouses, cold storage, and primary processing units. Helps farmers add value to their produce.",
    "baseRate": 9.0,
    "effectiveRate": 6.0,
    "promptIncentive": 3.0,
    "maxLimit": 20000000,
    "highlights": [
      "3% interest subvention per annum",
      "Up to ₹2 crore per project"
    ],
    "collateralFreeLimit": 20000000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "entrepreneur",
        "fpo",
        "pacs",
        "shg",
        "startup"
      ],
      "crops": [
        "all",
        "processing",
        "cold-storage",
        "warehousing",
        "primary-processing",
        "sorting-grading"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A medium-to-long-term debt financing facility for building post-harvest infrastructure like warehouses, cold storage, and primary processing units. Helps farmers add value to their produce.",
    "benefits": "Provides 3% interest subvention per annum up to a limit of ₹2 crore for a maximum tenure of 7 years. In addition, credit guarantee coverage is available under CGTMSE for loans up to ₹2 crore without requiring third-party collateral.",
    "pros": [
      "Substantial interest subvention of 3% per annum for up to 7 years",
      "Credit guarantee fee paid by the Central Government under CGTMSE",
      "Moratorium period of minimum 6 months up to 2 years",
      "Eligible for warehouses, silos, cold chains, assaying units, and solar rooftops"
    ],
    "cons": [
      "Focus is on post-harvest infrastructure rather than operational crop inputs",
      "Requires a Detailed Project Report (DPR) and bank techno-economic appraisal",
      "Ceiling capped at ₹2 crore per individual project location"
    ],
    "documents": [
      {
        "id": "doc-dpr",
        "name": "Detailed Project Report (DPR)",
        "required": true,
        "desc": "Technical and financial viability analysis"
      },
      {
        "id": "doc-land-title",
        "name": "Land Title Deed / Registered Long-Term Lease",
        "required": true,
        "desc": "Proof of site ownership or minimum 10-15 year lease"
      },
      {
        "id": "doc-aadhaar-pan",
        "name": "Aadhaar & PAN of Promoters / Farmer",
        "required": true,
        "desc": "KYC identification documents"
      },
      {
        "id": "doc-bank-statement",
        "name": "Bank Account Statements (Past 12 Months)",
        "required": true,
        "desc": "Financial statement of applicant or entity"
      }
    ]
  },
  {
    "id": "ahidf",
    "name": "Animal Husbandry Infrastructure Development Fund",
    "shortName": "AHIDF",
    "category": "INFRASTRUCTURE LOAN",
    "icon": "🐄",
    "badge": "Infrastructure Loan",
    "badgeColor": "red-orange",
    "tagline": "A specialized fund for medium-to-long-term debt to build processing and value-addition infrastructure in the dairy, meat, and animal feed sectors. Creates rural employment and builds cold-chain capacity.",
    "baseRate": 8.5,
    "effectiveRate": 5.5,
    "promptIncentive": 3.0,
    "maxLimit": 100000000,
    "highlights": [
      "3% per annum for 8 years",
      "Up to 90% of project cost, no upper ceiling"
    ],
    "collateralFreeLimit": 0,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "entrepreneur",
        "fpo",
        "msme",
        "shg",
        "dairy-cooperative"
      ],
      "crops": [
        "dairy",
        "meat",
        "animal-feed",
        "poultry",
        "cattle",
        "milk"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A specialized fund for medium-to-long-term debt to build processing and value-addition infrastructure in the dairy, meat, and animal feed sectors. Creates rural employment and builds cold-chain capacity.",
    "benefits": "Provides 3% interest subvention for 8 years and up to 90% loan financing of eligible project cost with no upper financial ceiling. Also offers 25% credit guarantee support through NABARD for MSMEs.",
    "pros": [
      "No upper limit on total loan amount for enterprise-scale projects",
      "3% interest subvention for an extended period of 8 years",
      "Finances up to 90% of total project cost (only 10% promoter contribution needed)",
      "2-year moratorium on principal repayment provides time to set up operations"
    ],
    "cons": [
      "Term loan exclusively meant for processing machinery and sheds, not working capital",
      "Requires detailed engineering estimates and local statutory clearances",
      "Primarily targeted at dairy plants, feed manufacturing, and cold chain units"
    ],
    "documents": [
      {
        "id": "doc-ahidf-dpr",
        "name": "Detailed Techno-Economic Feasibility Report",
        "required": true,
        "desc": "Project engineering, equipment list and cash flows"
      },
      {
        "id": "doc-land-clearance",
        "name": "Site Ownership / Lease Deed & Clearances",
        "required": true,
        "desc": "Proof of industrial/agri land and conversion clearance"
      },
      {
        "id": "doc-kyc",
        "name": "Aadhaar, PAN & Udyam/FPO Registration",
        "required": true,
        "desc": "Enterprise and promoter identity verification"
      },
      {
        "id": "doc-statutory",
        "name": "FSSAI / Pollution Control Consent (if applicable)",
        "required": false,
        "desc": "Environmental clearances for processing units"
      }
    ]
  },
  {
    "id": "kcc",
    "name": "Kisan Credit Card",
    "shortName": "KCC",
    "category": "CROP LOAN",
    "icon": "💳",
    "badge": "Crop Loan",
    "badgeColor": "green",
    "tagline": "A single-window credit facility providing farmers with timely and affordable institutional credit for crop cultivation and allied activities, including dairy, poultry, and fisheries. Over 7.7 crore active accounts nationwide.",
    "baseRate": 7.0,
    "effectiveRate": 4.0,
    "promptIncentive": 3.0,
    "maxLimit": 500000,
    "subLimits": {
      "crop": 300000,
      "allied": 200000,
      "fisheries": 500000
    },
    "highlights": [
      "7% base, 4% effective on timely repayment",
      "Up to ₹3 lakh (₹2 lakh for allied-only, ₹5 lakh for fisheries)"
    ],
    "collateralFreeLimit": 200000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "tenant",
        "sharecropper",
        "shg",
        "jlg"
      ],
      "crops": [
        "all",
        "wheat",
        "paddy",
        "rice",
        "cotton",
        "sugarcane",
        "pulses",
        "vegetables",
        "fruits",
        "dairy",
        "poultry",
        "fisheries"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A single-window credit facility providing farmers with timely and affordable institutional credit for crop cultivation and allied activities, including dairy, poultry, and fisheries. Over 7.7 crore active accounts nationwide.",
    "benefits": "Revolving cash credit line with flexible withdrawals using RuPay debit card at ATMs and mandis. Low 4% net interest upon annual prompt settlement. Includes in-built crop insurance linkage and personal accident insurance.",
    "pros": [
      "Revolving credit facility — withdraw and repay as crops are harvested and sold",
      "Low 4% effective interest on timely repayment",
      "Collateral-free loan up to ₹1.60 lakh (raised to ₹2 lakh by RBI without collateral)",
      "Covers animal husbandry, dairy, poultry, and inland/marine fisheries"
    ],
    "cons": [
      "Must renew and clear interest once every 12 months to maintain 4% rate",
      "Tenant farmers require local tenancy agreements or JLG group guarantees",
      "Compulsory Aadhaar seeding required"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Identity verification and DBT subvention seeding"
      },
      {
        "id": "doc-land",
        "name": "Land Record (Khasra / Khatauni / Patta)",
        "required": true,
        "desc": "Documentary proof of agricultural landholding"
      },
      {
        "id": "doc-bank",
        "name": "Bank Passbook with Photo",
        "required": true,
        "desc": "Existing savings account passbook with IFSC code"
      },
      {
        "id": "doc-photos",
        "name": "2 Passport Size Photographs",
        "required": true,
        "desc": "Required for application form and RuPay Kisan Card"
      }
    ]
  },
  {
    "id": "pm-kisan",
    "name": "Pradhan Mantri Kisan Samman Nidhi",
    "shortName": "PM-KISAN",
    "category": "INCOME SUPPORT",
    "icon": "💰",
    "badge": "Income Support",
    "badgeColor": "teal",
    "tagline": "A central sector scheme providing direct income support of ₹6,000 per year to landholding farmer families, transferred in three equal instalments of ₹2,000 into Aadhaar-seeded bank accounts via Direct Benefit Transfer (DBT).",
    "baseRate": 0,
    "effectiveRate": 0,
    "promptIncentive": 0,
    "maxLimit": 6000,
    "highlights": [
      "Not a loan — direct income support",
      "₹6,000 per year (₹2,000 x 3 instalments)"
    ],
    "collateralFreeLimit": 0,
    "eligibility": {
      "farmerTypes": [
        "owner"
      ],
      "crops": [
        "all"
      ],
      "maxIncome": null,
      "minLand": 0.01,
      "requiresAadhaar": true,
      "exclusions": [
        "income tax payers",
        "institutional landholders",
        "constitutional posts",
        "serving/retired govt staff",
        "pensioners >= 10000/mo"
      ]
    },
    "whatItIs": "A central sector scheme providing direct income support of ₹6,000 per year to landholding farmer families, transferred in three equal instalments of ₹2,000 into Aadhaar-seeded bank accounts via Direct Benefit Transfer (DBT).",
    "benefits": "100% grant funding transferred directly to the farmer's bank account with zero middlemen. Provides immediate cash liquidity ahead of sowing seasons (April-July, August-November, December-March) for seeds, fertilizer, and household needs.",
    "pros": [
      "Direct grant with 0% interest and no repayment obligation",
      "Transferred directly into bank account via DBT eliminating leakage",
      "Over 11 crore farmer families supported nationwide",
      "Facilitates easy KCC approval when registered under PM-KISAN database"
    ],
    "cons": [
      "Strictly limited to landowning farmers; tenant/landless farmers not covered",
      "Fixed at ₹6,000 per year regardless of landholding size",
      "Requires biometric or OTP-based e-KYC and land seeding on the portal"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Mandatory for Aadhaar-based DBT transfers"
      },
      {
        "id": "doc-land",
        "name": "Land Record (RoR / Jamabandi / Khasra)",
        "required": true,
        "desc": "Cultivable land registered in applicant's name"
      },
      {
        "id": "doc-bank",
        "name": "Aadhaar & NPCI Mapped Bank Account",
        "required": true,
        "desc": "Bank passbook showing NPCI DBT mapping active"
      },
      {
        "id": "doc-ekyc",
        "name": "e-KYC Completion on PM-KISAN Portal",
        "required": true,
        "desc": "Biometric or mobile OTP authenticated KYC"
      }
    ]
  },
  {
    "id": "pmfby",
    "name": "Pradhan Mantri Fasal Bima Yojana",
    "shortName": "PMFBY",
    "category": "CROP INSURANCE & CREDIT",
    "icon": "🛡️",
    "badge": "Crop Insurance",
    "badgeColor": "green",
    "tagline": "Comprehensive crop insurance scheme protecting farmers against unforeseen weather events, pests, and natural calamities with subsidized premium rates.",
    "baseRate": 2.0,
    "effectiveRate": 1.5,
    "promptIncentive": 0,
    "maxLimit": 1000000,
    "highlights": [
      "Only 1.5% - 2% farmer premium, rest covered by Govt",
      "Automatic claim settlement directly into bank account"
    ],
    "collateralFreeLimit": 1000000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "tenant",
        "sharecropper"
      ],
      "crops": [
        "all",
        "wheat",
        "rice",
        "cotton",
        "soybean",
        "pulses",
        "horticulture",
        "oilseeds"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A comprehensive national crop insurance scheme providing comprehensive financial support to farmers suffering crop loss/damage arising out of unforeseen weather events.",
    "benefits": "Farmers pay a uniform maximum premium of only 2% for Kharif food and oilseed crops, 1.5% for Rabi crops, and 5% for annual commercial/horticultural crops. The entire remaining premium is subsidized equally by Central and State Governments.",
    "pros": [
      "Shields farmers from total loss during drought, flood, hailstorm, or pest attacks",
      "Protects farmer credit rating and prevents loan default during crop failure",
      "Covers prevented sowing, mid-season adversity, and post-harvest losses",
      "Claim compensation credited directly to Aadhaar-seeded bank account"
    ],
    "cons": [
      "Assessment unit is often village/gram panchayat level rather than individual field",
      "Intimation of localized damage must be lodged within 72 hours via crop insurance app",
      "Coverage applies strictly to notified crops in notified areas"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Mandatory identity proof"
      },
      {
        "id": "doc-land",
        "name": "Land Record / Tenancy Agreement",
        "required": true,
        "desc": "Proof of agricultural land or tenancy agreement"
      },
      {
        "id": "doc-sowing-cert",
        "name": "Sowing Certificate / Patwari Verification",
        "required": true,
        "desc": "Verification of crop sown in current season"
      },
      {
        "id": "doc-bank",
        "name": "Bank Passbook Copy",
        "required": true,
        "desc": "Account details for receiving claim compensation"
      }
    ]
  },
  {
    "id": "smam",
    "name": "Sub-Mission on Agricultural Mechanization",
    "shortName": "SMAM",
    "category": "EQUIPMENT & TRACTOR LOAN",
    "icon": "🚜",
    "badge": "Machinery Subsidy",
    "badgeColor": "orange",
    "tagline": "Financial assistance and bank credit facilitation for purchasing tractors, power tillers, rotavators, and setting up Custom Hiring Centres (CHC).",
    "baseRate": 8.0,
    "effectiveRate": 8.0,
    "promptIncentive": 0,
    "maxLimit": 1000000,
    "highlights": [
      "40% to 50% capital subsidy on farm machinery",
      "Up to ₹10 Lakh subsidy for Custom Hiring Centres"
    ],
    "collateralFreeLimit": 500000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "entrepreneur",
        "shg",
        "fpo",
        "pacs"
      ],
      "crops": [
        "all"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A flagship central scheme aimed at increasing farm power availability and modern farm equipment access among small and marginal farmers with up to 40-50% subsidy.",
    "benefits": "Provides individual farmers with 40% to 50% direct subsidy on agricultural equipment like tractors, combine harvesters, laser levellers, and seed drills. Also provides 40% financial assistance up to ₹10 Lakh to set up Custom Hiring Centres.",
    "pros": [
      "Substantial direct capital subsidy reduces tractor and machinery cost by half",
      "Special higher subsidy rates for SC/ST, women, and small/marginal farmers",
      "Allows rural youth to earn rental income by setting up Custom Hiring Centres",
      "Bank loan easily sanctioned for the remaining 50% amount with government tie-up"
    ],
    "cons": [
      "Annual budget quotas per district require applying early during notification windows",
      "Machinery must be purchased strictly from empanelled certified manufacturers",
      "Requires geotagged inspection of machinery before subsidy disbursement"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Identification and DBT linkage"
      },
      {
        "id": "doc-land",
        "name": "Land Record (Khatiyan / Khasra)",
        "required": true,
        "desc": "Proof of cultivable landholding"
      },
      {
        "id": "doc-bank",
        "name": "Bank Passbook / Cancelled Cheque",
        "required": true,
        "desc": "Bank account for subsidy credit"
      },
      {
        "id": "doc-tractor-quote",
        "name": "Dealer Quotation for Machinery",
        "required": true,
        "desc": "Official quotation from an empanelled equipment vendor"
      }
    ]
  },
  {
    "id": "pm-kusum",
    "name": "PM-KUSUM Solar Pump Scheme",
    "shortName": "PM-KUSUM",
    "category": "SOLAR IRRIGATION & LOAN",
    "icon": "☀️",
    "badge": "Solar Irrigation",
    "badgeColor": "orange",
    "tagline": "Empowering farmers with stand-alone solar agriculture pumps and solarization of existing grid pumps with up to 60% total subsidy.",
    "baseRate": 8.0,
    "effectiveRate": 8.0,
    "promptIncentive": 0,
    "maxLimit": 500000,
    "highlights": [
      "60% combined Central & State subsidy",
      "30% bank loan facility, only 10% farmer share"
    ],
    "collateralFreeLimit": 500000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "fpo",
        "pacs"
      ],
      "crops": [
        "all",
        "irrigation",
        "horticulture"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A major renewable energy scheme providing subsidized stand-alone solar agricultural water pumps (up to 7.5 HP) and solarization of grid-connected agricultural pumps.",
    "benefits": "Farmers receive 30% Central Financial Assistance and 30% State Government subsidy, paying only 10% upfront. The remaining 30% can be financed via accessible bank loans, eliminating costly recurring diesel and electricity bills.",
    "pros": [
      "Replaces expensive diesel irrigation with free solar power for 25+ years",
      "Total 60% direct subsidy significantly slashes capital cost",
      "Can sell surplus power back to state electricity boards for additional income",
      "Provides reliable daytime irrigation without dependence on nocturnal power supply"
    ],
    "cons": [
      "Vendor installation must follow state renewable agency waiting list",
      "Farmer must provide proof of verified water source (borewell/canal)",
      "Strict restrictions against drilling new unauthorized borewells in dark zones"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Identity verification"
      },
      {
        "id": "doc-land",
        "name": "Land Record (Jamabandi)",
        "required": true,
        "desc": "Proof of agricultural land for pump installation"
      },
      {
        "id": "doc-water",
        "name": "Water Source Declaration",
        "required": true,
        "desc": "Affidavit or certificate proving borewell or open water source"
      },
      {
        "id": "doc-bank",
        "name": "Bank Account Details",
        "required": true,
        "desc": "Aadhaar seeded bank account for loan and subsidy processing"
      }
    ]
  },
  {
    "id": "pmfme",
    "name": "PM Formalisation of Micro Food Processing Enterprises",
    "shortName": "PMFME",
    "category": "FOOD PROCESSING CREDIT",
    "icon": "🥫",
    "badge": "Food Processing",
    "badgeColor": "teal",
    "tagline": "Financial, technical, and business support for setting up or upgrading micro food-processing units with 35% credit-linked capital subsidy.",
    "baseRate": 9.5,
    "effectiveRate": 9.5,
    "promptIncentive": 0,
    "maxLimit": 1000000,
    "highlights": [
      "35% credit-linked capital subsidy up to ₹10 Lakh",
      "Supports individual farmers, FPOs, and SHGs"
    ],
    "collateralFreeLimit": 1000000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "entrepreneur",
        "fpo",
        "shg",
        "msme"
      ],
      "crops": [
        "all",
        "fruits",
        "vegetables",
        "spices",
        "millets",
        "pulses",
        "dairy"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A credit-linked subsidy scheme under Aatmanirbhar Bharat that helps individual farmers, SHGs, and FPOs set up food processing, packaging, and branding units.",
    "benefits": "Provides 35% credit-linked capital subsidy with a ceiling of ₹10 lakh per unit. Helps farmers transition from selling raw agricultural produce at distress prices to value-added branded products (flour, oil, pickles, spices, juice).",
    "pros": [
      "Direct 35% capital subsidy credited against loan principal",
      "Special support under One District One Product (ODOP) framework",
      "Includes marketing, packaging, food testing, and FSSAI licensing support",
      "Seed capital of ₹40,000 provided per SHG member for working capital"
    ],
    "cons": [
      "Must be linked to commercial bank loan appraisal",
      "Applicant must contribute minimum 10% of project cost from own funds",
      "Requires basic premises and electricity connection for machinery"
    ],
    "documents": [
      {
        "id": "doc-project",
        "name": "Micro-Enterprise Project Proposal",
        "required": true,
        "desc": "Cost estimates for processing machinery"
      },
      {
        "id": "doc-aadhaar-pan",
        "name": "Aadhaar & PAN Card",
        "required": true,
        "desc": "Identity and tax proof"
      },
      {
        "id": "doc-premises",
        "name": "Premises Ownership or Rent Agreement",
        "required": true,
        "desc": "Proof of unit setup location"
      },
      {
        "id": "doc-bank",
        "name": "Bank Passbook / Statements",
        "required": true,
        "desc": "Applicant financial records"
      }
    ]
  },
  {
    "id": "acabc",
    "name": "Agri-Clinics & Agri-Business Centres",
    "shortName": "ACABC",
    "category": "AGRI-ENTREPRENEUR LOAN",
    "icon": "🔬",
    "badge": "Agri-Business Loan",
    "badgeColor": "green",
    "tagline": "Loans up to ₹20 Lakh for individuals and up to ₹1 Crore for groups with 36% to 44% composite subsidy to establish agricultural clinics and retail hubs.",
    "baseRate": 8.5,
    "effectiveRate": 8.5,
    "promptIncentive": 0,
    "maxLimit": 2000000,
    "highlights": [
      "36% composite subsidy (44% for women & SC/ST)",
      "Free 45-day residential training by MANAGE"
    ],
    "collateralFreeLimit": 2000000,
    "eligibility": {
      "farmerTypes": [
        "owner",
        "entrepreneur",
        "graduate",
        "fpo"
      ],
      "crops": [
        "all"
      ],
      "maxIncome": null,
      "minLand": 0,
      "requiresAadhaar": true
    },
    "whatItIs": "A joint initiative by Ministry of Agriculture and NABARD to provide bank finance and massive composite subsidies for setting up agri-clinics, soil testing labs, input centers, and veterinary dispensaries.",
    "benefits": "Individual ceiling up to ₹20 lakh (₹25 lakh for extremely qualified cases) and group ceiling up to ₹100 lakh (for groups of 5+). Government provides 36% back-ended capital subsidy for general category and 44% for women, SC/ST, and Northeastern regions.",
    "pros": [
      "Very high 36% to 44% composite subsidy provided through NABARD",
      "Free 45-day residential technical and management training",
      "Covers 32+ viable farm businesses including custom hiring, seed processing, and soil labs",
      "Collateral-free loans up to ₹5 lakh under RBI Priority Sector norms"
    ],
    "cons": [
      "Applicant must hold a degree/diploma in agriculture or allied subjects",
      "Mandatory completion of MANAGE training course before loan sanction",
      "Subsidy is back-ended and adjusted after satisfactory project operation"
    ],
    "documents": [
      {
        "id": "doc-edu",
        "name": "Agriculture Degree / Diploma Certificate",
        "required": true,
        "desc": "Educational qualification proof"
      },
      {
        "id": "doc-manage",
        "name": "MANAGE Training Completion Certificate",
        "required": true,
        "desc": "Proof of 45-day residential agri-clinic training"
      },
      {
        "id": "doc-dpr",
        "name": "Detailed Business Plan (DPR)",
        "required": true,
        "desc": "Financial and technical projections"
      },
      {
        "id": "doc-kyc",
        "name": "Aadhaar, PAN & Bank Details",
        "required": true,
        "desc": "Standard KYC verification"
      }
    ]
  },
  {
    "id": "pm-kmy",
    "name": "Pradhan Mantri Kisan Maandhan Yojana",
    "shortName": "PM-KMY",
    "category": "PENSION & SOCIAL SECURITY",
    "icon": "👴",
    "badge": "Farmer Pension",
    "badgeColor": "teal",
    "tagline": "Voluntary and contributory old-age pension scheme providing an assured minimum pension of ₹3,000 per month to small and marginal farmers upon reaching 60 years.",
    "baseRate": 0,
    "effectiveRate": 0,
    "promptIncentive": 0,
    "maxLimit": 36000,
    "highlights": [
      "Assured ₹3,000 monthly pension for life",
      "50% contribution paid by Central Government"
    ],
    "collateralFreeLimit": 0,
    "eligibility": {
      "farmerTypes": [
        "owner"
      ],
      "crops": [
        "all"
      ],
      "maxIncome": null,
      "minLand": 0.01,
      "requiresAadhaar": true
    },
    "whatItIs": "A social security scheme for small and marginal farmers (entry age 18-40 years) that provides ₹3,000 monthly pension on attaining 60 years of age.",
    "benefits": "The farmer contributes between ₹55 to ₹200 monthly depending on entry age, and the Central Government contributes an equal matching 50% amount into the Pension Fund managed by LIC.",
    "pros": [
      "Guaranteed lifetime social security and financial independence in old age",
      "Equal 50% matching monthly contribution deposited by Central Govt",
      "Monthly contribution can be auto-debited directly from PM-KISAN instalments",
      "Family pension of 50% (₹1,500/month) transferred to spouse upon beneficiary death"
    ],
    "cons": [
      "Only for small and marginal farmers with cultivable land up to 2 hectares",
      "Entry age capped strictly between 18 and 40 years",
      "Beneficiaries covered under EPFO/NPS/ESIC are excluded"
    ],
    "documents": [
      {
        "id": "doc-aadhaar",
        "name": "Aadhaar Card",
        "required": true,
        "desc": "Mandatory identity document"
      },
      {
        "id": "doc-bank",
        "name": "Savings Bank Account Passbook",
        "required": true,
        "desc": "Bank account for monthly auto-debit and pension credit"
      },
      {
        "id": "doc-land",
        "name": "Khasra / Khatauni Copy",
        "required": true,
        "desc": "Proof of holding cultivable land up to 2 hectares"
      }
    ]
  }
];
