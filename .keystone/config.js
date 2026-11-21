"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// features/integrations/payment/manual.ts
var manual_exports = {};
__export(manual_exports, {
  capturePaymentFunction: () => capturePaymentFunction,
  createPaymentFunction: () => createPaymentFunction,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction,
  getPaymentStatusFunction: () => getPaymentStatusFunction,
  handleWebhookFunction: () => handleWebhookFunction,
  refundPaymentFunction: () => refundPaymentFunction
});
function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function asString(value, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
async function handleWebhookFunction() {
  throw new Error("Pay-in-person payments do not accept webhooks.");
}
async function createPaymentFunction({ amount, currency }) {
  return {
    status: "pending",
    data: {
      status: "pending",
      amount: asNumber(amount),
      currency: asString(currency, "usd").toLowerCase(),
      provider: "manual",
      settlement: "offline"
    }
  };
}
async function capturePaymentFunction() {
  throw new Error("Pay-in-person payments are not captured by a processor. Record the payment at checkout.");
}
async function refundPaymentFunction() {
  throw new Error("Pay-in-person payments are not refunded by a processor. Record a cash refund from the checkout receipt.");
}
async function getPaymentStatusFunction() {
  throw new Error("Pay-in-person payments have no processor status to check.");
}
async function generatePaymentLinkFunction() {
  return null;
}
var init_manual = __esm({
  "features/integrations/payment/manual.ts"() {
    "use strict";
  }
});

// features/integrations/payment/stripe.ts
var stripe_exports = {};
__export(stripe_exports, {
  capturePaymentFunction: () => capturePaymentFunction2,
  createPaymentFunction: () => createPaymentFunction2,
  generatePaymentLinkFunction: () => generatePaymentLinkFunction2,
  getPaymentStatusFunction: () => getPaymentStatusFunction2,
  handleWebhookFunction: () => handleWebhookFunction2,
  refundPaymentFunction: () => refundPaymentFunction2,
  stripeConfigured: () => stripeConfigured
});
function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Online card payments are not set up.");
  return key;
}
function form(values) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== void 0 && value !== "") body.append(key, String(value));
  return body;
}
async function stripe(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {},
      ...init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}
    },
    body: init.body,
    redirect: "error"
  });
  const json3 = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json3.error?.message || `Stripe request failed (${response.status}).`);
  return json3;
}
function sessionStatus(session) {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") return "captured";
  if (session.status === "expired") return "expired";
  return "pending";
}
function asString2(value) {
  return typeof value === "string" ? value : "";
}
async function createPaymentFunction2({ amount, currency, successUrl, cancelUrl, description, idempotencyKey, metadata, customerEmail, expiresAt }) {
  const cents2 = Math.round(Number(amount));
  if (!Number.isSafeInteger(cents2) || cents2 <= 0) throw new Error("Payment amount must be greater than zero.");
  const meta = metadata && typeof metadata === "object" ? metadata : {};
  const session = await stripe("/checkout/sessions", {
    method: "POST",
    idempotencyKey: asString2(idempotencyKey) || void 0,
    body: form({
      mode: "payment",
      // Unix seconds; Stripe accepts 30 minutes to 24 hours from now.
      expires_at: Number.isSafeInteger(expiresAt) ? Number(expiresAt) : void 0,
      success_url: asString2(successUrl),
      cancel_url: asString2(cancelUrl),
      .../^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asString2(customerEmail)) ? { customer_email: asString2(customerEmail) } : {},
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": asString2(currency || "usd").toLowerCase(),
      "line_items[0][price_data][unit_amount]": cents2,
      "line_items[0][price_data][product_data][name]": asString2(description) || "Deposit",
      ...Object.fromEntries(Object.entries(meta).map(([key, value]) => [`metadata[${key}]`, asString2(value)]))
    })
  });
  return { status: sessionStatus(session), id: session.id, url: session.url, data: { id: session.id, url: session.url, status: session.status, amount: session.amount_total, provider: "stripe" } };
}
async function getPaymentStatusFunction2({ paymentId }) {
  const session = await stripe(`/checkout/sessions/${encodeURIComponent(asString2(paymentId))}`);
  return { status: sessionStatus(session), amount: session.amount_total, data: { id: session.id, status: session.status, paymentStatus: session.payment_status, paymentIntent: session.payment_intent, amount: session.amount_total } };
}
async function capturePaymentFunction2(args) {
  return getPaymentStatusFunction2(args);
}
async function refundPaymentFunction2({ paymentId, amount, idempotencyKey }) {
  const session = await stripe(`/checkout/sessions/${encodeURIComponent(asString2(paymentId))}`);
  if (!session.payment_intent) throw new Error("This payment has nothing to refund.");
  const refund = await stripe("/refunds", {
    method: "POST",
    idempotencyKey: asString2(idempotencyKey) || void 0,
    body: form({ payment_intent: session.payment_intent, amount: amount == null ? void 0 : Math.round(Number(amount)) })
  });
  return { status: refund.status === "succeeded" ? "refunded" : refund.status, amount: refund.amount, data: refund };
}
async function handleWebhookFunction2() {
  throw new Error("Stripe payments are confirmed from the Checkout Session, not by webhook.");
}
var API, generatePaymentLinkFunction2;
var init_stripe = __esm({
  "features/integrations/payment/stripe.ts"() {
    "use strict";
    API = "https://api.stripe.com/v1";
    generatePaymentLinkFunction2 = createPaymentFunction2;
  }
});

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core21 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/models/User.ts
var import_core = require("@keystone-6/core");
var import_access = require("@keystone-6/core/access");
var import_fields = require("@keystone-6/core/fields");

// features/keystone/access.ts
function isSignedIn({ session }) {
  return Boolean(session);
}
var flag = (key) => ({ session }) => Boolean(session?.data.role?.[key]);
var permissions = {
  canManagePeople: flag("canManagePeople"),
  canManageRoles: flag("canManageRoles"),
  canManageBusiness: flag("canManageBusiness"),
  canManageClients: flag("canManageClients"),
  canManageAppointments: flag("canManageAppointments"),
  canManagePayments: flag("canManagePayments"),
  canViewEarnings: flag("canViewEarnings"),
  canReadPayments: ({ session }) => Boolean(session?.data.role?.canManagePayments || session?.data.role?.canViewEarnings)
};
var rules = {
  canReadPeople: ({ session }) => {
    if (!session) return false;
    if (session.data.role?.canSeeOtherPeople) return true;
    return { id: { equals: session.itemId } };
  },
  canUpdatePeople: ({ session }) => {
    if (!session) return false;
    if (session.data.role?.canEditOtherPeople) return true;
    return { id: { equals: session.itemId } };
  }
};

