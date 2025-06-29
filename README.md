# WeSpeak Backend - Python/FastAPI Version

This is the Python/FastAPI rebuild of the WeSpeak backend, migrated from Node.js/Express with MongoDB to use only MySQL as the database.

## Features

- **Authentication**: JWT-based authentication with email/password and social login (Google, Facebook)
- **User Management**: User registration, profile management, premium subscriptions
- **Organizations**: Company/organization management with statistics and crisis detection
- **Complaints**: Complaint submission, tracking, and state management
- **Chat System**: Real-time messaging between users and organizations
- **Payment Processing**: Stripe integration for premium subscriptions
- **File Upload**: S3 integration for image uploads
- **Statistics**: Automated statistics calculation and graphing
- **Email**: Email verification and password reset functionality

## Technology Stack

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **MySQL**: Single database for all data
- **Stripe**: Payment processing
- **AWS S3**: File storage
- **JWT**: Authentication tokens
- **Alembic**: Database migrations

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p -e "CREATE DATABASE wespeakwelisten;"
   
   # Run existing MySQL schema
   mysql -u root -p wespeakwelisten < backend-master/mysql/table_setup.mysql
   
   # Initialize Alembic (for future migrations)
   alembic init alembic
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

4. **Data Migration** (if migrating from MongoDB)
   ```python
   # Export users from MongoDB to JSON
   # Then run migration script
   python -c "from app.utils.migration import migrate_users_from_mongo_export; migrate_users_from_mongo_export('users_export.json')"
   ```

5. **Run the Application**
   ```bash
   python run.py
   # or
   uvicorn app.main:app --reload
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/email-verification` - Email verification
- `POST /api/auth/resetpassword` - Password reset
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/facebook` - Facebook OAuth

### Users
- `GET /api/users/` - Get all users
- `GET /api/users/{user_id}` - Get user by ID
- `PUT /api/users/{user_id}` - Update user
- `POST /api/users/image` - Upload user image

### Organizations
- `GET /api/organizations/` - Get all organizations
- `GET /api/organizations/{id}` - Get organization by ID
- `POST /api/organizations/follow` - Follow organization
- `POST /api/organizations/unfollow` - Unfollow organization
- `POST /api/organizations/neworganization` - Create organization

### Complaints
- `POST /api/complaints/` - Create complaint
- `GET /api/complaints/user/{user_id}` - Get user complaints
- `GET /api/complaints/organization/{org_id}` - Get organization complaints
- `GET /api/complaints/myfeed` - Get user feed
- `PUT /api/complaints/change-state/{id}` - Change complaint state

### Chat
- `GET /api/chat/chatlist` - Get chat list
- `GET /api/chat/{complaint_id}` - Get chat for complaint
- `POST /api/chat/{complaint_id}` - Send message

### Payment
- `GET /api/payment/plans` - Get Stripe plans
- `POST /api/payment/subscription` - Create subscription
- `POST /api/payment/cancel` - Cancel subscription

### Data (Legacy MySQL API)
- `GET /api/data/companies` - Get companies
- `GET /api/data/complaints` - Get complaints
- `POST /api/data/complaints/insert` - Insert complaint
- `GET /api/data/replies/{complaint_id}` - Get replies

## Database Schema

The application uses the existing MySQL schema from the original backend:

- `users` - User accounts and profiles
- `companies` - Company/organization data
- `complaints` - User complaints and issues
- `replies` - Replies to complaints
- `images` - Image attachments
- `chats` - Chat conversations
- `chat_messages` - Individual chat messages
- `chat_companies` - Chat-company relationships

## Key Differences from Node.js Version

1. **Single Database**: Uses only MySQL instead of MongoDB + MySQL
2. **Modern Python**: FastAPI with async/await support
3. **Type Safety**: Pydantic models for request/response validation
4. **Auto Documentation**: Swagger/OpenAPI docs at `/docs`
5. **Better Error Handling**: Structured error responses
6. **Background Tasks**: Async scheduler for statistics updates

## Migration Notes

- All MongoDB user data should be migrated to the MySQL `users` table
- Existing MySQL data (companies, complaints, etc.) remains unchanged
- Social authentication flows updated for FastAPI
- Statistics calculation logic preserved from original
- File upload handling adapted for FastAPI

## Development

```bash
# Run with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests (when implemented)
pytest

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Production Deployment

1. Set `ENVIRONMENT=production` in `.env`
2. Configure production database
3. Set up proper CORS origins
4. Use production WSGI server (gunicorn)
5. Configure SSL/HTTPS
6. Set up monitoring and logging

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`