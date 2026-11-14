# Digital Wallet Simulator

A small backend I built to practise NestJS, MongoDB and Mongoose. It simulates a mobile wallet: users sign up, verify their email with an OTP, get a wallet, and send money to other wallets by phone number. No real money and no payment gateway is involved.

This was a training project, so I kept the scope small on purpose. The things I left out are listed at the bottom.

## Tech stack

- NestJS, TypeScript
- MongoDB with Mongoose
- JWT for authentication, bcryptjs for hashing
- Joi for request validation
- Nodemailer for sending OTP emails
- date-fns / date-fns-tz for Cairo-time daily and monthly limits

## How it works

1. A user registers with name, phone number, national ID, email and password.
2. An OTP is sent to the email. It is stored hashed, expires after 5 minutes, allows 5 attempts, and can be resent once per minute.
3. When the email is verified, the wallet is created in the same database transaction.
4. The user logs in with phone number and password and gets a JWT (valid for 15 minutes).
5. The user can send money to another wallet using the receiver's phone number.

### Transfer rules

- Currency is EGP.
- Maximum 60,000 per transfer.
- Fee is 0.1% of the amount, capped at 20.
- Daily limit 120,000 and monthly limit 200,000. The fee counts toward the limits and the days/months follow Cairo time.
- You can't send money to yourself, and both wallets must be active.
- The sender's balance check and deduction happen in one atomic update inside a MongoDB transaction, so a transfer either fully happens or not at all.
- Every transfer needs an `Idempotency-Key` header. Sending the same key again returns the first result instead of moving the money twice.

## API

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/users` | No | `name`, `phoneNumber`, `SSN`, `email`, `password` |
| POST | `/auth/verify-email` | No | `email`, `otp` |
| POST | `/auth/resend-otp` | No | `email` |
| POST | `/auth/login` | No | `phoneNumber`, `password` |
| GET | `/wallets` | Bearer token | none |
| POST | `/transactions/transfer` | Bearer token | `receiverPhoneNumber`, `amount` |

`/transactions/transfer` also needs the header `Idempotency-Key: <any unique string>`.

Phone numbers are Egyptian mobile numbers (`01[0125]xxxxxxxx`) and the national ID is 14 digits.

Example:

```bash
curl -X POST http://localhost:3000/transactions/transfer \
  -H "Authorization: Bearer <accessToken>" \
  -H "Idempotency-Key: transfer-001" \
  -H "Content-Type: application/json" \
  -d '{ "receiverPhoneNumber": "01012345678", "amount": 500 }'
```

## Data models

**User**

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| phoneNumber | String | required, unique |
| SSN | String | required, unique |
| email | String | required, unique |
| password | String | bcrypt hash, hidden from queries |
| isVerified | Boolean | default `false` |
| emailVerificationOtpHash | String | hidden, removed after verification |
| emailVerificationOtpExpiresAt | Date | hidden |
| emailVerificationOtpSentAt | Date | hidden |
| emailVerificationAttempts | Number | hidden, default 0 |

**Wallet** (one wallet per user)

| Field | Type | Notes |
|---|---|---|
| user | ObjectId (ref User) | required, unique |
| phoneNumber | String | required, unique, used to find the receiver |
| currency | String | `EGP` |
| balance | Number | default 0, minimum 0 |
| status | String | `active` or `frozen` |

**Transaction**

| Field | Type | Notes |
|---|---|---|
| fromWallet | ObjectId (ref Wallet) | required |
| toWallet | ObjectId (ref Wallet) | required |
| amount | Number | what the receiver gets |
| fee | Number | |
| totalDeduction | Number | amount + fee, taken from the sender |
| currency | String | `EGP` |
| status | String | `completed` |
| idempotencyKey | String | unique together with `fromWallet` |

All three collections have `createdAt` and `updatedAt` timestamps.

## Running it locally

You need Node.js and a MongoDB replica set. MongoDB Atlas has one on the free tier. A plain local `mongod` will not work because transactions require a replica set.

```bash
npm install
cp .env.example .env     # then fill in your own values
npm run start:dev
```

The server starts on port 3000 unless `PORT` is set.

### Adding balance for testing

New wallets start with a balance of 0 and there is no deposit endpoint. To try a transfer, set a balance by hand, for example in `mongosh`:

```js
db.wallets.updateOne({ phoneNumber: "01012345678" }, { $set: { balance: 5000 } })
```

## Project structure

```
src/
  auth/           login, OTP verification, JWT guard
  users/          registration
  wallets/        wallet schema and "get my wallet"
  transactions/   transfers, fees, limits, idempotency
  email/          sending OTP emails
  security/       shared JWT module
  validation/     Joi validation pipe
  database/       MongoDB connection
```

## What this project does not have

I treated this as a practice project, so these are not done:

- No endpoint to deposit money or to list transaction history
- No automated tests
- Money is stored as a normal number, not as integer piastres
- The national ID is stored as plain text
- No rate limiting on login

I plan to cover these in my next, bigger project.