// features/keystone/models/User.ts
var User = (0, import_core.list)({
  access: {
    operation: {
      ...(0, import_access.allOperations)(isSignedIn),
      // Barbers create their own account; the Barber role is attached below, never chosen by the caller.
      create: () => true,
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ["name", "email", "role"]
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return "edit";
        if (session?.itemId === item?.id) return "edit";
        return "read";
      }
    }
  },
  hooks: {
    resolveInput: async ({ operation, resolvedData, context }) => {
      if (operation !== "create" || context.session?.data?.role?.canManagePeople) return resolvedData;
      const sudo = context.sudo();
      const found = (await sudo.db.Role.findMany({ where: { name: { equals: "Barber" } }, take: 1 }))[0];
      const role = found ?? await sudo.db.Role.createOne({ data: { name: "Barber", canAccessDashboard: true, canManageBusiness: true, canManageClients: true, canManageAppointments: true, canManagePayments: true, canViewEarnings: true } });
      return { ...resolvedData, role: { connect: { id: role.id } } };
    }
  },
  fields: {
    name: (0, import_fields.text)({
      validation: {
        isRequired: true
      }
    }),
    email: (0, import_fields.text)({
      isFilterable: false,
      isOrderable: false,
      isIndexed: "unique",
      validation: {
        isRequired: true
      }
    }),
    password: (0, import_fields.password)({
      access: {
        read: import_access.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      validation: { isRequired: true }
    }),
    role: (0, import_fields.relationship)({
      ref: "Role.assignedTo",
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople
      },
      ui: {
        itemView: {
          fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read"
        }
      }
    }),
    barberProfile: (0, import_fields.relationship)({ ref: "BarberProfile.owner", access: { create: () => false, update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    onboardingStatus: (0, import_fields.select)({
      type: "enum",
      options: [
        { label: "Not started", value: "not_started" },
        { label: "Done", value: "done" },
        { label: "Dismissed", value: "dismissed" }
      ],
      defaultValue: "not_started",
      access: { update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id }
    })
  }
});

// features/keystone/models/Role.ts
var import_core2 = require("@keystone-6/core");
var import_access3 = require("@keystone-6/core/access");
var import_fields2 = require("@keystone-6/core/fields");
var Role = (0, import_core2.list)({
  access: {
    operation: {
      ...(0, import_access3.allOperations)(permissions.canManageRoles),
      query: isSignedIn
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: { initialColumns: ["name", "assignedTo"] },
    itemView: { defaultFieldMode: (args) => permissions.canManageRoles(args) ? "edit" : "read" }
  },
  fields: {
    name: (0, import_fields2.text)({ validation: { isRequired: true } }),
    canSeeOtherPeople: (0, import_fields2.checkbox)({ defaultValue: false }),
    canEditOtherPeople: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManagePeople: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManageRoles: (0, import_fields2.checkbox)({ defaultValue: false }),
    canAccessDashboard: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManageBusiness: (0, import_fields2.checkbox)({ defaultValue: false, ui: { description: "Business profile, services, hours, time off, products, chair rental." } }),
    canManageClients: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManageAppointments: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManagePayments: (0, import_fields2.checkbox)({ defaultValue: false }),
    canViewEarnings: (0, import_fields2.checkbox)({ defaultValue: false }),
    assignedTo: (0, import_fields2.relationship)({ ref: "User.role", many: true, ui: { itemView: { fieldMode: "read" } } })
  }
});

// features/keystone/models/OAuthApp.ts
var import_core3 = require("@keystone-6/core");
var import_fields4 = require("@keystone-6/core/fields");

// features/keystone/models/trackingFields.ts
var import_fields3 = require("@keystone-6/core/fields");
var trackingFields = {
  createdAt: (0, import_fields3.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields3.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/mcp-oauth/core.ts
var import_node_crypto = __toESM(require("node:crypto"));
var MCP_SCOPES = ["mcp:read", "mcp:write"];
var MCP_ACCESS_PREFIX = "mcp_at_";
var ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
var REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1e3;
var CONSENT_TICKET_TTL_MS = 10 * 60 * 1e3;
var DEVELOPMENT_SECRET = "this secret should only be used in testing";
function secret() {
  return process.env.SESSION_SECRET || DEVELOPMENT_SECRET;
}
function randomToken(prefix, bytes = 32) {
  return `${prefix}${import_node_crypto.default.randomBytes(bytes).toString("base64url")}`;
}
function digestToken(token, purpose = "mcp-oauth-token") {
  return import_node_crypto.default.createHmac("sha256", secret()).update(`${purpose}\0${token}`, "utf8").digest("hex");
}
function bearerToken(header) {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(value);
  return match ? match[1] : null;
}
function isMcpAccessToken(token) {
  return typeof token === "string" && token.startsWith(MCP_ACCESS_PREFIX) && token.length > MCP_ACCESS_PREFIX.length;
}
function storedScopes(value) {
  return Array.isArray(value) ? MCP_SCOPES.filter((scope) => value.includes(scope)) : [];
}

// features/keystone/models/OAuthApp.ts
var OAuthApp = (0, import_core3.list)({
  access: {
    operation: {
      query: permissions.canManagePeople,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    }
  },
  fields: {
    name: (0, import_fields4.text)({
      validation: {
        isRequired: true
      }
    }),
    clientId: (0, import_fields4.text)({
      isIndexed: "unique",
      hooks: {
        resolveInput: ({ operation, resolvedData }) => {
          if (operation === "create" && !resolvedData.clientId) {
            return randomToken("mcp_cl_", 18);
          }
          return resolvedData.clientId;
        }
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Auto-generated unique identifier for your application."
      }
    }),
    clientSecret: (0, import_fields4.text)({
      access: {
        read: () => false
      },
      hooks: {
        resolveInput: ({ resolvedData }) => {
          if (resolvedData.clientSecret) {
            return digestToken(resolvedData.clientSecret, "oauth-client-secret");
          }
          return void 0;
        }
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" },
        description: "Stored only as a digest. Public MCP clients have no secret."
      }
    }),
    tokenEndpointAuthMethod: (0, import_fields4.select)({
      options: [
        { label: "Client secret (POST)", value: "client_secret_post" },
        { label: "Client secret (Basic)", value: "client_secret_basic" },
        { label: "None (public PKCE client)", value: "none" }
      ],
      defaultValue: "client_secret_post",
      ui: {
        description: "How the app authenticates at the token endpoint. MCP clients are public (none)."
      }
    }),
    redirectUris: (0, import_fields4.json)({
      defaultValue: [],
      ui: {
        description: "Array of allowed redirect URIs for OAuth callbacks"
      }
    }),
    scopes: (0, import_fields4.json)({
      defaultValue: [...MCP_SCOPES],
      ui: {
        description: "Array of allowed OAuth scopes. MCP scopes only narrow the signed-in user's own access."
      }
    }),
    webhookUrl: (0, import_fields4.text)({
      ui: {
        description: "URL to receive webhook notifications"
      }
    }),
    status: (0, import_fields4.select)({
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Pending", value: "pending" }
      ],
      defaultValue: "active"
    }),
    installUrl: (0, import_fields4.text)({
      ui: {
        description: "URL where users can install this app"
      }
    }),
    uninstallUrl: (0, import_fields4.text)({
      ui: {
        description: "URL to handle app uninstallation"
      }
    }),
    description: (0, import_fields4.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    metadata: (0, import_fields4.json)({
      defaultValue: {},
      ui: {
        description: "Additional app-specific configuration and settings"
      }
    }),
    developerEmail: (0, import_fields4.text)(),
    privacyPolicyUrl: (0, import_fields4.text)(),
    termsOfServiceUrl: (0, import_fields4.text)(),
    supportUrl: (0, import_fields4.text)(),
    ...trackingFields
  },
  ui: {
    labelField: "name",
    listView: {
      initialColumns: ["name", "clientId", "status", "createdAt"]
    }
  }
});

// features/keystone/models/OAuthToken.ts
var import_core5 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");
var digestTokenInput = {
  resolveInput: ({ resolvedData, fieldKey }) => resolvedData[fieldKey] ? digestToken(resolvedData[fieldKey]) : resolvedData[fieldKey]
};
var OAuthToken = (0, import_core5.list)({
  access: {
    operation: {
      query: permissions.canManagePeople,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    }
  },
  fields: {
    tokenType: (0, import_fields5.select)({
      options: [
        { label: "Authorization Code", value: "authorization_code" },
        { label: "Access Token", value: "access_token" },
        { label: "Refresh Token", value: "refresh_token" }
      ],
      validation: {
        isRequired: true
      }
    }),
    token: (0, import_fields5.text)({
      access: { read: () => false },
      validation: {
        isRequired: true
      },
      isIndexed: "unique",
      hooks: digestTokenInput
    }),
    clientId: (0, import_fields5.text)({
      validation: {
        isRequired: true
      },
      isIndexed: true
    }),
    user: (0, import_fields5.relationship)({
      ref: "User",
      ui: {
        description: "The user who authorized this token"
      }
    }),
    scopes: (0, import_fields5.json)({
      defaultValue: [],
      ui: {
        description: "Array of granted scopes"
      }
    }),
    redirectUri: (0, import_fields5.text)({
      ui: {
        description: "The redirect URI used during authorization"
      }
    }),
    resource: (0, import_fields5.text)({
      ui: {
        description: "The MCP endpoint (RFC 8707 resource) this grant is for"
      }
    }),
    expiresAt: (0, import_fields5.timestamp)({
      ui: {
        description: "When this token expires"
      }
    }),
    isRevoked: (0, import_fields5.select)({
      options: [
        { label: "Active", value: "false" },
        { label: "Revoked", value: "true" }
      ],
      defaultValue: "false"
    }),
    authorizationCode: (0, import_fields5.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "The authorization code that was exchanged for this token (for access tokens)"
      }
    }),
    refreshToken: (0, import_fields5.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "Associated refresh token (for access tokens)"
      }
    }),
    accessToken: (0, import_fields5.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "Associated access token (for refresh tokens)"
      }
    }),
    state: (0, import_fields5.text)({
      ui: {
        description: "OAuth state parameter for CSRF protection"
      }
    }),
    codeChallenge: (0, import_fields5.text)({
      ui: {
        description: "PKCE code challenge"
      }
    }),
    codeChallengeMethod: (0, import_fields5.select)({
      options: [
        { label: "Plain", value: "plain" },
        { label: "SHA256", value: "S256" }
      ],
      ui: {
        description: "PKCE code challenge method"
      }
    }),
    ...trackingFields
  },
  ui: {
    labelField: "clientId",
    listView: {
      initialColumns: ["tokenType", "clientId", "user", "scopes", "expiresAt", "isRevoked"]
    }
  }
});

// features/keystone/models/BarberProfile.ts
var import_core7 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");

// features/keystone/utils/ownership.ts
function ownProfileFilter({ session }) {
  if (!session) return false;
  return { profile: { owner: { id: { equals: session.itemId } } } };
}
function ownerFilter({ session }) {
  if (!session) return false;
  return { owner: { id: { equals: session.itemId } } };
}
async function attachOwnProfile({ operation, resolvedData, context }) {
  if (operation !== "create") return resolvedData;
  const userId = context.session?.itemId;
  if (!userId) throw new Error("Sign in first.");
  const [profile] = await context.sudo().query.BarberProfile.findMany({ where: { owner: { id: { equals: userId } } }, take: 1, query: "id" });
  if (!profile) throw new Error("Set up your business first.");
  return { ...resolvedData, profile: { connect: { id: profile.id } } };
}

