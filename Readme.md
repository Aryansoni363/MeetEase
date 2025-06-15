# MeetEase

MeetEase is a modern video conferencing web application designed to provide seamless and efficient communication for students and educators. It features real-time video calls, chat functionality, and screen sharing capabilities with a beautiful, responsive user interface.

## ✨ Features

### 🎥 Video Conferencing
- **HD Video Calls**: Crystal clear video quality with adaptive streaming
- **Multi-participant Support**: Connect with multiple users simultaneously
- **Audio/Video Controls**: Easy mute/unmute and camera toggle
- **Screen Sharing**: Share your screen, applications, or browser tabs

### 💬 Communication
- **Real-time Chat**: Instant messaging during meetings
- **Message History**: Persistent chat history for each meeting
- **Notifications**: Unread message indicators and toast notifications

### 🔐 Security & Authentication
- **Secure Login/Registration**: JWT-based authentication with HTTP-only cookies
- **Profile Management**: Update personal information and password
- **Meeting Codes**: Random 8-character codes for secure meeting access
- **Private Rooms**: Each meeting has a unique room ID

### 🎨 Modern Interface
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Smooth Animations**: Powered by Framer Motion for fluid interactions
- **Intuitive Navigation**: Clean and modern UI/UX design

## 🚀 Tech Stack

### Frontend
- **React.js 18** - Modern React with Hooks and Context API
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework for styling
- **Framer Motion** - Animation library for smooth transitions
- **Socket.IO Client** - Real-time bidirectional communication
- **Axios** - HTTP client with interceptors for API calls
- **React Router v6** - Client-side routing
- **Lucide React** - Beautiful SVG icons

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database for data persistence
- **Socket.IO** - Real-time communication server
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing and security

### WebRTC & Real-time
- **WebRTC APIs** - Peer-to-peer video/audio communication
- **STUN Servers** - NAT traversal for connection establishment
- **Socket.IO** - WebRTC signaling and chat messaging

## 📋 Prerequisites

- **Node.js** 16 or higher
- **MongoDB** running locally or in the cloud
- **Modern web browser** with WebRTC support (Chrome, Firefox, Safari, Edge)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/MeetEase.git
cd MeetEase
```

### 2. Install Dependencies
```bash
# Install root dependencies (for concurrent scripts)
npm install

# Install backend dependencies
cd BACKEND
npm install

# Install frontend dependencies
cd ../FRONTEND
npm install
```

### 3. Environment Configuration

#### Backend (.env file in BACKEND directory):
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/meetease
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env file in FRONTEND directory):
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
VITE_DEV_MODE=true
```

### 4. Start the Application

#### Option 1: Start Both Services Concurrently (Recommended)
```bash
# From the root directory
npm start
```

#### Option 2: Start Services Separately
```bash
# Terminal 1 - Backend
cd BACKEND
npm run dev

# Terminal 2 - Frontend
cd FRONTEND
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/v1

## 📁 Project Structure

```
MeetEase/
├── 📄 package.json              # Root package.json for scripts
├── 📄 README.md                 # This file
├── BACKEND/                     # Backend application
│   ├── src/
│   │   ├── controllers/         # Route controllers
│   │   ├── models/             # MongoDB models
│   │   ├── routes/             # API routes
│   │   ├── middlewares/        # Custom middlewares
│   │   ├── socket/             # Socket.IO configuration
│   │   └── utils/              # Utility functions
│   ├── package.json
│   └── .env                    # Backend environment variables
└── FRONTEND/                   # Frontend React application
    ├── src/
    │   ├── components/         # Reusable UI components
    │   ├── pages/             # Application pages/routes
    │   ├── context/           # React Context providers
    │   ├── services/          # API services and utilities
    │   ├── utils/             # Helper functions
    │   └── assets/            # Static assets
    ├── public/                # Public files
    ├── package.json
    └── .env                   # Frontend environment variables
```

## 🎯 Available Scripts

### Root Directory
```bash
npm start           # Start both frontend and backend
npm run dev         # Start frontend only
npm run backend     # Start backend only
npm run setup       # Install all dependencies
```

### Frontend (FRONTEND directory)
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Backend (BACKEND directory)
```bash
npm run dev         # Start with nodemon
npm start           # Start production server
npm test            # Run tests
```

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/users/register` - User registration
- `POST /api/v1/users/login` - User login
- `POST /api/v1/users/logout` - User logout
- `POST /api/v1/users/refresh-token` - Refresh access token

### Meeting Management
- `POST /api/v1/meeting/create` - Create new meeting
- `POST /api/v1/meeting/join` - Join meeting with code
- `POST /api/v1/meeting/leave/:roomId` - Leave meeting
- `GET /api/v1/meeting/history` - Get user's meeting history
- `GET /api/v1/meeting/:roomId/messages` - Get meeting messages
- `POST /api/v1/meeting/:roomId/message` - Send message

## 🔧 Development

### Code Style & Quality
- **ESLint** configuration for code consistency
- **Prettier** for code formatting
- **Tailwind CSS** for consistent styling
- **Error Boundaries** for graceful error handling

### Testing
```bash
cd BACKEND
npm test  # Run backend tests

cd FRONTEND
npm run test  # Run frontend tests (when implemented)
```

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Build the project: `cd FRONTEND && npm run build`
2. Deploy the `dist` folder
3. Set environment variables in deployment platform
4. Configure redirects for SPA routing

### Backend (Heroku/Railway/DigitalOcean)
1. Set up MongoDB Atlas or other cloud database
2. Configure environment variables
3. Deploy using your preferred platform
4. Ensure CORS settings allow your frontend domain

### Production Environment Variables
```env
# Backend
NODE_ENV=production
MONGODB_URI=your-production-mongodb-url
CORS_ORIGIN=https://your-frontend-domain.com

# Frontend
VITE_API_URL=https://your-backend-domain.com/api/v1
VITE_SOCKET_URL=https://your-backend-domain.com
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write clear commit messages
- Test your changes thoroughly
- Update documentation as needed
- Ensure responsive design compatibility

## 📱 Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome  | 80+     | ✅ Full support |
| Firefox | 75+     | ✅ Full support |
| Safari  | 13+     | ✅ Full support |
| Edge    | 80+     | ✅ Full support |

**Note**: WebRTC features require HTTPS in production environments.

## 🐛 Known Issues & Limitations

- WebRTC may require TURN servers for some network configurations
- Screen sharing is limited to one user at a time
- Mobile Safari has some WebRTC limitations
- File sharing is not yet implemented

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/your-username/MeetEase/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/MeetEase/discussions)
- **Email**: your-email@example.com

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React.js** team for the amazing framework
- **TailwindCSS** for the utility-first CSS framework
- **Socket.IO** team for real-time communication
- **WebRTC** community for standards and examples
- **Framer Motion** for beautiful animations
- All contributors and testers who helped improve MeetEase

---

**Made with ❤️ for seamless video communication**
