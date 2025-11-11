# Implementation Notes - Dynamic Scheduling System

## Overview
This document describes the new scheduling features implemented for the Emerson Scheduling System.

## Database Changes

### New Tables

1. **room_assignments** - Tracks which rooms are assigned to which sections for specific time slots
   - `room_id`, `section_id`, `time_slot_id`, `semester`
   - `status` (reserved|available|blocked)
   - Automatically freed when reservations are cancelled

2. **slot_reservations** - Records when instructors reserve specific time slots
   - Links course requests to time slots and rooms
   - Tracks reservation status (reserved|cancelled)
   - Used for audit trail and conflict checking

3. **time_slot_generation_settings** - Stores configuration for generating time slots
   - Stores distribution settings per shift
   - Allows per-shift customization

### Modified Tables

- **time_slots** - Added:
  - `day_of_week` column for per-day slot generation
  - `slot_length_minutes` for flexible slot lengths

## API Endpoints

### Admin Endpoints

#### Dynamic Time Slot Generation
- `POST /api/timing/generate-slots`
  - Generate time slots based on distribution configuration
  - Input: `{ shift, start_time, end_time, distribution[], working_days[] }`
  - Distribution format: `[{ len: 90, count: 2 }, { len: 60, count: 1 }]`
  - Validates that distribution fits in time window

- `POST /api/timing/slot-settings`
  - Set slot generation settings for a shift
  - Stores settings in `time_slot_generation_settings` table

- `GET /api/timing/slot-settings`
  - Retrieve current slot generation settings

#### Room Management
- `POST /api/rooms/auto-assign`
  - Automatically assign rooms to sections based on capacity
  - Input: `{ shift, semester, policy: 'evening-first'|'morning-first' }`
  - Returns: `{ assigned[], unassigned[], conflicts[] }`

- `GET /api/rooms/assignments`
  - Get all room assignments with filters
  - Query params: `section_id`, `semester`, `room_id`

- `PUT /api/rooms/assignments/:id`
  - Edit an existing room assignment
  - Validates for conflicts before updating

- `DELETE /api/rooms/assignments/:id`
  - Delete a room assignment
  - Prevents deletion if active reservations exist

#### Course Requests
- `POST /api/course-requests`
  - Create bulk course requests (existing)
  - Now supports JSON preferences storage

- `GET /api/course-requests`
  - Get all course requests (admin view)
  - Returns detailed information including instructor names

### Instructor Endpoints

#### Get Available Requests
- `GET /api/course-requests/instructor`
  - Returns pending requests for the instructor
  - **NEW**: Includes `available_time_slots` array for each request
  - Filters out already reserved slots
  - Shows room capacity and slot labels

#### Accept Request with Slot Selection
- `POST /api/course-requests/accept`
  - **Enhanced**: Now accepts multiple time slots
  - Input: `{ request_id, time_slots: [id1, id2, ...], room_id?, preference_days? }`
  - Uses database transactions with SELECT FOR UPDATE for concurrency
  - Returns 409 Conflict if slots unavailable
  - Automatically assigns rooms if not specified

#### Undo Acceptance
- `POST /api/course-requests/undo-accept`
  - Cancel an accepted request and free up slots
  - Input: `{ request_id }`
  - Only instructor who accepted or admin can undo
  - Cancels all slot reservations atomically

## Concurrency & Correctness

### Transaction Safety
All accept and undo operations use database transactions with:
- `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`
- `SELECT ... FOR UPDATE` for row-level locking
- Prevents race conditions when multiple instructors try to reserve same slot

### Conflict Detection
The system checks for:
1. Room availability for requested time slot
2. Instructor time conflicts
3. Section time conflicts
4. Capacity constraints (room capacity >= section strength)

### Error Handling
- Returns 409 Conflict with detailed conflict information
- Provides specific reasons for each conflict
- Rollbacks are performed on any error

## Frontend Integration Points

### Admin Settings Page
Need to add UI for:
1. Time slot distribution configuration
   - Input fields for different slot lengths
   - Preview before generation
   - Per-shift configuration (morning/evening)

2. Auto-room assignment
   - Button to trigger auto-assign
   - Display results (assigned/unassigned/conflicts)
   - Allow re-run with different policies

### Instructor Requests Page
Need to enhance UI for:
1. Display available time slots per request
   - Group by day and time
   - Show room capacity
   - Visual indicators for availability

2. Multi-slot selection
   - Checkbox selection for multiple slots
   - Immediate validation feedback
   - Show spinner during accept API call

3. Display conflict messages
   - Show which slots unavailable and why
   - Suggest alternative slots

## Usage Examples

### Generate Time Slots for Morning Shift
```bash
POST /api/timing/generate-slots
{
  "shift": "morning",
  "start_time": "08:00:00",
  "end_time": "13:00:00",
  "distribution": [
    { "len": 90, "count": 2 },
    { "len": 60, "count": 1 }
  ],
  "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

### Auto-Assign Rooms
```bash
POST /api/rooms/auto-assign
{
  "shift": "morning",
  "semester": "3",
  "policy": "evening-first"
}
```

### Instructor Accepts Request
```bash
POST /api/course-requests/accept
{
  "request_id": 1,
  "time_slots": [5, 7, 12],
  "preference_days": ["monday", "wednesday"]
}
```

## Migration Steps

1. Run the SQL migration file: `database/migration_add_scheduling_tables.sql`
   - Use phpMyAdmin to execute the SQL
   - This creates the new tables and modifies time_slots

2. Restart the backend server to load new routes

3. Test the API endpoints using Postman or similar

4. Update frontend to use new endpoints and data structures

## Testing Checklist

- [ ] Generate time slots with different distributions
- [ ] Verify slot generation rejects invalid distributions
- [ ] Test auto-room assignment with different policies
- [ ] Verify conflict detection when accepting requests
- [ ] Test concurrent accept attempts (two instructors, same slot)
- [ ] Test undo functionality
- [ ] Verify room assignments are freed on undo
- [ ] Check that room capacity constraints are enforced

## Notes for phpMyAdmin Usage

The user specified that schema changes should be done through phpMyAdmin, not by editing SQL directly in code. All data manipulation after migration should also be done through phpMyAdmin for:
- Testing with dummy data
- Correcting any data inconsistencies
- Adjusting generated time slots or room assignments

