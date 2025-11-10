# Task 2: Event Registration System

A complete event registration system built with Express.js and SQLite.

## Features

- ✅ View list of events with details
- ✅ View event details individually
- ✅ Register for events with user information
- ✅ Manage registrations (view and cancel)
- ✅ Track event capacity and availability
- ✅ User management (automatic user creation)
- ✅ Registration status tracking

## Installation

1. Navigate to the project directory:
```bash
cd task2-event-registration
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

   For development with auto-reload:
```bash
npm run dev
```

2. Start the server and automatically open Chrome (Windows):
```bash
npm run start:chrome
```

3. If you start the server without the Chrome script, open your browser and navigate to:
```
http://localhost:3001
```

## API Endpoints

### GET /api/events
Get all events with registration counts.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Tech Conference 2024",
    "description": "Annual tech conference",
    "event_date": "2024-12-01 10:00:00",
    "location": "Convention Center",
    "max_capacity": 100,
    "registered_count": 25,
    "available_spots": 75
  }
]
```

### GET /api/events/:id
Get event by ID with registration details.

### POST /api/events
Create a new event (for testing/admin).

**Request Body:**
```json
{
  "title": "Tech Conference 2024",
  "description": "Annual tech conference",
  "event_date": "2024-12-01 10:00:00",
  "location": "Convention Center",
  "max_capacity": 100
}
```

### POST /api/events/:id/register
Register for an event.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890"
}
```

### GET /api/users/:email/registrations
Get all registrations for a user by email.

### GET /api/registrations/:id
Get registration details by ID.

### DELETE /api/registrations/:id
Cancel a registration.

## Database Schema

### Events Table
- id (PRIMARY KEY)
- title
- description
- event_date
- location
- max_capacity
- created_at

### Users Table
- id (PRIMARY KEY)
- name
- email (UNIQUE)
- phone
- created_at

### Registrations Table
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- event_id (FOREIGN KEY)
- registration_date
- status (confirmed/cancelled)
- UNIQUE(user_id, event_id)

## Technologies Used

- Express.js
- SQLite3
- CORS
- Body-parser

## License

ISC

