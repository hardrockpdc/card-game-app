import { getCoins, addCoins, subtractCoins } from "./wallet";
import { warn } from "./logger";

// One safe path for every coin-funded cosmetic unlock (decks, felts, frames).
//
// Each shop screen used to hand-roll this, in an order that could charge the
// player for nothing:
//
//   const newBalance = await subtractCoins(price);
//   ...
//   await updateProfile({ unlockedThemes: next }).catch(() => {});
//
// Coins were debited, then ownership was persisted with the failure swallowed —
// so a failed profile write cost the player 3,000 coins and delivered nothing,
// silently. The affordability gate above it also read a `coins` state value
// that could lag the real balance, and subtractCoins clamps at zero, so an
// under-funded purchase still "succeeded" for whatever was left.
//
// `apply` performs the persistence (typically updateProfile with the new owned
// list). If it throws, the debit is rolled back.
//
// Returns:
//   { ok: true,  balance }
//   { ok: false, reason: "insufficient", balance }
//   { ok: false, reason: "persist-failed", balance }
export async function purchaseCosmetic({ price, apply }) {
  const cost = Math.max(0, Math.floor(price || 0));

  // Check against storage, not against whatever the screen last rendered.
  const balance = await getCoins();
  if (cost > balance) {
    return { ok: false, reason: "insufficient", balance };
  }

  const afterDebit = cost > 0 ? await subtractCoins(cost) : balance;

  try {
    await apply();
  } catch (err) {
    // Roll the debit back so a storage failure can't take the player's coins.
    warn("[shop] unlock failed to persist — refunding:", err);
    const restored = cost > 0 ? await addCoins(cost) : afterDebit;
    return { ok: false, reason: "persist-failed", balance: restored };
  }

  return { ok: true, balance: afterDebit };
}
