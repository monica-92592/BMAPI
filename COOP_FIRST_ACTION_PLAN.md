# Co-op First Action Plan

**Your Growth Strategy**: Co-op members evangelize because they benefit financially.

---

## ✅ What EXISTS (Foundation)

### Revenue Sharing Logic
- ✅ Pool revenue calculation (`calculatePoolDistribution`)
- ✅ Member distribution based on contribution %
- ✅ Chargeback reserves per member
- ✅ Pool earnings visible in financial dashboard (`/api/business/financial/pool-earnings`)

### Pool Management
- ✅ Create pools (`POST /api/collections`)
- ✅ View pools (`GET /api/collections`)
- ✅ Pool details (`GET /api/collections/:id`)
- ✅ Update pools (`PUT /api/collections/:id`)

### Payouts
- ✅ Manual payout requests (`POST /api/business/payouts/request`)
- ✅ Stripe Connect onboarding

---

## ❌ What's MISSING (Critical for Co-op Growth)

### 1. Pool Member Management (CRITICAL)
- ❌ **Invite members to pools** - Routes commented out
- ❌ **Join pool endpoint** - `POST /api/collections/:id/join` (commented)
- ❌ **Leave pool endpoint** - `POST /api/collections/:id/leave` (commented)
- ❌ **Get pool members** - `GET /api/collections/:id/members` (commented)
- ❌ **Set contribution percentages** - No endpoint to update member contributions

### 2. Automatic Payouts (CRITICAL)
- ❌ **Automatic payouts to pool members** - Only manual payout exists
- ❌ **Per-member payout tracking** - No way to see individual member payouts
- ❌ **Payout scheduling** - No automatic payout when threshold reached

### 3. Real-Time Revenue Visibility (HIGH PRIORITY)
- ⚠️ **Pool earnings endpoint exists** but needs enhancement
- ❌ **Member-specific revenue dashboard** - Show each member their share
- ❌ **Real-time updates** - WebSocket or polling for live revenue updates
- ❌ **Revenue attribution** - Which member's media drove which sale?

### 4. Member Promotion Tools (HIGH PRIORITY)
- ❌ **Member-specific API keys** - Each member gets their own key
- ❌ **Embeddable media player** - `<iframe src=".../embed/pool/abc123">`
- ❌ **Shareable pool pages** - Public landing pages for each pool
- ❌ **Referral tracking** - Which member drove which integration?
- ❌ **Revenue attribution** - Member gets credit for integrations they bring

### 5. Simple Integration Options (MEDIUM PRIORITY)
- ❌ **WordPress plugin** - Not started
- ❌ **Embed code generator** - Not started
- ❌ **Zapier integration** - Not started
- ❌ **Webflow/Squarespace widgets** - Not started

---

## 🎯 Immediate Action Plan

### Week 1: Verify & Fix Foundation (CRITICAL)

#### Day 1-2: Test Pool Revenue Flow
- [ ] **Test end-to-end revenue flow:**
  ```
  Sale happens → Revenue calculated → Split among pool members → 
  Each member sees their share → Payouts sent to each Stripe account
  ```
- [ ] **Verify pool earnings endpoint** (`/api/business/financial/pool-earnings`)
- [ ] **Test with 3-member pool** - Verify distribution works
- [ ] **Test chargeback reserves** - Verify reserves calculated per member

#### Day 3-4: Fix Pool Member Management
- [ ] **Uncomment and implement** `POST /api/collections/:id/join`
- [ ] **Uncomment and implement** `POST /api/collections/:id/leave`
- [ ] **Uncomment and implement** `GET /api/collections/:id/members`
- [ ] **Add** `POST /api/collections/:id/invite` - Invite member by email
- [ ] **Add** `PUT /api/collections/:id/members/:memberId` - Update contribution %
- [ ] **Add** `DELETE /api/collections/:id/members/:memberId` - Remove member

#### Day 5: Automatic Payouts
- [ ] **Create** automatic payout job/cron
- [ ] **Add** payout threshold per member (e.g., $25 minimum)
- [ ] **Add** payout scheduling (daily/weekly)
- [ ] **Add** per-member payout tracking
- [ ] **Test** automatic payouts to all pool members

---

### Week 2: Member Promotion Tools (HIGH PRIORITY)

#### Day 1-2: Member-Specific API Keys
- [ ] **Add** `apiKey` field to Business model
- [ ] **Add** `POST /api/business/api-keys` - Generate API key
- [ ] **Add** `GET /api/business/api-keys` - List API keys
- [ ] **Add** `DELETE /api/business/api-keys/:id` - Revoke API key
- [ ] **Add** API key authentication middleware (alternative to JWT)
- [ ] **Add** usage tracking per API key

