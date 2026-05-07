export interface Product {
  id: string;
  name: string;
  size: string;
  unit: string;
  price: number;
  mrp?: number;
  category: string;
  description: string;
  badge?: string;
  popular?: boolean;
  deliveryType?: "Instant" | "Scheduled" | "Subscription" | "All";
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
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
  { id: "bundles", name: "Bundles", description: "Packs of 12 or 24", icon: "📦", color: "from-indigo-400 to-indigo-600" },
  { id: "machines", name: "Purifiers", description: "RO systems and filters", icon: "💧", color: "from-blue-300 to-cyan-500" },
];

export const products: Product[] = [
  // Individual
  { id: "p1", name: "AquaPure Mini", size: "200ml", unit: "Bottle", price: 10, mrp: 12, category: "individual", description: "Perfect for on-the-go hydration", badge: "Compact", deliveryType: "All", imageUrl: "/water-bottle.png", rating: 4.6, reviewCount: 812 },
  { id: "p2", name: "AquaPure Classic", size: "500ml", unit: "Bottle", price: 20, mrp: 25, category: "individual", description: "Our bestselling everyday bottle", popular: true, badge: "Bestseller", deliveryType: "All", imageUrl: "/water-bottle.png", rating: 4.9, reviewCount: 3241 },
  { id: "p3", name: "AquaPure Litre", size: "1L", unit: "Bottle", price: 35, mrp: 40, category: "individual", description: "Great value for daily use", deliveryType: "All", imageUrl: "/water-bottle.png", rating: 4.7, reviewCount: 1528 },
  { id: "p4", name: "AquaPure Family", size: "5L", unit: "Can", price: 90, mrp: 110, category: "individual", description: "Perfect for families and homes", deliveryType: "All", imageUrl: "/water-can.png", rating: 4.8, reviewCount: 2104 },

  // Apartment / Office
  { id: "p5", name: "AquaPure Mega", size: "10L", unit: "Can", price: 160, mrp: 190, category: "apartment", description: "Ideal for apartments and offices", deliveryType: "All", imageUrl: "/water-can.png", rating: 4.7, reviewCount: 934 },
  { id: "p6", name: "AquaPure Dispenser Can", size: "25L", unit: "Can", price: 320, mrp: 370, category: "apartment", description: "Dispenser-ready water can", popular: true, badge: "Popular", deliveryType: "All", imageUrl: "/water-can.png", rating: 4.8, reviewCount: 1763 },

  // Bundles / Events
  { id: "p7", name: "Event Pack 12 (500ml)", size: "12 × 500ml", unit: "Bundle", price: 220, mrp: 260, category: "bundles", description: "Bundle of 12 bottles for small events", badge: "Bundle", deliveryType: "Scheduled", imageUrl: "/water-bundle.png", rating: 4.6, reviewCount: 445 },
  { id: "p8", name: "Event Pack 24 (500ml)", size: "24 × 500ml", unit: "Bundle", price: 400, mrp: 480, category: "bundles", description: "Bundle of 24 bottles for medium events", popular: true, badge: "Best Value", deliveryType: "Scheduled", imageUrl: "/water-bundle.png", rating: 4.8, reviewCount: 1102 },
  { id: "p9", name: "Wedding Premium Pack", size: "48 × 500ml", unit: "Bundle", price: 750, mrp: 900, category: "wedding", description: "Elegant branded bottles for weddings", badge: "Premium", deliveryType: "Scheduled", imageUrl: "/water-bundle.png", rating: 4.9, reviewCount: 287 },
  { id: "p10", name: "Corporate Box (1L)", size: "24 × 1L", unit: "Bundle", price: 800, mrp: 960, category: "corporate", description: "Office supply box with branded bottles", deliveryType: "Scheduled", imageUrl: "/water-bundle.png", rating: 4.7, reviewCount: 568 },

  // Tankers
  { id: "t1", name: "Mini Tanker", size: "3,000L", unit: "Tanker", price: 1500, category: "apartment", description: "Mini tanker for small complexes", badge: "Tanker", deliveryType: "Scheduled", imageUrl: "/tanker-5000l.png", rating: 4.6, reviewCount: 193 },
  { id: "t2", name: "Standard Tanker", size: "5,000L", unit: "Tanker", price: 2000, category: "apartment", description: "Standard tanker for apartments", popular: true, badge: "Tanker", deliveryType: "Scheduled", imageUrl: "/tanker-5000l.png", rating: 4.8, reviewCount: 412 },
  { id: "t3", name: "Jumbo Tanker", size: "10,000L", unit: "Tanker", price: 3500, category: "apartment", description: "Large tanker for bulk distribution", badge: "Tanker", deliveryType: "Scheduled", imageUrl: "/tanker-10000l.png", rating: 4.7, reviewCount: 284 },
  { id: "t4", name: "Mega Tanker", size: "25,000L", unit: "Tanker", price: 7500, category: "apartment", description: "Massive tanker for large housing societies", badge: "Mega", deliveryType: "Scheduled", imageUrl: "/tanker-10000l.png", rating: 4.9, reviewCount: 97 },

  // Purifiers / Machines
  { id: "m1", name: "Aqua Smart RO Purifier", size: "15L/hr", unit: "Machine", price: 12500, mrp: 15000, category: "machines", description: "Smart RO water purifier with mineral enrichment", popular: true, badge: "New", deliveryType: "Scheduled", imageUrl: "/ro-purifier.png", rating: 4.9, reviewCount: 631 },
];

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating: number;
  text: string;
  tag: string;
}

