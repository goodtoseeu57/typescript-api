import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("Audit processor received messages:", event.Records.length);

  for (const record of event.Records) {
    try {
      await processAuditMessage(record);
    } catch (error) {
      console.error("Error processing audit message:", error);
      // Message will be sent to DLQ after max retries
      throw error;
    }
  }
};

async function processAuditMessage(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);

  // Parse SNS message if it's from SNS
  let messageBody;
  if (message.Type === "Notification") {
    messageBody = JSON.parse(message.Message);
  } else {
    messageBody = message;
  }

  console.log("Processing audit log:", {
    messageId: record.messageId,
    body: messageBody,
    timestamp: new Date().toISOString(),
  });

  // TODO: Implement actual audit logging
  // For example, writing to DynamoDB, CloudWatch Logs, or S3
  /*
  const dynamoClient = new DynamoDBClient({});
  await dynamoClient.send(new PutItemCommand({
    TableName: process.env.AUDIT_TABLE_NAME,
    Item: {
      id: { S: record.messageId },
      timestamp: { S: new Date().toISOString() },
      message: { S: JSON.stringify(messageBody) },
      source: { S: 'notification-service' },
    },
  }));
  */

  console.log("Audit message processed successfully");
}
