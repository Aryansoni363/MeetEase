# MeetEase Frontend

A modern, responsive video conferencing application built with React.js, featuring real-time communication, WebRTC integration, and a sleek user interface.

## Features

### 🎥 Video Conferencing
- HD video calls with adaptive streaming
- Multi-participant support
- Audio/video controls (mute, camera toggle)
- Screen sharing capability

### 💬 Real-time Chat
- Instant messaging during meetings
- Message history
- Unread message indicators

### 🔒 Authentication & Security
- User registration and login
- JWT-based authentication with HTTP-only cookies
- Profile management
- Secure meeting codes

### 🎨 Modern UI/UX
- Responsive design for all devices
- Dark/light theme support
- Smooth animations with Framer Motion
- Clean, intuitive interface

### 🚀 Performance
- Optimized WebRTC connections
- Lazy loading and code splitting
- Efficient state management

## Tech Stack

- **Frontend**: React.js 18 with Hooks
- **Routing**: React Router v6
- **Styling**: TailwindCSS with custom components
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **HTTP Client**: Axios with interceptors
- **WebSockets**: Socket.IO client
- **WebRTC**: Native WebRTC APIs
- **Build Tool**: Vite
- **State Management**: React Context API

## Getting Started

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- Modern web browser with WebRTC support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MeetEase
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd FRONTEND
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy and configure environment file
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   # From the root directory
   npm run dev

   # Or start frontend only
   cd FRONTEND
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Environment Variables

Create a `.env` file in the FRONTEND directory:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
VITE_DEV_MODE=true
```

## Available Scripts

```bash
# Development
npm run dev          # Start frontend dev server
npm run backend      # Start backend server
npm start           # Start both frontend and backend

# Production
npm run build       # Build for production
npm run preview     # Preview production build

# Code Quality
npm run lint        # Run ESLint
```

## Project Structure

```
FRONTEND/
├── public/
│   └── vite.svg
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── LoadingSpinner.jsx
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── PublicRoute.jsx
│   ├── context/            # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── SocketContext.jsx
│   │   └── ThemeContext.jsx
│   ├── pages/              # Main application pages
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── Meeting.jsx
│   │   └── NotFound.jsx
│   ├── services/           # API and external services
│   │   ├── api.js
│   │   └── meetingService.js
│   ├── utils/              # Utility functions
│   │   ├── index.js
│   │   └── webrtc.js
│   ├── App.jsx             # Main App component
│   ├── main.jsx           # React entry point
│   └── index.css          # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Key Features Implementation

### WebRTC Video Calls
- Peer-to-peer connections using RTCPeerConnection
- STUN server configuration for NAT traversal
- Offer/Answer model for connection establishment
- ICE candidate exchange for connectivity

### Real-time Communication
- Socket.IO integration for signaling
- Message broadcasting and reception
- Room-based communication
- Connection state management

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly controls
- Optimized for various screen sizes

### State Management
- Context API for global state
- Custom hooks for reusable logic
- Optimized re-renders
- Proper error handling

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Note: WebRTC features require HTTPS in production environments.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Netlify/Vercel

1. Connect your repository to Netlify or Vercel
2. Set build command: `npm run build`
3. Set publish directory: `FRONTEND/dist`
4. Configure environment variables
5. Deploy!

### Environment Variables for Production

```env
VITE_API_URL=https://your-api-domain.com/api/v1
VITE_SOCKET_URL=https://your-api-domain.com
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- React.js team for the amazing framework
- TailwindCSS for the utility-first CSS framework
- Socket.IO team for real-time communication
- WebRTC community for the standards and examples
