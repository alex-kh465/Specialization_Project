# GenEWA(Efficient Workflow Access) - LOCK IN 🎓

A premium AI-powered study assistant specifically designed for Indian college students. GenEWA provides intelligent tools to boost academic productivity, manage student life, and enhance learning outcomes. LOCK IN to your success with efficient workflow access.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Features Overview](#-features-overview)
- [Database Schema](#-database-schema)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🤖 Core AI Features
- **AI Chat Assistant**: Powered by Groq's Llama-3.3-70b model for academic support
- **Smart Study Companion**: Get instant help with academic questions
- **Intelligent Responses**: Context-aware AI assistance for various student needs

### 📱 Student Management Tools
- **Dashboard**: Centralized hub with quick actions and daily overview
- **Budget Planner**: Track student expenses and manage finances
- **Smart Calendar**: AI-powered scheduling with reminders
- **Weather Integration**: Daily weather updates and motivational tips
- **Daily Digest**: Automated email summaries
- **Usage Analytics**: Track your app usage and productivity metrics

### 🔐 Authentication & Security
- **JWT-based Authentication**: Secure user sessions
- **User Profiles**: Personalized student profiles with college information
- **Premium Features**: Freemium model with usage limits

### 💼 Additional Features
- **Email Summarizer** (Premium): Quick summaries of important emails
- **Referral System**: Student referral codes for community building
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Chat**: Instant AI responses with typing indicators

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **AI Integration**: Groq API (Llama-3.3-70b model)
- **CORS**: Cross-origin resource sharing enabled
- **Environment**: dotenv for configuration

### Development Tools
- **Package Manager**: npm/bun
- **Linting**: ESLint with TypeScript support
- **Code Quality**: Prettier, Husky (if configured)
- **Version Control**: Git

## 📁 Project Structure

```
Specialization_Project/
├── backend/                 # Express.js API server
│   ├── node_modules/
│   ├── .env                # Backend environment variables
│   ├── index.js            # Main server file
│   ├── package.json        # Backend dependencies
│   └── package-lock.json
├── frontend/               # React TypeScript application
│   ├── public/             # Static assets
│   ├── src/                # Source code
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   ├── pages/          # Route components
│   │   ├── App.tsx         # Main application component
│   │   ├── main.tsx        # Application entry point
│   │   └── index.css       # Global styles
│   ├── node_modules/
│   ├── index.html          # HTML template
│   ├── package.json        # Frontend dependencies
│   ├── tailwind.config.ts  # Tailwind configuration
│   ├── tsconfig.json       # TypeScript configuration
│   └── vite.config.ts      # Vite configuration
├── node_modules/           # Root dependencies
├── .git/                   # Git repository
├── .gitignore              # Git ignore rules
├── package.json            # Root package file
└── package-lock.json       # Root lock file
```

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v16 or higher)
- **npm** or **bun** package manager
- **Supabase account** for database and authentication
- **Groq API key** for AI chat functionality
- **Git** for version control

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Specialization_Project
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## ⚙️ Configuration

### 1. Supabase Setup

1. Create a new project at [Supabase](https://supabase.io)
2. Set up the following tables in your database:

```sql
-- Users profiles table
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  college TEXT,
  year TEXT,
  profile_picture TEXT,
  timezone TEXT,
  referral_code TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Environment Variables

Create the required environment files:

#### Backend Environment (`backend/.env`)

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Groq AI Configuration
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your_groq_api_key

# Server Configuration
PORT=4000
NODE_ENV=development
```

## 🏃 Running the Application

### Development Mode

1. **Start the Backend Server**:
```bash
cd backend
npm run dev
# Server runs on http://localhost:4000
```

2. **Start the Frontend Development Server**:
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Production Build

1. **Build the Frontend**:
```bash
cd frontend
npm run build
```

2. **Start the Backend**:
```bash
cd backend
npm start
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration

### User Profile
- `GET /profile` - Get user profile
- `POST /profile` - Create user profile
- `PUT /profile` - Update user profile

### Expenses Management
- `GET /expenses` - Get all user expenses
- `POST /expenses` - Add new expense
- `PUT /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Delete expense

### AI Chat
- `POST /ai/chat` - Send message to AI assistant

All protected routes require JWT authentication via `Authorization: Bearer <token>` header.

## 🎯 Features Overview

### Dashboard
- Welcome section with personalized greetings
- Quick action cards for main features
- Usage meters showing daily limits
- Integrated chat interface
- Today's tasks and study streak tracking

### AI Chat Assistant
- Powered by Groq's Llama-3.3-70b model
- Real-time messaging with typing indicators
- Daily usage limits (10 messages for free users)
- Context-aware responses for academic queries

### Budget Planner
- Expense tracking by category
- Monthly budget overview
- Visual spending analytics
- Indian Rupee (₹) currency support

### Smart Calendar
- AI-powered scheduling
- Study session reminders
- Integration with academic deadlines

### Weather & Daily Tips
- Current weather information
- Daily motivational content
- Location-based updates

### Premium Features
- Email summarization
- Extended usage limits
- Advanced analytics
- Priority support

## 🗄️ Database Schema

### Users (Supabase Auth)
- Managed by Supabase authentication system
- Email/password authentication
- JWT token generation

### Profiles Table
```sql
profiles (
  id: SERIAL PRIMARY KEY,
  user_id: UUID (FK to auth.users),
  name: TEXT,
  college: TEXT,
  year: TEXT,
  profile_picture: TEXT,
  timezone: TEXT,
  referral_code: TEXT,
  is_premium: BOOLEAN,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

### Expenses Table
```sql
expenses (
  id: SERIAL PRIMARY KEY,
  user_id: UUID (FK to auth.users),
  amount: DECIMAL(10,2),
  category: TEXT,
  description: TEXT,
  date: DATE,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

## 🌐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification | `your-jwt-secret` |
| `GROQ_API_KEY` | Groq API key for AI chat | `gsk_...` |
| `GROQ_API_URL` | Groq API endpoint | `https://api.groq.com/openai/v1/chat/completions` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `4000` |
| `NODE_ENV` | Environment mode | `development` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Test features thoroughly before submitting
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 🆘 Support

For support, please contact:
- Email: support@genewa.app
- GitHub Issues: [Create an issue](../../issues)
- Twitter: [@genewa_app](https://twitter.com/genewa_app)

## 🚀 Deployment

### Frontend Deployment
The frontend can be deployed to:
- **Vercel** (recommended for React apps)
- **Netlify**
- **Railway**
- **Heroku**

### Backend Deployment
The backend can be deployed to:
- **Railway**
- **Heroku**
- **DigitalOcean App Platform**
- **AWS EC2**

### Environment Setup for Production
Ensure all environment variables are properly configured in your deployment platform.

---

**Built with ❤️ for Indian students by the GenEWA team**

*LOCK IN - Empowering students with efficient workflow access and AI-driven productivity tools*