export const testimonials: Testimonial[] = [
  { id: "t1", name: "Priya M.", location: "Bangalore", avatar: "PM", rating: 5, text: "Delivered in 7 minutes flat! The water quality is excellent and the app is super smooth.", tag: "Instant Delivery" },
  { id: "t2", name: "Rahul K.", location: "Mumbai", avatar: "RK", rating: 5, text: "Set up a subscription for office and it runs on autopilot. Never thought water delivery could be this easy.", tag: "Subscription" },
  { id: "t3", name: "Ananya S.", location: "Hyderabad", avatar: "AS", rating: 5, text: "Booked a tanker for our apartment complex. The driver was on time and the water was crystal clear.", tag: "Tanker" },
  { id: "t4", name: "Kiran V.", location: "Chennai", avatar: "KV", rating: 5, text: "The wedding pack was amazing — branded bottles for all guests. Will definitely reorder!", tag: "Wedding" },
  { id: "t5", name: "Meera T.", location: "Delhi", avatar: "MT", rating: 5, text: "The subscription service is seamless. Set it once and water delivers itself!", tag: "Subscription" },
];

export const appStats = {
  deliveriesToday: "12,400+",
  avgDeliveryMin: 8,
  rating: 4.9,
  happyCustomers: "50K+",
  citiesCovered: 14,
};

export const trustBadges = [
  { icon: "🧪", label: "Lab Tested" },
  { icon: "✅", label: "BIS Certified" },
  { icon: "⚡", label: "10 Min Delivery" },
  { icon: "🌿", label: "Natural Source" },
  { icon: "🔒", label: "Tamper Proof" },
];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic Daily",
    description: "Daily hydration for one",
    pricePerMonth: 899,
    deliveryFrequency: "Daily",
    features: [
      "1 × 1L bottle delivered daily",
      "Free morning delivery",
      "Pause delivery anytime (Vacation Mode)",
      "Cancel anytime",
    ],
  },
  {
    id: "alternate",
    name: "Alternate Days",
    description: "Perfect for couples",
    pricePerMonth: 1299,
    deliveryFrequency: "Alternate Days",
    popular: true,
    features: [
      "2 × 5L cans delivered alternate days",
      "Flexible morning/evening slots",
      "Pause delivery anytime",
      "Free dispenser",
    ],
  },
  {
    id: "weekly",
    name: "Weekly Family",
    description: "Ideal for families",
    pricePerMonth: 1999,
    deliveryFrequency: "Weekly",
    features: [
      "4 × 25L cans per week",
      "Dedicated weekend delivery",
      "Free dispenser maintenance",
      "Pause delivery anytime",
    ],
  },
  {
    id: "monthly_corporate",
    name: "Corporate Bulk",
    description: "For offices & large families",
    pricePerMonth: 8999,
    deliveryFrequency: "Monthly",
    features: [
      "50 × 25L cans monthly quota",
      "Call to dispatch anytime",
      "Dedicated account manager",
      "Custom branding available",
    ],
  },
];
