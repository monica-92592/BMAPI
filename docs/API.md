# API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the Business Media API platform. All endpoints return JSON responses and follow RESTful conventions.

### Base URL

```
Production: https://api.businessmedia.com
Development: http://localhost:3000
```

### Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Response Format

All endpoints return responses in the following format:

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

---

## Financial Endpoints

The financial endpoints provide businesses with comprehensive financial data including earnings, transactions, revenue breakdowns, balance information, and pool earnings.

**Base Path:** `/api/business/financial`

All financial endpoints require authentication and return data specific to the authenticated business.

---

### GET /api/business/financial/overview

Get a comprehensive financial overview for the authenticated business.

#### Purpose

Returns a high-level financial summary including:
- Total earnings and spending
- Pending payouts
- Chargeback reserves
- Active licenses count
- Monthly revenue trend (last 12 months)

#### Authentication

**Required:** Yes

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

#### Request

**Method:** `GET`

**URL:** `/api/business/financial/overview`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Query Parameters:** None

#### Response Structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "earnings": {
      "total": 5000.00,
      "transactionCount": 45
    },
    "spending": {
      "total": 150.00,
      "transactionCount": 3
    },
    "pendingPayouts": {
      "total": 250.00,
      "count": 2
    },
    "chargebackReserve": {
      "total": 125.50,
      "transactionCount": 10
    },
    "activeLicenses": 12,
    "monthlyRevenueTrend": [
      {
        "year": 2024,
        "month": 1,
        "revenue": 500.00,
        "transactionCount": 5
      },
      {
        "year": 2024,
        "month": 2,
        "revenue": 750.00,
        "transactionCount": 8
      }
      // ... up to 12 months
    ]
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `earnings.total` | number | Total earnings from all completed transactions (as payee) |
| `earnings.transactionCount` | number | Number of transactions where business received payment |
| `spending.total` | number | Total spending from all completed transactions (as payer) |
| `spending.transactionCount` | number | Number of transactions where business made payment |
| `pendingPayouts.total` | number | Total amount of pending payouts |
| `pendingPayouts.count` | number | Number of pending payout transactions |
| `chargebackReserve.total` | number | Total amount held in chargeback reserve (5% of creator share, held for 90 days) |
| `chargebackReserve.transactionCount` | number | Number of transactions with active reserves |
| `activeLicenses` | number | Current number of active licenses |
| `monthlyRevenueTrend` | array | Array of monthly revenue data for last 12 months |
| `monthlyRevenueTrend[].year` | number | Year of the month |
| `monthlyRevenueTrend[].month` | number | Month (1-12) |
| `monthlyRevenueTrend[].revenue` | number | Total revenue for that month |
| `monthlyRevenueTrend[].transactionCount` | number | Number of transactions in that month |

#### Example Response

```json
{
  "success": true,
  "data": {
    "earnings": {
      "total": 5234.56,
      "transactionCount": 48
    },
    "spending": {
      "total": 150.00,
      "transactionCount": 3
    },
    "pendingPayouts": {
      "total": 250.00,
      "count": 2
    },
    "chargebackReserve": {
      "total": 125.50,
      "transactionCount": 10
    },
    "activeLicenses": 12,
    "monthlyRevenueTrend": [
      {
        "year": 2024,
        "month": 1,
        "revenue": 500.00,
        "transactionCount": 5
      },
      {
        "year": 2024,
        "month": 2,
        "revenue": 750.00,
        "transactionCount": 8
      }
    ]
  }
}
```

---

### GET /api/business/financial/transactions

Get paginated transaction history for the authenticated business.

#### Purpose

Returns a paginated list of all transactions where the business is either the payer or payee. Supports filtering by transaction type and status.

#### Authentication

**Required:** Yes

#### Request

**Method:** `GET`

**URL:** `/api/business/financial/transactions`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (1-indexed) |
| `limit` | number | No | 20 | Items per page (max: 100) |
| `type` | string | No | - | Filter by transaction type: `subscription_payment`, `license_payment`, `payout`, `refund`, `chargeback`, `platform_fee` |
| `status` | string | No | - | Filter by status: `pending`, `completed`, `failed`, `refunded`, `disputed` |

