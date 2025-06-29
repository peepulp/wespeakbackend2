from decouple import config
from typing import Optional

class Settings:
    # Database
    DATABASE_URL: str = config("DATABASE_URL")
    
    # JWT
    JWT_SECRET_KEY: str = config("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = config("JWT_ALGORITHM", default="HS256")
    JWT_EXPIRE_MINUTES: int = config("JWT_EXPIRE_MINUTES", default=43200, cast=int)
    
    # Email
    SMTP_HOST: str = config("SMTP_HOST")
    SMTP_PORT: int = config("SMTP_PORT", cast=int)
    SMTP_USER: str = config("SMTP_USER")
    SMTP_PASSWORD: str = config("SMTP_PASSWORD")
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = config("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: str = config("AWS_SECRET_ACCESS_KEY")
    AWS_BUCKET_NAME: str = config("AWS_BUCKET_NAME")
    AWS_REGION: str = config("AWS_REGION")
    S3_BUCKET_URL: str = config("S3_BUCKET_URL")
    
    # Stripe
    STRIPE_SECRET_KEY: str = config("STRIPE_SECRET_KEY")
    STRIPE_PRODUCT_ID: str = config("STRIPE_PRODUCT_ID")
    
    # Social Auth
    GOOGLE_CLIENT_ID: str = config("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = config("GOOGLE_CLIENT_SECRET")
    FACEBOOK_CLIENT_ID: str = config("FACEBOOK_CLIENT_ID")
    FACEBOOK_CLIENT_SECRET: str = config("FACEBOOK_CLIENT_SECRET")
    TWITTER_CLIENT_ID: str = config("TWITTER_CLIENT_ID")
    TWITTER_CLIENT_SECRET: str = config("TWITTER_CLIENT_SECRET")
    
    # App
    BASE_URL: str = config("BASE_URL", default="http://localhost:8000")
    ENVIRONMENT: str = config("ENVIRONMENT", default="development")

settings = Settings()