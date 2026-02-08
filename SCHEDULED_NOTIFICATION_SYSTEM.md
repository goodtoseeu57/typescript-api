# Scheduled Notification System

This document describes the scheduled notification system that publishes messages to two SQS queues via SNS using EventBridge for hourly scheduling.

## Architecture Overview

```
EventBridge (Hourly) → Lambda (Scheduler) → SNS Topic → SQS Queues → Lambda Processors
                                                    ↓
                                            [Primary Queue]  [Secondary Queue]
                                                    ↓              ↓
                                            [Primary Proc]  [Secondary Proc]
```

## Components

### 1. ScheduledNotificationConstruct

**Location**: `iac/ScheduledNotificationConstruct.ts`

Main CDK construct that creates:

- SNS Topic for scheduled notifications
- Two SQS queues (Primary and Secondary) with Dead Letter Queues
- EventBridge rule for hourly triggers
- Lambda functions for scheduling and processing

**Key Features**:

- Message filtering by `messageType` attribute
- KMS encryption for all queues
- Configurable retry policies with DLQs
- Automatic Lambda event source mappings

### 2. EventBridge Scheduling

**Schedule**: Every hour (configurable)
**Target**: Hourly Scheduler Lambda function
**Rule**: `events.Schedule.rate(Duration.hours(1))`

**Custom Schedules**: Use the `addCustomScheduleRule` method to create additional scheduling patterns.

### 3. SNS Topic and Message Routing

**Topic Name**: `scheduled-notifications`

**Message Filtering**:

- `messageType: 'urgent'` → Primary Queue only
- `messageType: 'batch'` → Secondary Queue only
- `messageType: 'background'` → Secondary Queue only
- `messageType: 'all'` → Both queues

### 4. SQS Queues

#### Primary Queue (`scheduled-primary-queue`)

- **Purpose**: Urgent/immediate processing
- **Visibility Timeout**: 5 minutes
- **Retention**: 4 days
- **DLQ Max Receives**: 3
- **Processor Concurrency**: 20

#### Secondary Queue (`scheduled-secondary-queue`)

- **Purpose**: Batch/background processing
- **Visibility Timeout**: 10 minutes
- **Retention**: 7 days
- **DLQ Max Receives**: 5
- **Processor Concurrency**: 5

## Lambda Functions

### 1. Hourly Scheduler (`src/schedulers/hourly-scheduler.ts`)

**Trigger**: EventBridge hourly rule
**Purpose**: Publishes scheduled notifications to SNS topic

**Message Types Generated**:

- `urgent`: System health checks
- `batch`: Analytics processing
- `all`: Maintenance notifications

**Special Hour Tasks**:

- `00:00` (Midnight): Daily summary generation
- `06:00` (6 AM): Morning health check
- `12:00` (Noon): Midday maintenance
- `18:00` (6 PM): Evening backup

**Environment Variables**:

- `SNS_TOPIC_ARN`: Target SNS topic for publishing

### 2. Primary Processor (`src/processors/primary-processor.ts`)

**Trigger**: SQS events from Primary Queue
**Purpose**: Process urgent/immediate notifications

**Processing Types**:

- Health checks
- System alerts
- High-priority tasks
- Emergency procedures

**Configuration**:

- Batch size: 10 messages
- Batching window: 5 seconds
- Concurrent executions: 20

### 3. Secondary Processor (`src/processors/secondary-processor.ts`)

**Trigger**: SQS events from Secondary Queue  
**Purpose**: Process batch/background notifications

**Processing Types**:

- Analytics processing
- Maintenance tasks
- Data archival
- Report generation

**Configuration**:

- Batch size: 25 messages
- Batching window: 20 seconds
- Concurrent executions: 5

## API Endpoints

### Manual Trigger Endpoint

**Endpoint**: `POST /scheduled/trigger`
**Purpose**: Manually trigger scheduled notifications for testing

**Request Body**:

```json
{
  "triggerType": "immediate|test",
  "messageTypes": ["urgent", "batch", "all"],
  "customMessage": {
    "title": "Custom Test Message",
    "body": "Custom message body",
    "priority": "high",
    "data": {
      "customField": "value"
    }
  }
}
```

**Response**:

