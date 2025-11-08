# Revenue Calculation Documentation

## Overview

This document explains how revenue is calculated and distributed in the Business Media API platform. The system uses **Option C Fee Splitting Model**, which ensures fairness for both creators and the platform.

### Option C Fee Splitting Model

**Option C** is a fee splitting model where payment processing fees (Stripe) are deducted **BEFORE** the revenue split between creator and platform. This means both parties share the fee burden proportionally.

#### Why Option C Was Chosen

1. **Fairness**: Both creator and platform share the cost of payment processing proportionally
2. **Transparency**: Clear calculation - fees are deducted first, then revenue is split
3. **Industry Standard**: Common model used by many platforms
4. **Predictability**: Creators know exactly what they'll receive after fees

#### How It's Fair to All Parties

- **Creators**: Pay their share of fees based on their revenue percentage (e.g., 80% of fees if they get 80% of revenue)
- **Platform**: Pays their share of fees based on their revenue percentage (e.g., 20% of fees if they get 20% of revenue)
- **No Hidden Costs**: All fees are transparent and calculated upfront

---

## Fee Flow

### Money Flow Diagram

```
Gross Amount ($100.00)
    ↓
Stripe Fee Deduction (2.9% + $0.30 = $3.20)
    ↓
Net Amount ($96.80)
    ↓
    ├─→ Creator Share (80% = $77.44)
    └─→ Platform Share (20% = $19.36)
```

### Step-by-Step Process

1. **Gross Amount**: The total amount paid by the buyer (e.g., $100.00)
2. **Stripe Fee**: Payment processing fee deducted (2.9% + $0.30)
3. **Net Amount**: Gross amount minus Stripe fee (e.g., $100.00 - $3.20 = $96.80)
4. **Revenue Split**: Net amount split between creator and platform based on tier

### Example Calculation

**For a $100.00 sale on Free Tier (80/20 split):**

- Gross Amount: $100.00
- Stripe Fee: ($100.00 × 0.029) + $0.30 = $3.20
- Net Amount: $100.00 - $3.20 = $96.80
- Creator Share: $96.80 × 0.80 = $77.44
- Platform Share: $96.80 × 0.20 = $19.36
- **Verification**: $77.44 + $19.36 = $96.80 ✓

---

## Tier Splits

The platform offers 4 membership tiers, each with different revenue splits:

| Tier | Creator Share | Platform Share | Monthly Fee | Example ($100 sale) |
|------|---------------|---------------|-------------|---------------------|
| **Free** | 80% | 20% | $0 | Creator: $77.44, Platform: $19.36 |
| **Contributor** | 85% | 15% | $15 | Creator: $82.28, Platform: $14.52 |
| **Partner** | 90% | 10% | $50 | Creator: $87.12, Platform: $9.68 |
| **Equity Partner** | 95% | 5% | $100 | Creator: $91.96, Platform: $4.84 |

### Detailed Examples for $100 Sale

#### Free Tier (80/20 Split)

- Gross Amount: $100.00
- Stripe Fee: $3.20
- Net Amount: $96.80
- Creator Share: $96.80 × 0.80 = **$77.44**
- Platform Share: $96.80 × 0.20 = **$19.36**

#### Contributor Tier (85/15 Split)

- Gross Amount: $100.00
- Stripe Fee: $3.20
- Net Amount: $96.80
- Creator Share: $96.80 × 0.85 = **$82.28**
- Platform Share: $96.80 × 0.15 = **$14.52**

#### Partner Tier (90/10 Split)

- Gross Amount: $100.00
- Stripe Fee: $3.20
- Net Amount: $96.80
- Creator Share: $96.80 × 0.90 = **$87.12**
- Platform Share: $96.80 × 0.10 = **$9.68**

#### Equity Partner Tier (95/5 Split)

- Gross Amount: $100.00
- Stripe Fee: $3.20
- Net Amount: $96.80
- Creator Share: $96.80 × 0.95 = **$91.96**
- Platform Share: $96.80 × 0.05 = **$4.84**

### Tier Comparison

As you move up tiers, creators receive a larger percentage of net revenue:

- **Free → Contributor**: +$4.84 per $100 sale (+6.2%)
- **Contributor → Partner**: +$4.84 per $100 sale (+5.9%)
- **Partner → Equity Partner**: +$4.84 per $100 sale (+5.6%)

---

## Chargeback Reserve

### Overview

A **chargeback reserve** is a percentage of creator earnings held for a specified period to protect the platform from chargeback losses.

### Reserve Details

- **Reserve Percentage**: 5% of creator share
- **Holding Period**: 90 days
- **Immediate Payout**: 95% of creator share
- **Release**: Reserve is released after 90 days if no chargeback occurs

### Why This Protects the Platform

1. **Chargeback Risk**: Credit card disputes can occur up to 90 days after a transaction
2. **Financial Protection**: Reserve covers potential chargeback losses
3. **Fair Distribution**: Only creator share is reserved (platform share is not reserved)
4. **Automatic Release**: Reserve is automatically released after 90 days

### Example Calculation

