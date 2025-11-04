# Contributing to BROski

Thank you for your interest in contributing to BROski! We're excited to have you on board. This guide will help you get started with contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+ or pnpm 8+ or yarn 1.22+
- Git
- Basic understanding of React and TypeScript

### Setting Up the Development Environment

1. **Fork the Repository**
   - Click the "Fork" button on the top right of the [GitHub repository](https://github.com/your-username/broski-app)

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/your-username/broski-app.git
   cd broski-app
   ```

3. **Install Dependencies**

   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn
   ```

4. **Set Up Environment Variables**

   ```bash
   cp .env.example .env.local
   # Update the environment variables in .env.local
   ```

5. **Start the Development Server**

   ```bash
   npm run dev
   ```

## 🛠 Development Workflow

### Branch Naming Convention

- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Build process or auxiliary tool changes

Example: `feature/add-dark-mode`

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example:

feat(auth): add Google OAuth integration

- Add Google OAuth button component
- Implement authentication flow
- Add error handling

Closes #123

### Pull Request Process

1. Make sure your fork is up to date with the main branch

   ```bash
   git checkout main
   git pull upstream main
   ```

2. Create a new branch for your changes

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes and commit them with a descriptive commit message

4. Push your changes to your fork

   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a Pull Request (PR) to the `main` branch of the main repository

6. Ensure all tests pass and there are no linting errors

7. Request a review from one of the maintainers

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

### Writing Tests

- Place test files next to the component/utility they test with a `.test.tsx` or `.test.ts` extension
- Follow the "Arrange-Act-Assert" pattern
- Mock external dependencies when necessary

## 🎨 Styling

We use Tailwind CSS for styling. Follow these guidelines:

- Use Tailwind utility classes whenever possible
- For complex components, use `@apply` in a CSS module
- Follow the BEM naming convention for custom CSS classes
- Use CSS variables for theming

## 📝 Documentation

- Update the relevant documentation when adding new features or making changes
- Add JSDoc comments for all public APIs and components
- Keep the README and other documentation up to date

## 🐛 Reporting Bugs

If you find a bug, please open an issue with the following information:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots or screen recordings if applicable
6. Browser/OS version if it's a frontend issue

## 💡 Feature Requests

We welcome feature requests! Please open an issue with:

1. A clear and descriptive title
2. A detailed description of the feature
3. The problem it solves
4. Any relevant examples or references

## 📜 Code of Conduct

Please note that this project is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🙏 Thank You

Thank you for taking the time to contribute to BROski! Your contributions help make this project better for everyone.
