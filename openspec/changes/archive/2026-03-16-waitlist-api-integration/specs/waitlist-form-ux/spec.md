## ADDED Requirements

### Requirement: Show loading state during submission
The system SHALL disable the submit button and show a loading indicator while the API request is in flight.

#### Scenario: Form submission in progress
- **WHEN** the user submits the form and the API call has not yet resolved
- **THEN** the submit button SHALL be disabled
- **AND** the button text SHALL change to indicate loading (e.g., '...' or 'Joining')

### Requirement: Show success state after submission
The system SHALL update the form to a permanent success state when the API returns a successful response.

#### Scenario: API returns success
- **WHEN** the API responds with `{ success: true }`
- **THEN** the submit button SHALL display '✓ Joined'
- **AND** the input field SHALL be disabled
- **AND** the `console.log` of the email SHALL NOT occur

### Requirement: Show error state on submission failure
The system SHALL display an inline error message when the API call fails or returns an error response.

#### Scenario: API returns error
- **WHEN** the API responds with `{ success: false }` or the network request fails
- **THEN** an error message SHALL appear below the form
- **AND** the form SHALL remain interactive so the user can retry
- **AND** the submit button SHALL return to its default state
