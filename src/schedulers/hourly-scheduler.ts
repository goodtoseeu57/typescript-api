import { EventBridgeEvent } from "aws-lambda";
import { SNS } from "aws-sdk";

const sns = new SNS({ region: process.env.AWS_REGION });

interface ScheduledNotificationPayload {
  timestamp: string;
  scheduleType: "hourly" | "daily" | "weekly" | "custom";
  messageType: "urgent" | "batch" | "background" | "all";
  payload: any;
}

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log("EventBridge trigger received:", JSON.stringify(event, null, 2));

  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    throw new Error("SNS_TOPIC_ARN environment variable not set");
  }

  try {
    // Get current timestamp
    const currentTime = new Date().toISOString();

    // Create different types of scheduled notifications
    const notifications = [
      // Urgent notification - goes to primary queue only
      {
        messageType: "urgent",
        title: "Hourly System Health Check",
        body: `System health check completed at ${currentTime}`,
        priority: "high",
        data: {
          timestamp: currentTime,
          checkType: "health",
          status: "active",
        },
      },

      // Batch notification - goes to secondary queue only
      {
        messageType: "batch",
        title: "Hourly Analytics Processing",
        body: `Starting hourly analytics batch processing at ${currentTime}`,
        priority: "normal",
        data: {
          timestamp: currentTime,
          processType: "analytics",
          batchSize: 1000,
        },
      },

      // All notification - goes to both queues
      {
        messageType: "all",
        title: "Hourly Maintenance Notification",
        body: `System maintenance check initiated at ${currentTime}`,
        priority: "medium",
        data: {
          timestamp: currentTime,
          taskType: "maintenance",
          estimatedDuration: "5 minutes",
        },
      },
    ];

    // Publish each notification to SNS
    const publishPromises = notifications.map(async (notification) => {
      const message: ScheduledNotificationPayload = {
        timestamp: currentTime,
        scheduleType: "hourly",
        messageType: notification.messageType as any,
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
            StringValue: "hourly",
          },
          timestamp: {
            DataType: "String",
            StringValue: currentTime,
          },
        },
      };

      console.log(
        `Publishing ${notification.messageType} notification:`,
        params.Subject
      );
      return sns.publish(params).promise();
    });

    // Wait for all publications to complete
    const results = await Promise.all(publishPromises);

    console.log(
      "All notifications published successfully:",
      results.map((r) => r.MessageId)
    );

    // Additional scheduled tasks based on hour
    const currentHour = new Date().getHours();
    await handleHourlyTasks(currentHour, topicArn);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Hourly notifications published successfully",
        timestamp: currentTime,
        notificationCount: notifications.length,
        messageIds: results.map((r) => r.MessageId),
      }),
    };
  } catch (error) {
    console.error("Error publishing scheduled notifications:", error);
    throw error;
  }
};

async function handleHourlyTasks(hour: number, topicArn: string) {
  // Special tasks based on specific hours
  const specialTasks: { [key: number]: any } = {
    0: {
      // Midnight - daily summary
      messageType: "batch",
      title: "Daily Summary Generation",
      body: "Generating daily summary reports",
      priority: "high",
    },
    6: {
      // 6 AM - morning health check
      messageType: "urgent",
      title: "Morning System Startup Check",
      body: "Performing morning system health verification",
      priority: "high",
    },
    12: {
      // Noon - midday maintenance
      messageType: "all",
      title: "Midday Maintenance Window",
      body: "Scheduled midday maintenance and optimization",
      priority: "medium",
    },
    18: {
      // 6 PM - evening backup
      messageType: "batch",
      title: "Evening Backup Process",
      body: "Initiating evening data backup procedures",
      priority: "normal",
    },
  };

  const specialTask = specialTasks[hour];
  if (specialTask) {
    const message = {
      timestamp: new Date().toISOString(),
      scheduleType: "hourly",
      messageType: specialTask.messageType,
      payload: {
        ...specialTask,
        isSpecialTask: true,
        hour: hour,
        data: {
          timestamp: new Date().toISOString(),
          taskType: "scheduled-special",
          hour: hour,
        },
      },
    };

    const params = {
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      Subject: specialTask.title,
      MessageAttributes: {
        messageType: {
          DataType: "String",
          StringValue: specialTask.messageType,
        },
        priority: {
          DataType: "String",
          StringValue: specialTask.priority,
        },
        scheduleType: {
          DataType: "String",
          StringValue: "hourly",
        },
        isSpecialTask: {
          DataType: "String",
          StringValue: "true",
        },
        hour: {
          DataType: "Number",
          StringValue: hour.toString(),
        },
      },
    };

    console.log(`Publishing special task for hour ${hour}:`, specialTask.title);
    await sns.publish(params).promise();
  }
}