#### Response Structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "type": "license_payment",
        "grossAmount": 100.00,
        "stripeFee": 3.20,
        "netAmount": 96.80,
        "creatorShare": 77.44,
        "platformShare": 19.36,
        "status": "completed",
        "payer": {
          "_id": "507f1f77bcf86cd799439012",
          "companyName": "Buyer Company",
          "email": "buyer@example.com"
        },
        "payee": {
          "_id": "507f1f77bcf86cd799439013",
          "companyName": "Seller Company",
          "email": "seller@example.com"
        },
        "relatedLicense": {
          "_id": "507f1f77bcf86cd799439014",
          "licenseType": "commercial",
          "price": 100.00,
          "status": "active"
        },
        "description": "License payment for media",
        "metadata": {},
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
      // ... more transactions
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `transactions` | array | Array of transaction objects |
| `transactions[]._id` | string | Transaction ID |
| `transactions[].type` | string | Transaction type |
| `transactions[].grossAmount` | number | Gross amount before fees |
| `transactions[].stripeFee` | number | Stripe processing fee |
| `transactions[].netAmount` | number | Net amount after fees |
| `transactions[].creatorShare` | number | Creator's share of revenue |
| `transactions[].platformShare` | number | Platform's share of revenue |
| `transactions[].status` | string | Transaction status |
| `transactions[].payer` | object | Payer business (populated) |
| `transactions[].payee` | object | Payee business (populated) |
| `transactions[].relatedLicense` | object | Related license (populated, if applicable) |
| `transactions[].description` | string | Transaction description |
| `transactions[].metadata` | object | Additional metadata |
| `transactions[].createdAt` | string | Transaction creation date (ISO 8601) |
| `transactions[].updatedAt` | string | Transaction last update date (ISO 8601) |
| `pagination.page` | number | Current page number |
| `pagination.limit` | number | Items per page |
| `pagination.totalCount` | number | Total number of transactions |
| `pagination.totalPages` | number | Total number of pages |
| `pagination.hasNextPage` | boolean | Whether there is a next page |
| `pagination.hasPrevPage` | boolean | Whether there is a previous page |

#### Example Request

