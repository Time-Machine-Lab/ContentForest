## ADDED Requirements

### Requirement: Accept and persist waitlist email
The system SHALL accept a POST request with an email address, validate it, deduplicate against existing entries, and append it to persistent storage.

#### Scenario: Successful new signup
- **WHEN** a POST request is made to `/api/waitlist` with a valid, previously unseen email
- **THEN** the system SHALL append the email and timestamp to `server/data/waitlist.json`
- **AND** return HTTP 200 with `{ success: true }`

#### Scenario: Duplicate email submitted
- **WHEN** a POST request is made to `/api/waitlist` with an email already in the list
- **THEN** the system SHALL return HTTP 200 with `{ success: true, duplicate: true }`
- **AND** NOT write a duplicate entry to storage

#### Scenario: Invalid email format
- **WHEN** a POST request is made to `/api/waitlist` with a missing or malformed email
- **THEN** the system SHALL return HTTP 400 with `{ success: false, error: 'Invalid email' }`

#### Scenario: Storage write failure
- **WHEN** the server cannot write to the storage file
- **THEN** the system SHALL return HTTP 500 with `{ success: false, error: 'Server error' }`
- **AND** NOT return a 200 response
