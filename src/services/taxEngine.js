class TaxEngine {
  /**
   * Computes dynamic tax based on Region, State matching, and Product base tax percent.
   */
  static calculateTax(params) {
    const { companyCountry = '', companyState = '', customerCountry = '', customerState = '', taxPercent = 0, lineSubtotal = 0 } = params;

    // Normalization
    const coCountry = companyCountry.trim().toUpperCase();
    const cuCountry = customerCountry.trim().toUpperCase();
    const coState = companyState.trim().toUpperCase();
    const cuState = customerState.trim().toUpperCase();

    const breakdown = [];
    const baseSubtotal = Number(lineSubtotal || 0);
    const baseTaxPercent = Number(taxPercent || 0);

    // 1. India GST System
    if (coCountry === 'INDIA' && cuCountry === 'INDIA') {
      if (coState === cuState) {
        // Intra-State: CGST + SGST (split rate 50/50)
        const cgstRate = baseTaxPercent / 2;
        const sgstRate = baseTaxPercent / 2;
        const cgstAmount = Number(((baseSubtotal * cgstRate) / 100).toFixed(2));
        const sgstAmount = Number(((baseSubtotal * sgstRate) / 100).toFixed(2));
        
        breakdown.push({ name: 'CGST', rate: cgstRate, amount: cgstAmount });
        breakdown.push({ name: 'SGST', rate: sgstRate, amount: sgstAmount });
        
        return {
          taxType: 'CGST_SGST',
          cgstRate,
          sgstRate,
          igstRate: 0,
          vatRate: 0,
          totalTaxAmount: cgstAmount + sgstAmount,
          breakdown
        };
      } else {
        // Inter-State: IGST (full rate applied to Central Gov)
        const igstAmount = Number(((baseSubtotal * baseTaxPercent) / 100).toFixed(2));
        breakdown.push({ name: 'IGST', rate: baseTaxPercent, amount: igstAmount });

        return {
          taxType: 'IGST',
          cgstRate: 0,
          sgstRate: 0,
          igstRate: baseTaxPercent,
          vatRate: 0,
          totalTaxAmount: igstAmount,
          breakdown
        };
      }
    }

    // 2. UAE VAT System (5% Standard Rate)
    if (coCountry === 'UAE' || coCountry === 'UNITED ARAB EMIRATES') {
      const uaeVatRate = 5;
      const vatAmount = Number(((baseSubtotal * uaeVatRate) / 100).toFixed(2));
      breakdown.push({ name: 'VAT', rate: uaeVatRate, amount: vatAmount });

      return {
        taxType: 'VAT',
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        vatRate: uaeVatRate,
        totalTaxAmount: vatAmount,
        breakdown
      };
    }

    // 3. Fallback/Standard Country tax mapping
    if (baseTaxPercent > 0) {
      const standardTaxAmount = Number(((baseSubtotal * baseTaxPercent) / 100).toFixed(2));
      breakdown.push({ name: 'Standard Tax', rate: baseTaxPercent, amount: standardTaxAmount });

      return {
        taxType: 'VAT',
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        vatRate: baseTaxPercent,
        totalTaxAmount: standardTaxAmount,
        breakdown
      };
    }

    return {
      taxType: 'ZERO_TAX',
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate: 0,
      totalTaxAmount: 0,
      breakdown: []
    };
  }
}

module.exports = TaxEngine;
