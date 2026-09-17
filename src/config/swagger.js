/**
 * OpenAPI 3.0 Specification for KisanSahay
 */

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'KisanSahay Agricultural Finance & Loan Recommendation API',
    version: '2.0.0',
    description: 'RESTful API for matching Indian farmers with subsidized government loan schemes, agricultural policies, and responsible borrowing assessments based on location intelligence and soil-crop suitability.',
    contact: {
      name: 'KisanSahay Engineering Team',
      url: 'https://github.com/samirahamed-27/KisanSahay'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  paths: {
    '/api/recommend': {
      post: {
        summary: 'Recommend & Rank Agricultural Schemes for Farmer Profile',
        description: 'Multi-factor ranking engine (eligibility, financial interest, regional fit, crop-soil suitability, application ease) returning color-coded sequence: 1 Best Match, 10-11 Good Alternatives, Moderate Fits, and Ineligible (listed last).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/FarmerProfileInput'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Ranked list of agricultural schemes with location intelligence and debt safety analysis',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RecommendationResponse'
                }
              }
            }
          },
          '400': {
            description: 'Validation error'
          },
          '429': {
            description: 'Rate limit exceeded'
          }
        }
      }
    },
    '/api/schemes': {
      get: {
        summary: 'List All Government Schemes and Agri-Loans',
        description: 'Filter by category, state, crop, provider, or search keywords.',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'e.g. CROP LOAN, IRRIGATION, LIVESTOCK, INFRASTRUCTURE' },
          { name: 'state', in: 'query', schema: { type: 'string' }, description: 'e.g. Punjab, Maharashtra, Telangana' },
          { name: 'crop', in: 'query', schema: { type: 'string' }, description: 'e.g. Wheat, Cotton, Dairy' },
          { name: 'maxRate', in: 'query', schema: { type: 'number' }, description: 'Maximum interest rate percentage' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Free-text search' }
        ],
        responses: {
          '200': {
            description: 'List of matching schemes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    total: { type: 'integer' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Scheme' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/schemes/{id}': {
      get: {
        summary: 'Get Detailed Scheme by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'e.g. kcc, miss, aif, pm-kusum' }
        ],
        responses: {
          '200': {
            description: 'Scheme details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Scheme' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Scheme not found'
          }
        }
      }
    },
    '/api/context/location': {
      get: {
        summary: 'Get Location Intelligence (Soil Health, Land Valuation, Crop Trends)',
        parameters: [
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'district', in: 'query', schema: { type: 'string' } },
          { name: 'pincode', in: 'query', schema: { type: 'string' } },
          { name: 'latitude', in: 'query', schema: { type: 'number' } },
          { name: 'longitude', in: 'query', schema: { type: 'number' } }
        ],
        responses: {
          '200': {
            description: 'Location context information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/LocationContext' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/ingest/refresh': {
      post: {
        summary: 'Trigger Background Scheme Ingestion & Verification',
        description: 'Scrapes and verifies public open data portals (adhering strictly to robots.txt).',
        responses: {
          '200': {
            description: 'Ingestion status and timestamp'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      FarmerProfileInput: {
        type: 'object',
        properties: {
          state: { type: 'string', example: 'Punjab' },
          district: { type: 'string', example: 'Ludhiana' },
          village: { type: 'string', example: 'Samrala' },
          pincode: { type: 'string', example: '141114' },
          latitude: { type: 'number', example: 30.9 },
          longitude: { type: 'number', example: 75.85 },
          landSizeAcres: { type: 'number', example: 3.5 },
          landSizeHectares: { type: 'number', example: 1.41 },
          cropType: { type: 'string', example: 'Wheat, Paddy' },
          landOwnership: { type: 'string', enum: ['owner', 'tenant', 'sharecropper', 'leaseholder', 'landless'], example: 'owner' },
          annualIncome: { type: 'number', example: 250000 },
          existingLoans: { type: 'number', example: 50000 },
          category: { type: 'string', enum: ['general', 'sc', 'st', 'obc', 'women'], example: 'general' },
          hasKcc: { type: 'boolean', example: true },
          hasAadhaar: { type: 'boolean', example: true }
        }
      },
      RecommendationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          farmer_location: { type: 'string' },
          farmer_context: {
            type: 'object',
            properties: {
              soil_type: { type: 'string' },
              soil_ph: { type: 'number' },
              estimated_land_value_per_acre: { type: 'number' }
            }
          },
          debt_safety_assessment: {
            type: 'object',
            properties: {
              monthly_farm_income: { type: 'number' },
              baseline_dti_ratio: { type: 'string' },
              max_safe_borrowing_limit: { type: 'number' },
              debt_status: { type: 'string' }
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scheme_id: { type: 'string' },
                scheme_name: { type: 'string' },
                status: { type: 'string', enum: ['best', 'good', 'moderate', 'ineligible'] },
                score: { type: 'integer' },
                interest_rate: { type: 'string' },
                max_loan_amount: { type: 'string' },
                eligibility_reason: { type: 'string' },
                apply_link: { type: 'string' },
                documents_required: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        }
      },
      Scheme: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          shortName: { type: 'string' },
          category: { type: 'string' },
          baseInterestRate: { type: 'number' },
          subsidizedInterestRate: { type: 'number' },
          maxLoanAmount: { type: 'number' }
        }
      },
      LocationContext: {
        type: 'object',
        properties: {
          resolvedLocation: { type: 'object' },
          soilProfile: { type: 'object' },
          landValuation: { type: 'object' },
          cropTrends: { type: 'object' }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