**For a $100 sale on Free Tier:**

- Creator Share: $77.44
- Reserve Amount: $77.44 × 0.05 = **$3.87**
- Immediate Payout: $77.44 × 0.95 = **$73.57**
- **Verification**: $73.57 + $3.87 = $77.44 ✓
- Release Date: 90 days from transaction date

### Reserve Timeline

```
Transaction Date
    ↓
Immediate Payout (95%) → Creator's Account
    ↓
Reserve Held (5%) → Platform Reserve Account
    ↓
90 Days Later
    ↓
Reserve Released → Creator's Account
```

---

## Pool Distribution

### Overview

**Media Pools** (Collections) allow multiple creators to collaborate and share revenue from licensed media. Revenue is distributed among pool members based on their contribution percentages.

### How Pool Revenue is Calculated

1. **Base Revenue Split**: Calculate total creator share for the pool (same as individual sale)
2. **Member Distribution**: Distribute creator share among members based on contribution percentages
3. **Individual Reserves**: Calculate chargeback reserve for each member's share

### How Member Contributions Work

- Each member has a **contribution percentage** (0-100%)
- All member contributions must total **exactly 100%**
- Each member receives their percentage of the pool's creator share
- Each member has their own chargeback reserve calculated

### Example: 3-Member Pool Distribution

**Pool Setup:**
- Member 1: 40% contribution
- Member 2: 35% contribution
- Member 3: 25% contribution
- **Total**: 100% ✓

**Sale Details:**
- Gross Amount: $100.00
- Tier: Partner (90/10 split)
- Stripe Fee: $3.20
- Net Amount: $96.80
- Pool Creator Share: $87.12

**Distribution:**

| Member | Contribution % | Share | Reserve (5%) | Immediate Payout |
|--------|----------------|-------|---------------|------------------|
| Member 1 | 40% | $34.85 | $1.74 | $33.11 |
| Member 2 | 35% | $30.49 | $1.52 | $28.97 |
| Member 3 | 25% | $21.78 | $1.09 | $20.69 |
| **Total** | **100%** | **$87.12** | **$4.36** | **$82.76** |

**Verification:**
- Total Shares: $34.85 + $30.49 + $21.78 = $87.12 ✓
- Total Reserves: $1.74 + $1.52 + $1.09 = $4.36 ✓
- Total Immediate: $33.11 + $28.97 + $20.69 = $82.76 ✓
- Shares + Reserves = Creator Share: $82.76 + $4.36 = $87.12 ✓

### Pool Distribution Flow

```
Gross Amount ($100.00)
    ↓
Stripe Fee ($3.20)
    ↓
Net Amount ($96.80)
    ↓
Pool Creator Share ($87.12)
    ↓
    ├─→ Member 1 (40%): $34.85
    │   ├─→ Immediate: $33.11
    │   └─→ Reserve: $1.74
    │
    ├─→ Member 2 (35%): $30.49
    │   ├─→ Immediate: $28.97
    │   └─→ Reserve: $1.52
    │
    └─→ Member 3 (25%): $21.78
        ├─→ Immediate: $20.69
        └─→ Reserve: $1.09
```

---

## Formulas

### 1. Stripe Fee Calculation

**Formula:**
```
Stripe Fee = (Gross Amount × 0.029) + 0.30
```

**Example:**
- Gross Amount: $100.00
- Stripe Fee: ($100.00 × 0.029) + $0.30 = $3.20

**Notes:**
- 2.9% is Stripe's standard processing fee for US cards
- $0.30 is Stripe's fixed fee per transaction
- Minimum fee: $0.30 (for very small amounts)

---

### 2. Net Amount Calculation

**Formula:**
```
Net Amount = Gross Amount - Stripe Fee
```

**Example:**
- Gross Amount: $100.00
- Stripe Fee: $3.20
- Net Amount: $100.00 - $3.20 = $96.80

---

### 3. Revenue Split Calculation

**Formula:**
```
Creator Share = Net Amount × (Creator Percentage / 100)
Platform Share = Net Amount × (Platform Percentage / 100)
```

**Example (Free Tier - 80/20):**
- Net Amount: $96.80
- Creator Share: $96.80 × (80 / 100) = $77.44
- Platform Share: $96.80 × (20 / 100) = $19.36
- **Verification**: $77.44 + $19.36 = $96.80 ✓

**Example (Partner Tier - 90/10):**
- Net Amount: $96.80
- Creator Share: $96.80 × (90 / 100) = $87.12
- Platform Share: $96.80 × (10 / 100) = $9.68
- **Verification**: $87.12 + $9.68 = $96.80 ✓

---

### 4. Chargeback Reserve Calculation

**Formula:**
```
Reserve Amount = Creator Share × 0.05
Immediate Payout = Creator Share × 0.95
Release Date = Transaction Date + 90 days
```

**Example:**
- Creator Share: $77.44
- Reserve Amount: $77.44 × 0.05 = $3.87
- Immediate Payout: $77.44 × 0.95 = $73.57
- **Verification**: $73.57 + $3.87 = $77.44 ✓

---

