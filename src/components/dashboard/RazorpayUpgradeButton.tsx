"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { useNotifications } from "./NotificationContext";
import Script from "next/script";

interface RazorpayUpgradeButtonProps {
  sessionUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  className?: string;
  buttonText?: string;
}

export default function RazorpayUpgradeButton({
  sessionUser,
  className = "",
  buttonText = "Upgrade to Pro Tier",
}: RazorpayUpgradeButtonProps) {
  const { triggerToast } = useNotifications();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);

  useEffect(() => {
    if ((window as any).Razorpay) setIsScriptLoaded(true);
  }, []);

  function handleInitializeCheckout() {
    if (!(window as any).Razorpay && !isScriptLoaded) {
      triggerToast("Gateway Connection Failure", "Razorpay checkout SDK is currently unreachable. Please refresh.", "WARNING");
      return;
    }
    setIsProcessing(true);

    const options = {
      key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
      amount:      129900,
      currency:    "INR",
      name:        "WealthWatch Premium",
      description: "Annual Pro Tier Subscription",
      image:       sessionUser.image ?? "",
      handler:     async function (response: any) {
        try {
          triggerToast("Authorization Captured", "Verifying payment signature…", "SUCCESS");
          const verifyRes = await fetch("/api/payments/verify", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              razorpayPaymentId:  response.razorpay_payment_id,
              razorpayOrderId:    response.razorpay_order_id,
              razorpaySignature:  response.razorpay_signature,
            }),
          });
          if (verifyRes.ok) {
            triggerToast("Upgrade Complete", "Your workspace has been promoted to PRO.", "SUCCESS");
            window.location.reload();
          } else {
            triggerToast("Verification Failed", "The server could not authorize the signature.", "WARNING");
          }
        } catch (err) {
          console.error(err);
          triggerToast("Network Error", "Failed to reach verification endpoints.", "WARNING");
        } finally {
          setIsProcessing(false);
        }
      },
      modal:   { ondismiss: () => setIsProcessing(false) },
      prefill: { name: sessionUser.name ?? "", email: sessionUser.email ?? "" },
      notes:   { userId: sessionUser.id },
      theme:   { color: "#f59e0b" },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
        onError={() => console.error("Razorpay script load error.")}
      />
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleInitializeCheckout}
        className={`flex items-center gap-2 transition-colors font-mono disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      >
        {isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
        ) : (
          <CreditCard className="w-3.5 h-3.5 text-premium shrink-0" />
        )}
        <span>{isProcessing ? "Opening Gateway…" : buttonText}</span>
      </button>
    </>
  );
}