```
GET /api/business/financial/transactions?page=1&limit=20&type=license_payment&status=completed
Authorization: Bearer <token>
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "type": "license_payment",
        "grossAmount": 100.00,
        "stripeFee": 3.20,
        "netAmount": 96.80,
        "creatorShare": 77.44,
        "platformShare": 19.36,
        "status": "completed",
        "payer": {
          "_id": "507f1f77bcf86cd799439012",
          "companyName": "Buyer Company",
          "email": "buyer@example.com"
        },
        "payee": {
          "_id": "507f1f77bcf86cd799439013",
          "companyName": "Seller Company",
          "email": "seller@example.com"
        },
        "relatedLicense": {
          "_id": "507f1f77bcf86cd799439014",
          "licenseType": "commercial",
          "price": 100.00,
          "status": "active"
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### GET /api/business/financial/revenue

Get revenue breakdown by period with daily trends.

#### Purpose

Returns detailed revenue breakdown including:
- Revenue by transaction type
- Daily revenue trend
- Summary statistics

#### Authentication

**Required:** Yes

#### Request

**Method:** `GET`

**URL:** `/api/business/financial/revenue`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `30days` | Time period: `7days`, `30days`, `12months`, `all` |

#### Response Structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "period": "30days",
    "startDate": "2024-01-01T00:00:00.000Z",
    "summary": {
      "totalRevenue": 5000.00,
      "totalTransactions": 50
    },
    "revenueByType": [
      {
        "type": "license_payment",
        "total": 4800.00,
        "count": 48,
        "average": 100.00
      },
      {
        "type": "platform_fee",
        "total": 200.00,
        "count": 2,
        "average": 100.00
      }
    ],
    "dailyRevenueTrend": [
      {
        "date": "2024-01-15",
        "revenue": 500.00,
        "transactionCount": 5
      },
      {
        "date": "2024-01-16",
        "revenue": 750.00,
        "transactionCount": 8
      }
      // ... more days
    ]
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `period` | string | Selected time period |
| `startDate` | string | Start date for the period (ISO 8601) |
| `summary.totalRevenue` | number | Total revenue for the period |
| `summary.totalTransactions` | number | Total number of transactions |
| `revenueByType` | array | Revenue breakdown by transaction type |
| `revenueByType[].type` | string | Transaction type |
| `revenueByType[].total` | number | Total revenue for this type |
| `revenueByType[].count` | number | Number of transactions of this type |
| `revenueByType[].average` | number | Average revenue per transaction |
| `dailyRevenueTrend` | array | Daily revenue data |
| `dailyRevenueTrend[].date` | string | Date in YYYY-MM-DD format |
| `dailyRevenueTrend[].revenue` | number | Revenue for that day |
| `dailyRevenueTrend[].transactionCount` | number | Number of transactions that day |

#### Example Request

```
GET /api/business/financial/revenue?period=30days
Authorization: Bearer <token>
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "period": "30days",
    "startDate": "2024-01-01T00:00:00.000Z",
    "summary": {
      "totalRevenue": 5234.56,
      "totalTransactions": 48
    },
    "revenueByType": [
      {
        "type": "license_payment",
        "total": 5034.56,
        "count": 46,
        "average": 109.45
      }
    ],
    "dailyRevenueTrend": [
      {
        "date": "2024-01-15",
        "revenue": 500.00,
        "transactionCount": 5
      },
      {
        "date": "2024-01-16",
        "revenue": 750.00,
        "transactionCount": 8
      }
    ]
  }
}
```

---

### GET /api/business/financial/balance

Get current balance and available payout information.

#### Purpose

Returns current balance information including:
- Current balance
- Chargeback reserve
- Pending payouts
- Available for payout (after minimum threshold)

#### Authentication

**Required:** Yes

#### Request

**Method:** `GET`

**URL:** `/api/business/financial/balance`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Query Parameters:** None

#### Response Structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "currentBalance": 5000.00,
    "chargebackReserve": 125.50,
    "pendingPayouts": {
      "total": 250.00,
      "count": 2
    },
    "availableForPayout": 4975.00,
    "minimumPayout": 25.00,
    "balanceStatus": "positive"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `currentBalance` | number | Current balance in business account |
| `chargebackReserve` | number | Total amount held in chargeback reserve (5% of creator share, held for 90 days) |
| `pendingPayouts.total` | number | Total amount of pending payouts |
| `pendingPayouts.count` | number | Number of pending payout transactions |
| `availableForPayout` | number | Amount available for payout (currentBalance - minimumPayout, minimum 0) |
| `minimumPayout` | number | Minimum payout amount ($25.00) |
| `balanceStatus` | string | Balance status: `positive`, `negative`, `suspended` |

#### Example Response

```json
{
  "success": true,
  "data": {
    "currentBalance": 5234.56,
    "chargebackReserve": 125.50,
    "pendingPayouts": {
      "total": 250.00,
      "count": 2
    },
    "availableForPayout": 5209.56,
    "minimumPayout": 25.00,
    "balanceStatus": "positive"
  }
}
```

---

### GET /api/business/financial/pool-earnings

Get pool earnings breakdown for the authenticated business.

#### Purpose

Returns earnings from media pools (collections) where the business is a member, including:
- Earnings grouped by pool/collection
- Total per pool
- Member contribution breakdown

#### Authentication

**Required:** Yes

#### Request

**Method:** `GET`

**URL:** `/api/business/financial/pool-earnings`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Query Parameters:** None

#### Response Structure

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPoolEarnings": 1500.00,
      "totalPoolTransactions": 15,
      "poolCount": 3
    },
    "pools": [
      {
        "collectionId": "507f1f77bcf86cd799439020",
        "totalPoolRevenue": 1000.00,
        "transactionCount": 10,
        "memberEarnings": 400.00,
        "contributionPercent": 40
      },
      {
        "collectionId": "507f1f77bcf86cd799439021",
        "totalPoolRevenue": 500.00,
        "transactionCount": 5,
        "memberEarnings": 175.00,
        "contributionPercent": 35
      }
    ]
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `summary.totalPoolEarnings` | number | Total earnings from all pools |
| `summary.totalPoolTransactions` | number | Total number of pool transactions |
| `summary.poolCount` | number | Number of pools the business is a member of |
| `pools` | array | Array of pool earnings objects |
| `pools[].collectionId` | string | Collection/pool ID |
| `pools[].totalPoolRevenue` | number | Total revenue for this pool |
| `pools[].transactionCount` | number | Number of transactions in this pool |
| `pools[].memberEarnings` | number | Business's earnings from this pool |
| `pools[].contributionPercent` | number | Business's contribution percentage in this pool |

#### Example Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPoolEarnings": 1750.00,
      "totalPoolTransactions": 18,
      "poolCount": 3
    },
    "pools": [
      {
        "collectionId": "507f1f77bcf86cd799439020",
        "totalPoolRevenue": 1000.00,
        "transactionCount": 10,
        "memberEarnings": 400.00,
        "contributionPercent": 40
      },
      {
        "collectionId": "507f1f77bcf86cd799439021",
        "totalPoolRevenue": 500.00,
        "transactionCount": 5,
        "memberEarnings": 175.00,
        "contributionPercent": 35
      },
      {
        "collectionId": "507f1f77bcf86cd799439022",
        "totalPoolRevenue": 250.00,
        "transactionCount": 3,
        "memberEarnings": 62.50,
        "contributionPercent": 25
      }
    ]
  }
}
```

