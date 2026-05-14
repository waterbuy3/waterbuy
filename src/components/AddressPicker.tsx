import { Check, Plus, Home, Briefcase, MapPin } from "lucide-react";
import type { UserAddress } from "@/lib/supabase";

interface AddressPickerProps {
  addresses: UserAddress[];
  selectedId: string | null;
  onSelect: (address: UserAddress) => void;
  onAddNew: () => void;
}

function TagIcon({ tag }: { tag: string }) {
  if (tag === "Home") return <Home className="h-4 w-4" />;
  if (tag === "Work") return <Briefcase className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
}

export function AddressPicker({ addresses, selectedId, onSelect, onAddNew }: AddressPickerProps) {
  return (
    <div className="space-y-2">
      {addresses.map((addr) => {
        const isSelected = selectedId === addr.id;
        return (
          <button
            key={addr.id}
            type="button"
            onClick={() => onSelect(addr)}
            className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <TagIcon tag={addr.tag} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-extrabold">{addr.tag}</span>
                {addr.isDefault && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {addr.line1}
                {addr.pincode ? ` – ${addr.pincode}` : ""}
                {addr.landmark ? `, near ${addr.landmark}` : ""}
              </p>
            </div>
            {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAddNew}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
      >
        <Plus className="h-4 w-4" /> Add New Address
      </button>
    </div>
  );
}
