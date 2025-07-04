# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Copy wait-for-it.sh and make it executable
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Change working directory to /app/src for correct module imports
WORKDIR /app/src

# Expose port
EXPOSE 8000

# Set the default command to run the app with uvicorn from the src directory
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]