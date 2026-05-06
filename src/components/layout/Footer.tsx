import { Link } from "@tanstack/react-router";
import { Droplets, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-gradient-water">AquaPure</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium water delivery for every occasion. From individual bottles to tanker loads.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/products" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Products</Link>
              <Link to="/subscriptions" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Subscriptions</Link>
              <Link to="/schedule" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Schedule Delivery</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Categories</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Individual</p>
              <p>Corporate</p>
              <p>Events & Weddings</p>
              <p>Apartments & Bulk</p>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (800) AQUA-PURE</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@aquapure.com</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Available Worldwide</p>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AquaPure. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
