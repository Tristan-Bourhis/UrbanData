FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
WORKDIR /app/src
EXPOSE 5000
CMD ["sh", "-c", "python api.py & sleep 5 && python user_permissions.py && wait"]