// features/keystone/models/BarberProfile.ts
var BarberProfile = (0, import_core7.list)({
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: () => false,
      update: permissions.canManageBusiness,
      delete: () => false
    },
    filter: { query: ownerFilter, update: ownerFilter }
  },
  ui: { listView: { initialColumns: ["businessName", "slug", "timezone", "bookingOpen"] } },
  fields: {
    owner: (0, import_fields6.relationship)({ ref: "User.barberProfile", access: { create: () => false, update: () => false } }),
    businessName: (0, import_fields6.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields6.text)({
      isIndexed: "unique",
      validation: { isRequired: true, match: { regex: /^[a-z0-9][a-z0-9-]{1,40}$/, explanation: "Use lowercase letters, numbers and hyphens (2 to 41 characters)." } },
      ui: { description: "Your booking page address: /book/<this>." }
    }),
    bio: (0, import_fields6.text)({ ui: { displayMode: "textarea" } }),
    photoPath: (0, import_fields6.text)({ ui: { description: "Photo on your booking page: an image address, e.g. /images/barber/barber-at-work.webp or https://\u2026" } }),
    phone: (0, import_fields6.text)(),
    email: (0, import_fields6.text)(),
    location: (0, import_fields6.text)({ ui: { description: "Where clients find you: shop, booth, or mobile area." } }),
    timezone: (0, import_fields6.text)({ defaultValue: "America/New_York", validation: { isRequired: true } }),
    currencyCode: (0, import_fields6.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    bookingOpen: (0, import_fields6.checkbox)({ defaultValue: true, ui: { description: "Clients can book from your page." } }),
    slotMinutes: (0, import_fields6.integer)({ defaultValue: 15, validation: { isRequired: true, min: 5, max: 120 } }),
    bufferMinutes: (0, import_fields6.integer)({ defaultValue: 10, validation: { isRequired: true, min: 0, max: 120 }, ui: { description: "Clean-up time after each client." } }),
    minNoticeHours: (0, import_fields6.integer)({ defaultValue: 2, validation: { isRequired: true, min: 0, max: 720 } }),
    maxAdvanceDays: (0, import_fields6.integer)({ defaultValue: 60, validation: { isRequired: true, min: 1, max: 365 } }),
    cancellationWindowHours: (0, import_fields6.integer)({ defaultValue: 24, validation: { isRequired: true, min: 0, max: 720 } }),
    // Fresha lets salons pick 1 to 72 hours; Square and Booksy take the deposit at booking. 6 hours frees a prime slot the same day.
    unpaidHoldHours: (0, import_fields6.integer)({
      label: "Hold unpaid bookings for",
      defaultValue: 6,
      validation: { isRequired: true, min: 1, max: 72 },
      ui: { description: "Hours an online booking waiting for its deposit keeps its time (1 to 72). After that it is cancelled and the time opens for other clients." }
    }),
    noShowFeeCents: (0, import_fields6.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    workStyle: (0, import_fields6.select)({
      type: "enum",
      options: [
        { label: "Own space", value: "own_space" },
        { label: "Rent a chair", value: "chair_rental" },
        { label: "Mobile", value: "mobile" }
      ],
      defaultValue: "own_space",
      validation: { isRequired: true }
    }),
    services: (0, import_fields6.relationship)({ ref: "Service.profile", many: true, access: { create: () => false, update: () => false } }),
    weeklyHours: (0, import_fields6.relationship)({ ref: "WeeklyHours.profile", many: true, access: { create: () => false, update: () => false } }),
    timeOff: (0, import_fields6.relationship)({ ref: "TimeOff.profile", many: true, access: { create: () => false, update: () => false } }),
    clients: (0, import_fields6.relationship)({ ref: "Client.profile", many: true, access: { create: () => false, update: () => false } }),
    appointments: (0, import_fields6.relationship)({ ref: "Appointment.profile", many: true, access: { create: () => false, update: () => false } }),
    clientNotes: (0, import_fields6.relationship)({ ref: "ClientNote.profile", many: true, access: { create: () => false, update: () => false } }),
    products: (0, import_fields6.relationship)({ ref: "Product.profile", many: true, access: { create: () => false, update: () => false } }),
    productSales: (0, import_fields6.relationship)({ ref: "ProductSale.profile", many: true, access: { create: () => false, update: () => false } }),
    payments: (0, import_fields6.relationship)({ ref: "Payment.profile", many: true, access: { create: () => false, update: () => false } }),
    paymentProviders: (0, import_fields6.relationship)({ ref: "PaymentProvider.profile", many: true, access: { create: () => false, update: () => false } }),
    paymentSessions: (0, import_fields6.relationship)({ ref: "PaymentSession.profile", many: true, access: { create: () => false, update: () => false } }),
    chairRentals: (0, import_fields6.relationship)({ ref: "ChairRental.profile", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/Service.ts
var import_core8 = require("@keystone-6/core");
var import_fields7 = require("@keystone-6/core/fields");
var Service = (0, import_core8.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: permissions.canManageBusiness,
      update: permissions.canManageBusiness,
      delete: permissions.canManageBusiness
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["name", "priceCents", "durationMinutes", "active"] } },
  fields: {
    profile: (0, import_fields7.relationship)({ ref: "BarberProfile.services", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    name: (0, import_fields7.text)({ validation: { isRequired: true } }),
    description: (0, import_fields7.text)({ ui: { displayMode: "textarea" } }),
    photoPath: (0, import_fields7.text)({ ui: { description: "Photo shown with this service: an image address, e.g. /images/barber/clipper-fade.webp or https://\u2026" } }),
    priceCents: (0, import_fields7.integer)({ validation: { isRequired: true, min: 0 }, ui: { description: "Price in cents." } }),
    durationMinutes: (0, import_fields7.integer)({ defaultValue: 30, validation: { isRequired: true, min: 5, max: 600 } }),
    depositCents: (0, import_fields7.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 }, ui: { description: "Paid online to hold the slot. 0 means pay at the chair." } }),
    active: (0, import_fields7.checkbox)({ defaultValue: true }),
    sortOrder: (0, import_fields7.integer)({ defaultValue: 0, validation: { isRequired: true } }),
    appointments: (0, import_fields7.relationship)({ ref: "Appointment.service", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/WeeklyHours.ts
var import_core9 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");
var WeeklyHours = (0, import_core9.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: permissions.canManageBusiness,
      update: permissions.canManageBusiness,
      delete: permissions.canManageBusiness
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  graphql: { plural: "WeeklyHoursRows" },
  ui: { listView: { initialColumns: ["dayOfWeek", "startMinute", "endMinute", "isWorking"] } },
  fields: {
    profile: (0, import_fields8.relationship)({ ref: "BarberProfile.weeklyHours", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    dayOfWeek: (0, import_fields8.select)({
      type: "enum",
      options: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
      validation: { isRequired: true }
    }),
    isWorking: (0, import_fields8.checkbox)({ defaultValue: true }),
    startMinute: (0, import_fields8.integer)({ defaultValue: 540, validation: { isRequired: true, min: 0, max: 1439 }, ui: { description: "Minutes after midnight (540 = 9:00 AM)." } }),
    endMinute: (0, import_fields8.integer)({ defaultValue: 1020, validation: { isRequired: true, min: 1, max: 1440 }, ui: { description: "Minutes after midnight (1020 = 5:00 PM)." } }),
    breakStartMinute: (0, import_fields8.integer)({ validation: { min: 0, max: 1439 } }),
    breakEndMinute: (0, import_fields8.integer)({ validation: { min: 1, max: 1440 } }),
    ...trackingFields
  }
});

// features/keystone/models/TimeOff.ts
var import_core10 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");
var TimeOff = (0, import_core10.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: permissions.canManageBusiness,
      update: permissions.canManageBusiness,
      delete: permissions.canManageBusiness
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["startsAt", "endsAt", "reason"] } },
  fields: {
    profile: (0, import_fields9.relationship)({ ref: "BarberProfile.timeOff", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    startsAt: (0, import_fields9.timestamp)({ validation: { isRequired: true } }),
    endsAt: (0, import_fields9.timestamp)({ validation: { isRequired: true } }),
    reason: (0, import_fields9.text)(),
    ...trackingFields
  }
});

// features/keystone/models/Client.ts
var import_core11 = require("@keystone-6/core");
var import_fields10 = require("@keystone-6/core/fields");
var Client = (0, import_core11.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageClients,
      create: permissions.canManageClients,
      update: permissions.canManageClients,
      delete: permissions.canManageClients
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["fullName", "phone", "email", "lastVisitAt"] } },
  fields: {
    profile: (0, import_fields10.relationship)({ ref: "BarberProfile.clients", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    firstName: (0, import_fields10.text)({ validation: { isRequired: true } }),
    lastName: (0, import_fields10.text)(),
    phone: (0, import_fields10.text)(),
    email: (0, import_fields10.text)(),
    status: (0, import_fields10.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "VIP", value: "vip" },
        { label: "Blocked", value: "blocked" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    preferences: (0, import_fields10.text)({ ui: { displayMode: "textarea", description: "Cut, guard numbers, products, anything to remember next time." } }),
    lastVisitAt: (0, import_fields10.timestamp)(),
    fullName: (0, import_fields10.virtual)({
      field: import_core11.graphql.field({
        type: import_core11.graphql.String,
        resolve: (item) => [item.firstName, item.lastName].filter(Boolean).join(" ")
      })
    }),
    notes: (0, import_fields10.relationship)({ ref: "ClientNote.client", many: true, access: { create: () => false, update: () => false } }),
    appointments: (0, import_fields10.relationship)({ ref: "Appointment.client", many: true, access: { create: () => false, update: () => false } }),
    productSales: (0, import_fields10.relationship)({ ref: "ProductSale.client", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/ClientNote.ts
var import_core12 = require("@keystone-6/core");
var import_fields11 = require("@keystone-6/core/fields");
var ClientNote = (0, import_core12.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageClients,
      create: permissions.canManageClients,
      update: permissions.canManageClients,
      delete: permissions.canManageClients
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["client", "body", "createdAt"] } },
  fields: {
    profile: (0, import_fields11.relationship)({ ref: "BarberProfile.clientNotes", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    client: (0, import_fields11.relationship)({ ref: "Client.notes" }),
    appointment: (0, import_fields11.relationship)({ ref: "Appointment.notes" }),
    body: (0, import_fields11.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/Appointment.ts
var import_core13 = require("@keystone-6/core");
var import_fields12 = require("@keystone-6/core/fields");
var Appointment = (0, import_core13.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageAppointments,
      create: permissions.canManageAppointments,
      update: permissions.canManageAppointments,
      delete: permissions.canManageAppointments
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["client", "service", "startsAt", "status", "paymentStatus"] } },
  fields: {
    profile: (0, import_fields12.relationship)({ ref: "BarberProfile.appointments", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    client: (0, import_fields12.relationship)({ ref: "Client.appointments" }),
    service: (0, import_fields12.relationship)({ ref: "Service.appointments" }),
    startsAt: (0, import_fields12.timestamp)({ validation: { isRequired: true } }),
    endsAt: (0, import_fields12.timestamp)(),
    serviceNameSnapshot: (0, import_fields12.text)({ access: { update: () => false } }),
    priceCents: (0, import_fields12.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 }, ui: { description: "Price in cents, copied from the service when booked." } }),
    depositCents: (0, import_fields12.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 }, access: { update: () => false } }),
    status: (0, import_fields12.select)({
      type: "enum",
      options: [
        { label: "Requested", value: "requested" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "No-show", value: "no_show" }
      ],
      defaultValue: "confirmed",
      validation: { isRequired: true }
    }),
    source: (0, import_fields12.select)({
      type: "enum",
      options: [
        { label: "Booking page", value: "online" },
        { label: "Phone or text", value: "phone" },
        { label: "Walk-in", value: "walk_in" }
      ],
      defaultValue: "phone",
      validation: { isRequired: true }
    }),
    paymentStatus: (0, import_fields12.select)({
      access: { create: () => false, update: () => false },
      type: "enum",
      options: [
        { label: "Unpaid", value: "unpaid" },
        { label: "Deposit paid", value: "deposit_paid" },
        { label: "Paid", value: "paid" },
        { label: "Refunded", value: "refunded" }
      ],
      defaultValue: "unpaid",
      validation: { isRequired: true }
    }),
    clientNotes: (0, import_fields12.text)({ ui: { displayMode: "textarea", description: "What the client asked for when booking." } }),
    internalNotes: (0, import_fields12.text)({ ui: { displayMode: "textarea" } }),
    cancellationReason: (0, import_fields12.text)(),
    publicAccessTokenHash: (0, import_fields12.text)({
      access: { read: () => false, create: () => false, update: () => false },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    notes: (0, import_fields12.relationship)({ ref: "ClientNote.appointment", many: true, access: { create: () => false, update: () => false } }),
    productSales: (0, import_fields12.relationship)({ ref: "ProductSale.appointment", many: true, access: { create: () => false, update: () => false } }),
    payments: (0, import_fields12.relationship)({ ref: "Payment.appointment", many: true, access: { create: () => false, update: () => false } }),
    paymentSessions: (0, import_fields12.relationship)({ ref: "PaymentSession.appointment", many: true, access: { create: () => false, update: () => false } }),
    summary: (0, import_fields12.virtual)({
      field: import_core13.graphql.field({
        type: import_core13.graphql.String,
        resolve: (item) => `${item.serviceNameSnapshot || "Appointment"}`
      })
    }),
    ...trackingFields
  }
});

// features/keystone/models/Product.ts
var import_core14 = require("@keystone-6/core");
var import_fields13 = require("@keystone-6/core/fields");
var Product = (0, import_core14.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: permissions.canManageBusiness,
      update: permissions.canManageBusiness,
      delete: permissions.canManageBusiness
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["name", "priceCents", "stock", "active"] } },
  fields: {
    profile: (0, import_fields13.relationship)({ ref: "BarberProfile.products", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    name: (0, import_fields13.text)({ validation: { isRequired: true } }),
    priceCents: (0, import_fields13.integer)({ validation: { isRequired: true, min: 0 } }),
    stock: (0, import_fields13.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    active: (0, import_fields13.checkbox)({ defaultValue: true }),
    sales: (0, import_fields13.relationship)({ ref: "ProductSale.product", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/ProductSale.ts
var import_core15 = require("@keystone-6/core");
var import_fields14 = require("@keystone-6/core/fields");
var ProductSale = (0, import_core15.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManagePayments,
      create: permissions.canManagePayments,
      update: permissions.canManagePayments,
      delete: permissions.canManagePayments
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["product", "quantity", "totalCents", "createdAt"] } },
  fields: {
    profile: (0, import_fields14.relationship)({ ref: "BarberProfile.productSales", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    product: (0, import_fields14.relationship)({ ref: "Product.sales" }),
    client: (0, import_fields14.relationship)({ ref: "Client.productSales" }),
    appointment: (0, import_fields14.relationship)({ ref: "Appointment.productSales" }),
    productNameSnapshot: (0, import_fields14.text)(),
    quantity: (0, import_fields14.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 } }),
    unitPriceCents: (0, import_fields14.integer)({ validation: { isRequired: true, min: 0 } }),
    totalCents: (0, import_fields14.integer)({ validation: { isRequired: true, min: 0 } }),
    ...trackingFields
  }
});

// features/keystone/models/Payment.ts
var import_core16 = require("@keystone-6/core");
var import_fields15 = require("@keystone-6/core/fields");
var Payment = (0, import_core16.list)({
  access: {
    operation: {
      query: permissions.canReadPayments,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["appointment", "method", "amountCents", "tipCents", "status", "paidAt"] } },
  fields: {
    profile: (0, import_fields15.relationship)({ ref: "BarberProfile.payments" }),
    appointment: (0, import_fields15.relationship)({ ref: "Appointment.payments" }),
    method: (0, import_fields15.select)({
      type: "enum",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Card (reader or app)", value: "card" },
        { label: "Zelle / Venmo / Cash App", value: "transfer" },
        { label: "Online (Stripe)", value: "stripe" }
      ],
      defaultValue: "cash",
      validation: { isRequired: true }
    }),
    kind: (0, import_fields15.select)({
      type: "enum",
      options: [
        { label: "Deposit", value: "deposit" },
        { label: "Service", value: "service" },
        { label: "Refund", value: "refund" },
        { label: "No-show fee", value: "no_show_fee" }
      ],
      defaultValue: "service",
      validation: { isRequired: true }
    }),
    status: (0, import_fields15.select)({
      type: "enum",
      options: [{ label: "Paid", value: "paid" }, { label: "Refunded", value: "refunded" }],
      defaultValue: "paid",
      validation: { isRequired: true }
    }),
    amountCents: (0, import_fields15.integer)({ validation: { isRequired: true, min: 0 }, ui: { description: "Service and product amount, tip not included." } }),
    tipCents: (0, import_fields15.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    productsCents: (0, import_fields15.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    providerReference: (0, import_fields15.text)({ ui: { description: "Stripe Checkout Session id for online payments." } }),
    paidAt: (0, import_fields15.timestamp)({ defaultValue: { kind: "now" } }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentProvider.ts
var import_core17 = require("@keystone-6/core");
var import_fields16 = require("@keystone-6/core/fields");
var adapter = { validation: { isRequired: true }, defaultValue: "manual", ui: { description: "Name of the payment adapter this operation uses." } };
var PaymentProvider = (0, import_core17.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canReadPayments,
      create: permissions.canManagePayments,
      update: permissions.canManagePayments,
      delete: permissions.canManagePayments
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["name", "code", "isInstalled"] } },
  fields: {
    profile: (0, import_fields16.relationship)({ ref: "BarberProfile.paymentProviders", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    name: (0, import_fields16.text)({ validation: { isRequired: true } }),
    code: (0, import_fields16.text)({
      validation: { isRequired: true, match: { regex: /^pp_(manual|stripe)$/, explanation: "Provider code is pp_manual or pp_stripe." } }
    }),
    isInstalled: (0, import_fields16.checkbox)({ defaultValue: true }),
    createPaymentFunction: (0, import_fields16.text)(adapter),
    capturePaymentFunction: (0, import_fields16.text)(adapter),
    refundPaymentFunction: (0, import_fields16.text)(adapter),
    getPaymentStatusFunction: (0, import_fields16.text)(adapter),
    generatePaymentLinkFunction: (0, import_fields16.text)(adapter),
    handleWebhookFunction: (0, import_fields16.text)(adapter),
    paymentSessions: (0, import_fields16.relationship)({ ref: "PaymentSession.paymentProvider", many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentSession.ts
var import_core18 = require("@keystone-6/core");
var import_fields17 = require("@keystone-6/core/fields");
var PaymentSession = (0, import_core18.list)({
  access: {
    operation: {
      query: permissions.canReadPayments,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["appointment", "status", "amountCents", "expiresAt"] } },
  fields: {
    profile: (0, import_fields17.relationship)({ ref: "BarberProfile.paymentSessions" }),
    appointment: (0, import_fields17.relationship)({ ref: "Appointment.paymentSessions" }),
    paymentProvider: (0, import_fields17.relationship)({ ref: "PaymentProvider.paymentSessions" }),
    status: (0, import_fields17.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Captured", value: "captured" },
        { label: "Expired", value: "expired" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    amountCents: (0, import_fields17.integer)({ validation: { isRequired: true, min: 0 } }),
    currencyCode: (0, import_fields17.text)({ defaultValue: "USD" }),
    providerPaymentId: (0, import_fields17.text)(),
    expiresAt: (0, import_fields17.timestamp)(),
    capturedAt: (0, import_fields17.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/ChairRental.ts
var import_core19 = require("@keystone-6/core");
var import_fields18 = require("@keystone-6/core/fields");
var ChairRental = (0, import_core19.list)({
  hooks: { resolveInput: attachOwnProfile },
  access: {
    operation: {
      query: permissions.canManageBusiness,
      create: permissions.canManageBusiness,
      update: permissions.canManageBusiness,
      delete: permissions.canManageBusiness
    },
    filter: { query: ownProfileFilter, update: ownProfileFilter, delete: ownProfileFilter }
  },
  ui: { listView: { initialColumns: ["hostName", "rentCents", "period", "status"] } },
  fields: {
    profile: (0, import_fields18.relationship)({ ref: "BarberProfile.chairRentals", db: { foreignKey: true, extendPrismaSchema: (schema) => schema.replaceAll("?", "") }, access: { create: () => false, update: () => false } }),
    hostName: (0, import_fields18.text)({ validation: { isRequired: true }, ui: { description: "The shop or owner you rent from." } }),
    hostContact: (0, import_fields18.text)(),
    rentCents: (0, import_fields18.integer)({ validation: { isRequired: true, min: 0 } }),
    period: (0, import_fields18.select)({
      type: "enum",
      options: [{ label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }],
      defaultValue: "weekly",
      validation: { isRequired: true }
    }),
    startsOn: (0, import_fields18.timestamp)(),
    endsOn: (0, import_fields18.timestamp)(),
    status: (0, import_fields18.select)({
      type: "enum",
      options: [{ label: "Active", value: "active" }, { label: "Ended", value: "ended" }],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    terms: (0, import_fields18.text)({ ui: { displayMode: "textarea", description: "Days, hours, supplies, notice to leave." } }),
    ...trackingFields
  }
});

// features/keystone/models/index.ts
var models = {
  User,
  Role,
  OAuthApp,
  OAuthToken,
  BarberProfile,
  Service,
  WeeklyHours,
  TimeOff,
  Client,
  ClientNote,
  Appointment,
  Product,
  ProductSale,
  Payment,
  PaymentProvider,
  PaymentSession,
  ChairRental
};

// features/keystone/index.ts
var import_session = require("@keystone-6/core/session");

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/utils/business.ts
var CommandError = class extends Error {
};
var ok = (data) => ({ success: true, error: null, data });
var fail = (error) => ({
  success: false,
  error: error instanceof CommandError ? error.message : "This could not be completed. Try again.",
  data: null
});
async function requireOwnProfile(db, session, permission) {
  if (!session) throw new CommandError("Sign in first.");
  if (!session.data.role?.[permission]) throw new CommandError("Your role does not allow this.");
  const profile = await db.barberProfile.findFirst({ where: { ownerId: session.itemId } });
  if (!profile) throw new CommandError("Set up your business first.");
  return profile;
}

// features/keystone/utils/commands.ts
var import_node_crypto3 = require("node:crypto");

// features/integrations/payment/index.ts
var paymentProviderAdapters = {
  manual: {
    load: () => Promise.resolve().then(() => (init_manual(), manual_exports)),
    settlement: "offline",
    allowsPublicSettlement: false
  },
  // Online deposits through Stripe Checkout. Secret key: STRIPE_SECRET_KEY.
  stripe: {
    load: () => Promise.resolve().then(() => (init_stripe(), stripe_exports)),
    settlement: "processor",
    allowsPublicSettlement: true
  }
};
function isPaymentProviderAdapterCode(value) {
  return Object.prototype.hasOwnProperty.call(paymentProviderAdapters, value);
}
function getPaymentProviderRegistration(code) {
  return isPaymentProviderAdapterCode(code) ? paymentProviderAdapters[code] : null;
}

// features/keystone/utils/paymentProviderAdapter.ts
function adapterCodeForProvider(provider) {
  const code = provider.code.replace(/^pp_/, "");
  const registration = getPaymentProviderRegistration(code);
  if (!registration) {
    throw new Error(`Payment adapter ${code || provider.code} is not registered.`);
  }
  return code;
}
async function executeAdapterFunction({ provider, functionName, args }) {
  const adapterCode = adapterCodeForProvider(provider);
  const configuredSelector = provider[functionName];
  if (typeof configuredSelector === "string" && configuredSelector !== adapterCode) {
    throw new Error(`Payment adapter selector for ${functionName} is not registered for ${adapterCode}.`);
  }
  const registration = getPaymentProviderRegistration(adapterCode);
  if (!registration) throw new Error(`Payment adapter ${adapterCode} is not registered.`);
  const adapter2 = await registration.load();
  const fn = adapter2[functionName];
  if (!fn) {
    throw new Error(`Function ${functionName} is not available in payment adapter ${adapterCode}.`);
  }
  try {
    return await fn({ provider: { code: provider.code }, ...args });
  } catch (error) {
    throw new Error(
      `Error executing ${functionName} for payment adapter ${adapterCode}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
async function createPayment({ provider, ...args }) {
  return executeAdapterFunction({ provider, functionName: "createPaymentFunction", args });
}
async function refundPayment({ provider, ...args }) {
  return executeAdapterFunction({ provider, functionName: "refundPaymentFunction", args });
}
async function getPaymentStatus({ provider, ...args }) {
  return executeAdapterFunction({ provider, functionName: "getPaymentStatusFunction", args });
}

// features/shared/trusted-origin.ts
function trustedOrigin(env = process.env) {
  const configured = env.APP_ORIGIN || env.NEXT_PUBLIC_APP_URL || (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : "");
  if (configured) {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("APP_ORIGIN must be an HTTP(S) origin without credentials or path.");
    if (env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("APP_ORIGIN must use HTTPS in production.");
    return url.origin;
  }
  if (env.NODE_ENV === "production") throw new Error("Set APP_ORIGIN (or RAILWAY_PUBLIC_DOMAIN) before starting production.");
  const port = env.PORT || "3000";
  if (!/^\d{1,5}$/.test(port)) throw new Error("Invalid local application port.");
  return `http://127.0.0.1:${port}`;
}

// features/shared/business-time.ts
function businessDateParts(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}
function businessDateKey(value, timeZone) {
  const p = businessDateParts(value, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}
function businessWallTime(date, minute, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 0, minute);
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const p = businessDateParts(new Date(instant), timeZone);
    const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    const delta = target - represented;
    if (!delta) return new Date(instant);
    instant += delta;
  }
  throw new Error("This local time does not exist in your timezone. Choose another time.");
}
function businessDayRange(value, timeZone) {
  const key = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : businessDateKey(value, timeZone);
  const next = /* @__PURE__ */ new Date(`${key}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { start: businessWallTime(key, 0, timeZone), end: businessWallTime(next.toISOString().slice(0, 10), 0, timeZone) };
}

// features/keystone/utils/availability.ts
var DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function dayOfWeekFor(date) {
  return DAYS[(/* @__PURE__ */ new Date(`${date}T12:00:00Z`)).getUTCDay()];
}
function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN((/* @__PURE__ */ new Date(`${value}T12:00:00Z`)).getTime());
}
function openSlots(input) {
  const { hours, date, timeZone, duration } = input;
  const now = input.now ?? /* @__PURE__ */ new Date();
  if (!hours?.isWorking) return [];
  const start = hours.startMinute ?? 540;
  const end = hours.endMinute ?? 1020;
  const step = Math.max(5, input.slotMinutes);
  const earliest = now.getTime() + input.minNoticeHours * 36e5;
  const latest = now.getTime() + input.maxAdvanceDays * 864e5;
  const out = [];
  for (let minute = start; minute + duration <= end; minute += step) {
    const breaks = typeof hours.breakStartMinute === "number" && typeof hours.breakEndMinute === "number" && minute < hours.breakEndMinute && hours.breakStartMinute < minute + duration;
    if (breaks) continue;
    let begins;
    try {
      begins = businessWallTime(date, minute, timeZone);
    } catch {
      continue;
    }
    if (begins.getTime() < earliest || begins.getTime() > latest) continue;
    const finishes = new Date(begins.getTime() + duration * 6e4);
    const clash = input.busy.some((b) => begins < new Date(b.endsAt.getTime() + input.bufferMinutes * 6e4) && b.startsAt < new Date(finishes.getTime() + input.bufferMinutes * 6e4));
    if (!clash) out.push(begins.toISOString());
  }
  return out;
}

// features/keystone/utils/publicAccessToken.ts
var import_node_crypto2 = require("node:crypto");
function hashPublicAccessToken(token) {
  return (0, import_node_crypto2.createHash)("sha256").update(token, "utf8").digest("hex");
}
function createPublicAccessToken() {
  const token = (0, import_node_crypto2.randomBytes)(32).toString("base64url");
  return { token, hash: hashPublicAccessToken(token) };
}
function publicAccessTokenMatches(token, expectedHash) {
  if (!token || !expectedHash) return false;
  const supplied = Buffer.from(hashPublicAccessToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && (0, import_node_crypto2.timingSafeEqual)(supplied, expected);
}

// features/keystone/utils/commands.ts
var OPEN = ["requested", "confirmed"];
var UNPAID_HOLD = { status: "requested", paymentStatus: "unpaid", source: "online", depositCents: { gt: 0 } };
var holdCutoff = (holdHours, now = Date.now()) => new Date(now - holdHours * 36e5);
var holdEndsAt = (createdAt, holdHours) => new Date(createdAt.getTime() + holdHours * 36e5);
async function releaseUnpaidHolds(prisma, profileId, appointmentId) {
  const profile = await prisma.barberProfile.findUnique({ where: { id: profileId }, select: { unpaidHoldHours: true } });
  if (!profile) return 0;
  const stale = await prisma.appointment.findMany({
    where: { profileId, ...UNPAID_HOLD, createdAt: { lt: holdCutoff(profile.unpaidHoldHours) }, ...appointmentId ? { id: appointmentId } : {} },
    select: { id: true, profileId: true, status: true, paymentStatus: true },
    take: 50
  });
  let released = 0;
  for (const a of stale) {
    if ((await settleDeposit(prisma, a).catch(() => ({ paid: false }))).paid) continue;
    const done = await prisma.appointment.updateMany({
      where: { id: a.id, ...UNPAID_HOLD },
      data: { status: "cancelled", cancellationReason: `Deposit not paid within ${profile.unpaidHoldHours} hours; time released` }
    });
    if (!done.count) continue;
    released++;
    await prisma.paymentSession.updateMany({ where: { appointmentId: a.id, status: "pending" }, data: { status: "expired" } });
  }
  return released;
}
async function publicSlots(db, slug, serviceId, date) {
  if (!isDateKey(date)) throw new CommandError("Choose a valid date.");
  const profile = await db.barberProfile.findUnique({ where: { slug } });
  if (!profile || !profile.bookingOpen) throw new CommandError("Online booking is closed.");
  const service = await db.service.findFirst({ where: { id: serviceId, profileId: profile.id, active: true } });
  if (!service) throw new CommandError("Choose a service.");
  const { start, end } = businessDayRange(date, profile.timezone);
  const [hours, appointments, off] = await Promise.all([
    db.weeklyHours.findFirst({ where: { profileId: profile.id, dayOfWeek: dayOfWeekFor(date) } }),
    // An appointment added by hand without an end time blocks its service length (30 minutes with no service).
    // An online booking whose deposit is past the hold no longer blocks its time, even before it is released.
    db.appointment.findMany({ where: { profileId: profile.id, status: { in: [...OPEN] }, NOT: { ...UNPAID_HOLD, createdAt: { lt: holdCutoff(profile.unpaidHoldHours) } }, startsAt: { lt: end }, OR: [{ endsAt: { gt: start } }, { endsAt: null, startsAt: { gt: new Date(start.getTime() - 864e5) } }] }, select: { startsAt: true, endsAt: true, service: { select: { durationMinutes: true } } } }).then((rows) => rows.map((row) => ({ startsAt: row.startsAt, endsAt: row.endsAt ?? new Date(row.startsAt.getTime() + (row.service?.durationMinutes ?? 30) * 6e4) }))),
    db.timeOff.findMany({ where: { profileId: profile.id, startsAt: { lt: end }, endsAt: { gt: start } }, select: { startsAt: true, endsAt: true } })
  ]);
  const busy = [...appointments, ...off].filter((row) => Boolean(row.startsAt && row.endsAt));
  return openSlots({
    date,
    timeZone: profile.timezone,
    hours: hours ?? void 0,
    duration: service.durationMinutes ?? 30,
    slotMinutes: profile.slotMinutes ?? 15,
    bufferMinutes: profile.bufferMinutes ?? 0,
    minNoticeHours: profile.minNoticeHours ?? 0,
    maxAdvanceDays: profile.maxAdvanceDays ?? 60,
    busy
  });
}
function cleanGuest(guest) {
  const name = guest.name.trim().slice(0, 120);
  const phone = guest.phone.trim().slice(0, 40);
  const email = guest.email.trim().toLowerCase().slice(0, 200);
  if (!name) throw new CommandError("Enter your name.");
  if (!phone && !email) throw new CommandError("Enter a phone number or an email so your barber can reach you.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CommandError("Enter a valid email.");
  return { name, phone, email, notes: guest.notes.trim().slice(0, 500) };
}
async function bookAppointment(prisma, input) {
  const guest = cleanGuest(input.guest);
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new CommandError("Choose a time.");
  const access = createPublicAccessToken();
  const owner = await prisma.barberProfile.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (owner) await releaseUnpaidHolds(prisma, owner.id);
  const appointment = await prisma.$transaction(async (tx) => {
    const profile = await tx.barberProfile.findUnique({ where: { slug: input.slug } });
    if (!profile || !profile.bookingOpen) throw new CommandError("Online booking is closed.");
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "barber-booking", profile.id);
    const service = await tx.service.findFirst({ where: { id: input.serviceId, profileId: profile.id, active: true } });
    if (!service) throw new CommandError("Choose a service.");
    const date = businessDateKey(startsAt, profile.timezone);
    const free = await publicSlots(tx, input.slug, service.id, date);
    if (!free.includes(startsAt.toISOString())) throw new CommandError("That time was just taken. Choose another.");
    const contact = guest.phone ? { phone: guest.phone } : { email: guest.email };
    let client = await tx.client.findFirst({ where: { profileId: profile.id, ...contact } });
    if (client?.status === "blocked") throw new CommandError("This time can\u2019t be booked online. Contact your barber.");
    const [first, ...rest] = guest.name.split(/\s+/);
    client ??= await tx.client.create({ data: { profileId: profile.id, firstName: first, lastName: rest.join(" ") || void 0, phone: guest.phone || void 0, email: guest.email || void 0 } });
    const deposit = await depositProvider(tx, profile.id) ? service.depositCents ?? 0 : 0;
    const created = await tx.appointment.create({
      data: {
        profileId: profile.id,
        clientId: client.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + (service.durationMinutes ?? 30) * 6e4),
        serviceNameSnapshot: service.name,
        priceCents: service.priceCents,
        depositCents: deposit,
        status: deposit > 0 ? "requested" : "confirmed",
        source: "online",
        paymentStatus: "unpaid",
        clientNotes: guest.notes || void 0,
        publicAccessTokenHash: access.hash
      }
    });
    return { id: created.id, depositCents: deposit };
  }, { isolationLevel: "Serializable" });
  return { appointmentId: appointment.id, token: access.token, depositCents: appointment.depositCents };
}
async function ownedByToken(db, id, token) {
  const appointment = await db.appointment.findUnique({ where: { id }, include: { profile: true, service: true, client: true } });
  if (!appointment || !publicAccessTokenMatches(token, appointment.publicAccessTokenHash)) throw new CommandError("This booking link is not valid.");
  return appointment;
}
async function depositProvider(db, profileId) {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return db.paymentProvider.findFirst({ where: { profileId, code: "pp_stripe", isInstalled: true } });
}
async function readBooking(db, id, token) {
  let a = await ownedByToken(db, id, token);
  if (a.paymentStatus === "unpaid" && a.depositCents > 0 && (await settleDeposit(db, a).catch(() => ({ paid: false }))).paid) a = await ownedByToken(db, id, token);
  if (a.status === "requested" && await releaseUnpaidHolds(db, a.profileId, a.id)) a = await ownedByToken(db, id, token);
  const waiting = a.status === "requested" && a.paymentStatus === "unpaid" && a.depositCents > 0 && a.source === "online";
  return {
    holdEndsAt: waiting ? holdEndsAt(a.createdAt, a.profile.unpaidHoldHours).toISOString() : null,
    released: a.status === "cancelled" && Boolean(a.cancellationReason?.startsWith("Deposit not paid")),
    id: a.id,
    status: a.status,
    paymentStatus: a.paymentStatus,
    startsAt: a.startsAt.toISOString(),
    serviceName: a.serviceNameSnapshot,
    priceCents: a.priceCents,
    depositCents: a.depositCents,
    businessName: a.profile.businessName,
    location: a.profile.location,
    phone: a.profile.phone,
    timezone: a.profile.timezone,
    canPayDeposit: a.paymentStatus === "unpaid" && a.depositCents > 0 && OPEN.includes(a.status) && Boolean(await depositProvider(db, a.profileId))
  };
}
async function startDepositCheckout(db, id, token) {
  let a = await ownedByToken(db, id, token);
  if (a.status === "requested" && await releaseUnpaidHolds(db, a.profileId, a.id)) a = await ownedByToken(db, id, token);
  if (a.status === "cancelled" && a.cancellationReason?.startsWith("Deposit not paid")) throw new CommandError("The deposit was not paid in time, so this time was released. Book again from the booking page.");
  if (!OPEN.includes(a.status) || a.paymentStatus !== "unpaid" || a.depositCents <= 0) throw new CommandError("This booking has no deposit to pay.");
  if ((await settleDeposit(db, a)).paid) throw new CommandError("Your deposit is already paid.");
  const provider = await depositProvider(db, a.profileId);
  if (!provider) throw new CommandError("Online deposits are not available. Pay your barber in person.");
  const origin = trustedOrigin();
  const back = `${origin}/booking/${encodeURIComponent(a.id)}?t=${encodeURIComponent(token)}`;
  const holdEnd = holdEndsAt(a.createdAt, a.profile.unpaidHoldHours).getTime();
  const expiresAt = new Date(Math.min(Math.max(holdEnd, Date.now() + 31 * 6e4), Date.now() + 23.5 * 36e5));
  const result = await createPayment({
    expiresAt: Math.floor(expiresAt.getTime() / 1e3),
    provider: { code: provider.code },
    amount: a.depositCents,
    currency: a.profile.currencyCode.toLowerCase(),
    description: `Deposit \xB7 ${a.serviceNameSnapshot ?? "Appointment"}`,
    idempotencyKey: (0, import_node_crypto3.randomUUID)(),
    successUrl: `${back}&paid=1`,
    cancelUrl: `${back}&paid=0`,
    customerEmail: a.client?.email ?? "",
    metadata: { appointmentId: a.id }
  });
  if (!result.id || !result.url) throw new CommandError("The card page did not open. Try again.");
  await db.paymentSession.create({ data: { profileId: a.profileId, appointmentId: a.id, paymentProviderId: provider.id, amountCents: a.depositCents, currencyCode: a.profile.currencyCode, providerPaymentId: result.id, expiresAt } });
  return { url: result.url, sessionId: result.id };
}
async function confirmDeposit(db, id, token) {
  const a = await ownedByToken(db, id, token);
  return settleDeposit(db, a);
}
async function settleDeposit(db, a) {
  if (String(a.paymentStatus) !== "unpaid") return { paid: true };
  const sessions = await db.paymentSession.findMany({ where: { appointmentId: a.id, status: "pending" }, include: { paymentProvider: true } });
  for (const session of sessions) {
    if (!session.providerPaymentId || !session.paymentProvider) continue;
    const result = await getPaymentStatus({ provider: { code: session.paymentProvider.code }, paymentId: session.providerPaymentId });
    if (result.status === "captured" && Number(result.amount) === session.amountCents) {
      await db.$transaction(async (tx) => {
        const claimed = await tx.paymentSession.updateMany({ where: { id: session.id, status: "pending" }, data: { status: "captured", capturedAt: /* @__PURE__ */ new Date() } });
        if (!claimed.count) return;
        await tx.payment.create({ data: { profileId: a.profileId, appointmentId: a.id, method: "stripe", kind: "deposit", amountCents: session.amountCents, providerReference: session.providerPaymentId } });
        await tx.appointment.update({ where: { id: a.id }, data: { paymentStatus: "deposit_paid", ...a.status === "requested" ? { status: "confirmed" } : {} } });
      });
      if (a.status === "cancelled") await refundDeposit(db, a.id, a.profileId).catch(() => console.error("[barber] late deposit refund failed"));
      return { paid: true };
    }
  }
  return { paid: false };
}
async function cancelByClient(db, id, token) {
  let a = await ownedByToken(db, id, token);
  if (!OPEN.includes(a.status)) throw new CommandError("This booking can no longer be cancelled here.");
  const hoursLeft = (a.startsAt.getTime() - Date.now()) / 36e5;
  if (hoursLeft < a.profile.cancellationWindowHours) throw new CommandError(`Cancellations close ${a.profile.cancellationWindowHours} hours before the appointment. Call ${a.profile.phone || "your barber"}.`);
  if (a.paymentStatus === "unpaid" && a.depositCents > 0 && (await settleDeposit(db, a).catch(() => ({ paid: false }))).paid) a = await ownedByToken(db, id, token);
  let refunded = false;
  if (a.paymentStatus === "deposit_paid") {
    try {
      await refundDeposit(db, a.id, a.profileId);
      refunded = true;
    } catch (error) {
      if (error instanceof CommandError) throw error;
      console.error("[barber] client cancel refund failed", error instanceof Error ? error.message : error);
      throw new CommandError(`Your deposit could not be refunded just now, so the booking is still on. Try again, or call ${a.profile.phone || "your barber"}.`);
    }
  }
  await db.appointment.update({ where: { id: a.id }, data: { status: "cancelled", cancellationReason: "Cancelled by client" } });
  return { cancelled: true, refunded };
}
async function refundDeposit(db, appointmentId, profileId) {
  const payment = await db.payment.findFirst({ where: { appointmentId, profileId, method: "stripe", kind: "deposit", status: "paid" } });
  if (!payment?.providerReference) throw new CommandError("There is no online deposit to refund.");
  const claimed = await db.payment.updateMany({ where: { id: payment.id, status: "paid" }, data: { status: "refunded" } });
  if (!claimed.count) throw new CommandError("This deposit was already refunded.");
  try {
    await refundPayment({ provider: { code: "pp_stripe" }, paymentId: payment.providerReference, amount: payment.amountCents, idempotencyKey: `refund-${payment.id}` });
  } catch (error) {
    await db.payment.updateMany({ where: { id: payment.id }, data: { status: "paid" } });
    throw error;
  }
  await db.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: "refunded" } });
}

// features/keystone/utils/staffCommands.ts
var METHODS = ["cash", "card", "transfer"];
var DAYS2 = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function cents(value, label) {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1e7) throw new CommandError(`${label} is not a valid amount.`);
  return n;
}
var STARTER_SERVICES = [
  { name: "Haircut", description: "Scissor or clipper cut, styled and lined up.", priceCents: 3500, durationMinutes: 30, depositCents: 1e3, photoPath: "/images/barber/scissor-cut.webp" },
  { name: "Skin fade", description: "Fade down to the skin, blended by hand, with a line-up.", priceCents: 4e3, durationMinutes: 45, depositCents: 1e3, photoPath: "/images/barber/clipper-fade.webp" },
  { name: "Cut and beard", description: "Full haircut plus beard shape-up with a hot towel.", priceCents: 5500, durationMinutes: 60, depositCents: 1500, photoPath: "/images/barber/barber-at-work.webp" },
  { name: "Beard trim", description: "Beard shaped, lined and finished with oil.", priceCents: 2e3, durationMinutes: 20, depositCents: 0, photoPath: "/images/barber/beard-detail.webp" },
  { name: "Hot towel shave", description: "Straight-razor shave with hot towels and balm.", priceCents: 4500, durationMinutes: 45, depositCents: 1500, photoPath: "/images/barber/chair-service.webp" }
];
var STARTER_PRODUCTS = [
  { name: "Matte clay", priceCents: 2200, stock: 12 },
  { name: "Beard oil", priceCents: 1800, stock: 10 },
  { name: "Sea salt spray", priceCents: 1600, stock: 8 }
];
async function setupBusiness(prisma, session, input) {
  if (!session) throw new CommandError("Sign in first.");
  const name = input.businessName.trim().slice(0, 120);
  const slug = input.slug.trim().toLowerCase();
  if (!name) throw new CommandError("Enter your business name.");
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) throw new CommandError("Booking address: 2 to 41 lowercase letters, numbers or hyphens.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
  } catch {
    throw new CommandError("Choose a valid timezone.");
  }
  const workStyle = ["own_space", "chair_rental", "mobile"].includes(input.workStyle) ? input.workStyle : "own_space";
  return prisma.$transaction(async (tx) => {
    if (await tx.barberProfile.findFirst({ where: { ownerId: session.itemId } })) throw new CommandError("Your business is already set up.");
    if (await tx.barberProfile.findUnique({ where: { slug } })) throw new CommandError("That booking address is taken. Try another.");
    const profile = await tx.barberProfile.create({
      data: {
        ownerId: session.itemId,
        businessName: name,
        slug,
        timezone: input.timezone,
        phone: input.phone.trim() || void 0,
        location: input.location.trim() || void 0,
        workStyle,
        ...input.starterMenu ? { photoPath: "/images/barber/barber-chair.webp" } : {}
      }
    });
    if (input.starterMenu) {
      await tx.service.createMany({ data: STARTER_SERVICES.map((service, sortOrder) => ({ ...service, sortOrder, profileId: profile.id })) });
      await tx.product.createMany({ data: STARTER_PRODUCTS.map((product) => ({ ...product, profileId: profile.id })) });
    }
    await tx.weeklyHours.createMany({
      data: DAYS2.map((dayOfWeek, i) => ({ profileId: profile.id, dayOfWeek, isWorking: i >= 2 && i <= 6, startMinute: 600, endMinute: 1080 }))
    });
    await tx.paymentProvider.create({ data: { profileId: profile.id, name: "In person", code: "pp_manual" } });
    await tx.paymentProvider.create({ data: { profileId: profile.id, name: "Card online", code: "pp_stripe", createPaymentFunction: "stripe", capturePaymentFunction: "stripe", refundPaymentFunction: "stripe", getPaymentStatusFunction: "stripe", generatePaymentLinkFunction: "stripe", handleWebhookFunction: "stripe" } });
    await tx.user.update({ where: { id: session.itemId }, data: { onboardingStatus: "done" } });
    return { slug: profile.slug };
  });
}
async function checkoutAppointment(prisma, session, input) {
  if (!METHODS.includes(input.method)) throw new CommandError("Choose how the client paid.");
  const tip = cents(input.tipCents, "Tip");
  return prisma.$transaction(async (tx) => {
    const profile = await requireOwnProfile(tx, session, "canManagePayments");
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", "barber-checkout", input.appointmentId);
    const a = await tx.appointment.findFirst({ where: { id: input.appointmentId, profileId: profile.id } });
    if (!a) throw new CommandError("Appointment not found.");
    if (!["requested", "confirmed"].includes(a.status)) throw new CommandError("Only an open appointment can be checked out.");
    const price = input.priceCents === void 0 ? a.priceCents : cents(input.priceCents, "Price");
    const deposit = a.paymentStatus === "deposit_paid" ? a.depositCents : 0;
    let productsTotal = 0;
    for (const line of input.products) {
      const qty = Math.floor(Number(line.quantity));
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new CommandError("Product quantity is not valid.");
      const product = await tx.product.findFirst({ where: { id: line.productId, profileId: profile.id, active: true } });
      if (!product) throw new CommandError("A product was not found.");
      const taken = await tx.product.updateMany({ where: { id: product.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
      if (!taken.count) throw new CommandError(`Not enough ${product.name} in stock.`);
      const total = product.priceCents * qty;
      productsTotal += total;
      await tx.productSale.create({ data: { profileId: profile.id, productId: product.id, clientId: a.clientId, appointmentId: a.id, productNameSnapshot: product.name, quantity: qty, unitPriceCents: product.priceCents, totalCents: total } });
    }
    const due = Math.max(0, price - deposit);
    await tx.payment.create({ data: { profileId: profile.id, appointmentId: a.id, method: input.method, kind: "service", amountCents: due, productsCents: productsTotal, tipCents: tip } });
    await tx.appointment.update({ where: { id: a.id }, data: { status: "completed", paymentStatus: "paid", priceCents: price } });
    if (a.clientId) await tx.client.update({ where: { id: a.clientId }, data: { lastVisitAt: /* @__PURE__ */ new Date() } });
    return { due, tip, productsTotal };
  }, { isolationLevel: "Serializable" });
}
async function markNoShow(prisma, session, appointmentId) {
  return prisma.$transaction(async (tx) => {
    const profile = await requireOwnProfile(tx, session, "canManageAppointments");
    const a = await tx.appointment.findFirst({ where: { id: appointmentId, profileId: profile.id } });
    if (!a) throw new CommandError("Appointment not found.");
    if (!["requested", "confirmed"].includes(a.status)) throw new CommandError("Only an open appointment can be marked a no-show.");
    await tx.appointment.update({ where: { id: a.id }, data: { status: "no_show" } });
    return { depositKept: a.paymentStatus === "deposit_paid" };
  });
}
async function cancelByBarber(prisma, session, appointmentId, reason) {
  const profile = await requireOwnProfile(prisma, session, "canManageAppointments");
  const a = await prisma.appointment.findFirst({ where: { id: appointmentId, profileId: profile.id } });
  if (!a) throw new CommandError("Appointment not found.");
  if (!["requested", "confirmed"].includes(a.status)) throw new CommandError("Only an open appointment can be cancelled.");
  if (a.paymentStatus === "deposit_paid") await refundDeposit(prisma, a.id, profile.id);
  await prisma.appointment.update({ where: { id: a.id }, data: { status: "cancelled", cancellationReason: reason.trim().slice(0, 300) || "Cancelled by barber" } });
  return { refunded: a.paymentStatus === "deposit_paid" };
}
async function earnings(prisma, session, from, to) {
  const profile = await requireOwnProfile(prisma, session, "canViewEarnings");
  const where = { profileId: profile.id, status: "paid", paidAt: { gte: from, lt: to } };
  const [sum, byMethod, visits, rentals] = await Promise.all([
    prisma.payment.aggregate({ where, _sum: { amountCents: true, tipCents: true, productsCents: true } }),
    prisma.payment.groupBy({ by: ["method"], where, _sum: { amountCents: true, tipCents: true, productsCents: true } }),
    prisma.appointment.count({ where: { profileId: profile.id, status: "completed", startsAt: { gte: from, lt: to } } }),
    prisma.chairRental.findMany({ where: { profileId: profile.id } })
  ]);
  const rent = rentals.reduce((total, r) => {
    const runsFrom = Math.max(from.getTime(), (r.startsOn ?? r.createdAt).getTime());
    const runsTo = Math.min(to.getTime(), (r.endsOn ?? (r.status === "ended" ? r.updatedAt : to)).getTime());
    const days = Math.max(0, (runsTo - runsFrom) / 864e5);
    return total + Math.round(r.rentCents * (days / (r.period === "weekly" ? 7 : 30)));
  }, 0);
  return {
    servicesCents: sum._sum.amountCents ?? 0,
    tipsCents: sum._sum.tipCents ?? 0,
    productsCents: sum._sum.productsCents ?? 0,
    visits,
    rentCents: rent,
    byMethod: byMethod.map((row) => ({ method: row.method, cents: (row._sum.amountCents ?? 0) + (row._sum.tipCents ?? 0) + (row._sum.productsCents ?? 0) }))
  };
}

// features/keystone/mutations/index.ts
var graphql3 = String.raw;
var run = async (work) => {
  try {
    return ok(await work());
  } catch (error) {
    if (!(error instanceof CommandError)) console.error("barber command failed", error instanceof Error ? error.message : "unknown");
    return fail(error);
  }
};
async function publicBusiness(prisma, where) {
  const p = await prisma.barberProfile.findUnique({ where, include: { services: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }, weeklyHours: true } });
  if (!p) return null;
  const takesDeposits = Boolean(await depositProvider(prisma, p.id));
  return {
    slug: p.slug,
    businessName: p.businessName,
    bio: p.bio,
    photoPath: p.photoPath,
    phone: p.phone,
    location: p.location,
    timezone: p.timezone,
    bookingOpen: p.bookingOpen,
    currencyCode: p.currencyCode,
    maxAdvanceDays: p.maxAdvanceDays,
    cancellationWindowHours: p.cancellationWindowHours,
    unpaidHoldHours: p.unpaidHoldHours,
    services: p.services.map((s) => ({ id: s.id, name: s.name, description: s.description, photoPath: s.photoPath, priceCents: s.priceCents, durationMinutes: s.durationMinutes, depositCents: takesDeposits ? s.depositCents : 0 })),
    hours: p.weeklyHours.map((h) => ({ dayOfWeek: h.dayOfWeek, isWorking: h.isWorking, startMinute: h.startMinute, endMinute: h.endMinute }))
  };
}
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql3`
      type CommandResult { success: Boolean!, error: String, data: JSON }
      input GuestInput { name: String!, phone: String, email: String, notes: String }
      input SaleLineInput { productId: ID!, quantity: Int! }

      type Query {
        redirectToInit: Boolean
        publicBusiness(slug: String!): JSON
        homeBusiness: JSON
        publicSlots(slug: String!, serviceId: ID!, date: String!): CommandResult!
        publicBooking(id: ID!, token: String!): CommandResult!
        myEarnings(from: String!, to: String!): CommandResult!
      }
      type Mutation {
        setUpMyBusiness(businessName: String!, slug: String!, timezone: String!, phone: String, location: String, workStyle: String, starterMenu: Boolean): CommandResult!
        bookOnline(slug: String!, serviceId: ID!, startsAt: String!, guest: GuestInput!): CommandResult!
        payDepositOnline(id: ID!, token: String!): CommandResult!
        confirmDepositOnline(id: ID!, token: String!): CommandResult!
        cancelMyBooking(id: ID!, token: String!): CommandResult!
        checkOutAppointment(appointmentId: ID!, method: String!, tipCents: Int, priceCents: Int, products: [SaleLineInput!]): CommandResult!
        markAppointmentNoShow(appointmentId: ID!): CommandResult!
        cancelAppointmentAsBarber(appointmentId: ID!, reason: String): CommandResult!
      }
    `,
    resolvers: {
      Query: {
        redirectToInit: redirectToInit_default,
        publicBusiness: (_r, { slug }, c) => publicBusiness(c.prisma, { slug }),
        // The home page shows the first barber who set up a booking page on this deployment.
        homeBusiness: async (_r, _a, c) => {
          const first = await c.prisma.barberProfile.findFirst({ where: { bookingOpen: true }, orderBy: { createdAt: "asc" }, select: { slug: true } });
          return first ? publicBusiness(c.prisma, { slug: first.slug }) : null;
        },
        publicSlots: (_r, a, c) => run(async () => {
          const owner = await c.prisma.barberProfile.findUnique({ where: { slug: a.slug }, select: { id: true } });
          if (owner) await releaseUnpaidHolds(c.prisma, owner.id).catch((e) => console.error("[barber] hold release failed", e instanceof Error ? e.message : e));
          return publicSlots(c.prisma, a.slug, a.serviceId, a.date);
        }),
        publicBooking: (_r, a, c) => run(() => readBooking(c.prisma, a.id, a.token)),
        myEarnings: (_r, a, c) => run(() => {
          const from = new Date(a.from);
          const to = new Date(a.to);
          if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw new CommandError("Choose a valid date range.");
          return earnings(c.prisma, c.session, from, to);
        })
      },
      Mutation: {
        setUpMyBusiness: (_r, a, c) => run(() => setupBusiness(c.prisma, c.session, { businessName: a.businessName, slug: a.slug, timezone: a.timezone, phone: a.phone ?? "", location: a.location ?? "", workStyle: a.workStyle ?? "own_space", starterMenu: a.starterMenu ?? false })),
        bookOnline: (_r, a, c) => run(() => bookAppointment(c.prisma, { slug: a.slug, serviceId: a.serviceId, startsAt: a.startsAt, guest: { name: a.guest.name, phone: a.guest.phone ?? "", email: a.guest.email ?? "", notes: a.guest.notes ?? "" } })),
        payDepositOnline: (_r, a, c) => run(() => startDepositCheckout(c.prisma, a.id, a.token)),
        confirmDepositOnline: (_r, a, c) => run(() => confirmDeposit(c.prisma, a.id, a.token)),
        cancelMyBooking: (_r, a, c) => run(() => cancelByClient(c.prisma, a.id, a.token)),
        checkOutAppointment: (_r, a, c) => run(() => checkoutAppointment(c.prisma, c.session, { appointmentId: a.appointmentId, method: a.method, tipCents: a.tipCents ?? 0, priceCents: a.priceCents ?? void 0, products: a.products ?? [] })),
        markAppointmentNoShow: (_r, a, c) => run(() => markNoShow(c.prisma, c.session, a.appointmentId)),
        cancelAppointmentAsBarber: (_r, a, c) => run(() => cancelByBarber(c.prisma, c.session, a.appointmentId, a.reason ?? ""))
      }
    }
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}

// features/keystone/mcp-oauth/session.ts
async function resolveMcpAccessToken(context, token, listKey = "User") {
  try {
    const sudo = context.sudo();
    const record = await sudo.db.OAuthToken.findOne({ where: { token: digestToken(token) } });
    if (!record || record.tokenType !== "access_token" || record.isRevoked !== "false" || !record.userId || !record.expiresAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      return void 0;
    }
    const app = await sudo.db.OAuthApp.findOne({ where: { clientId: record.clientId } });
    if (!app || app.status !== "active") return void 0;
    const mcp = {
      clientId: record.clientId,
      scopes: storedScopes(record.scopes),
      tokenId: String(record.id)
    };
    return { itemId: String(record.userId), listKey, mcp };
  } catch {
    return void 0;
  }
}
function withMcpBearerSessions(strategy, listKey = "User") {
  return {
    ...strategy,
    async get({ context }) {
      const token = bearerToken(context?.req?.headers?.authorization);
      if (isMcpAccessToken(token)) return resolveMcpAccessToken(context, token, listKey);
      return strategy.get({ context });
    }
  };
}

// features/keystone/index.ts
var databaseURL = process.env.DATABASE_URL || "file:./keystone.db";
var sessionConfig = {
  maxAge: 60 * 60 * 24 * 360,
  // How long they stay signed in?
  secret: process.env.SESSION_SECRET || "this secret should only be used in testing"
};
var {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com"
} = process.env;
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          canSeeOtherPeople: true,
          canEditOtherPeople: true,
          canManagePeople: true,
          canManageRoles: true,
          canAccessDashboard: true,
          canManageBusiness: true,
          canManageClients: true,
          canManageAppointments: true,
          canManagePayments: true,
          canViewEarnings: true
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    }
  },
  sessionData: `
    name
    email
    onboardingStatus
    role {
      id
      name
      canSeeOtherPeople
      canEditOtherPeople
      canManagePeople
      canManageRoles
      canAccessDashboard
      canManageBusiness
      canManageClients
      canManageAppointments
      canManagePayments
      canViewEarnings
    }
  `
});
var keystone_default = withAuth(
  (0, import_core21.config)({
    db: {
      provider: "postgresql",
      url: databaseURL
    },
    lists: models,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5e3 },
        forcePathStyle: true
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false
    },
    // MCP OAuth bearer tokens resolve to the approving user; everything else is unchanged.
    session: withMcpBearerSessions((0, import_session.statelessSessions)(sessionConfig)),
    graphql: {
      extendGraphqlSchema
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
