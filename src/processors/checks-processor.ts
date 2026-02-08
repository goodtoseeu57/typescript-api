import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("Checks processor received messages:", event.Records.length);

  for (const record of event.Records) {
    try {
      await processChecksMessage(record);
    } catch (error) {
      console.error("Error processing checks message:", error);
      // Let SQS/Lambda retry and DLQ on failure
      throw error;
    }
  }
};

async function processChecksMessage(record: SQSRecord): Promise<void> {
  const body = safeParse(record.body);
  console.log("Processing SLS Checks message:", {
    id: record.messageId,
    body,
  });

  // TODO: Implement the actual checks logic (lint/security/etc.)
}

function safeParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

