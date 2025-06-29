# WeSpeak Backend - Python/FastAPI

Modern Python backend for WeSpeak application, rebuilt from Node.js/Express to use FastAPI with MySQL.

## Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   # Update .env with your credentials
   nano .env
   ```

3. **Setup Database**
   ```bash
   # Create MySQL database
   mysql -u root -p -e "CREATE DATABASE wespeakwelisten;"
   
   # Run schema setup
   mysql -u root -p wespeakwelisten < backend-master/mysql/table_setup.mysql
   mysql -u root -p wespeakwelisten < backend-master/mysql/patches/5-17-21.mysql
   ```

4. **Run Application**
   ```bash
   python run.py
   ```

5. **Access API**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

## Configuration

Update `.env` file with your credentials:

- **Database**: MySQL connection string
- **AWS S3**: Access keys and bucket info
- **Stripe**: Secret keys for payments
- **Email**: SMTP settings for notifications
- **Social Auth**: Google/Facebook OAuth credentials

## Key Features

- ✅ JWT Authentication
- ✅ User Management & Premium Subscriptions
- ✅ Organization/Company Management
- ✅ Complaint System with State Tracking
- ✅ Real-time Chat System
- ✅ Stripe Payment Integration
- ✅ AWS S3 File Uploads
- ✅ Email Notifications
- ✅ Social Login (Google/Facebook)
- ✅ Statistics & Crisis Detection
- ✅ Background Task Scheduler

## API Endpoints

### Core APIs
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/users/{id}` - User management
- `GET /api/organizations/` - Organization data
- `POST /api/complaints/` - Submit complaints
- `GET /api/chat/{complaint_id}` - Chat system

### Legacy MySQL APIs (Compatible with original)
- `GET /api/data/companies` - Company data
- `GET /api/data/complaints` - Complaint data
- `POST /api/data/complaints/insert` - Insert complaint
- `GET /api/data/replies/{complaint_id}` - Replies

## Database Schema

Uses existing MySQL schema:
- `users` - User accounts
- `companies` - Organizations
- `complaints` - User complaints
- `replies` - Complaint responses
- `chats` - Chat conversations
- `images` - File attachments

## Development

```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Docker Setup

```bash
# Run with Docker Compose
docker-compose up -d

# This will start:
# - MySQL database on port 3306
# - FastAPI app on port 8000
```

## Migration from Node.js

The Python backend is fully compatible with the original Node.js API structure while providing:
- Better performance with async/await
- Type safety with Pydantic
- Auto-generated API documentation
- Modern Python ecosystem
- Single database (MySQL only)

All existing frontend applications should work without changes.