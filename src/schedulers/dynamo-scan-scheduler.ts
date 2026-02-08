import {
  DynamoDBClient,
  ScanCommand,
  AttributeValue,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import axios from "axios";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const client = new DynamoDBClient({});
const snsClient = new SNSClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const EXTERNAL_API_URL =
  process.env.EXTERNAL_API_URL || "https://example.com/mock-endpoint";
const SCAN_LIMIT = parseInt(process.env.SCAN_LIMIT || "50", 10);
const SCHEDULED_TOPIC_ARN = process.env.SCHEDULED_TOPIC_ARN; // optional

interface JobItem {
  id: string;
  status?: string;
  processedAt?: string;
  enrichment?: Record<string, any>;
}

export const handler = async () => {
  // Scan for items needing processing (status = PENDING or missing processedAt)
  const filterExpression =
    "attribute_not_exists(processedAt) OR status = :pending";
  const expressionAttributeValues: Record<string, AttributeValue> = {
    ":pending": { S: "PENDING" },
  };

  const scanRes = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: SCAN_LIMIT,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );

  const items = (scanRes.Items || []).map((raw: any) => ({
    id: raw.id?.S as string,
  })) as JobItem[];
  if (!items.length) {
    return { message: "No items to process" };
  }

  // Mock external API call: send primary keys, receive enrichment data
  let apiData: any = {};
  try {
    const payload = { ids: items.map((i) => i.id) };
    // If actual endpoint wanted, axios will call it. For mock we just synthesize.
    if (EXTERNAL_API_URL.includes("example.com")) {
      apiData = payload.ids.reduce((acc: any, id: string) => {
        acc[id] = {
          score: Math.floor(Math.random() * 100),
          flag: Math.random() > 0.8,
        };
        return acc;
      }, {});
    } else {
      const resp = await axios.post(EXTERNAL_API_URL, payload, {
        timeout: 5000,
      });
      apiData = resp.data;
    }
  } catch (e: any) {
    console.error("External API error", e.message);
    throw e;
  }

  const nowIso = new Date().toISOString();
  const publishedMessageIds: string[] = [];
  // Update each item with enrichment and mark done
  for (const it of items) {
    const enrichment = apiData[it.id] || {};
    const updateExprParts = [
      "SET processedAt = :processedAt",
      "status = :status",
      "enrichment = :enrichment",
    ];
    const exprAttrValues: Record<string, AttributeValue> = {
      ":processedAt": { S: nowIso },
      ":status": { S: "DONE" },
      ":enrichment": { S: JSON.stringify(enrichment) },
    };

    await client.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: it.id } },
        UpdateExpression: updateExprParts.join(", "),
        ExpressionAttributeValues: exprAttrValues,
      })
    );

    if (SCHEDULED_TOPIC_ARN) {
      try {
        await snsClient.send(
          new PublishCommand({
            TopicArn: SCHEDULED_TOPIC_ARN,
            Message: JSON.stringify({
              id: it.id,
              type: "enrichment-complete",
              enrichment,
              processedAt: nowIso,
            }),
            MessageAttributes: {
              messageType: { DataType: "String", StringValue: "background" },
            },
          })
        );
        publishedMessageIds.push(it.id);
      } catch (err: any) {
        console.error(
          "Failed to publish SNS message for id",
          it.id,
          err?.message
        );
      }
    }
  }

  return { processed: items.length, notified: publishedMessageIds.length };
};
