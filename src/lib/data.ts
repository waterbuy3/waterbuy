export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  category: string;
  description: string;
  badge?: string;
  popular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  pricePerMonth: number;
  features: string[];
  popular?: boolean;
  deliveryFrequency: string;
}

export const categories: Category[] = [
  { id: "individual", name: "Individual", description: "Personal hydration packs", icon: "🧑", color: "from-blue-400 to-blue-600" },
  { id: "corporate", name: "Corporate", description: "Office & workplace supply", icon: "🏢", color: "from-cyan-400 to-cyan-600" },
  { id: "events", name: "Events", description: "Parties, conferences & more", icon: "🎉", color: "from-teal-400 to-teal-600" },
  { id: "wedding", name: "Wedding", description: "Premium wedding packages", icon: "💒", color: "from-sky-400 to-indigo-500" },
  { id: "apartment", name: "Apartment", description: "Bulk & tanker delivery", icon: "🏠", color: "from-blue-500 to-blue-700" },
  { id: "bulk", name: "Bulk Orders", description: "Wholesale & distribution", icon: "📦", color: "from-indigo-400 to-indigo-600" },
];

export const products: Product[] = [
  { id: "p1", name: "AquaPure Mini", size: "200ml", price: 0.50, category: "individual", description: "Perfect for on-the-go hydration", badge: "Compact" },
  { id: "p2", name: "AquaPure Classic", size: "500ml", price: 1.00, category: "individual", description: "Our bestselling everyday bottle", popular: true, badge: "Bestseller" },
  { id: "p3", name: "AquaPure Litre", size: "1 Litre", price: 1.80, category: "individual", description: "Great value for daily use" },
  { id: "p4", name: "AquaPure Family", size: "5 Litres", price: 4.50, category: "individual", description: "Perfect for families and homes" },
  { id: "p5", name: "AquaPure Mega", size: "10 Litres", price: 7.99, category: "apartment", description: "Ideal for apartments and offices" },
  { id: "p6", name: "AquaPure Can", size: "25 Litres", price: 15.99, category: "apartment", description: "Dispenser-ready water can", popular: true, badge: "Popular" },
  { id: "p7", name: "Event Pack 12", size: "12 × 500ml", price: 10.99, category: "events", description: "Bundle of 12 bottles for small events", badge: "Bundle" },
  { id: "p8", name: "Event Pack 24", size: "24 × 500ml", price: 19.99, category: "events", description: "Bundle of 24 bottles for medium events", popular: true, badge: "Best Value" },
  { id: "p9", name: "Wedding Premium Pack", size: "48 × 500ml", price: 35.99, category: "wedding", description: "Elegant branded bottles for weddings", badge: "Premium" },
  { id: "p10", name: "Corporate Box", size: "24 × 1L", price: 38.99, category: "corporate", description: "Office supply box with branded bottles" },
  { id: "p11", name: "Water Tanker Small", size: "5,000 Litres", price: 89.99, category: "apartment", description: "Small tanker for apartment complexes", badge: "Tanker" },
  { id: "p12", name: "Water Tanker Large", size: "10,000 Litres", price: 149.99, category: "bulk", description: "Large tanker for bulk distribution", badge: "Tanker" },
];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Perfect for individuals",
    pricePerMonth: 9.99,
    deliveryFrequency: "Weekly",
    features: [
      "4 × 5L cans per month",
      "Free delivery",
      "Flexible schedule",
      "Cancel anytime",
    ],
  },
  {
    id: "family",
    name: "Family",
    description: "Ideal for families & small offices",
    pricePerMonth: 24.99,
    deliveryFrequency: "Twice a week",
    popular: true,
    features: [
      "8 × 5L cans per month",
      "Priority delivery",
      "Custom schedule",
      "Free dispenser",
      "Cancel anytime",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "For apartments & large offices",
    pricePerMonth: 59.99,
    deliveryFrequency: "Daily",
    features: [
      "Unlimited 25L cans",
      "Same-day delivery",
      "Dedicated account manager",
      "Free dispenser & maintenance",
      "Priority support",
      "Custom branding available",
    ],
  },
];
