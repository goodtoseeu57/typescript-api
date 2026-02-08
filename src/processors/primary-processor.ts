import {
  SQSEvent,
  SQSRecord,
  SQSBatchResponse,
  SQSBatchItemFailure,
} from "aws-lambda";

interface ScheduledMessage {
  timestamp: string;
  scheduleType: string;
  messageType: string;
  payload: {
    title: string;
    body: string;
    priority: string;
    data: any;
  };
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log("Primary processor received messages:", event.Records.length);

  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      await processUrgentMessage(record);
      console.log(`Successfully processed urgent message: ${record.messageId}`);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);

      // Add to batch failures for retry
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return {
    batchItemFailures,
  };
};

async function processUrgentMessage(record: SQSRecord): Promise<void> {
  try {
    // Parse SNS message from SQS
    const snsMessage = JSON.parse(record.body);
    const scheduledMessage: ScheduledMessage = JSON.parse(snsMessage.Message);

    console.log("Processing urgent message:", {
      messageId: record.messageId,
      messageType: scheduledMessage.messageType,
      title: scheduledMessage.payload.title,
      priority: scheduledMessage.payload.priority,
    });

    // Simulate urgent processing tasks
    await handleUrgentTasks(scheduledMessage);

    // Log processing completion
    console.log(
      `Urgent message processed successfully: ${scheduledMessage.payload.title}`
    );
  } catch (error) {
    console.error("Error parsing or processing urgent message:", error);
    throw error;
  }
}

async function handleUrgentTasks(message: ScheduledMessage): Promise<void> {
  const { payload } = message;

  switch (payload.data?.checkType || payload.data?.taskType) {
    case "health":
      await performHealthCheck(payload);
      break;
    case "scheduled-special":
      await handleSpecialUrgentTask(payload);
      break;
    default:
      await performGenericUrgentTask(payload);
      break;
  }
}

async function performHealthCheck(payload: any): Promise<void> {
  console.log("Performing system health check...");

  // TODO: Implement actual health check logic
  // - Check database connectivity
  // - Verify API endpoints
  // - Monitor system resources
  // - Send alerts if issues detected

  // Simulate health check processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Health check completed successfully");
}

async function handleSpecialUrgentTask(payload: any): Promise<void> {
  const hour = payload.data?.hour;
  console.log(`Handling special urgent task for hour ${hour}:`, payload.title);

  switch (hour) {
    case 6: // Morning health check
      await performMorningHealthCheck();
      break;
    default:
      console.log(
        `No specific urgent handler for hour ${hour}, using generic processing`
      );
      await performGenericUrgentTask(payload);
      break;
  }
}

async function performMorningHealthCheck(): Promise<void> {
  console.log("Performing comprehensive morning health check...");

  // TODO: Implement morning health check
  // - System startup verification
  // - Database integrity check
  // - Cache warming
  // - Service availability verification

  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Morning health check completed");
}

async function performGenericUrgentTask(payload: any): Promise<void> {
  console.log("Processing generic urgent task:", payload.title);

  // TODO: Implement generic urgent processing
  // - Send immediate notifications
  // - Process high-priority requests
  // - Handle system alerts
  // - Execute emergency procedures

  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("Generic urgent task completed");
}

// Error recovery mechanism
async function attemptMessageRecovery(record: SQSRecord): Promise<boolean> {
  try {
    console.log(`Attempting recovery for message: ${record.messageId}`);

    // Implement recovery logic
    // - Validate message format
    // - Check external dependencies
    // - Retry with backoff

    return true;
  } catch (error) {
    console.error("Message recovery failed:", error);
    return false;
  }
}
