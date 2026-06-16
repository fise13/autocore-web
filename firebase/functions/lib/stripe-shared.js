"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingIntervalFromPriceId = billingIntervalFromPriceId;
exports.createMarketingStripeCheckout = createMarketingStripeCheckout;
exports.createCompanyStripeCheckout = createCompanyStripeCheckout;
exports.createStripeCustomer = createStripeCustomer;
exports.createStripeBillingPortal = createStripeBillingPortal;
exports.retrieveStripeCheckoutSession = retrieveStripeCheckoutSession;
exports.retrieveStripeSubscription = retrieveStripeSubscription;
exports.stripeObjectId = stripeObjectId;
exports.checkoutSessionEmail = checkoutSessionEmail;
exports.isProStripeStatus = isProStripeStatus;
exports.subscriptionPeriodEnd = subscriptionPeriodEnd;
function resolvePriceId(interval) {
    const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ||
        "price_1TbiZUHo5bmy0A9LC86I6wJJ";
    const yearly = process.env.STRIPE_PRICE_PRO_YEARLY ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ||
        "price_1TbiarHo5bmy0A9LD3SafymR";
    return interval === "yearly" ? yearly : monthly;
}
function billingIntervalFromPriceId(priceId) {
    if (!priceId)
        return null;
    if (priceId === resolvePriceId("yearly"))
        return "yearly";
    if (priceId === resolvePriceId("monthly"))
        return "monthly";
    return null;
}
async function stripeRequest(secretKey, path, body, method = "POST") {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${secretKey}`,
            ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
        body: method === "POST" ? body : undefined,
    });
    const payload = (await response.json());
    if (!response.ok) {
        throw new Error(payload.error?.message ?? "Stripe request failed");
    }
    return payload;
}
async function createMarketingStripeCheckout(params) {
    const body = new URLSearchParams({
        mode: "subscription",
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        "line_items[0][price]": resolvePriceId(params.interval),
        "line_items[0][quantity]": "1",
        "metadata[flow]": "marketing_pro",
        "metadata[interval]": params.interval,
        "subscription_data[metadata][flow]": "marketing_pro",
        "subscription_data[metadata][interval]": params.interval,
        allow_promotion_codes: "true",
    });
    const session = await stripeRequest(params.secretKey, "checkout/sessions", body);
    const url = session.url?.trim();
    if (!url) {
        throw new Error("Stripe Checkout не вернул ссылку");
    }
    return { url, sessionId: session.id };
}
async function createCompanyStripeCheckout(params) {
    const body = new URLSearchParams({
        mode: "subscription",
        customer: params.customerId,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        "line_items[0][price]": params.priceId,
        "line_items[0][quantity]": "1",
        "metadata[flow]": "in_app_pro",
        "metadata[companyId]": params.companyId,
        "subscription_data[metadata][flow]": "in_app_pro",
        "subscription_data[metadata][companyId]": params.companyId,
        allow_promotion_codes: "true",
    });
    const session = await stripeRequest(params.secretKey, "checkout/sessions", body);
    const url = session.url?.trim();
    if (!url) {
        throw new Error("Stripe Checkout не вернул ссылку");
    }
    return { url, sessionId: session.id };
}
async function createStripeCustomer(params) {
    const body = new URLSearchParams({
        "metadata[companyId]": params.companyId,
    });
    if (params.email)
        body.set("email", params.email);
    if (params.name)
        body.set("name", params.name);
    const customer = await stripeRequest(params.secretKey, "customers", body);
    return customer.id;
}
async function createStripeBillingPortal(params) {
    const body = new URLSearchParams({
        customer: params.customerId,
        return_url: params.returnUrl,
    });
    const session = await stripeRequest(params.secretKey, "billing_portal/sessions", body);
    const url = session.url?.trim();
    if (!url) {
        throw new Error("Stripe Portal не вернул ссылку");
    }
    return url;
}
async function retrieveStripeCheckoutSession(secretKey, sessionId) {
    const payload = await stripeRequest(secretKey, `checkout/sessions/${encodeURIComponent(sessionId)}`, undefined, "GET");
    return payload;
}
async function retrieveStripeSubscription(secretKey, subscriptionId) {
    return stripeRequest(secretKey, `subscriptions/${encodeURIComponent(subscriptionId)}`, undefined, "GET");
}
function stripeObjectId(value) {
    if (!value)
        return null;
    if (typeof value === "string")
        return value;
    return value.id?.trim() || null;
}
function checkoutSessionEmail(session) {
    return (session.customer_email?.trim().toLowerCase() ||
        session.customer_details?.email?.trim().toLowerCase() ||
        null);
}
function isProStripeStatus(status) {
    return status === "active" || status === "trialing" || status === "past_due";
}
function subscriptionPeriodEnd(subscription) {
    const fromItem = subscription.items?.data?.[0]?.current_period_end;
    if (typeof fromItem === "number")
        return fromItem;
    if (typeof subscription.current_period_end === "number")
        return subscription.current_period_end;
    return null;
}
//# sourceMappingURL=stripe-shared.js.map