import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("Close conversation processor triggered:", event.Records.length);

  for (const record of event.Records) {
    try {
      await closeConversation(record);
    } catch (error) {
      console.error("Error closing conversation:", error);
      throw error;
    }
  }
};

async function closeConversation(record: SQSRecord): Promise<void> {
  const body = safeParse(record.body);
  // If this came via EventBridge -> SQS, the body will likely be the EventBridge event
  console.log("Closing conversation after inactivity:", {
    id: record.messageId,
    event: body,
    closedAt: new Date().toISOString(),
  });

  // TODO: Implement actual conversation close (e.g., update DB/state, notify services)
}

function safeParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

