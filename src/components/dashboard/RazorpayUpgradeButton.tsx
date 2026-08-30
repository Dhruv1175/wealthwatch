"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
  style?: React.CSSProperties;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof (window as any).Razorpay === "function") {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayUpgradeButton({
  sessionUser,
  className = "",
  buttonText = "Upgrade to Pro Tier",
  style,
}: RazorpayUpgradeButtonProps) {
  const { triggerToast }                = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleCheckout() {
    setIsProcessing(true);

    if (typeof (window as any).Razorpay !== "function") {
      const loaded = await loadRazorpayScript();
      if (!loaded || typeof (window as any).Razorpay !== "function") {
        triggerToast("Gateway Unavailable", "Razorpay SDK failed to load — please check your network connection.", "WARNING");
        setIsProcessing(false);
        return;
      }
    }

    try {
      const rzp = new (window as any).Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount:      129900,
        currency:    "INR",
        name:        "WealthWatch",
        description: "Annual Pro Tier Subscription",
        image:       sessionUser.image ?? "",
        handler: async (response: any) => {
          try {
            triggerToast("Payment Captured", "Verifying signature…", "SUCCESS");
            const res = await fetch("/api/payments/verify", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                razorpayPaymentId:  response.razorpay_payment_id,
                razorpayOrderId:    response.razorpay_order_id,
                razorpaySignature:  response.razorpay_signature,
              }),
            });
            if (res.ok) {
              triggerToast("Upgrade Complete", "Your account is now Pro tier.", "SUCCESS");
              window.location.reload();
            } else {
              triggerToast("Verification Failed", "Could not verify payment. Contact support.", "WARNING");
            }
          } catch {
            triggerToast("Network Error", "Failed to reach verification endpoint.", "WARNING");
          } finally {
            setIsProcessing(false);
          }
        },
        modal:   { ondismiss: () => setIsProcessing(false) },
        prefill: { name: sessionUser.name ?? "", email: sessionUser.email ?? "" },
        notes:   { userId: sessionUser.id },
        theme:   { color: "hsl(40, 95%, 58%)" },
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay initialization error:", err);
      triggerToast("Error", "Could not launch Razorpay payment checkout.", "WARNING");
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleCheckout}
        className={className}
        style={style}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Opening Gateway…
          </>
        ) : (
          buttonText
        )}
      </button>
    </>
  );
}