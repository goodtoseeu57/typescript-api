import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SNS } from "aws-sdk";

const sns = new SNS({ region: process.env.AWS_REGION });

interface TriggerRequest {
  triggerType?: "immediate" | "test";
  messageTypes?: string[];
  customMessage?: {
    title: string;
    body: string;
    priority: string;
    data?: any;
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(
    "Manual scheduler trigger received:",
    JSON.stringify(event, null, 2)
  );

  try {
    const topicArn = process.env.SCHEDULED_SNS_TOPIC_ARN;
    if (!topicArn) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: JSON.stringify({
          error: "SCHEDULED_SNS_TOPIC_ARN environment variable not set",
        }),
      };
    }

    // Parse request body
    let requestBody: TriggerRequest = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            error: "Invalid JSON in request body",
            details: parseError,
          }),
        };
      }
    }

    const currentTime = new Date().toISOString();
    const triggerType = requestBody.triggerType || "immediate";

    let notifications: any[] = [];

    if (requestBody.customMessage) {
      // Use custom message provided in request
      notifications.push({
        messageType: "all", // Send to both queues by default
        ...requestBody.customMessage,
      });
    } else {
      // Create default test notifications
      const messageTypes = requestBody.messageTypes || [
        "urgent",
        "batch",
        "all",
      ];

      notifications = messageTypes.map((messageType) => {
        switch (messageType) {
          case "urgent":
            return {
              messageType: "urgent",
              title: "Manual Urgent Test Notification",
              body: `Manual urgent test triggered at ${currentTime}`,
              priority: "high",
              data: {
                timestamp: currentTime,
                triggerType: "manual",
                testType: "urgent",
              },
            };
          case "batch":
            return {
              messageType: "batch",
              title: "Manual Batch Test Notification",
              body: `Manual batch test triggered at ${currentTime}`,
              priority: "normal",
              data: {
                timestamp: currentTime,
                triggerType: "manual",
                testType: "batch",
                batchSize: 100,
              },
            };
          case "all":
            return {
              messageType: "all",
              title: "Manual All-Queues Test Notification",
              body: `Manual test for all queues triggered at ${currentTime}`,
              priority: "medium",
              data: {
                timestamp: currentTime,
                triggerType: "manual",
                testType: "all-queues",
              },
            };
          default:
            return {
              messageType: "all",
              title: "Manual Generic Test Notification",
              body: `Manual generic test triggered at ${currentTime}`,
              priority: "low",
              data: {
                timestamp: currentTime,
                triggerType: "manual",
                testType: "generic",
              },
            };
        }
      });
    }

    // Publish notifications to SNS
    const publishPromises = notifications.map(async (notification) => {
      const message = {
        timestamp: currentTime,
        scheduleType: "manual",
        messageType: notification.messageType,
        payload: notification,
      };

      const params = {
        TopicArn: topicArn,
        Message: JSON.stringify(message),
        Subject: notification.title,
        MessageAttributes: {
          messageType: {
            DataType: "String",
            StringValue: notification.messageType,
          },
          priority: {
            DataType: "String",
            StringValue: notification.priority,
          },
          scheduleType: {
            DataType: "String",
            StringValue: "manual",
          },
          triggerType: {
            DataType: "String",
            StringValue: triggerType,
          },
          timestamp: {
            DataType: "String",
            StringValue: currentTime,
          },
        },
      };

      console.log(
        `Publishing manual ${notification.messageType} notification:`,
        notification.title
      );
      return sns.publish(params).promise();
    });

    // Wait for all publications to complete
    const results = await Promise.all(publishPromises);

    console.log(
      "All manual notifications published successfully:",
      results.map((r) => r.MessageId)
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        message: "Manual scheduler trigger executed successfully",
        timestamp: currentTime,
        triggerType: triggerType,
        notificationCount: notifications.length,
        messageIds: results.map((r) => r.MessageId),
        notifications: notifications.map((n) => ({
          messageType: n.messageType,
          title: n.title,
          priority: n.priority,
        })),
      }),
    };
  } catch (error) {
    console.error("Error in manual scheduler trigger:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
