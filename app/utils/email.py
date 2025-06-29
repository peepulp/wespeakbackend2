import emails
from app.config import settings

def send_email(to_email: str, subject: str, html_content: str):
    message = emails.html(
        html=html_content,
        subject=subject,
        mail_from=settings.SMTP_USER
    )
    
    smtp_options = {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "user": settings.SMTP_USER,
        "password": settings.SMTP_PASSWORD,
        "tls": True
    }
    
    response = message.send(to=to_email, smtp=smtp_options)
    return response.status_code == 250

def send_verification_email(email: str, name: str, verification_token: str):
    verification_link = f"{settings.BASE_URL}/api/auth/email-verification?verificationToken={verification_token}"
    
    html_content = f"""
    Dear {name},<br>
    <br>
    Please verify your account by clicking this link. If you are unable to do so, copy and paste the following link into your browser:
    <br>
    <a href="{verification_link}">Verify email</a>
    <br>
    <br>
    Have a great day!<br>
    WeSpeak company<br>
    <br>
    """
    
    return send_email(email, "WeSpeak Email Verification", html_content)

def send_password_reset_email(email: str, name: str, reset_token: str):
    reset_link = f"{settings.BASE_URL}/api/auth/changepassword?email={email}&token={reset_token}"
    
    html_content = f"""
    Dear {name},<br>
    <br>
    please follow the link to change your password:
    <br>
    <a href="{reset_link}">Reset password</a>
    <br>
    if you didn't request a password change you may safely ignore this message.<br>
    <br>
    Have a great day!<br>
    WeSpeak company<br>
    <br>
    """
    
    return send_email(email, "WeSpeak Password Reset", html_content)