### 5. Pool Member Share Calculation

**Formula:**
```
Member Share = Pool Creator Share × (Member Contribution % / 100)
```

**Example:**
- Pool Creator Share: $87.12
- Member Contribution: 40%
- Member Share: $87.12 × (40 / 100) = $34.85

---

### 6. Pool Distribution Calculation

**Step 1: Calculate Base Revenue Split**
```
Base Revenue Split = calculateRevenueSplit(Gross Amount, Tier Config)
```

**Step 2: Validate Member Contributions**
```
Total Contribution % = Sum of all member contribution percentages
Must equal: 100%
```

**Step 3: Distribute Creator Share**
```
For each member:
  Member Share = Pool Creator Share × (Member Contribution % / 100)
  Member Reserve = Member Share × 0.05
  Member Immediate = Member Share × 0.95
```

**Example (3-Member Pool):**
- Pool Creator Share: $87.12
- Member 1 (40%): $87.12 × 0.40 = $34.85
- Member 2 (35%): $87.12 × 0.35 = $30.49
- Member 3 (25%): $87.12 × 0.25 = $21.78
- **Total**: $34.85 + $30.49 + $21.78 = $87.12 ✓

---

## Complete Calculation Example

### Scenario: $100 Sale on Partner Tier

**Step 1: Calculate Stripe Fee**
```
Stripe Fee = ($100.00 × 0.029) + $0.30
Stripe Fee = $2.90 + $0.30
Stripe Fee = $3.20
```

**Step 2: Calculate Net Amount**
```
Net Amount = $100.00 - $3.20
Net Amount = $96.80
```

**Step 3: Calculate Revenue Split (90/10)**
```
Creator Share = $96.80 × 0.90
Creator Share = $87.12

Platform Share = $96.80 × 0.10
Platform Share = $9.68
```

**Step 4: Calculate Chargeback Reserve**
```
Reserve Amount = $87.12 × 0.05
Reserve Amount = $4.36

Immediate Payout = $87.12 × 0.95
Immediate Payout = $82.76
```

**Final Breakdown:**
- Gross Amount: $100.00
- Stripe Fee: $3.20
- Net Amount: $96.80
- Creator Share: $87.12
  - Immediate Payout: $82.76
  - Reserve: $4.36
- Platform Share: $9.68

**Verification:**
- Net Amount: $87.12 + $9.68 = $96.80 ✓
- Creator Share: $82.76 + $4.36 = $87.12 ✓

---

## Rounding Rules

All monetary amounts are rounded to **2 decimal places** using standard rounding:

- **Round Half Up**: 0.005 rounds up to 0.01
- **Round Half Down**: 0.004 rounds down to 0.00

**Example:**
- $77.444 → $77.44
- $77.445 → $77.45
- $19.362 → $19.36
- $19.365 → $19.37

---

## Validation Rules

### Transaction Validation

1. **Net Amount Validation**
   ```
   Net Amount = Gross Amount - Stripe Fee
   (within 0.01 tolerance)
   ```

2. **Revenue Split Validation**
   ```
   Creator Share + Platform Share = Net Amount
   (within 0.01 tolerance)
   ```

3. **Chargeback Reserve Validation**
   ```
   Immediate Payout + Reserve Amount = Creator Share
   (within 0.01 tolerance)
   ```

### Pool Validation

1. **Contribution Validation**
   ```
   Sum of all member contribution percentages = 100%
   (within 0.01 tolerance)
   ```

2. **Distribution Validation**
   ```
   Sum of all member shares = Pool Creator Share
   (within 0.01 tolerance)
   ```

---

## Implementation Notes

### Code Location

- **Revenue Calculation Utilities**: `src/utils/revenueCalculation.js`
- **Pool Revenue Calculation**: `src/utils/poolRevenueCalculation.js`
- **Tier Configuration**: `src/config/tiers.js`
- **Transaction Model**: `src/models/Transaction.js`

### Key Functions

- `calculateStripeFee(grossAmount)` - Calculate Stripe processing fee
- `calculateRevenueSplit(grossAmount, tierConfig)` - Calculate revenue split
- `calculateChargebackReserve(creatorShare)` - Calculate reserve amounts
- `calculatePoolDistribution(grossAmount, tierConfig, members)` - Calculate pool distribution

### Testing

All revenue calculations are thoroughly tested in:
- `tests/unit/utils/revenueCalculation.test.js`
- `tests/unit/utils/poolRevenueCalculation.test.js`
- `tests/integration/revenueSplit.test.js`

---

## Summary

The revenue calculation system uses **Option C Fee Splitting Model** to ensure fairness and transparency:

1. **Fees First**: Stripe fees are deducted before revenue split
2. **Proportional Split**: Creator and platform share fees proportionally
3. **Tier-Based**: Higher tiers receive larger percentage of net revenue
4. **Reserve Protection**: 5% reserve held for 90 days to protect against chargebacks
5. **Pool Support**: Multiple creators can share revenue based on contribution percentages

All calculations are transparent, predictable, and fair to all parties involved.

---

**Last Updated**: Current  
**Version**: 1.0

