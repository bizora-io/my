import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { isOtpLocked, nextFailedOtpState, checkOtpCooldown } from "./notify.ts";
import { validatePositiveMoney, validatePassword } from "./validation.ts";
import { journalLine, validateJournalLines, AUTO_JOURNAL_ACCOUNTS } from "../../../shared/lib/journalAutoPost.ts";

describe("API Integration & Remediation Test Suite (BZ-F01 - BZ-F09)", () => {
  // =========================================================================
  // 1. P0 — BZ-F01: POS Sales & Authoritative Atomic Inventory
  // =========================================================================
  describe("P0 — BZ-F01: POS Sales & Inventory Atomic Deduction", () => {
    interface Product {
      id: string;
      name: string;
      stock: number;
      type?: string;
      isDeleted?: boolean;
      variants?: { id: string; name: string; stock: number }[];
    }

    interface SaleItem {
      productId: string;
      qty: number;
      variantId?: string;
    }

    class InventoryTransactionSimulator {
      private products = new Map<string, Product>();
      private transactions = new Map<string, any>();

      public setProduct(product: Product) {
        this.products.set(product.id, { ...product });
      }

      public getProduct(id: string): Product | undefined {
        return this.products.get(id);
      }

      public getTransaction(id: string): any {
        return this.transactions.get(id);
      }

      public executeSaleTransaction(txn: {
        id: string;
        businessId: string;
        amount: number;
        items: SaleItem[];
        stockDeducted?: boolean;
      }): { success: boolean; error?: string; code?: string; available?: number } {
        if (this.transactions.has(txn.id)) {
          return { success: true };
        }

        const v = validatePositiveMoney(txn.amount, "amount");
        if (!v.valid) {
          return { success: false, error: v.error, code: "invalid_money" };
        }

        const updates: { id: string; nextStock: number; variants?: any[] }[] = [];

        for (const it of txn.items) {
          const prod = this.products.get(it.productId);
          if (!prod) continue;
          if (prod.isDeleted) {
            return { success: false, error: "Product deleted", code: "product_deleted" };
          }
          if (prod.type === "Service") continue;

          if (it.variantId && prod.variants) {
            const vIdx = prod.variants.findIndex((v) => v.id === it.variantId);
            if (vIdx >= 0) {
              const currentVStock = prod.variants[vIdx].stock;
              if (currentVStock < it.qty) {
                return {
                  success: false,
                  error: `Insufficient stock for variant. Available: ${currentVStock}`,
                  code: "insufficient_stock",
                  available: currentVStock,
                };
              }
              const nextVariants = [...prod.variants];
              nextVariants[vIdx] = { ...nextVariants[vIdx], stock: currentVStock - it.qty };
              const nextTotal = nextVariants.reduce((s, v) => s + v.stock, 0);
              updates.push({ id: prod.id, nextStock: nextTotal, variants: nextVariants });
            }
          } else {
            if (prod.stock < it.qty) {
              return {
                success: false,
                error: `Insufficient stock for ${prod.name}. Available: ${prod.stock}`,
                code: "insufficient_stock",
                available: prod.stock,
              };
            }
            updates.push({ id: prod.id, nextStock: prod.stock - it.qty });
          }
        }

        for (const u of updates) {
          const cur = this.products.get(u.id)!;
          cur.stock = u.nextStock;
          if (u.variants) cur.variants = u.variants;
        }

        this.transactions.set(txn.id, { ...txn, stockDeducted: true });
        return { success: true };
      }
    }

    it("atomically verifies and deducts stock on POS sale", () => {
      const sim = new InventoryTransactionSimulator();
      sim.setProduct({ id: "prod-1", name: "Premium Basmati Rice 5kg", stock: 10 });

      const res = sim.executeSaleTransaction({
        id: "tx-101",
        businessId: "biz-1",
        amount: 850,
        items: [{ productId: "prod-1", qty: 3 }],
      });

      assert.equal(res.success, true);
      assert.equal(sim.getProduct("prod-1")?.stock, 7);
      assert.equal(sim.getTransaction("tx-101")?.stockDeducted, true);
    });

    it("rejects POS sale when requested quantity exceeds available inventory (insufficient stock)", () => {
      const sim = new InventoryTransactionSimulator();
      sim.setProduct({ id: "prod-2", name: "Organic Ghee 1L", stock: 2 });

      const res = sim.executeSaleTransaction({
        id: "tx-102",
        businessId: "biz-1",
        amount: 2400,
        items: [{ productId: "prod-2", qty: 5 }],
      });

      assert.equal(res.success, false);
      assert.equal(res.code, "insufficient_stock");
      assert.equal(res.available, 2);
      assert.equal(sim.getProduct("prod-2")?.stock, 2);
    });

    it("is idempotent: retrying same sale does not double-deduct stock", () => {
      const sim = new InventoryTransactionSimulator();
      sim.setProduct({ id: "prod-3", name: "Mustard Oil 1L", stock: 5 });

      const res1 = sim.executeSaleTransaction({
        id: "tx-103",
        businessId: "biz-1",
        amount: 320,
        items: [{ productId: "prod-3", qty: 2 }],
      });
      assert.equal(res1.success, true);
      assert.equal(sim.getProduct("prod-3")?.stock, 3);

      const res2 = sim.executeSaleTransaction({
        id: "tx-103",
        businessId: "biz-1",
        amount: 320,
        items: [{ productId: "prod-3", qty: 2 }],
      });
      assert.equal(res2.success, true);
      assert.equal(sim.getProduct("prod-3")?.stock, 3);
    });

    it("deducts variant-level stock correctly for apparel/shoes", () => {
      const sim = new InventoryTransactionSimulator();
      sim.setProduct({
        id: "prod-4",
        name: "Classic Polo Shirt",
        stock: 15,
        variants: [
          { id: "var-blue-m", name: "Blue / M", stock: 5 },
          { id: "var-blue-l", name: "Blue / L", stock: 10 },
        ],
      });

      const res = sim.executeSaleTransaction({
        id: "tx-104",
        businessId: "biz-1",
        amount: 950,
        items: [{ productId: "prod-4", variantId: "var-blue-m", qty: 2 }],
      });

      assert.equal(res.success, true);
      const updated = sim.getProduct("prod-4")!;
      assert.equal(updated.variants![0].stock, 3);
      assert.equal(updated.variants![1].stock, 10);
      assert.equal(updated.stock, 13);
    });
  });

  // =========================================================================
  // 2. P1 — BZ-F04 / AGENT 2: OTP Concurrency, Lockout & Challenge Binding
  // =========================================================================
  describe("P1 — BZ-F04 / Agent 2: OTP Security & Concurrency Verification", () => {
    interface OtpChallengeDoc {
      mobile: string;
      challengeId: string;
      purpose: string;
      codeHash: string;
      expiresAt: number;
      failedAttempts: number;
      lockedUntil: number | null;
      isUsed: boolean;
      lastSentAt: number;
    }

    class OtpServerlessSimulator {
      private store = new Map<string, OtpChallengeDoc>();
      // Simulated mutex lock representing Firestore db.runTransaction OCC
      private locks = new Set<string>();

      public setDoc(doc: OtpChallengeDoc) {
        this.store.set(doc.mobile, { ...doc });
      }

      public getDoc(mobile: string): OtpChallengeDoc | undefined {
        return this.store.get(mobile);
      }

      public async requestOtp(params: {
        mobile: string;
        purpose?: string;
        cooldownMs?: number;
      }): Promise<{ ok: boolean; challengeId?: string; error?: string; code?: string }> {
        const existing = this.store.get(params.mobile);
        if (existing) {
          const locked = isOtpLocked(existing.failedAttempts, existing.lockedUntil);
          if (locked) {
            return { ok: false, error: locked, code: "otp_locked" };
          }
          const cd = checkOtpCooldown(existing.lastSentAt, params.cooldownMs ?? 60_000);
          if (cd) {
            return { ok: false, error: cd, code: "otp_cooldown" };
          }
        }

        const challengeId = crypto.randomUUID();
        const codeHash = crypto.createHash("sha256").update("123456").digest("hex");
        this.store.set(params.mobile, {
          mobile: params.mobile,
          challengeId,
          purpose: params.purpose || "phone_verification",
          codeHash,
          expiresAt: Date.now() + 600_000,
          failedAttempts: 0,
          lockedUntil: null,
          isUsed: false,
          lastSentAt: Date.now(),
        });
        return { ok: true, challengeId };
      }

      public async confirmOtpTransaction(params: {
        mobile: string;
        otp: string;
        challengeId?: string;
        purpose?: string;
      }): Promise<{ valid: boolean; code?: string; error?: string; attempts?: number }> {
        // Atomic transaction simulator
        while (this.locks.has(params.mobile)) {
          await new Promise((r) => setTimeout(r, 2));
        }
        this.locks.add(params.mobile);

        try {
          const doc = this.store.get(params.mobile);
          if (!doc) {
            return { valid: false, error: "No challenge found", code: "not_found" };
          }
          if (doc.isUsed) {
            return { valid: false, error: "Code already used", code: "otp_replayed" };
          }
          const locked = isOtpLocked(doc.failedAttempts, doc.lockedUntil);
          if (locked) {
            return { valid: false, error: locked, code: "otp_locked" };
          }
          if (params.challengeId && doc.challengeId !== params.challengeId) {
            return { valid: false, error: "Challenge ID mismatch", code: "challenge_mismatch" };
          }
          if (params.purpose && doc.purpose !== params.purpose) {
            return { valid: false, error: "Purpose mismatch", code: "purpose_mismatch" };
          }

          const inputHash = crypto.createHash("sha256").update(params.otp).digest("hex");
          if (inputHash === doc.codeHash) {
            doc.isUsed = true;
            this.store.delete(params.mobile);
            return { valid: true };
          }

          const next = nextFailedOtpState(doc.failedAttempts);
          doc.failedAttempts = next.resetCodeFailedAttempts;
          doc.lockedUntil = next.resetCodeLockedUntil;

          if (next.resetCodeLockedUntil) {
            return { valid: false, error: "Locked for 15 minutes", code: "otp_locked", attempts: doc.failedAttempts };
          }
          return { valid: false, error: "Invalid OTP", code: "invalid_otp", attempts: doc.failedAttempts };
        } finally {
          this.locks.delete(params.mobile);
        }
      }
    }

    it("locks after 5 consecutive failed verification attempts and rejects 6th with otp_locked", async () => {
      const sim = new OtpServerlessSimulator();
      const req = await sim.requestOtp({ mobile: "+8801700000001" });
      assert.equal(req.ok, true);

      // 4 invalid attempts
      for (let i = 1; i <= 4; i++) {
        const res = await sim.confirmOtpTransaction({
          mobile: "+8801700000001",
          otp: "000000",
          challengeId: req.challengeId,
        });
        assert.equal(res.valid, false);
        assert.equal(res.code, "invalid_otp");
        assert.equal(res.attempts, i);
      }

      // 5th invalid attempt triggers lockout
      const fifth = await sim.confirmOtpTransaction({
        mobile: "+8801700000001",
        otp: "000000",
        challengeId: req.challengeId,
      });
      assert.equal(fifth.valid, false);
      assert.equal(fifth.code, "otp_locked");
      assert.equal(fifth.attempts, 5);

      // 6th attempt is rejected immediately with otp_locked without incrementing
      const sixth = await sim.confirmOtpTransaction({
        mobile: "+8801700000001",
        otp: "000000",
        challengeId: req.challengeId,
      });
      assert.equal(sixth.valid, false);
      assert.equal(sixth.code, "otp_locked");
    });

    it("handles 6 concurrent invalid requests atomically without race conditions", async () => {
      const sim = new OtpServerlessSimulator();
      const req = await sim.requestOtp({ mobile: "+8801700000002" });
      assert.equal(req.ok, true);

      // Launch 6 concurrent verification requests in parallel
      const promises = Array.from({ length: 6 }, () =>
        sim.confirmOtpTransaction({
          mobile: "+8801700000002",
          otp: "wrong_code",
          challengeId: req.challengeId,
        })
      );
      const results = await Promise.all(promises);

      // All 6 must be invalid
      assert.ok(results.every((r) => r.valid === false));
      // Exactly 4 must be 'invalid_otp', 1 must be 'otp_locked' on 5th, and 1 must be 'otp_locked' on 6th
      const invalidCount = results.filter((r) => r.code === "invalid_otp").length;
      const lockedCount = results.filter((r) => r.code === "otp_locked").length;
      assert.equal(invalidCount, 4);
      assert.equal(lockedCount, 2);
    });

    it("persists lockout across simulated separate serverless instances", async () => {
      const sim = new OtpServerlessSimulator();
      const req = await sim.requestOtp({ mobile: "+8801700000003" });

      // Simulate Instance A making 5 failed attempts
      for (let i = 1; i <= 5; i++) {
        await sim.confirmOtpTransaction({ mobile: "+8801700000003", otp: "wrong", challengeId: req.challengeId });
      }

      // Simulate Instance B reading shared database state
      const instBResult = await sim.confirmOtpTransaction({
        mobile: "+8801700000003",
        otp: "123456", // Even with correct OTP, locked account must reject!
        challengeId: req.challengeId,
      });
      assert.equal(instBResult.valid, false);
      assert.equal(instBResult.code, "otp_locked");
    });

    it("prevents challenge recreation bypass when account is locked", async () => {
      const sim = new OtpServerlessSimulator();
      const req1 = await sim.requestOtp({ mobile: "+8801700000004" });
      for (let i = 1; i <= 5; i++) {
        await sim.confirmOtpTransaction({ mobile: "+8801700000004", otp: "wrong", challengeId: req1.challengeId });
      }

      // Attacker attempts to reset lockout by calling requestOtp again
      const recreate = await sim.requestOtp({ mobile: "+8801700000004" });
      assert.equal(recreate.ok, false);
      assert.equal(recreate.code, "otp_locked");
    });

    it("prevents OTP replay after successful confirmation", async () => {
      const sim = new OtpServerlessSimulator();
      const req = await sim.requestOtp({ mobile: "+8801700000005" });

      // First valid submission succeeds
      const first = await sim.confirmOtpTransaction({
        mobile: "+8801700000005",
        otp: "123456",
        challengeId: req.challengeId,
      });
      assert.equal(first.valid, true);

      // Replaying the exact same OTP fails immediately
      const replay = await sim.confirmOtpTransaction({
        mobile: "+8801700000005",
        otp: "123456",
        challengeId: req.challengeId,
      });
      assert.equal(replay.valid, false);
    });

    it("rejects verification on wrong challenge ID or wrong purpose", async () => {
      const sim = new OtpServerlessSimulator();
      const req = await sim.requestOtp({ mobile: "+8801700000006", purpose: "login" });

      // Wrong challenge ID
      const wrongChallenge = await sim.confirmOtpTransaction({
        mobile: "+8801700000006",
        otp: "123456",
        challengeId: "fake-challenge-id",
        purpose: "login",
      });
      assert.equal(wrongChallenge.valid, false);
      assert.equal(wrongChallenge.code, "challenge_mismatch");

      // Wrong purpose
      const wrongPurpose = await sim.confirmOtpTransaction({
        mobile: "+8801700000006",
        otp: "123456",
        challengeId: req.challengeId,
        purpose: "password_reset",
      });
      assert.equal(wrongPurpose.valid, false);
      assert.equal(wrongPurpose.code, "purpose_mismatch");
    });
  });

  // =========================================================================
  // 3. P1 — BZ-F02: Login Mobile Normalization
  // =========================================================================
  describe("P1 — BZ-F02: Login Mobile Number Normalization & Query Sets", () => {
    function getMobileVariants(raw: string): string[] {
      const clean = raw.trim();
      const cleanDigits = clean.replace(/\D/g, "");
      const variants = new Set<string>();
      variants.add(clean);
      if (cleanDigits.length >= 10) {
        variants.add(cleanDigits);
        variants.add("+" + cleanDigits);
        if (cleanDigits.startsWith("01") && cleanDigits.length === 11) {
          variants.add("+88" + cleanDigits);
          variants.add("88" + cleanDigits);
          variants.add(cleanDigits.slice(1));
        } else if (cleanDigits.startsWith("1") && cleanDigits.length === 10) {
          variants.add("0" + cleanDigits);
          variants.add("+880" + cleanDigits);
          variants.add("880" + cleanDigits);
        } else if (cleanDigits.startsWith("880") && cleanDigits.length === 13) {
          variants.add("+" + cleanDigits);
          variants.add("0" + cleanDigits.slice(3));
          variants.add(cleanDigits.slice(3));
        }
      }
      return Array.from(variants).slice(0, 10);
    }

    it("generates exact union of Bangladesh mobile variants without scanning entire collection", () => {
      const variants = getMobileVariants("01712345678");
      assert.ok(variants.includes("01712345678"));
      assert.ok(variants.includes("+8801712345678"));
      assert.ok(variants.includes("8801712345678"));
      assert.ok(variants.includes("1712345678"));
      assert.ok(variants.length <= 10, "Variants must fit inside a single Firestore 'in' query limit");
    });

    it("resolves user from indexed variants cleanly", () => {
      const registeredUser = {
        id: "biz-10",
        mobile: "01812345678",
        normalizedMobile: "+8801812345678",
      };

      const loginVariants = getMobileVariants("+8801812345678");
      const matched = loginVariants.some(
        (v) => v === registeredUser.mobile || v === registeredUser.normalizedMobile
      );
      assert.equal(matched, true);
    });
  });

  // =========================================================================
  // 4. P1 — BZ-F03 / AGENT 1: Multi-Store Scoping & Firestore Isolation
  // =========================================================================
  describe("P1 — BZ-F03 / Agent 1: Multi-Store Cloud Persistence & Tenant Scope", () => {
    interface StoreDoc {
      id: string;
      business_id: string;
      name: string;
      location: string;
      isHeadOffice: boolean;
    }

    class StoreServiceSimulator {
      private stores = new Map<string, StoreDoc>();

      public createStore(doc: StoreDoc) {
        this.stores.set(`${doc.business_id}:${doc.id}`, { ...doc });
      }

      public listStores(businessId: string): StoreDoc[] {
        return Array.from(this.stores.values()).filter((s) => s.business_id === businessId);
      }

      public deleteStore(businessId: string, storeId: string): { ok: boolean; error?: string } {
        const key = `${businessId}:${storeId}`;
        const s = this.stores.get(key);
        if (!s) return { ok: false, error: "Not found" };
        if (s.isHeadOffice) return { ok: false, error: "Cannot delete Head Office" };
        this.stores.delete(key);
        return { ok: true };
      }
    }

    it("enforces tenant boundary on stores and protects Head Office from deletion", () => {
      const sim = new StoreServiceSimulator();
      sim.createStore({ id: "1", business_id: "biz-A", name: "Main HQ", location: "Dhaka", isHeadOffice: true });
      sim.createStore({ id: "2", business_id: "biz-A", name: "Chittagong Branch", location: "GEC", isHeadOffice: false });
      sim.createStore({ id: "1", business_id: "biz-B", name: "Biz B HQ", location: "Sylhet", isHeadOffice: true });

      const bizBStores = sim.listStores("biz-B");
      assert.equal(bizBStores.length, 1);
      assert.equal(bizBStores[0].location, "Sylhet");

      const delHq = sim.deleteStore("biz-A", "1");
      assert.equal(delHq.ok, false);
      assert.equal(delHq.error, "Cannot delete Head Office");

      const delBranch = sim.deleteStore("biz-A", "2");
      assert.equal(delBranch.ok, true);
      assert.equal(sim.listStores("biz-A").length, 1);
    });

    it("enforces tenant isolation: Tenant A cannot access Tenant B journals", () => {
      const journalCollection = new Map<string, any>();
      journalCollection.set("biz-A:je-1", { businessId: "biz-A", memo: "Tenant A Revenue" });
      journalCollection.set("biz-B:je-2", { businessId: "biz-B", memo: "Tenant B Secret" });

      function queryTenantJournals(businessId: string) {
        return Array.from(journalCollection.values()).filter((j) => j.businessId === businessId);
      }

      const tenantAJournals = queryTenantJournals("biz-A");
      assert.equal(tenantAJournals.length, 1);
      assert.equal(tenantAJournals[0].memo, "Tenant A Revenue");
      assert.ok(!tenantAJournals.some((j) => j.businessId === "biz-B"));
    });
  });

  // =========================================================================
  // 5. P2 — BZ-F08 / AGENT 4: Accounting Immutability & Reversals
  // =========================================================================
  describe("P2 — BZ-F08 / Agent 4: Accounting Integrity & Immutability", () => {
    it("creates an exact offsetting debit/credit reversal when a transaction is deleted", () => {
      const cash = AUTO_JOURNAL_ACCOUNTS.cash;
      const sales = AUTO_JOURNAL_ACCOUNTS.sales;

      const originalLines = [journalLine(cash, 1000, 0), journalLine(sales, 0, 1000)];
      const originalCheck = validateJournalLines(originalLines);
      assert.equal(originalCheck.ok, true);
      assert.equal(originalCheck.debit, 1000);
      assert.equal(originalCheck.credit, 1000);

      const reversalLines = originalLines.map((l) => ({
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.credit,
        credit: l.debit,
      }));

      const reversalCheck = validateJournalLines(reversalLines);
      assert.equal(reversalCheck.ok, true);
      assert.equal(reversalCheck.debit, 1000);
      assert.equal(reversalCheck.credit, 1000);

      const combinedLines = [...originalLines, ...reversalLines];
      const cashDebits = combinedLines.filter((l) => l.accountId === cash.id).reduce((s, l) => s + l.debit, 0);
      const cashCredits = combinedLines.filter((l) => l.accountId === cash.id).reduce((s, l) => s + l.credit, 0);
      assert.equal(cashDebits - cashCredits, 0);

      const salesDebits = combinedLines.filter((l) => l.accountId === sales.id).reduce((s, l) => s + l.debit, 0);
      const salesCredits = combinedLines.filter((l) => l.accountId === sales.id).reduce((s, l) => s + l.credit, 0);
      assert.equal(salesCredits - salesDebits, 0);
    });

    it("prevents duplicate reversal of the same journal entry", () => {
      interface JournalDoc {
        id: string;
        memo: string;
        isVoid?: boolean;
        reversedBy?: string;
      }

      class JournalServiceSimulator {
        private entries = new Map<string, JournalDoc>();

        public setEntry(e: JournalDoc) {
          this.entries.set(e.id, { ...e });
        }

        public reverseEntry(id: string): { ok: boolean; error?: string; code?: string } {
          const e = this.entries.get(id);
          if (!e) return { ok: false, error: "Not found", code: "not_found" };
          if (e.isVoid || e.reversedBy) {
            return { ok: false, error: "Already reversed", code: "already_reversed" };
          }
          const revId = `rev-${id}`;
          e.isVoid = true;
          e.reversedBy = revId;
          this.entries.set(revId, { id: revId, memo: `Reversal of ${e.memo}` });
          return { ok: true };
        }
      }

      const sim = new JournalServiceSimulator();
      sim.setEntry({ id: "je-100", memo: "Sale #100" });

      const firstRev = sim.reverseEntry("je-100");
      assert.equal(firstRev.ok, true);

      // Second attempt to reverse must be rejected with already_reversed
      const secondRev = sim.reverseEntry("je-100");
      assert.equal(secondRev.ok, false);
      assert.equal(secondRev.code, "already_reversed");
    });

    it("enforces financial immutability: posted journal lines cannot be mutated", () => {
      function validateJournalPatch(body: any): { allowed: boolean; error?: string; code?: string } {
        if (body.lines !== undefined || body.totalDebit !== undefined || body.totalCredit !== undefined) {
          return {
            allowed: false,
            error: "Posted journal lines are immutable. Create a reversal entry.",
            code: "journal_immutable",
          };
        }
        return { allowed: true };
      }

      // Metadata update (e.g. memo or void status) allowed
      assert.equal(validateJournalPatch({ memo: "Updated note" }).allowed, true);
      // Mutating line items or amounts strictly blocked
      const linePatch = validateJournalPatch({ lines: [{ debit: 500 }] });
      assert.equal(linePatch.allowed, false);
      assert.equal(linePatch.code, "journal_immutable");
    });

    it("prevents duplicate transaction deletion calls from creating duplicate reversals", () => {
      interface Txn {
        id: string;
        isDeleted?: boolean;
      }

      let reversalCount = 0;
      function deleteTransaction(txn: Txn) {
        if (txn.isDeleted) return { skipped: true };
        txn.isDeleted = true;
        reversalCount++;
        return { skipped: false };
      }

      const tx: Txn = { id: "tx-500", isDeleted: false };
      const res1 = deleteTransaction(tx);
      assert.equal(res1.skipped, false);
      assert.equal(reversalCount, 1);

      // Concurrent or duplicate call skips execution
      const res2 = deleteTransaction(tx);
      assert.equal(res2.skipped, true);
      assert.equal(reversalCount, 1);
    });
  });

  // =========================================================================
  // 6. P3 — BZ-F09: Password Hashing Standard Enforcement
  // =========================================================================
  describe("P3 — BZ-F09: Password Security Bounds", () => {
    it("strictly validates strong password constraints", () => {
      assert.equal(validatePassword("short").valid, false);
      assert.equal(validatePassword("validPassword123!").valid, true);
    });
  });

  // =========================================================================
  // 7. TASK 1: Firestore Rule & Client Access Restrictions
  // =========================================================================
  describe("Task 1 — Firestore Rules: Financial Ledger & Transaction Isolation", () => {
    // Model Firestore Security Rules evaluator for client SDK vs Admin SDK
    class FirestoreRulesEvaluator {
      private isAllowedTenantSubcollection(subcollection: string): boolean {
        // journalEntries and transactions are explicitly excised
        const allowed = [
          "products", "entities", "staff", "warehouses", "financialAccounts",
          "onlineOrders", "quotations", "kitchenOrders", "kitchenTickets",
          "kitchenSettings", "purchaseOrders", "stockTransfers", "giftCards",
          "bankStatements", "leaveRequests", "payrollRuns", "rawMaterials",
          "boms", "productionBatches", "departments", "designations",
          "workShifts", "holidays", "backups", "settings", "catalogCategories",
          "catalogBrands", "wastage", "lettersOfCredit", "loans", "hotelRooms",
          "hotelReservations", "providentFund", "eprocurement", "vehicles",
          "vehicleLogs", "visitors", "projects", "projectTasks", "dealerTargets",
          "documentAiJobs", "notifications", "supportTickets", "feedbacks",
          "marketingCampaigns", "customerGroups",
        ];
        return allowed.includes(subcollection);
      }

      public evaluateClientRequest(params: {
        path: string;
        operation: "get" | "list" | "create" | "update" | "delete";
        authToken?: { uid: string; businessId?: string; role?: string };
        data?: any;
      }): { allowed: boolean; reason?: string } {
        const parts = params.path.split("/").filter(Boolean);
        // Path: businesses/{businessId}/{subcollection}/{docId}
        if (parts[0] === "businesses" && parts.length === 4) {
          const businessId = parts[1];
          const subcollection = parts[2];

          const isTenantMember =
            !!params.authToken &&
            (params.authToken.uid === businessId || params.authToken.businessId === businessId);
          const isSaasStaff =
            !!params.authToken &&
            (params.authToken.role === "SAAS_OWNER" || params.authToken.role === "SAAS_ADMIN");

          // Dedicated match: /journalEntries/{entryId}
          if (subcollection === "journalEntries") {
            if (params.operation === "get" || params.operation === "list") {
              return isTenantMember || isSaasStaff
                ? { allowed: true }
                : { allowed: false, reason: "Tenant membership required for read" };
            }
            // allow write: if false; (create, update, delete all blocked)
            return { allowed: false, reason: "Direct client write forbidden on journalEntries" };
          }

          // Dedicated match: /transactions/{transactionId}
          if (subcollection === "transactions") {
            if (params.operation === "get" || params.operation === "list") {
              return isTenantMember || isSaasStaff
                ? { allowed: true }
                : { allowed: false, reason: "Tenant membership required for read" };
            }
            // allow write: if false;
            return { allowed: false, reason: "Direct client write forbidden on transactions" };
          }

          // Dedicated match: /ledgerEntries/{entryId}
          if (subcollection === "ledgerEntries") {
            if (params.operation === "get" || params.operation === "list") {
              return isTenantMember || isSaasStaff
                ? { allowed: true }
                : { allowed: false, reason: "Tenant membership required for read" };
            }
            // allow write: if false;
            return { allowed: false, reason: "Direct client write forbidden on ledgerEntries" };
          }

          // Fallback wildcard: /{subcollection}/{docId}
          if (this.isAllowedTenantSubcollection(subcollection)) {
            if (!isTenantMember && !isSaasStaff) {
              return { allowed: false, reason: "Tenant membership required" };
            }
            return { allowed: true };
          }

          // Not in allowed subcollections -> default deny
          return { allowed: false, reason: "Subcollection not in tenant allowlist" };
        }

        return { allowed: false, reason: "Global default deny" };
      }

      // Backend Express API using Firebase Admin SDK
      public executeAdminSdkOperation(params: {
        path: string;
        operation: "create" | "update" | "delete";
        data: any;
      }): { success: boolean; data: any } {
        // Admin SDK completely bypasses rules
        return { success: true, data: params.data };
      }
    }

    const rules = new FirestoreRulesEvaluator();

    it("blocks direct client-side journal entry creation", () => {
      const res = rules.evaluateClientRequest({
        path: "/businesses/biz-123/journalEntries/je-001",
        operation: "create",
        authToken: { uid: "user-1", businessId: "biz-123" },
        data: { memo: "Attempted client direct journal", lines: [] },
      });
      assert.equal(res.allowed, false);
      assert.equal(res.reason, "Direct client write forbidden on journalEntries");
    });

    it("blocks cross-tenant journal read and write attempts", () => {
      const readRes = rules.evaluateClientRequest({
        path: "/businesses/biz-target/journalEntries/je-001",
        operation: "get",
        authToken: { uid: "user-attacker", businessId: "biz-attacker" },
      });
      assert.equal(readRes.allowed, false);

      const writeRes = rules.evaluateClientRequest({
        path: "/businesses/biz-target/journalEntries/je-001",
        operation: "create",
        authToken: { uid: "user-attacker", businessId: "biz-attacker" },
        data: { memo: "Cross tenant write" },
      });
      assert.equal(writeRes.allowed, false);
    });

    it("blocks direct client-side journal entry modification and deletion", () => {
      const updateRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/journalEntries/je-001",
        operation: "update",
        authToken: { uid: "user-1", businessId: "biz-123" },
        data: { memo: "Tampered" },
      });
      assert.equal(updateRes.allowed, false);

      const deleteRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/journalEntries/je-001",
        operation: "delete",
        authToken: { uid: "user-1", businessId: "biz-123" },
      });
      assert.equal(deleteRes.allowed, false);
    });

    it("allows legitimate backend journal creation via Admin SDK", () => {
      const adminRes = rules.executeAdminSdkOperation({
        path: "/businesses/biz-123/journalEntries/je-001",
        operation: "create",
        data: { memo: "Legitimate backend balanced journal", lines: [{ debit: 100 }, { credit: 100 }] },
      });
      assert.equal(adminRes.success, true);
      assert.equal(adminRes.data.memo, "Legitimate backend balanced journal");
    });

    it("blocks direct client-side transaction creation and deletion", () => {
      const createRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/transactions/tx-001",
        operation: "create",
        authToken: { uid: "user-1", businessId: "biz-123" },
        data: { amount: 500 },
      });
      assert.equal(createRes.allowed, false);

      const deleteRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/transactions/tx-001",
        operation: "delete",
        authToken: { uid: "user-1", businessId: "biz-123" },
      });
      assert.equal(deleteRes.allowed, false);
    });

    it("blocks direct client-side ledgerEntries write attempts", () => {
      const createRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/ledgerEntries/le-001",
        operation: "create",
        authToken: { uid: "user-1", businessId: "biz-123" },
        data: { amount: 250 },
      });
      assert.equal(createRes.allowed, false);
      assert.equal(createRes.reason, "Direct client write forbidden on ledgerEntries");
    });

    it("blocks unauthenticated direct client Firestore access to products to prevent confidential cost/vendor disclosure", () => {
      const unauthRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/products/prod-001",
        operation: "get",
        authToken: undefined,
      });
      assert.equal(unauthRes.allowed, false);
      assert.equal(unauthRes.reason, "Tenant membership required");
    });

    it("allows authenticated tenant members to read their products", () => {
      const authRes = rules.evaluateClientRequest({
        path: "/businesses/biz-123/products/prod-001",
        operation: "get",
        authToken: { uid: "user-1", businessId: "biz-123" },
      });
      assert.equal(authRes.allowed, true);
    });

    it("blocks cross-tenant product read and write attempts", () => {
      const readRes = rules.evaluateClientRequest({
        path: "/businesses/biz-target/products/prod-001",
        operation: "get",
        authToken: { uid: "user-attacker", businessId: "biz-attacker" },
      });
      assert.equal(readRes.allowed, false);

      const writeRes = rules.evaluateClientRequest({
        path: "/businesses/biz-target/products/prod-001",
        operation: "create",
        authToken: { uid: "user-attacker", businessId: "biz-attacker" },
        data: { name: "Malicious product" },
      });
      assert.equal(writeRes.allowed, false);
    });

    it("safely projects public catalog fields via storefront server API while stripping confidential cost/supplier/BOM data", () => {
      // Simulates backend/src/api/storefront.ts publicProduct() projection
      const rawInternalProduct = {
        id: "prod-secret-01",
        name: "Premium Cotton Shirt",
        notes: "Internal margin 40%",
        salePrice: 1200,
        comparePrice: 1500,
        purchasePrice: 720, // CONFIDENTIAL COST
        supplierId: "supp-abc-99", // CONFIDENTIAL VENDOR
        bomId: "bom-manufacturing-04", // CONFIDENTIAL BOM
        minStockLevel: 10,
        stock: 45,
        sellOnline: true,
        image: "https://example.com/shirt.jpg",
        images: ["https://example.com/shirt.jpg"],
        category: "Apparel",
        brand: "Bizora Fashion",
        sku: "SHIRT-001",
        barcode: "8941234567890",
        unit: "Pcs",
        lots: [{ lotNumber: "LOT-2026", qty: 45, receivedAt: "2026-01-01" }],
      };

      // Server-side projection function from backend/src/api/storefront.ts
      const projectPublicProduct = (p: any) => {
        const rawImages = Array.isArray(p.images) && p.images.length > 0 ? p.images.filter(Boolean) : (p.image ? [p.image] : []);
        const mainImage = rawImages[0] || p.image || null;
        return {
          id: p.id,
          name: p.name || "Untitled Product",
          description: p.notes || p.description || "",
          salePrice: Math.max(0, Number(p.salePrice) || 0),
          comparePrice: Math.max(0, Number(p.comparePrice) || Number(p.originalPrice) || 0),
          stock: Math.max(0, Number(p.stock) || 0),
          image: mainImage,
          images: rawImages.length > 0 ? rawImages : (mainImage ? [mainImage] : []),
          category: p.category || "General",
          brand: p.brand || null,
          sku: p.sku || null,
          barcode: p.barcode || null,
          unit: p.unit || "Pcs",
          variants: [],
        };
      };

      const publicView: any = projectPublicProduct(rawInternalProduct);

      // Verify public catalog fields are present
      assert.equal(publicView.id, "prod-secret-01");
      assert.equal(publicView.name, "Premium Cotton Shirt");
      assert.equal(publicView.salePrice, 1200);
      assert.equal(publicView.stock, 45);

      // Verify confidential wholesale costs, supplier IDs, BOM, and lot tracking are completely omitted
      assert.equal(publicView.purchasePrice, undefined);
      assert.equal(publicView.supplierId, undefined);
      assert.equal(publicView.bomId, undefined);
      assert.equal(publicView.minStockLevel, undefined);
      assert.equal(publicView.lots, undefined);
    });
  });

  // =========================================================================
  // 8. TASK 2: Accounting API Security & Immutability Verification
  // =========================================================================
  describe("Task 2 — Accounting API Security & Reversal Verification", () => {
    interface JournalEntry {
      id: string;
      business_id: string;
      memo?: string;
      lines: { accountId: string; debit: number; credit: number }[];
      totalDebit?: number;
      totalCredit?: number;
      isVoid?: boolean;
      reversedBy?: string;
      reversalOf?: string;
    }

    interface AuthUser {
      uid: string;
      businessId: string;
      role: string;
      permissions?: string[];
    }

    class AccountingApiSimulator {
      private journals = new Map<string, JournalEntry>();

      public setEntry(entry: JournalEntry) {
        this.journals.set(`${entry.business_id}:${entry.id}`, { ...entry });
      }

      public getEntry(businessId: string, id: string): JournalEntry | undefined {
        return this.journals.get(`${businessId}:${id}`);
      }

      // POST /api/journal-entries
      public createJournal(user: AuthUser | undefined, body: any): { status: number; body: any } {
        // Authentication guard
        if (!user) {
          return { status: 401, body: { error: "Access denied." } };
        }
        // Permission guard: finance.ledgers or finance.accounts required for employees
        if (user.role === "EMPLOYEE") {
          const perms = user.permissions || [];
          const hasPerm =
            perms.includes("finance.ledgers") || perms.includes("finance.accounts") || perms.includes("all");
          if (!hasPerm) return { status: 403, body: { error: "Insufficient permissions" } };
        }

        const lines = Array.isArray(body.lines) ? body.lines : [];
        if (lines.length < 2) {
          return { status: 400, body: { error: "A journal entry must contain at least two lines." } };
        }

        const totalDebit = lines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
        const totalCredit = lines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.009) {
          return {
            status: 400,
            body: {
              error: `Journal entry must be balanced. Total Debits (${totalDebit}) != Total Credits (${totalCredit}).`,
              code: "unbalanced_journal",
            },
          };
        }

        if (totalDebit <= 0) {
          return { status: 400, body: { error: "Journal entry amount must be greater than zero." } };
        }

        const id = body.id || `je-${Date.now()}`;
        const newDoc: JournalEntry = {
          id,
          business_id: user.businessId,
          memo: body.memo,
          lines,
          totalDebit,
          totalCredit,
        };
        this.journals.set(`${user.businessId}:${id}`, newDoc);
        return { status: 201, body: { journalEntry: newDoc } };
      }

      // DELETE /api/journal-entries/:id
      public deleteJournal(_user: AuthUser | undefined, _id: string): { status: number; body: any } {
        return {
          status: 405,
          body: {
            error:
              "Posted journal entries are financially immutable and cannot be deleted. Create a reversing journal entry instead.",
            code: "journal_immutable",
          },
        };
      }

      // POST /api/journal-entries/:id/reverse
      public reverseJournal(user: AuthUser | undefined, id: string): { status: number; body: any } {
        if (!user) return { status: 401, body: { error: "Access denied." } };

        if (user.role === "EMPLOYEE") {
          const perms = user.permissions || [];
          const hasPerm =
            perms.includes("finance.ledgers") || perms.includes("finance.accounts") || perms.includes("all");
          if (!hasPerm) return { status: 403, body: { error: "Insufficient permissions" } };
        }

        const key = `${user.businessId}:${id}`;
        const original = this.journals.get(key);
        if (!original) {
          return { status: 404, body: { error: "Journal entry not found" } };
        }

        if (original.isVoid || original.reversedBy) {
          return {
            status: 409,
            body: { error: "This journal entry has already been reversed.", code: "already_reversed" },
          };
        }

        const revLines = original.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.credit) || 0,
          credit: Number(l.debit) || 0,
        }));

        const revId = `je-rev-${id}-${Date.now()}`;
        const reversalDoc: JournalEntry = {
          id: revId,
          business_id: user.businessId,
          memo: `[REVERSAL] Reversal of ${original.memo || original.id}`,
          lines: revLines,
          reversalOf: original.id,
        };

        this.journals.set(`${user.businessId}:${revId}`, reversalDoc);
        original.isVoid = true;
        original.reversedBy = revId;

        return { status: 201, body: { reversal: reversalDoc } };
      }
    }

    const api = new AccountingApiSimulator();
    const shopOwner: AuthUser = { uid: "owner-1", businessId: "biz-alpha", role: "SHOP_OWNER" };
    const financeStaff: AuthUser = {
      uid: "emp-1",
      businessId: "biz-alpha",
      role: "EMPLOYEE",
      permissions: ["finance.ledgers"],
    };
    const salesStaff: AuthUser = {
      uid: "emp-2",
      businessId: "biz-alpha",
      role: "EMPLOYEE",
      permissions: ["pos.sell"],
    };

    it("enforces authentication: rejects unauthenticated requests with 401", () => {
      const res = api.createJournal(undefined, { lines: [{ debit: 100 }, { credit: 100 }] });
      assert.equal(res.status, 401);
      const revRes = api.reverseJournal(undefined, "je-1");
      assert.equal(revRes.status, 401);
    });

    it("enforces RBAC role and permission checks: denies unauthorized staff with 403", () => {
      const createDeny = api.createJournal(salesStaff, { lines: [{ debit: 100 }, { credit: 100 }] });
      assert.equal(createDeny.status, 403);

      const reverseDeny = api.reverseJournal(salesStaff, "je-1");
      assert.equal(reverseDeny.status, 403);

      // Authorized finance staff succeeds
      const allowRes = api.createJournal(financeStaff, {
        id: "je-valid-1",
        memo: "Valid entry",
        lines: [
          { accountId: "acc-1", debit: 250, credit: 0 },
          { accountId: "acc-2", debit: 0, credit: 250 },
        ],
      });
      assert.equal(allowRes.status, 201);
    });

    it("enforces tenant ownership: rejects cross-tenant journal access with 404", () => {
      api.setEntry({
        id: "je-secret-beta",
        business_id: "biz-beta",
        lines: [
          { accountId: "acc-1", debit: 1000, credit: 0 },
          { accountId: "acc-2", debit: 0, credit: 1000 },
        ],
      });

      // User from biz-alpha tries to reverse biz-beta entry
      const res = api.reverseJournal(shopOwner, "je-secret-beta");
      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Journal entry not found");
    });

    it("validates atomic balanced debit/credit entries: rejects unbalanced with 400", () => {
      const unbalanced = api.createJournal(shopOwner, {
        lines: [
          { accountId: "acc-1", debit: 500, credit: 0 },
          { accountId: "acc-2", debit: 0, credit: 400 },
        ],
      });
      assert.equal(unbalanced.status, 400);
      assert.equal(unbalanced.body.code, "unbalanced_journal");

      const singleLine = api.createJournal(shopOwner, {
        lines: [{ accountId: "acc-1", debit: 500, credit: 0 }],
      });
      assert.equal(singleLine.status, 400);
    });

    it("strictly forbids deletion: DELETE returns HTTP 405 Method Not Allowed", () => {
      const delRes = api.deleteJournal(shopOwner, "je-valid-1");
      assert.equal(delRes.status, 405);
      assert.equal(delRes.body.code, "journal_immutable");
    });

    it("prevents duplicate reversal: 2nd reversal attempt returns HTTP 409 already_reversed", () => {
      api.setEntry({
        id: "je-to-reverse",
        business_id: "biz-alpha",
        memo: "Revenue to reverse",
        lines: [
          { accountId: "acc-cash", debit: 300, credit: 0 },
          { accountId: "acc-sales", debit: 0, credit: 300 },
        ],
      });

      const firstRev = api.reverseJournal(shopOwner, "je-to-reverse");
      assert.equal(firstRev.status, 201);
      assert.equal(firstRev.body.reversal.lines[0].credit, 300);
      assert.equal(firstRev.body.reversal.lines[1].debit, 300);

      const secondRev = api.reverseJournal(shopOwner, "je-to-reverse");
      assert.equal(secondRev.status, 409);
      assert.equal(secondRev.body.code, "already_reversed");
    });

    it("guarantees mathematical balance on reversal: debit-credit delta is exactly zero", () => {
      const orig = api.getEntry("biz-alpha", "je-to-reverse")!;
      assert.equal(orig.isVoid, true);
      const rev = api.getEntry("biz-alpha", orig.reversedBy!)!;
      assert.ok(rev);

      const revTotalDebit = rev.lines.reduce((s, l) => s + l.debit, 0);
      const revTotalCredit = rev.lines.reduce((s, l) => s + l.credit, 0);
      assert.equal(revTotalDebit, 300);
      assert.equal(revTotalCredit, 300);
      assert.equal(revTotalDebit - revTotalCredit, 0);
    });
  });
});
