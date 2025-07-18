# Deploy FastAPI Backend to AWS EC2

## Step 1: Connect to Your EC2 Instance
```bash
ssh -i ~/.ssh/welisten.pem ubuntu@3.236.22.64
```

## Step 2: Set Up Python Backend Directory
```bash
# Create directory for Python backend
cd /opt
sudo mkdir python-backend
sudo chown ubuntu:ubuntu python-backend
cd python-backend

# Upload your FastAPI code to this directory
# You can use scp, git clone, or file transfer
```

## Step 3: Install Dependencies
```bash
# Update system
sudo apt update

# Install Python and MySQL dependencies
sudo apt install python3 python3-pip python3-venv mysql-client libmysqlclient-dev pkg-config

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

## Step 4: Set Up Database
```bash
# Connect to MySQL and verify database
mysql -u root -p
# Password: test

# In MySQL console:
USE wespeakwelisten;
SHOW TABLES;

# If tables don't exist, run:
# EXIT from MySQL first, then:
mysql -u root -p wespeakwelisten < backend-master/mysql/table_setup.mysql
mysql -u root -p wespeakwelisten < backend-master/mysql/patches/5-17-21.mysql
```

## Step 5: Test the Backend
```bash
# Activate virtual environment
source venv/bin/activate

# Start the FastAPI server
python run.py

# Test in another terminal:
curl http://localhost:8000/api
```

## Step 6: Set Up as Service (Optional)
```bash
# Create systemd service file
sudo nano /etc/systemd/system/fastapi-backend.service
```

Add this content:
```ini
[Unit]
Description=FastAPI Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/python-backend
Environment=PATH=/opt/python-backend/venv/bin
ExecStart=/opt/python-backend/venv/bin/python run.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable fastapi-backend
sudo systemctl start fastapi-backend
sudo systemctl status fastapi-backend
```

## Step 7: Update Frontend Configuration
Update your frontend to point to the new backend:
- Change API base URL to: `http://3.236.22.64:8000`
- Or if running on same server: `http://localhost:8000`

## Step 8: Configure Nginx (if needed)
If you want to proxy through Nginx:
```bash
sudo nano /etc/nginx/sites-available/fastapi
```

Add:
```nginx
server {
    listen 80;
    server_name 3.236.22.64;
    
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        # Your existing frontend config
        root /home/ubuntu/welisten2;
        try_files $uri $uri/ /index.html;
    }
}
```

## Verification
1. Backend API docs: `http://3.236.22.64:8000/docs`
2. Health check: `http://3.236.22.64:8000/`
3. Test login: `http://3.236.22.64:8000/api/auth/login`