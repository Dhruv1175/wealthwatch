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
  buttonText = "Upgrade to Pro Tier" 
}: RazorpayUpgradeButtonProps) {
  const { triggerToast } = useNotifications();
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Monitor if the window object picked up the checkout engine script layer
  useEffect(() => {
    if ((window as any).Razorpay) {
      setIsScriptLoaded(true);
    }
  }, []);

  function handleInitializeCheckout() {
    if (!(window as any).Razorpay && !isScriptLoaded) {
      triggerToast("Gateway Connection Failure", "Razorpay checkout SDK is currently unreachable. Please refresh.", "WARNING");
      return;
    }

    setIsProcessing(true);

    const options = {
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_your_key_here",
  amount: 129900, // Matching your standard Pro pricing variant (₹1,299.00 INR)
  currency: "INR",
  name: "WealthWatch Premium",
  description: "Monthly Pro Tier Subscription Access",
  image: sessionUser.image || "",
  handler: async function (response: any) {
    try {
      triggerToast("Authorization Captured", "Verifying live payment logs across database clusters...", "SUCCESS");
      
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature // 🔥 Passing signature to verify token integrity
        })
      });

      if (verifyRes.ok) {
        triggerToast("Upgrade Complete", "Your workspace has been successfully promoted to PRO.", "SUCCESS");
        // Force layout refresh to reflect updated navigation and UI states immediately
        window.location.reload();
      } else {
        triggerToast("Verification Failed", "The server could not authorize the signature.", "WARNING");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Network Error", "Failed to reach database verification endpoints.", "WARNING");
    } finally {
      setIsProcessing(false);
    }
  },
  modal: {
    ondismiss: function () {
      setIsProcessing(false);
    }
  },
  prefill: {
    name: sessionUser.name || "",
    email: sessionUser.email || ""
  },
  notes: {
    userId: sessionUser.id 
  },
  theme: {
    color: "#000000" 
  }
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
        onError={() => console.error("Razorpay script load anomaly.")}
      />

      <button
        type="button"
        disabled={isProcessing}
        onClick={handleInitializeCheckout}
        className={`flex items-center gap-2.5 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
        ) : (
          <CreditCard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        )}
        <span>{isProcessing ? "Opening Gateway..." : buttonText}</span>
      </button>
    </>
  );
}