```json
{
  "message": "Manual scheduler trigger executed successfully",
  "timestamp": "2025-09-11T10:00:00Z",
  "triggerType": "immediate",
  "notificationCount": 3,
  "messageIds": ["msg-id-1", "msg-id-2", "msg-id-3"],
  "notifications": [
    {
      "messageType": "urgent",
      "title": "Manual Urgent Test Notification",
      "priority": "high"
    }
  ]
}
```

## Message Format

### SNS Message Structure

```json
{
  "timestamp": "2025-09-11T10:00:00Z",
  "scheduleType": "hourly|daily|manual",
  "messageType": "urgent|batch|background|all",
  "payload": {
    "title": "Notification Title",
    "body": "Notification body text",
    "priority": "high|medium|low",
    "data": {
      "timestamp": "2025-09-11T10:00:00Z",
      "checkType": "health|maintenance|analytics",
      "additionalData": "..."
    }
  }
}
```

### Message Attributes

- `messageType`: Controls queue routing
- `priority`: Processing priority level
- `scheduleType`: Source of the trigger
- `timestamp`: Message creation time

## Integration with Main API

The scheduled notification system is integrated into the main API construct (`ApiConstruct.ts`):

```typescript
// Initialize scheduled notification service
this.scheduledNotificationService = new ScheduledNotificationConstruct(
  this,
  "ScheduledNotificationService"
);

// Add manual trigger endpoint
const schedulerTriggerLambda = this.createSchedulerTriggerLambda();
const schedulerTriggerIntegration = new LambdaIntegration(
  schedulerTriggerLambda
);
api.root
  .addResource("scheduled")
  .addResource("trigger")
  .addMethod("POST", schedulerTriggerIntrigration, { authorizer });
```

## Deployment

1. **Install Dependencies**:

   ```bash
   npm install aws-sdk
   ```

2. **Deploy Stack**:

   ```bash
   cdk deploy
   ```

3. **Verify Deployment**:
   - Check EventBridge rules in AWS Console
   - Verify SNS topic and subscriptions
   - Confirm SQS queues are created
   - Test manual trigger endpoint

## Monitoring and Troubleshooting

### CloudWatch Logs

- Lambda execution logs for each function
- SQS queue metrics (messages sent/received/in flight)
- SNS topic publish metrics
- EventBridge rule invocation logs

### Key Metrics to Monitor

- EventBridge rule success rate
- SNS publish success rate
- SQS queue depth
- Lambda function duration and errors
- DLQ message count

### Common Issues

1. **Messages not routing correctly**: Check message attributes and filter policies
2. **Lambda timeouts**: Increase timeout or optimize processing logic
3. **DLQ accumulation**: Review error logs and fix processing issues
4. **EventBridge not triggering**: Verify rule is enabled and permissions are correct

## Security Features

- **KMS Encryption**: All SQS queues encrypted with AWS KMS
- **IAM Roles**: Least privilege access for all Lambda functions
- **API Authorization**: All endpoints require valid JWT tokens
- **VPC**: Can be deployed within VPC for additional security

## Cost Optimization

- **Reserved Concurrency**: Limits set on Lambda functions
- **SQS Batching**: Efficient message processing in batches
- **Message Retention**: Appropriate retention periods to minimize storage costs
- **DLQ Strategy**: Prevents infinite retry loops

## Extensibility

### Adding New Schedule Patterns

```typescript
// Add custom schedule (e.g., every 15 minutes)
scheduledNotificationService.addCustomScheduleRule(
  "FifteenMinuteRule",
  events.Schedule.rate(Duration.minutes(15)),
  "Custom 15-minute notification schedule"
);
```

### Adding New Message Types

1. Update filter policies in `ScheduledNotificationConstruct.ts`
2. Add handling logic in processor Lambda functions
3. Update documentation and message format

### Custom Processing Logic

- Extend processor functions with new task types
- Add environment variables for configuration
- Implement new notification channels (email, SMS, etc.)

## Best Practices

1. **Error Handling**: Always implement proper error handling and logging
2. **Idempotency**: Ensure processing functions can handle duplicate messages
3. **Monitoring**: Set up CloudWatch alarms for critical metrics
4. **Testing**: Use manual trigger endpoint for testing new functionality
5. **Documentation**: Keep this documentation updated with changes
