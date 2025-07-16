# Simple CMS

A simple content management system built with Node.js, Express, and PostgreSQL.

## Features

- User authentication and authorization
- Article management with drafts and publishing
- Category and tag organization
- Full-text search functionality
- RESTful API with comprehensive documentation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/simple-cms.git
cd simple-cms
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:
```bash
cp .env.example .env
cp .env.example .env.test
```

4. Update the environment variables in `.env` and `.env.test` with your database credentials.

5. Set up the database:
```bash
npm run db:migrate
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

## Testing

### Running Tests

The project includes comprehensive test suites:

- Run all tests:
```bash
npm test
```

- Run tests in watch mode:
```bash
npm run test:watch
```

- Generate test coverage report:
```bash
npm run test:coverage
```

### Integration Tests

Integration tests verify the interaction between different components:

```bash
npm run test:integration
```

### Workflow Tests

Workflow tests simulate complete user journeys through the system:

```bash
npm run test:workflows
```

These tests cover:
- User registration and authentication workflows
- Article creation, editing, and publishing workflows
- Search and content discovery workflows

### Test Database Setup

Set up the test database:

```bash
npm run db:test:setup
npm run db:test:seed
```

## Continuous Integration

The project uses GitHub Actions for continuous integration. The CI pipeline:

1. Sets up Node.js and PostgreSQL
2. Installs dependencies
3. Runs linting
4. Runs unit tests
5. Runs integration tests
6. Runs workflow tests
7. Generates and uploads coverage reports

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## License

This project is licensed under the ISC License.