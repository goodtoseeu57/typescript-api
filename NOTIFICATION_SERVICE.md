# Notification Service Integration

This document explains how to use the notification service that has been integrated into your API.

## Architecture Overview

The notification service uses Amazon SNS with multiple SQS queues to handle different types of notifications:

- **Email notifications**: Processed by `email-processor`
- **SMS notifications**: Processed by `sms-processor`
- **Push notifications**: Processed by `push-processor`
- **Audit logs**: Processed by `audit-processor`

## API Endpoints

### 1. Publish Notification

**POST** `/notifications/publish`

```json
{
  "message": "Your notification message",
  "subject": "Email Subject (optional)",
  "email": "recipient@example.com",
  "type": "email|sms|push|all",
  "priority": "normal|high|critical"
}
```

### 2. Create Note (Updated)

**POST** `/create-note`

This endpoint now automatically sends notifications when a note is created successfully.

## Message Filtering

The SNS topic uses message filtering to route messages to appropriate queues:

- **Email queue**: Receives messages with `notificationType: ['email', 'all']`
- **SMS queue**: Receives messages with `notificationType: ['sms', 'all']` AND `priority: ['high', 'critical']`
- **Push queue**: Receives messages with `notificationType: ['push', 'all']`
- **Audit queue**: Receives ALL messages for logging purposes

## Lambda Functions

### Publisher Lambda

- **File**: `src/publisher/notification-publisher.ts`
- **Purpose**: Accepts HTTP requests and publishes to SNS
- **Environment Variables**: `SNS_TOPIC_ARN`

### Processor Lambdas

Each processor handles messages from their respective SQS queues:

1. **Email Processor** (`src/processors/email-processor.ts`)

   - Processes email notifications
   - TODO: Integrate with AWS SES

2. **SMS Processor** (`src/processors/sms-processor.ts`)

   - Processes SMS notifications
   - TODO: Integrate with AWS SNS SMS or Pinpoint

3. **Push Processor** (`src/processors/push-processor.ts`)

   - Processes push notifications
   - TODO: Integrate with Firebase or AWS Mobile Push

4. **Audit Processor** (`src/processors/audit-processor.ts`)
   - Logs all notifications for auditing
   - TODO: Store in DynamoDB or CloudWatch

## Best Practices Implemented

1. **Dead Letter Queues**: Each queue has a DLQ for failed messages
2. **Message Encryption**: All queues use KMS encryption
3. **Proper Timeouts**: Different visibility timeouts per service type
4. **Concurrency Limits**: Reserved concurrency for Lambda functions
5. **Batch Processing**: Optimized batch sizes for each processor
6. **IAM Permissions**: Least privilege access patterns

## Example Usage

### Using the API directly:

```bash
curl -X POST https://your-api-gateway-url/notifications/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Hello from notification service!",
    "subject": "Test Notification",
    "email": "user@example.com",
    "type": "email",
    "priority": "normal"
  }'
```

### From within a Lambda function:

```typescript
import * as AWS from "aws-sdk";

const sns = new AWS.SNS();

await sns
  .publish({
    TopicArn: process.env.SNS_TOPIC_ARN,
    Message: JSON.stringify({
      default: "Your message",
      email: JSON.stringify({
        subject: "Subject",
        content: "Content",
        recipient: "user@example.com",
      }),
    }),
    MessageStructure: "json",
    MessageAttributes: {
      notificationType: {
        DataType: "String",
        StringValue: "email",
      },
    },
  })
  .promise();
```

## Monitoring

- All Lambda functions log to CloudWatch
- SQS provides metrics for queue depth, message age, etc.
- SNS provides metrics for message delivery
- Dead letter queues capture failed messages for investigation

## Next Steps

1. Install required dependencies: `npm install aws-sdk`
2. Deploy the stack: `cdk deploy`
3. Update the TODO sections in processor functions with actual service integrations
4. Set up CloudWatch alarms for monitoring queue depths and errors
5. Configure proper email addresses and phone numbers for testing
