/**
 * Mirrors backend CustomerService.calculateGrossedUpGatewayAmounts
 * and the web payment summary so Review & Buy totals match GeePay.
 */

export function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function calculateGrossedUpGatewayAmounts(
  insuranceAmount: number,
  serviceChargePercent: number,
) {
  const premium = roundMoney(insuranceAmount);
  const percent = Number(serviceChargePercent);

  if (!Number.isFinite(premium) || premium <= 0) {
    return {
      serviceChargeAmount: 0,
      totalAmount: 0,
    };
  }

  if (!Number.isFinite(percent) || percent <= 0) {
    return {
      serviceChargeAmount: 0,
      totalAmount: premium,
    };
  }

  const feePercentDecimal = percent / 100;
  if (feePercentDecimal >= 1) {
    return {
      serviceChargeAmount: 0,
      totalAmount: premium,
    };
  }

  let totalAmount = roundMoney(premium / (1 - feePercentDecimal));
  let netReceived = roundMoney(totalAmount * (1 - feePercentDecimal));

  while (netReceived < premium) {
    totalAmount = roundMoney(totalAmount + 0.01);
    netReceived = roundMoney(totalAmount * (1 - feePercentDecimal));
  }

  return {
    serviceChargeAmount: roundMoney(totalAmount - premium),
    totalAmount,
  };
}

export function resolveServiceChargePercentForMethod(params: {
  method: 'MOBILE_MONEY' | 'CARD' | '';
  mobileMoneyServiceChargePercent: number;
  cardServiceChargePercent: number;
}) {
  if (params.method === 'MOBILE_MONEY') {
    return params.mobileMoneyServiceChargePercent;
  }
  if (params.method === 'CARD') {
    return params.cardServiceChargePercent;
  }
  return 0;
}

export function getLevyLabel(levyPercentage?: number) {
  if (levyPercentage === undefined || !Number.isFinite(levyPercentage)) {
    return 'Statutory Levy';
  }
  const percent = Number.isInteger(levyPercentage)
    ? String(levyPercentage)
    : levyPercentage.toFixed(2);
  return `Statutory Levy (${percent}%)`;
}
