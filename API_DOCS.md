# BROski API Documentation

This document provides detailed information about the BROski API, including available endpoints, request/response formats, and authentication methods.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Endpoints](#endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Users](#users)
  - [Tasks](#tasks)
  - [Rewards](#rewards)
  - [Avatar](#avatar)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Versioning](#versioning)

## Authentication

BROski uses JWT (JSON Web Tokens) for authentication. Include the JWT in the `Authorization` header for authenticated requests.

```http
Authorization: Bearer <your_jwt_token>
```

## Base URL

```text
https://api.broski.app/v1
```

## Endpoints

### Authentication Endpoints

#### Register a New User

```http
POST /auth/register
```

**Request Body:**

```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string"
}
```

**Response:**

```json
{
  "id": "string",
  "username": "string",
  "email": "user@example.com",
  "token": "jwt_token_here"
}
```

#### Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response:**

```json
{
  "id": "string",
  "username": "string",
  "email": "user@example.com",
  "token": "jwt_token_here"
}
```

### Users

#### Get Current User

```http
GET /users/me
```

**Response:**

```json
{
  "id": "string",
  "username": "string",
  "email": "user@example.com",
  "level": 1,
  "xp": 0,
  "coins": 100,
  "avatar": {
    "id": "string",
    "outfit": "basic",
    "accessories": [],
    "unlockedItems": ["basic_outfit"]
  },
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Tasks

#### Get All Tasks

```http
GET /tasks
```

**Query Parameters:**

| Parameter | Type    | Description                           |
|-----------|---------|---------------------------------------|
| status    | string  | Filter by status (active, completed)  |
| priority  | string  | Filter by priority (low, medium, high)|
| dueDate   | string  | Filter by due date (ISO date)         |

**Response:**

```json
{
  "tasks": [
    {
      "id": "string",
      "title": "Complete documentation",
      "description": "Write API documentation for BROski",
      "status": "active",
      "priority": "high",
      "dueDate": "2023-12-31T23:59:59.999Z",
      "xpReward": 50,
      "coinReward": 25,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create a Task

```http
POST /tasks
```

**Request Body:**

```json
{
  "title": "New Task",
  "description": "Task description",
  "priority": "medium",
  "dueDate": "2023-12-31T23:59:59.999Z",
  "xpReward": 25,
  "coinReward": 10
}
```

**Response:**

```json
{
  "id": "string",
  "title": "New Task",
  "description": "Task description",
  "status": "active",
  "priority": "medium",
  "dueDate": "2023-12-31T23:59:59.999Z",
  "xpReward": 25,
  "coinReward": 10,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### Complete a Task

```http
PATCH /tasks/:taskId/complete
```

**Response:**

```json
{
  "success": true,
  "message": "Task completed successfully",
  "rewards": {
    "xp": 25,
    "coins": 10,
    "levelUp": false,
    "newLevel": 1,
    "unlockedItems": []
  }
}
```

### Rewards

#### Get Available Rewards

```http
GET /rewards
```

**Response:**

```json
{
  "rewards": [
    {
      "id": "string",
      "name": "Premium Outfit",
      "description": "Exclusive premium outfit for your avatar",
      "type": "outfit",
      "price": 500,
      "rarity": "epic",
      "unlocked": false
    },
    {
      "id": "string",
      "name": "Golden Hat",
      "description": "Shiny golden hat for your avatar",
      "type": "accessory",
      "price": 200,
      "rarity": "rare",
      "unlocked": true
    }
  ]
}
```

#### Purchase a Reward

```http
POST /rewards/:rewardId/purchase
```

**Response:**

```json
{
  "success": true,
  "message": "Reward purchased successfully",
  "balance": 300,
  "unlockedItem": {
    "id": "string",
    "name": "Premium Outfit",
    "type": "outfit",
    "assetUrl": "/assets/outfits/premium.glb"
  }
}
```

### Avatar

#### Update Avatar Appearance

```http
PATCH /avatar
```

**Request Body:**

```json
{
  "outfit": "premium",
  "accessories": ["golden_hat", "cool_glasses"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Avatar updated successfully"
}
```

## WebSocket API

BROski provides real-time updates through WebSockets for features like live task updates and notifications.

### Connection URL

```text
wss://api.broski.app/v1/ws
```

### Events

#### Task Updates

```json
{
  "event": "task_updated",
  "data": {
    "taskId": "string",
    "status": "completed",
    "updatedAt": "2023-01-01T12:00:00.000Z"
  }
}
```

#### Level Up

```json
{
  "event": "level_up",
  "data": {
    "newLevel": 2,
    "rewards": {
      "coins": 100,
      "unlockedItems": ["rare_outfit"]
    }
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes

| Code                 | Status Code | Description                           |
|----------------------|-------------|---------------------------------------|
| `invalid_credentials`| 401         | Invalid email or password             |
| `unauthorized`       | 401         | Missing or invalid authentication     |
| `forbidden`          | 403         | Insufficient permissions              |
| `not_found`          | 404         | Resource not found                    |
| `validation_error`   | 422         | Request validation failed             |
| `rate_limit_exceeded`| 429         | Too many requests                     |
| `internal_error`     | 500         | Internal server error                 |

## Rate Limiting

- **Unauthenticated requests:** 100 requests per hour
- **Authenticated requests:** 1000 requests per hour
- **WebSocket connections:** Limited to 10 concurrent connections per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 3600
```

## Versioning

API versioning is done through the URL path (e.g., `/v1/endpoint`). Breaking changes will result in a new version number.

## Support

For support, please contact [support@broski.app](mailto:support@broski.app) or visit our [Help Center](https://help.broski.app).
