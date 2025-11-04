<div align="center">
  <h1>BROski - Gamified Task Management</h1>
  <p>Transform mundane chores into an engaging gaming experience. Track tasks, earn rewards, and level up your productivity with our 3D interactive platform.</p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
  [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
  
  [Live Demo](#live-demo) | [Documentation](#documentation) | [Features](#-features) | [Tech Stack](#-tech-stack) | [Getting Started](#-getting-started) | [Contributing](#-contributing) | [License](#-license)
</div>

## 🌟 Live Demo

Check out our live demo: [BROski Demo](https://broski-app.vercel.app/)

## 📖 Documentation

- [Architecture](ARCHITECTURE.md) - Project structure and architecture
- [API Documentation](API_DOCS.md) - API endpoints and usage
- [Deployment Guide](DEPLOYMENT.md) - How to deploy the application
- [Contribution Guide](CONTRIBUTING.md) - How to contribute to the project

## ✨ Features

### 🎮 Interactive 3D Avatar System

- Customizable 3D avatars
- Real-time animations
- Achievement-based unlocks

### 📝 Task Management

- Create, update, and complete tasks
- Categorize tasks by type and priority
- Set due dates and reminders

### 🏆 Progression System

- Earn XP for completing tasks
- Level up your avatar
- Unlock achievements and rewards

### 💰 Economy System

- Earn coins for completing tasks
- Spend coins on avatar customizations
- Daily rewards and bonuses

### 📊 Analytics Dashboard

- Track your productivity
- View progress over time
- Set and achieve goals

### 🎨 User Experience

- Modern, responsive design
- Dark/light mode
- Keyboard shortcuts
- Offline support

## 🚀 Tech Stack

### Frontend

- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **3D Rendering**:
  - [Three.js](https://threejs.org/)
  - [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)
  - [@react-three/drei](https://github.com/pmndrs/drei)

### State Management

- [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management
- [React Query](https://tanstack.com/query) - Server state management

### Styling & UI

- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [shadcn/ui](https://ui.shadcn.com/) - Reusable UI components

### Routing & Navigation

- [React Router v6](https://reactrouter.com/) - Client-side routing

### Form Handling

- [React Hook Form](https://react-hook-form.com/) - Form validation
- [Zod](https://zod.dev/) - Schema validation

### Testing

- [Vitest](https://vitest.dev/) - Test runner
- [React Testing Library](https://testing-library.com/) - Component testing
- [MSW](https://mswjs.io/) - API mocking

### Code Quality

- [ESLint](https://eslint.org/) - JavaScript linter
- [Prettier](https://prettier.io/) - Code formatter
- [Husky](https://typicode.github.io/husky/) - Git hooks
- [Commitlint](https://commitlint.js.org/) - Commit message linter

## 🏗️ Project Structure

```
src/
├── assets/               # Static assets (images, fonts, etc.)
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── features/        # Feature-specific components
│   ├── layout/          # Layout components
│   └── 3d/              # 3D components and assets
│
├── config/              # Application configuration
│   ├── routes.ts        # Route configurations
│   └── theme.ts         # Theme configurations
│
├── features/            # Feature modules
│   ├── auth/           # Authentication
│   ├── tasks/          # Task management
│   ├── profile/        # User profile
│   └── rewards/        # Rewards system
│
├── hooks/               # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   └── useTasks.ts     # Tasks hook
│
├── lib/                 # Third-party library configurations
│   ├── api/            # API client
│   └── firebase/       # Firebase configuration
│
├── pages/               # Page components
│   ├── Home.tsx
│   ├── Dashboard.tsx
│   └── Settings.tsx
│
├── services/            # API and external services
│   ├── api.ts          # API service
│   └── auth.ts         # Auth service
│
├── stores/              # State management
│   ├── auth.store.ts   # Auth store
│   └── tasks.store.ts  # Tasks store
│
├── styles/             # Global styles
│   ├── globals.css
│   └── theme.css
│
├── types/              # TypeScript type definitions
│   ├── index.d.ts
│   └── api.types.ts
│
├── utils/              # Utility functions
│   ├── helpers.ts
│   └── validators.ts
│
└── __tests__/          # Test files
    ├── components/
    ├── hooks/
    └── utils/
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS version recommended)
- npm 9+ or pnpm 8+ or yarn 1.22+
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/broski-app.git
   cd broski-app
   ```

2. **Install dependencies**

   ```bash
   # Using npm
   npm install

   # Using pnpm
   pnpm install

   # Using yarn
   yarn
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Update the environment variables in .env.local
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code with Prettier

1. Clone the repository

   ```bash
   git clone https://github.com/your-username/broski-app.git
   cd broski-app
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the development server

   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🎨 Theming

BROski uses Tailwind CSS for styling. Customize the theme in `tailwind.config.js`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) for amazing 3D capabilities
- [Vite](https://vitejs.dev/) for the awesome developer experience
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- All the amazing open-source libraries that made this project possible

## 🙏 Acknowledgments

- [Vite](https://vitejs.dev/) for the amazing development experience
- [Three.js](https://threejs.org/) for 3D rendering
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- All the amazing open-source libraries that made this project possible
