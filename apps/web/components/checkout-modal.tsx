"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-context";
import { useAuth } from "./providers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AddressPickerModal } from "./maps/address-picker-modal";
import { 
  MapPin, 
  Plus, 
  Store, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Banknote, 
  KeyRound,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted?: (order: any) => void;
}

export function CheckoutModal({ isOpen, onClose, onOrderCompleted }: CheckoutModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, merchantGroups, subtotal, deliveryFee, total, clearCart } = useCart();

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"COD" | "UPI">("COD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  // Fetch saved customer addresses
  const { data: addressesData, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ["customer-addresses"],
    queryFn: async () => {
      const res = await api.get<any>("/customer/addresses");
      return res.data?.addresses || [];
    },
    enabled: Boolean(user && isOpen),
  });

  const addresses = addressesData || [];

  // Auto-select default address if not selected
  React.useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a: any) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId);

  const handlePlaceOrder = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!selectedAddress) {
      setError("Please select or add a delivery address in Khammam");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const subordersPayload = merchantGroups.map((g) => ({
        merchantId: g.merchantId,
        items: g.items.map((i) => ({
          productId: i.productId,
          productName: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          handlingTag: i.handlingTag,
        })),
      }));

      const payload = {
        customerId: user.id,
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: `${selectedAddress.addressLine}${selectedAddress.landmark ? `, Near ${selectedAddress.landmark}` : ""}`,
        deliveryLocality: selectedAddress.locality || "Khammam Central",
        deliveryLatitude: selectedAddress.latitude || 17.2475,
        deliveryLongitude: selectedAddress.longitude || 80.1518,
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey,
        suborders: subordersPayload,
      };

      const res = await api.post<any>("/orders", payload);

      if (res.success && res.data) {
        setCreatedOrder(res.data);
        clearCart();
        queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
        queryClient.invalidateQueries({ queryKey: ["in-app-notifications"] });
        onOrderCompleted?.(res.data);
      } else {
        setError(res.error?.message || "Failed to place order");
      }
    } catch (err: any) {
      setError(err.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewAddressSaved = (newAddr: any) => {
    queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
    setSelectedAddressId(newAddr.id);
  };

  // If order was just placed, display rich confirmation
  if (createdOrder) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Order Successfully Placed!" maxWidth="max-w-lg">
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-neutral-900">
              Shared Order Confirmed
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Order #{createdOrder.orderNumber || createdOrder.order_number}
            </p>
          </div>

          {/* Verification POD Code */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-800" />
              Your Proof of Delivery (POD) Code
            </div>
            <div className="text-3xl font-extrabold tracking-widest text-amber-950 font-mono my-1.5">
              {createdOrder.podCode || createdOrder.pod_code}
            </div>
            <p className="text-[11px] text-amber-800 leading-normal max-w-xs mx-auto">
              Please provide this 4-digit verification code to your delivery partner when your order arrives.
            </p>
          </div>

          {/* Suborders Summary */}
          <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50 text-left space-y-2 text-xs">
            <div className="font-bold text-neutral-800">
              {createdOrder.suborders?.length || 1} Merchant Suborders Coordinated:
            </div>
            {createdOrder.suborders?.map((sub: any, idx: number) => (
              <div key={idx} className="flex justify-between text-neutral-600">
                <span>Suborder #{sub.suborderNumber || sub.suborder_number || idx + 1}</span>
                <span className="font-semibold text-neutral-900">₹{Number(sub.subtotal).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-neutral-900 text-sm">
              <span>Total Paid ({paymentMode})</span>
              <span className="text-teal-800">₹{Number(createdOrder.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                onClose();
                setCreatedOrder(null);
              }}
            >
              Continue Shopping
            </Button>
            <Button
              variant="primary"
              className="flex-1 flex items-center justify-center gap-1.5 font-bold"
              onClick={() => {
                onClose();
                setCreatedOrder(null);
                router.push("/customer");
              }}
            >
              <span>Track in Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Complete Shared Delivery Checkout" maxWidth="max-w-xl">
        <div className="space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* 1. Delivery Address Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-700" />
                1. Delivery Address in Khammam
              </label>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Address
              </button>
            </div>

            {isLoadingAddresses ? (
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-500 text-center animate-pulse">
                Loading saved addresses...
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center space-y-2">
                <p className="text-xs text-neutral-500">No saved addresses found.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddressModalOpen(true)}
                >
                  Pin Location on Map
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {addresses.map((addr: any) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/60 shadow-2xs"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-200/70 text-neutral-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                        {addr.addressLine}
                      </p>
                      {addr.landmark && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">Near: {addr.landmark}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Delivery Instructions */}
          <div>
            <label className="block text-xs font-bold text-neutral-900 mb-1.5">
              2. Delivery Notes (Optional)
            </label>
            <input
              type="text"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Leave with security, call when outside apartment gate"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* 3. Payment Method */}
          <div>
            <label className="block text-xs font-bold text-neutral-900 mb-1.5">
              3. Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMode("COD")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  paymentMode === "COD"
                    ? "border-teal-600 bg-teal-50/60 shadow-2xs"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <Banknote className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-neutral-900">Cash on Delivery</div>
                  <div className="text-[11px] text-neutral-500">Pay delivery partner at drop-off</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode("UPI")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  paymentMode === "UPI"
                    ? "border-teal-600 bg-teal-50/60 shadow-2xs"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <CreditCard className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1">
                    UPI / QR <span className="text-[9px] px-1 bg-amber-100 text-amber-800 rounded font-bold">DEMO</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">Scan QR on arrival</div>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Financial Summary */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
            <div className="flex justify-between text-neutral-600">
              <span>Items Total ({items.length} items)</span>
              <span className="font-semibold text-neutral-900">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span className="flex items-center gap-1">
                Shared Delivery Fee
                <span className="text-[9px] px-1 py-0.2 bg-teal-100 text-teal-800 rounded font-mono font-semibold">
                  DEMO POLICY
                </span>
              </span>
              <span className="font-semibold text-neutral-900">₹{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-neutral-900">
              <span>Total Payable</span>
              <span className="text-teal-800">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting || !selectedAddress || items.length === 0}
              onClick={handlePlaceOrder}
              className="font-bold min-h-[48px] px-6 shadow-md"
            >
              {isSubmitting ? "Submitting Shared Order..." : `Confirm Order (₹${total.toFixed(2)})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Embedded Address Picker Modal */}
      <AddressPickerModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSaved={handleNewAddressSaved}
      />
    </>
  );
}

