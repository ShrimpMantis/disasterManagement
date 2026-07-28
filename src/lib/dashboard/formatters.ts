/** Format INR with compact Crore/Lakh when useful. */
export function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) {
    const crores = amount / 1_00_00_000;
    return `₹ ${crores.toFixed(crores >= 10 ? 1 : 2)} Cr`;
  }
  if (amount >= 1_00_000) {
    const lakhs = amount / 1_00_000;
    return `₹ ${lakhs.toFixed(lakhs >= 10 ? 1 : 2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