#### Day 3-4: Embeddable Media Player
- [ ] **Create** `GET /embed/pool/:id` - Embeddable pool page
- [ ] **Create** `GET /embed/media/:id` - Embeddable media player
- [ ] **Add** iframe-friendly CSS
- [ ] **Add** embed code generator in UI
- [ ] **Add** referral tracking (track which member's embed drove sale)

#### Day 5: Shareable Pool Pages
- [ ] **Create** `GET /pools/:id` - Public pool landing page
- [ ] **Add** pool slug/URL (e.g., `/pools/best-stock-photos`)
- [ ] **Add** public pool browsing
- [ ] **Add** "Powered by MediaAPI" branding
- [ ] **Add** member attribution (show which members are in pool)

---

### Week 3: Referral & Attribution (HIGH PRIORITY)

#### Day 1-2: Referral Tracking
- [ ] **Add** `referralCode` field to Business model
- [ ] **Add** `referredBy` field to Business model
- [ ] **Add** `POST /api/business/referral-code` - Generate referral code
- [ ] **Add** referral tracking in registration
- [ ] **Add** referral tracking in API key usage

#### Day 3-4: Revenue Attribution
- [ ] **Add** `attributedTo` field to Transaction model
- [ ] **Add** attribution tracking in license payments
- [ ] **Add** attribution tracking in API usage
- [ ] **Add** member dashboard showing attributed revenue
- [ ] **Add** bonus % for members who bring integrations

#### Day 5: Analytics Dashboard
- [ ] **Add** `GET /api/business/analytics` - Member analytics
- [ ] **Show** revenue by source (direct, referral, integration)
- [ ] **Show** API usage stats
- [ ] **Show** referral performance
- [ ] **Show** integration attribution

---

### Week 4: Simple Integrations (MEDIUM PRIORITY)

#### Day 1-2: WordPress Plugin
- [ ] **Create** WordPress plugin structure
- [ ] **Add** API key configuration
- [ ] **Add** pool browser
- [ ] **Add** media embed shortcode
- [ ] **Add** automatic licensing

#### Day 3: Embed Code Generator
- [ ] **Create** embed code generator UI
- [ ] **Add** customizable embed options
- [ ] **Add** preview functionality
- [ ] **Add** copy-to-clipboard

#### Day 4-5: Documentation & Guides
- [ ] **Create** integration guides for common platforms
- [ ] **Create** video tutorials
- [ ] **Create** code examples
- [ ] **Create** FAQ for co-op members

---

## 📊 Success Metrics

### Week 1 Metrics
- ✅ Pool revenue flow works end-to-end
- ✅ Members can join/leave pools
- ✅ Automatic payouts work

### Week 2 Metrics
- ✅ Each member has API key
- ✅ Embeddable player works
- ✅ Shareable pool pages exist

### Week 3 Metrics
- ✅ Referral tracking works
- ✅ Revenue attribution works
- ✅ Member analytics visible

### Week 4 Metrics
- ✅ WordPress plugin available
- ✅ Embed codes generated
- ✅ Integration guides published

---

## 🚀 Launch Checklist

### Before Beta Launch
- [ ] All Week 1 tasks complete
- [ ] All Week 2 tasks complete
- [ ] At least 3 co-op members onboarded
- [ ] At least 1 pool created with 3+ members
- [ ] Test sale processed and payouts sent
- [ ] Member feedback collected

### Beta Launch
- [ ] Invite first 10 co-op members
- [ ] Create 3-5 pools
- [ ] Get feedback on promotion tools
- [ ] Iterate based on what members actually use

### Public Launch
- [ ] All Week 3 tasks complete
- [ ] All Week 4 tasks complete
- [ ] 50+ co-op members
- [ ] 10+ active pools
- [ ] 100+ integrations
- [ ] $10K+ in member payouts

---

## 💡 Key Insights

### Your Competitive Advantage
**Traditional API Model:**
- Company → Developer docs → Hope developers adopt

**Your Co-op Model:**
- Co-op members have financial incentive to push adoption
- Members know their audiences (photographers, designers, creators)
- Members can evangelize in their communities
- Members become integration partners

### Growth Strategy
1. **Make co-op members successful** (revenue sharing works perfectly)
2. **Give members tools to grow the network** (embeds, widgets, referral tracking)
3. **Make integration dead simple** (WordPress plugin, embed codes)
4. **Track what works** (which members drive most integrations?)

---

## ❓ Critical Questions

1. **Do you have your first co-op members yet?**
   - If yes: What do they need most?
   - If no: What's blocking them from joining?

2. **What's your biggest risk right now?**
   - Revenue flow not working?
   - No way to invite members?
   - No promotion tools?

3. **What would make a co-op member successful?**
   - Seeing their revenue in real-time?
   - Easy way to share their pool?
   - Getting credit for integrations they bring?

---

**Next Step**: Start with Week 1, Day 1-2 - Test the complete pool revenue flow end-to-end.

