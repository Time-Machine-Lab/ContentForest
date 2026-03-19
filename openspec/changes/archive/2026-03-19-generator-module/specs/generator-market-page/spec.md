## ADDED Requirements

### Requirement: Generator market page
The system SHALL provide a generator market page within the console where users can browse, search, and install generators.

#### Scenario: Display paginated generator cards
- **WHEN** user navigates to the generator market page
- **THEN** the system SHALL display generators as cards in a grid layout
- **AND** each card SHALL show: name, description, platform tag, author, installCount, price
- **AND** cards SHALL be paginated with 20 items per page

#### Scenario: Filter by platform
- **WHEN** user selects a platform filter tab (e.g., 小红书, 抖音)
- **THEN** the system SHALL reload the list showing only generators for that platform

#### Scenario: Install button triggers installation
- **WHEN** user clicks「安装」on a generator card
- **THEN** the system SHALL call `POST /api/generators/{generatorId}/install`
- **AND** the button SHALL change to「已安装」after success

#### Scenario: Already installed generators show correct state
- **WHEN** the market page loads for an authenticated user
- **THEN** generators the user has already installed SHALL show「已安装」button state

### Requirement: My generators page
The system SHALL provide a「我的生成器」page where users can view and manage their installed generators.

#### Scenario: Display installed generators list
- **WHEN** user navigates to 我的生成器 page
- **THEN** the system SHALL display all installed generators with: name, platform, author, installedAt, skillPath

#### Scenario: Import local generator
- **WHEN** user clicks「导入生成器」and selects a local Skill folder
- **THEN** the system SHALL upload the Skill zip and metadata
- **AND** the generator SHALL appear in the user's installed list

#### Scenario: Uninstall generator
- **WHEN** user clicks「卸载」on an installed generator
- **THEN** the system SHALL call `DELETE /api/generators/{generatorId}/uninstall`
- **AND** the generator SHALL be removed from the list
