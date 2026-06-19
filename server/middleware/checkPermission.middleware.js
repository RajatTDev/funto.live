const MODULES = {
  USER: "admin/user",
  FAKE_USER: "admin/fakeUser",
  HOST: "admin/host",
  HOST_REQUEST: "admin/hostRequest",
  AGENCY: "admin/agency",
  AGENCY_HISTORY: "admin/agencyHistory",
  AGENCY_REDEEM_REQUEST: "admin/agencyRedeemRequest",
  COIN_SELLER: "admin/coinSeller",

  REGION: "admin/region",
  BD: "admin/bd",
  BD_REDEEM: "admin/bdRedeem",
  BD_PAYMENT_METHOD: "admin/bdPaymentMethod",

  MAIN_PLAN: "admin/mainPlan",
  PLAN_HISTORY: "admin/planHistory",
  USER_REDEEM_REQUEST: "admin/userRedeemRequest",

  GAME: "admin/game",
  GAME_HISTORY: "admin/gameHistory",

  GIFT_CATEGORY: "admin/giftCategory",
  GIFT: "admin/gift",

  REACTION: "admin/reaction",
  COMMENT: "admin/comment",
  SUGGEST_MESSAGE: "admin/suggestMessage",

  BANNER: "admin/banner",
  BROADCAST_GIFT: "admin/broadcastgift",
  BROADCAST_GAME: "admin/broadcastgame",

  THEME: "admin/theme",
  SONG: "admin/song",
  HASHTAG: "admin/hashtag",

  MAIN_POST: "admin/mainPost",
  MAIN_VIDEO: "admin/mainVideo",

  ENTRY_EFFECT: "admin/entryEffect",
  AVATAR_FRAME: "admin/avatarFrame",

  REPORTED_USER: "admin/reportedUser",
  COMPLAIN_REQUEST: "admin/complainRequest",

  LEVEL: "admin/level",
  ADVERTISEMENT: "admin/advertisement",
  LANGUAGE: "admin/language",

  SETTING: "admin/Setting"
};

/**
 * HTTP method → permission action(s).
 * PATCH/PUT can be stored as either "Edit" or "Update" in the DB,
 * so we check for either.
 */
const METHOD_TO_ACTIONS = {
  GET: ["List"],
  POST: ["Create"],
  PATCH: ["Edit", "Update"],
  PUT: ["Edit", "Update"],
  DELETE: ["Delete"],
};

/**
 * @param {string} module - One of the MODULES values (e.g. MODULES.CATEGORY)
 */
const checkPermission = (module) => {
  return (req, res, next) => {
    // ── 1. Super-admin bypass ──────────────────────────────────────────────
    if (req.admin) return next();

    // ── 2. Staff (sub-admin) gate ──────────────────────────────────────────
    if (req.subAdmin) {
      const permissions = req.subAdmin?.role?.permissions;

      if (!permissions || !Array.isArray(permissions)) {
        console.warn(`⚠️ [RBAC] Staff ${req.subAdmin._id} has no permissions array on their role.`);
        return res.status(403).json({
          status: false,
          message: "Access denied. No permissions configured for your role.",
        });
      }

      // a. Module check
      const modulePermission = permissions.find((p) => p.module === module);

      if (!modulePermission) {
        console.warn(`⚠️ [RBAC] Staff ${req.subAdmin._id} denied — module "${module}" not in role.`);
        return res.status(403).json({
          status: false,
          message: `Access denied. You do not have access to the "${module}" module.`,
        });
      }

      // b. Action check
      const requiredActions = METHOD_TO_ACTIONS[req.method] || [];
      const grantedActions = modulePermission.actions || [];

      const hasAction = requiredActions.some((action) => grantedActions.includes(action));

      if (!hasAction) {
        console.warn(
          `⚠️ [RBAC] Staff ${req.subAdmin._id} denied — action [${requiredActions.join(" or ")}] not permitted on module "${module}". Granted: [${grantedActions.join(", ")}]`
        );
        return res.status(403).json({
          status: false,
          message: `Access denied. You do not have permission to perform this action on the "${module}" module.`,
        });
      }

      // c. All good
      console.log(`✅ [RBAC] Staff ${req.subAdmin._id} — access granted for [${req.method}] on module "${module}".`);
      return next();
    }

    // ── 3. Neither admin nor staff (auth middleware mis-order) ─────────────
    console.warn("⚠️ [RBAC] Neither req.admin nor req.staff is set. Possible middleware mis-order.");
    return res.status(401).json({
      status: false,
      message: "Unauthorized. Authentication required.",
    });
  };
};

module.exports = { checkPermission, MODULES };
