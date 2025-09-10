import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("SMS processor received messages:", event.Records.length);

  for (const record of event.Records) {
    try {
      await processSmsMessage(record);
    } catch (error) {
      console.error("Error processing SMS message:", error);
      // Message will be sent to DLQ after max retries
      throw error;
    }
  }
};

async function processSmsMessage(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);

  // Parse SNS message if it's from SNS
  let messageBody;
  if (message.Type === "Notification") {
    messageBody = JSON.parse(message.Message);
  } else {
    messageBody = message;
  }

  console.log("Processing SMS notification:", {
    messageId: record.messageId,
    body: messageBody,
  });

  // TODO: Implement actual SMS sending logic
  // For example, using AWS SNS SMS or Amazon Pinpoint
  /*
  const snsClient = new SNSClient({});
  await snsClient.send(new PublishCommand({
    PhoneNumber: messageBody.phoneNumber,
    Message: messageBody.sms,
  }));
  */

  console.log("SMS notification processed successfully");
}
