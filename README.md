# Business Media API

A production-ready Business Media Licensing Platform built with Node.js and Express.js. Enables businesses to license media content, manage subscriptions, process payments via Stripe, and track revenue with comprehensive financial dashboards.

## Features

### Core Functionality
- ✅ **Media Management**: Upload, process, and serve images, videos, and audio files
- ✅ **Media Licensing**: Commercial, editorial, and exclusive license types
- ✅ **Business Model**: 4-tier membership system (Free, Contributor, Partner, Equity Partner)
- ✅ **Subscription Management**: Tier-based subscriptions with Stripe integration
- ✅ **Payment Processing**: License payments, subscriptions, payouts via Stripe
- ✅ **Financial Dashboard**: Revenue tracking, transaction history, balance management
- ✅ **Collections & Pools**: Group media into collections with revenue sharing
- ✅ **Stripe Connect**: Creator onboarding and direct payment processing

### Technical Features
- ✅ **Authentication**: JWT-based authentication and authorization
- ✅ **File Processing**: Image resizing, format conversion, thumbnail generation
- ✅ **Revenue Calculation**: Option C fee model with tier-based splits
- ✅ **Chargeback Protection**: 5% reserve with 90-day hold period
- ✅ **Comprehensive Testing**: 300+ unit and integration tests (>90% coverage)
- ✅ **Error Handling**: Centralized error middleware with user-friendly messages
- ✅ **Security**: Helmet.js, CORS, rate limiting, input validation

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Stripe account (for payment processing)
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BMAPI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp env.example .env
   ```

4. **Configure `.env` file**
   ```env
   # Server
   PORT=3000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/business-media
   
   # JWT
   JWT_SECRET=your-secret-key-change-in-production
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_CONTRIBUTOR=price_...
   STRIPE_PRICE_PARTNER=price_...
   STRIPE_PRICE_EQUITY_PARTNER=price_...
   
   # Frontend
   FRONTEND_URL=http://localhost:3000
   
   # Cloudinary (optional)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:3000`

## Project Structure

```
BMAPI/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── stripe.js
│   │   └── tiers.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── businessController.js
│   │   ├── licenseController.js
│   │   ├── mediaController.js
│   │   ├── subscriptionController.js
│   │   ├── transactionController.js
│   │   └── webhookController.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── errorMiddleware.js
│   │   └── upload.js
│   ├── models/
│   │   ├── Business.js
│   │   ├── Collection.js
│   │   ├── License.js
│   │   ├── Media.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── businessRoutes.js
│   │   ├── businessFinancialRoutes.js
│   │   ├── licenseRoutes.js
│   │   ├── mediaRoutes.js
│   │   ├── subscriptionRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── webhookRoutes.js
│   ├── services/
│   │   └── stripeService.js
│   ├── utils/
│   │   ├── errorHandler.js
│   │   ├── poolRevenueCalculation.js
│   │   └── revenueCalculation.js
│   └── app.js
├── tests/
│   ├── integration/
│   │   ├── businessFinancial.test.js
│   │   ├── licensePayment.test.js
│   │   ├── revenueSplit.test.js
│   │   ├── stripeConnect.test.js
│   │   ├── subscriptionPayment.test.js
│   │   └── webhooks.test.js
│   ├── unit/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   └── helpers/
├── scripts/
│   ├── seed.js
│   ├── clear.js
│   └── migrate-user-to-business.js
├── docs/
│   ├── API.md
│   └── REVENUE_CALCULATION.md
└── README.md
```

## API Documentation

For comprehensive API documentation, see:
- **[API Documentation](./docs/API.md)** - Complete API endpoint reference
- **[Revenue Calculation](./docs/REVENUE_CALCULATION.md)** - Revenue split and fee calculation details

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - Register a new business
- `POST /api/auth/login` - Login and get JWT token

**Media:**
- `POST /api/media/upload` - Upload media files
- `GET /api/media` - List media with pagination
- `GET /api/media/:id` - Get media details

**Licensing:**
- `POST /api/licenses/request` - Request a license
- `GET /api/licenses` - List licenses
- `POST /api/licenses/:id/pay` - Process license payment

**Subscriptions:**
- `POST /api/subscriptions/upgrade` - Upgrade subscription tier
- `POST /api/subscriptions/cancel` - Cancel subscription

**Financial:**
- `GET /api/business/financial/overview` - Financial overview
- `GET /api/business/financial/transactions` - Transaction history
- `GET /api/business/financial/revenue` - Revenue breakdown
- `GET /api/business/financial/balance` - Current balance

**Stripe Connect:**
- `POST /api/business/stripe/connect/onboard` - Onboard to Stripe Connect
- `GET /api/business/stripe/connect/status` - Get Connect status
- `POST /api/business/payouts/request` - Request payout

**Webhooks:**
- `POST /api/webhooks/stripe` - Stripe webhook endpoint

## Testing

### Running Tests

**Run all tests:**
```bash
npm test
```

**Run with coverage:**
```bash
npm test -- --coverage
```

**Run specific test suites:**
```bash
# Unit tests
npm test -- tests/unit/

# Integration tests
npm test -- tests/integration/

# Specific test file
npm test -- tests/integration/stripeConnect.test.js
```

### Test Coverage

- **Transaction Model**: >95% coverage (89 tests)
- **Revenue Calculation**: >95% coverage (62 tests)
- **Pool Revenue**: >90% coverage (37 tests)
- **Error Middleware**: 100% coverage (31 tests)
- **Stripe Service**: >90% coverage (51 tests)
- **Integration Tests**: 100+ tests covering all flows

**Total:** 300+ tests with >90% overall coverage

## Development

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
npm run seed       # Seed database with sample data
npm run clear      # Clear all database data
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-----------|----------|---------|
| `PORT` | Server port | No | `3000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes | - |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes | - |
| `FRONTEND_URL` | Frontend URL for redirects | Yes | - |
| `NODE_ENV` | Environment (development/production) | No | `development` |

## Implementation Status

### ✅ Completed Features

- **Business Model**: 4-tier membership system with resource limits
- **Media Management**: Upload, process, and serve media files
- **Licensing System**: Complete license workflow and management
- **Transaction Model**: Comprehensive transaction tracking
- **Revenue Calculation**: Option C fee model with tier splits
- **Financial Dashboard**: Complete financial APIs
- **Stripe Integration**: Full Stripe Connect and payment processing
- **Webhooks**: Complete webhook handling for Stripe events
- **Testing**: Comprehensive test coverage (>90%)
- **Error Handling**: Centralized error middleware
- **Collections & Pools**: Pool creation and revenue sharing logic

### 🚀 Production Ready

All core features are implemented and tested. The platform is ready for production deployment with:
- Complete Stripe integration
- Comprehensive error handling
- Extensive test coverage
- Security best practices
- Performance optimizations

## Documentation

- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Revenue Calculation](./docs/REVENUE_CALCULATION.md)** - Fee and revenue split details
- **[Testing Guide](./TESTING.md)** - Testing documentation
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Database migration guide
- **[Quick Start](./QUICK_START.md)** - Quick setup guide

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
