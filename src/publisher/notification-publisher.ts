import * as AWS from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const sns = new AWS.SNS();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");

    // Validate required fields
    if (!body.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Message is required" }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    const message = {
      default: body.message,
      email: JSON.stringify({
        subject: body.subject || "Notification",
        content: body.message,
        recipient: body.email,
      }),
      sms: body.message,
    };

    const publishParams = {
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: JSON.stringify(message),
      MessageStructure: "json",
      MessageAttributes: {
        notificationType: {
          DataType: "String",
          StringValue: body.type || "all",
        },
        priority: {
          DataType: "String",
          StringValue: body.priority || "normal",
        },
      },
    };

    const result = await sns.publish(publishParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Notification sent successfully",
        messageId: result.MessageId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Error publishing notification:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send notification" }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
