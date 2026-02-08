import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log("Summaries processor received messages:", event.Records.length);

  for (const record of event.Records) {
    try {
      await processSummary(record);
    } catch (error) {
      console.error("Error processing summary message:", error);
      throw error;
    }
  }
};

async function processSummary(record: SQSRecord): Promise<void> {
  const body = safeParse(record.body);
  console.log("Processing summary:", {
    id: record.messageId,
    body,
  });

  // TODO: Implement summarization logic (invoke LLM or service)
}

function safeParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

