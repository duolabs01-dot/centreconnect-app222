// supabase/functions/web-push/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3";

// Set VAPID keys from environment variables
const vapidKeys = {
  publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
  privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
};

webpush.setVapidDetails(
  "mailto:your-email@example.com", // Replace with a valid email
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use service role key for RLS bypass if needed
  );

  // Helper to respond with JSON
  const respondJson = (data: any, status: number = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // Handle subscription endpoint
  if (req.url.endsWith("/web-push/subscribe")) {
    if (req.method !== "POST") {
      return respondJson({ error: "Method Not Allowed" }, 405);
    }

    try {
      const { subscription, userId, ecdId } = await req.json();

      if (!subscription) {
        return respondJson({ error: "Subscription object is required" }, 400);
      }

      const { data, error } = await supabaseClient.from("push_subscriptions").upsert(
        {
          user_id: userId || null,
          ecd_id: ecdId || null,
          subscription: subscription,
        },
        { onConflict: "subscription" } // Assuming subscription object can be used as unique identifier
      ).select();

      if (error) {
        console.error("Error saving subscription:", error);
        return respondJson({ error: error.message }, 500);
      }

      return respondJson({ message: "Subscription saved", data });
    } catch (e) {
      console.error("Error processing subscribe request:", e);
      return respondJson({ error: e.message }, 500);
    }
  }

  // Handle send notification endpoint (for server-side triggers/calls)
  if (req.url.endsWith("/web-push/send-notification")) {
    if (req.method !== "POST") {
      return respondJson({ error: "Method Not Allowed" }, 405);
    }

    try {
      const { targetUserId, targetEcdId, payload } = await req.json();

      if (!targetUserId && !targetEcdId) {
        return respondJson({ error: "targetUserId or targetEcdId is required" }, 400);
      }

      let query = supabaseClient.from("push_subscriptions").select("subscription");
      if (targetUserId) {
        query = query.eq("user_id", targetUserId);
      }
      if (targetEcdId) {
        query = query.eq("ecd_id", targetEcdId);
      }
      // If both are provided, it implies a user within a specific ECD
      if (targetUserId && targetEcdId) {
        query = query.eq("user_id", targetUserId).eq("ecd_id", targetEcdId);
      }

      const { data: subscriptions, error } = await query;

      if (error) {
        console.error("Error fetching subscriptions:", error);
        return respondJson({ error: error.message }, 500);
      }

      if (!subscriptions || subscriptions.length === 0) {
        return respondJson({ message: "No active subscriptions found for target" });
      }

      const notificationPayload = JSON.stringify(payload || { title: "New Notification", body: "You have a new update!" });

      const sendPromises = subscriptions.map((sub) =>
        webpush.sendNotification(sub.subscription as webpush.PushSubscription, notificationPayload)
          .then(() => ({ success: true, subscription: sub.subscription }))
          .catch((err) => {
            console.error("Error sending notification:", err);
            // Handle specific errors like "Gone" (subscription expired/unsubscribed)
            if (err.statusCode === 410 || err.body?.includes("unsubscribed")) {
                console.log("Subscription is gone, deleting from DB:", sub.subscription);
                return supabaseClient.from("push_subscriptions").delete().eq("subscription", sub.subscription)
                    .then(() => ({ success: false, subscription: sub.subscription, status: "deleted" }))
                    .catch(deleteErr => {
                        console.error("Error deleting expired subscription:", deleteErr);
                        return { success: false, subscription: sub.subscription, status: "delete_failed", error: deleteErr.message };
                    });
            }
            return { success: false, subscription: sub.subscription, error: err.message };
          })
      );

      const results = await Promise.all(sendPromises);
      return respondJson({ message: "Notifications sent", results });
    } catch (e) {
      console.error("Error processing send-notification request:", e);
      return respondJson({ error: e.message }, 500);
    }
  }

  return respondJson({ error: "Not Found" }, 404);
});