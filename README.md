# SplitDost - Expense Tracking Application

A Splitwise-type expense tracking application built with Node.js, Express, PostgreSQL, React, and TypeScript.

## Features

- ✅ User authentication (signup/login with JWT)
- ✅ Personal expense tracking
- ✅ Group creation and management
- ✅ Group expense sharing with equal split
- ✅ Automatic balance calculation
- ✅ User-centric balance views (owe/owed)
- ✅ Multi-currency support (INR, USD, EUR, GBP)

## Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT authentication
- bcryptjs for password hashing

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Axios
- React Query (TanStack Query)
- Vite

## Project Structure

```
splitdost/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Database configuration
│   │   ├── models/
│   │   │   ├── index.js             # Model associations
│   │   │   ├── User.js
│   │   │   ├── Group.js
│   │   │   ├── GroupMember.js
│   │   │   ├── Expense.js
│   │   │   └── ExpenseSplit.js
│   │   ├── routes/
│   │   │   ├── auth.js              # Authentication routes
│   │   │   ├── expenses.js          # Personal expenses routes
│   │   │   ├── groups.js            # Group management routes
│   │   │   └── balances.js          # Balance calculation routes
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT authentication middleware
│   │   └── server.js                # Express server setup
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Signup.tsx
    │   │   ├── Dashboard.tsx
    │   │   └── GroupDetails.tsx
    │   ├── contexts/
    │   │   └── AuthContext.tsx      # Authentication context
    │   ├── services/
    │   │   └── api.ts               # API service layer
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

## Database Schema

### Users
- `id` (UUID, Primary Key)
- `name` (String)
- `email` (String, Unique)
- `password` (String, Hashed)
- `defaultCurrency` (String, Default: 'INR')

### Groups
- `id` (UUID, Primary Key)
- `name` (String)
- `createdBy` (UUID, Foreign Key → Users)

### GroupMembers (Join Table)
- `id` (UUID, Primary Key)
- `groupId` (UUID, Foreign Key → Groups)
- `userId` (UUID, Foreign Key → Users)
- Unique constraint on (groupId, userId)

### Expenses
- `id` (UUID, Primary Key)
- `title` (String)
- `amount` (Decimal)
- `currency` (String)
- `date` (Date)
- `paidBy` (UUID, Foreign Key → Users)
- `groupId` (UUID, Foreign Key → Groups, Nullable)
- `splitType` (Enum: 'equal', 'exact')
- `isPersonal` (Boolean)

### ExpenseSplits
- `id` (UUID, Primary Key)
- `expenseId` (UUID, Foreign Key → Expenses)
- `userId` (UUID, Foreign Key → Users)
- `amount` (Decimal)
- Unique constraint on (expenseId, userId)

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=splitdost
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

5. Create the PostgreSQL database:
```bash
createdb splitdost
```

6. Start the backend server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` and automatically create database tables.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, for custom API URL):
```env
VITE_API_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## API Documentation

### Authentication

#### POST /auth/signup
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "defaultCurrency": "INR"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "defaultCurrency": "INR"
  }
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "defaultCurrency": "INR"
  }
}
```

### Personal Expenses

#### POST /expenses/personal
Add a personal expense (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Coffee",
  "amount": 250,
  "currency": "INR",
  "date": "2024-01-15T10:00:00Z"
}
```

#### GET /expenses/personal
Get all personal expenses (requires authentication).

**Response:**
```json
{
  "expenses": [
    {
      "id": "uuid",
      "title": "Coffee",
      "amount": 250,
      "currency": "INR",
      "date": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Groups

#### POST /groups
Create a new group (requires authentication).

**Request Body:**
```json
{
  "name": "Goa Trip"
}
```

**Response:**
```json
{
  "message": "Group created successfully",
  "group": {
    "id": "uuid",
    "name": "Goa Trip",
    "createdBy": "user_uuid",
    "members": [
      {
        "id": "user_uuid",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ]
  }
}
```

#### GET /groups
Get all groups the user is a member of (requires authentication).

#### POST /groups/:groupId/members
Add members to a group (requires authentication).

**Request Body:**
```json
{
  "userIds": ["user_uuid_1", "user_uuid_2"]
}
```

### Group Expenses

#### POST /groups/:groupId/expenses
Add an expense to a group (requires authentication).

**Request Body:**
```json
{
  "title": "Hotel",
  "amount": 9000,
  "currency": "INR",
  "paidBy": "user_uuid",
  "splitType": "equal",
  "date": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "message": "Group expense added successfully",
  "expense": {
    "id": "uuid",
    "title": "Hotel",
    "amount": 9000,
    "currency": "INR",
    "paidBy": "user_uuid",
    "payer": {
      "id": "user_uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "splits": [
      {
        "id": "uuid",
        "userId": "user_uuid_1",
        "amount": 3000,
        "user": {
          "id": "user_uuid_1",
          "name": "User A"
        }
      }
    ]
  }
}
```

#### GET /groups/:groupId/expenses
Get all expenses for a group (requires authentication).

### Balances

#### GET /groups/:groupId/balances
Get balance summary for a group (requires authentication).

**Response:**
```json
{
  "groupId": "uuid",
  "groupName": "Goa Trip",
  "balances": [
    {
      "userId": "user_uuid",
      "name": "John Doe",
      "owes": 300,
      "owed": 600,
      "net": 300,
      "currency": "INR"
    }
  ]
}
```

#### GET /balances/summary
Get user's overall balance summary across all groups (requires authentication).

**Response:**
```json
{
  "summary": {
    "totalOwed": 600,
    "totalOwes": 300,
    "netBalance": 300,
    "currency": "INR",
    "byGroup": [
      {
        "groupId": "uuid",
        "groupName": "Goa Trip",
        "owes": 300,
        "owed": 600,
        "net": 300,
        "currency": "INR",
        "breakdown": [
          {
            "expenseId": "uuid",
            "expenseTitle": "Hotel",
            "otherUserId": "user_uuid_2",
            "otherUserName": "User B",
            "amount": 300,
            "type": "owed",
            "currency": "INR"
          }
        ]
      }
    ]
  }
}
```

## Balance Calculation Logic

The balance calculation works as follows:

1. For each expense in a group:
   - The payer's "owed" amount increases by the total expense amount
   - Each split participant's "owes" amount increases by their share
   - The payer's "owed" amount decreases by their own share (if they're part of the split)

2. Net balance = owed - owes
   - Positive net: User is owed money
   - Negative net: User owes money
   - Zero net: All settled up

### Example Scenario

**Group: Goa Trip**
- Members: User A, User B

**Expenses:**
- User A paid 1000 INR
- User B paid 400 INR
- Total = 1400 INR
- Each share = 700 INR

**Result:**
- User A: Paid 1000, Share 700 → Net: +300 (owed)
- User B: Paid 400, Share 700 → Net: -300 (owes)

**UI View for User A:**
"You are owed ₹300 from User B"

**UI View for User B:**
"You owe ₹300 to User A"

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 3000)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

### Frontend (.env)
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

## Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens expire after 7 days
- All protected routes require valid JWT token
- CORS is enabled for frontend-backend communication

## Future Enhancements (Bonus Features)

- [ ] Settlement feature (mark expenses as settled)
- [ ] Spending graphs per user
- [ ] Optimized balance minimization (Splitwise style)
- [ ] Exact split amounts UI
- [ ] Email notifications
- [ ] Expense categories
- [ ] Recurring expenses
- [ ] Export expenses to CSV/PDF

## License

MIT

