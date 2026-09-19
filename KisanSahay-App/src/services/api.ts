import axios from 'axios';
import schemesData from '../data/schemesDatabase.json';
import cropsData from '../data/cropsData.json';
import soilData from '../data/dynamicSoilFertility.json';
import cropTrends from '../data/cropTrendsData.json';
import landPrices from '../data/landPricesData.json';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ApiService = {
  /**
   * Fetch all schemes with offline fallback to bundled 500+ schemes dataset
   */
  async getSchemes(): Promise<any[]> {
    try {
      const res = await client.get('/schemes');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
      if (res.data && Array.isArray(res.data.schemes)) {
        return res.data.schemes;
      }
    } catch (e) {
      console.log('[API] Network unavailable, loading offline bundled schemes');
    }
    return schemesData as any[];
  },

  /**
   * Fetch scheme recommendations based on farmer attributes
   */
  async getRecommendations(profile: any): Promise<any[]> {
    try {
      const res = await client.post('/recommend', profile);
      if (res.data && Array.isArray(res.data.schemes)) {
        return res.data.schemes;
      }
    } catch (e) {
      console.log('[API] Offline recommendation calculation');
    }

    // Offline rule-based matching
    const all = schemesData as any[];
    const state = profile.state || 'All India';
    const land = Number(profile.landArea) || 2;
    const crop = (profile.cropType || '').toLowerCase();

    return all
      .map((scheme: any) => {
        let score = 50;
        if (scheme.state === 'All India' || scheme.state === state) score += 20;
        if (scheme.category === 'income_support' || scheme.category === 'crop_loan') score += 15;
        if (crop && JSON.stringify(scheme).toLowerCase().includes(crop)) score += 15;
        return { ...scheme, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 15);
  },

  /**
   * Fetch 63 curated crops catalog
   */
  async getCrops(): Promise<any[]> {
    try {
      const res = await client.get('/crops');
      if (res.data) return res.data;
    } catch (e) {
      // offline fallback
    }
    return cropsData as any[];
  },

  /**
   * Fetch Soil Fertility profile
   */
  async getSoilFertility(state: string, district: string): Promise<any> {
    try {
      const res = await client.get(`/soil-fertility?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
      if (res.data) return res.data;
    } catch (e) {
      // offline fallback
    }

    // Offline lookup
    const list = soilData as any[];
    const found = list.find(
      (item: any) =>
        (item.state || '').toLowerCase() === state.toLowerCase() &&
        (item.district || '').toLowerCase() === district.toLowerCase()
    );

    return (
      found || {
        state: state || 'Uttar Pradesh',
        district: district || 'Varanasi',
        pH: 7.2,
        nitrogen: 'Medium',
        phosphorus: 'Low',
        potassium: 'High',
        organicCarbon: 'Medium',
        moisture: 'Moderate',
        recommendedCrops: ['Wheat', 'Rice', 'Sugarcane', 'Mustard'],
        fertilizerAdvice: 'Apply balanced NPK with additional organic compost to improve soil carbon.',
      }
    );
  },

  /**
   * AI Assistant Chat (Gemini or backend RAG)
   */
  async sendChatMessage(message: string, lang: string = 'hi', history: any[] = []): Promise<string> {
    try {
      const res = await client.post('/assistant/chat', { message, lang, history });
      if (res.data && res.data.reply) {
        return res.data.reply;
      }
    } catch (e) {
      console.log('[API] Assistant network error, using offline knowledge base response');
    }

    // Offline fallback assistance
    const msg = message.toLowerCase();
    if (msg.includes('kcc') || msg.includes('credit card') || msg.includes('लोन')) {
      return 'Kisan Credit Card (KCC) provides institutional credit up to ₹3,00,000 at a subsidized interest rate of 4% (with 3% prompt repayment incentive). You can apply through any public sector bank, RRB, or cooperative bank.';
    }
    if (msg.includes('pm-kisan') || msg.includes('सम्मान')) {
      return 'Under PM-KISAN, eligible landholder farmer families receive ₹6,000 annually in three equal installments of ₹2,000 directly transferred into their Aadhaar-seeded bank accounts.';
    }
    if (msg.includes('soil') || msg.includes('मिट्टी')) {
      return 'You can check your district soil health from the Soil tab. The Soil Health Card scheme provides tailored fertilizer recommendations every 2 years.';
    }

    return `KisanSahay provides access to over 500 agricultural schemes and low-interest crop loans. To check your tailored benefits, explore the Schemes tab or use the Eligibility Calculator. (Language: ${lang})`;
  },

  /**
   * Fetch Crop Trends & Land Benchmark Prices
   */
  getCropTrends() {
    return cropTrends;
  },

  getLandPrices() {
    return landPrices;
  },
};
