import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("Email processor received messages:", event.Records.length);

  for (const record of event.Records) {
    try {
      await processEmailMessage(record);
    } catch (error) {
      console.error("Error processing email message:", error);
      // Message will be sent to DLQ after max retries
      throw error;
    }
  }
};

async function processEmailMessage(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);

  // Parse SNS message if it's from SNS
  let messageBody;
  if (message.Type === "Notification") {
    messageBody = JSON.parse(message.Message);
  } else {
    messageBody = message;
  }

  console.log("Processing email notification:", {
    messageId: record.messageId,
    body: messageBody,
  });

  // TODO: Implement actual email sending logic
  // For example, using AWS SES
  /*
  const sesClient = new SESClient({});
  await sesClient.send(new SendEmailCommand({
    Source: 'noreply@yourapp.com',
    Destination: {
      ToAddresses: [messageBody.email.recipient],
    },
    Message: {
      Subject: {
        Data: messageBody.email.subject,
      },
      Body: {
        Text: {
          Data: messageBody.email.content,
        },
      },
    },
  }));
  */

  console.log("Email notification processed successfully");
}
