import boto3
from botocore.exceptions import ClientError
from PIL import Image
import io
from app.config import settings

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

def upload_to_s3(file_data: bytes, file_name: str, content_type: str = 'image/jpeg'):
    try:
        s3_client.put_object(
            Bucket=settings.AWS_BUCKET_NAME,
            Key=file_name,
            Body=file_data,
            ContentType=content_type,
            ACL='public-read'
        )
        return f"{settings.S3_BUCKET_URL}/{file_name}"
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        return None

def resize_image(image_data: bytes, size: int) -> bytes:
    image = Image.open(io.BytesIO(image_data))
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    
    output = io.BytesIO()
    image.save(output, format='JPEG', quality=85)
    return output.getvalue()

def upload_image_variants(image_data: bytes, folder: str, filename: str):
    """Upload small, medium, and large variants of an image"""
    variants = {
        'small': 256,
        'medium': 640,
        'big': 960
    }
    
    urls = {}
    for variant, size in variants.items():
        resized_data = resize_image(image_data, size)
        file_path = f"{folder}/{variant}_{filename}"
        url = upload_to_s3(resized_data, file_path)
        if url:
            urls[variant] = url
    
    return urls