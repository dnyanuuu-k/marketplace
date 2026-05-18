export function formatPrice(price: number, currency = "USD"): string {
  if (currency === "INR") {
    return `₹${price.toLocaleString("en-IN")}`;
  }
  return `$${price.toFixed(2)}`;
}
