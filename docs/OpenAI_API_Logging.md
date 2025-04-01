# OpenAI API Logging System

## Overview
The Spy Story Game Engine includes comprehensive logging for OpenAI API requests and responses, enabling developers to:

- View exactly what is being sent to the OpenAI API
- Inspect token usage and response content
- Debug JSON parsing and response handling issues
- Track performance and identify bottlenecks

## Key Components

### 1. `utils/context_manager.py`
This file contains the core API logging functionality:

- `configure_logging()`: Sets up logging configuration for the entire application
- `OpenAIContextManager`: Stateless service class that handles API interactions
- `process_api_call()`: Centralized method for making API calls with robust logging
- `test_api_logging()`: Helper function for testing the logging system

### 2. `test_api_logging.py`
A standalone script that demonstrates API request logging:

```python
# Run from project root
python test_api_logging.py
```

## What's Logged

### Request Information
- **Model**: Which model is being used 
- **Temperature**: Temperature setting for the request
- **Full Request Payload**: The complete messages array and all parameters
- **Truncated Content**: For very large messages, content is truncated but preserves important parts

### Response Information
- **Usage Statistics**: Token counts for prompt, completion, and total
- **Content Length**: Size of the response
- **JSON Parsing**: Success or errors when parsing the JSON response
- **Raw Content Preview**: First 500 characters of the response

## How to Use

### In Code
To log an API call in your code:

```python
from utils.context_manager import OpenAIContextManager
from openai import OpenAI

# Create the context manager
context_manager = OpenAIContextManager()

# Create an OpenAI client
client = OpenAI(api_key=your_api_key)

# Make a request with detailed logging
result = context_manager.process_api_call(
    client=client,
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Your question here"}
    ],
    model="gpt-3.5-turbo",
    temperature=0.7
)
```

### Using Test Script
For quick testing of API logging:

```bash
# Set your API key
export OPENAI_API_KEY=your_key_here

# Run the test script
python test_api_logging.py
```

## Common Debugging Scenarios

### JSON Parsing Errors
If you see errors like:
```
JSON decode error: Expecting property name enclosed in double quotes
```

The logged response will include escaped content for inspection:
```
Escaped JSON content for inspection: ...
```

### Response Format Issues
When using `response_format="json_object"`, ensure your messages contain the word "json" somewhere, or you'll see:
```
'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'
```

### Token Usage Monitoring
Keep track of token usage to optimize prompts:
```
Usage: CompletionUsage(completion_tokens=30, prompt_tokens=36, total_tokens=66)
```

## Log Output Format

The logs are formatted with clear separators:

```
=======================================
OpenAI API REQUEST
=======================================
Model: gpt-3.5-turbo
Temperature: 0.7
REQUEST PAYLOAD:
{
  "model": "gpt-3.5-turbo",
  "messages": [...]
}
---------------------------------------
RESPONSE RECEIVED:
Usage: CompletionUsage(...)
Content length: 69
Successfully parsed JSON response
=======================================
```

## Implementation Details

The API logging system uses a stateless design:

1. All API requests go through a centralized `process_api_call()` method
2. Each request is fully logged with its parameters and messages
3. Every response is carefully captured with usage statistics
4. Error handling includes detailed logging of failure points
5. The logging is designed to work with both test and production environments 

### Example API Call

```python
response = client.chat.completions.create(
    model="o3-mini",
    messages=messages,
    response_format={"type": "json_object"}
)
```

### Logged Information

- **Model**: Model being used
- **Response Format**: Expected response format
- **Messages**: Input messages
- **Response**: API response content 