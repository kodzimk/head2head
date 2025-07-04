# Celery Configuration for Head2Head

## Overview

This document describes the Celery configuration for the Head2Head application, specifically for AI-powered quiz question generation using Google's Gemini 2.0 Flash Exp model.

## Architecture

### Components

1. **Celery Worker**: Processes background tasks for AI question generation
2. **Redis**: Message broker and result backend
3. **Flower**: Web-based monitoring tool for Celery tasks
4. **AI Quiz Generator**: Uses Gemini 2.0 Flash Exp for question generation

### Queues

- **default**: General tasks
- **ai_quiz**: AI-powered question generation tasks

## AI Quiz Generation

### Features

- **Real-time Generation**: Questions generated immediately when battles are created
- **Unique Questions**: Each battle gets unique questions based on battle ID and context
- **Difficulty Levels**: Support for easy, medium, and hard difficulty levels
- **Multiple Sports**: Football, basketball, tennis, and other sports
- **Fallback System**: Graceful fallback to basic questions if AI generation fails

### Question Format

Each generated question follows this structure:

```json
{
    "question": "What is the primary objective in football?",
    "answers": [
        {"text": "Score more goals than the opponent", "correct": true, "label": "A"},
        {"text": "Have the most possession time", "correct": false, "label": "B"},
        {"text": "Make the most passes", "correct": false, "label": "C"},
        {"text": "Run the fastest", "correct": false, "label": "D"}
    ],
    "time_limit": 30,
    "difficulty": "easy",
    "battle_id": "unique-battle-id"
}
```

### AI Model Configuration

- **Model**: Gemini 2.0 Flash Exp (latest and fastest)
- **API**: Google Generative AI
- **Response Format**: Structured JSON
- **Validation**: Comprehensive question and answer validation
- **Error Handling**: Graceful fallback to basic questions

### Difficulty Guidelines

#### Easy Questions
- Basic facts, rules, and common knowledge
- Most sports fans would know these
- Simple statistics and general information

#### Medium Questions
- Historical facts and notable players
- Championships and intermediate-level knowledge
- Recent events and achievements

#### Hard Questions
- Detailed statistics and records
- Specific dates and advanced rules
- Expert-level knowledge and obscure facts

## Setup

### Environment Variables

```bash
# Required
GOOGLE_API_KEY=your_google_api_key_here
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/dbname

# Optional
QUESTION_COUNT=7  # Default number of questions per battle
```

### Docker Compose

```yaml
services:
  celery-worker:
    image: head2head-backend
    command: celery -A celery_app worker --loglevel=info --concurrency=4 --queues=default,ai_quiz
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql+asyncpg://postgres:Kais123@db:5432/user_db
      - PYTHONPATH=/app/src
```

### Task Configuration

```python
# Task time limits
task_time_limit=10 * 60      # 10 minutes for AI generation
task_soft_time_limit=8 * 60  # 8 minutes soft limit

# Task routes
"tasks.generate_ai_quiz": {"queue": "ai_quiz"}
```

## Usage

### Starting the Worker

```bash
# Development
celery -A celery_app worker --loglevel=info --queues=default,ai_quiz

# Production
celery -A celery_app worker --loglevel=info --concurrency=4 --queues=default,ai_quiz
```

### Monitoring with Flower

```bash
celery -A celery_app flower --port=5555
```

Access Flower at: http://localhost:5555

### Task Execution

Questions are automatically generated when:
1. A new battle is created
2. Questions are requested for a battle that doesn't have cached questions

## Error Handling

### Fallback Mechanism

If AI quiz generation fails or times out:
1. System logs the error
2. Falls back to basic fallback questions
3. Continues with battle flow
4. Maintains user experience

### Common Issues

1. **API Key Issues**
   - Verify GOOGLE_API_KEY is set correctly
   - Check API key permissions and quotas

2. **Network Issues**
   - Check internet connectivity
   - Verify Google API endpoints are accessible

3. **Rate Limiting**
   - Monitor API usage
   - Implement retry logic if needed

4. **Task Timeouts**
   - Increase task time limits if needed
   - Check system resources

### Monitoring

- Check Celery worker logs for task errors
- Monitor Flower dashboard for failed tasks
- Review application logs for integration issues
- Monitor Google API usage and quotas

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure working directory is `/app/src` in Docker
   - Check Python path includes `src` directory

2. **Redis connection errors**
   - Verify Redis is running and accessible
   - Check `REDIS_URL` environment variable

3. **AI generation errors**
   - Verify Google API key is valid
   - Check API quotas and limits
   - Review error logs for specific issues

4. **Task timeouts**
   - Increase task time limits if needed
   - Check system resources and network connectivity

### Debug Commands

```bash
# Check Celery worker status
celery -A celery_app inspect active

# Check queue status
celery -A celery_app inspect stats

# Purge all queues
celery -A celery_app purge

# Check task results
celery -A celery_app inspect reserved
```

## Benefits of AI Question Generation

- **Uniqueness**: Each battle gets unique questions
- **Variety**: Wide range of topics and difficulty levels
- **Accuracy**: AI-generated questions are factually correct
- **Scalability**: Can generate questions for any sport or topic
- **Engagement**: More interesting and challenging questions
- **Real-time**: Questions generated on-demand

## Performance Considerations

- **Caching**: Questions cached in Redis for 1 hour
- **Async Processing**: Non-blocking question generation
- **Fallback System**: Graceful degradation if AI fails
- **Resource Management**: Proper task timeouts and limits
- **Monitoring**: Comprehensive logging and error tracking 