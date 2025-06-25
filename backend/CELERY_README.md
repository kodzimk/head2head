# Celery AI Quiz Generation

This document explains how to set up and use Celery for AI-powered quiz generation in the Head2Head application.

## Overview

The system uses Celery to generate AI-powered quiz questions asynchronously when battles are created. This prevents blocking the main application while generating questions.

## Architecture

- **Celery Worker**: Processes AI quiz generation tasks in the background
- **Redis**: Used as both message broker and result backend
- **Google Generative AI**: Generates quiz questions using the Gemini Pro model
- **Flower**: Web-based monitoring tool for Celery tasks

## Setup

### 1. Environment Variables

Make sure you have the following environment variables set:

```bash
GOOGLE_API_KEY=your_google_api_key_here
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql+asyncpg://postgres:Kais123@db:5432/user_db
```

### 2. Docker Compose

The system includes Celery services in `docker-compose.yml`:

```yaml
celery-worker:
  image: head2head-backend
  command: celery -A celery_app worker --loglevel=info --queues=default,ai_quiz
  environment:
    - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    - REDIS_URL=redis://redis:6379/0
    - DATABASE_URL=postgresql+asyncpg://postgres:Kais123@db:5432/user_db

flower:
  image: head2head-backend
  command: celery -A celery_app flower --port=5555
  ports:
    - "5555:5555"
```

### 3. Start Services

```bash
# Start all services including Celery
docker-compose up -d

# Or start specific services
docker-compose up -d redis
docker-compose up -d celery-worker
docker-compose up -d flower
```

## Local Development

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7

# Or install Redis locally
# brew install redis (macOS)
# sudo apt-get install redis-server (Ubuntu)
```

### 3. Start Celery Worker

```bash
# Using the provided script
python start_celery.py

# Or manually
celery -A src.celery_app worker --loglevel=info --queues=default,ai_quiz
```

### 4. Start Flower (Optional)

```bash
celery -A src.celery_app flower --port=5555
```

## Usage

### 1. Task Triggering

AI quiz generation is automatically triggered when:
- A battle invitation is accepted
- A player joins a waiting battle

The system will:
1. Send `quiz_generating` notification to both players
2. Trigger background AI quiz generation
3. Poll for completion (up to 30 seconds)
4. Store questions in Redis cache
5. Send `quiz_ready` notification when complete

### 2. Task Monitoring

Access Flower dashboard at `http://localhost:5555` to monitor:
- Task status and progress
- Worker status
- Task history and results
- Queue statistics

### 3. Manual Task Execution

You can manually trigger quiz generation:

```python
from tasks import generate_ai_quiz

# Generate questions for a battle
result = generate_ai_quiz.delay("battle_id", "football", "intermediate")
print(f"Task ID: {result.id}")

# Check task status
print(f"Status: {result.status}")
print(f"Result: {result.get()}")
```

## Task Configuration

### Queue Configuration

- **default**: General tasks
- **ai_quiz**: AI quiz generation tasks

### Task Settings

- **Time Limit**: 30 minutes
- **Soft Time Limit**: 25 minutes
- **Worker Prefetch**: 1 task at a time
- **Max Tasks Per Child**: 1000

### Question Generation

- **Questions per quiz**: 5
- **Time limit per question**: 30 seconds
- **Answer options**: 4 (A, B, C, D)
- **Correct answers**: 1 per question

## Error Handling

### Fallback Mechanism

If AI quiz generation fails or times out:
1. System logs the error
2. Falls back to static questions from `aiquiz.router`
3. Continues with battle flow

### Monitoring

- Check Celery worker logs for task errors
- Monitor Flower dashboard for failed tasks
- Review application logs for integration issues

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure working directory is `/app/src` in Docker
   - Check Python path includes `src` directory

2. **Redis connection errors**
   - Verify Redis is running and accessible
   - Check `REDIS_URL` environment variable

3. **Google API errors**
   - Verify `GOOGLE_API_KEY` is set correctly
   - Check API key permissions and quotas

4. **Task timeouts**
   - Increase task time limits if needed
   - Check network connectivity to Google API

### Debug Commands

```bash
# Check Celery worker status
celery -A celery_app inspect active

# Check queue status
celery -A celery_app inspect stats

# Purge all queues
celery -A celery_app purge

# Check Redis connection
redis-cli ping
```

## Performance Considerations

- AI quiz generation typically takes 5-15 seconds
- Questions are cached in Redis for 1 hour
- System polls for completion every second (max 30 seconds)
- Fallback to static questions ensures reliability

## Security

- Google API key should be kept secure
- Redis should be configured with authentication in production
- Consider rate limiting for AI API calls
- Monitor API usage and costs 