---

## Payment Endpoints

> **Note:** Payment endpoints will be implemented when Stripe integration is complete. These endpoints are planned but not yet available.

### Planned Endpoints

The following payment endpoints are planned for implementation:

#### POST /api/payments/create-payment-intent

Create a Stripe payment intent for a license purchase.

**Status:** Coming Soon

**Planned Features:**
- Create payment intent for license purchase
- Handle subscription payments
- Support multiple payment methods

---

#### POST /api/payments/confirm-payment

Confirm a payment intent and create transaction.

**Status:** Coming Soon

**Planned Features:**
- Confirm payment intent
- Create transaction record
- Update license status
- Calculate revenue split

---

#### POST /api/payments/create-payout

Request a payout to creator's bank account.

**Status:** Coming Soon

**Planned Features:**
- Create payout request
- Validate minimum payout amount ($25)
- Process payout via Stripe Connect
- Update business balance

---

#### POST /api/payments/create-refund

Create a refund for a transaction.

**Status:** Coming Soon

**Planned Features:**
- Create refund request
- Process refund via Stripe
- Update transaction status
- Adjust business balance

---

#### POST /api/payments/webhook

Handle Stripe webhook events.

**Status:** Coming Soon

**Planned Features:**
- Verify webhook signature
- Handle payment events (succeeded, failed, refunded)
- Update transaction status
- Process chargebacks

---

#### GET /api/payments/payment-methods

Get saved payment methods for a business.

**Status:** Coming Soon

**Planned Features:**
- List saved payment methods
- Add new payment method
- Set default payment method
- Remove payment method

---

#### POST /api/payments/stripe-connect/onboard

Initiate Stripe Connect onboarding for creators.

**Status:** Coming Soon

**Planned Features:**
- Create Stripe Connect account
- Generate onboarding link
- Handle onboarding completion
- Update business Stripe Connect status

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Validation failed",
  "errors": {
    "field": "Error message for field"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "authentication_failure",
  "message": "Invalid or expired token. Please log in again."
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "resource_not_found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "internal_server_error",
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Financial Endpoints:** 100 requests per minute per business
- **Payment Endpoints (when available):** 50 requests per minute per business

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page`: Page number (default: 1, minimum: 1)
- `limit`: Items per page (default: 20, maximum: 100)

**Response Format:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Date Formats

All dates in API responses are in ISO 8601 format:

```
2024-01-15T10:30:00.000Z
```

---

## Currency

All monetary amounts are in USD and represented as numbers with 2 decimal places:

```json
{
  "amount": 100.00
}
```

---

**Last Updated:** Current  
**Version:** 1.0

