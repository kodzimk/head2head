FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app/backend/src

# Copy the backend folder contents into the container
COPY backend/ /app/backend/

# Install Python dependencies
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Expose the port FastAPI will run on
EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]