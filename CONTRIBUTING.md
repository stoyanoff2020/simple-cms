# Contributing to Simple CMS

Thank you for considering contributing to Simple CMS! This document outlines the process for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please be respectful and considerate of others.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:
- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, etc.)

### Suggesting Features

If you have an idea for a new feature, please create an issue with:
- A clear, descriptive title
- Detailed description of the feature
- Any relevant mockups or examples
- Explanation of why this feature would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Run tests to ensure they pass
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature-name`)
7. Open a Pull Request

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (copy `.env.example` to `.env` and update values)
4. Set up the database: `npm run db:migrate && npm run db:seed`
5. Run the development server: `npm run dev`

## Testing

- Run all tests: `npm test`
- Run integration tests: `npm run test:integration`
- Run workflow tests: `npm run test:workflows`

## Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Write comments for complex logic
- Include JSDoc comments for functions

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.