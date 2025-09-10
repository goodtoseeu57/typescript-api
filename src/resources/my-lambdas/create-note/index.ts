import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
} from "@aws-sdk/client-lex-runtime-v2";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";
import { LexV2ActiveContext } from "aws-lambda";
import * as AWS from "aws-sdk";

interface CustomBody {
  text: string;
}

interface CustomEvent extends Omit<APIGatewayProxyEvent, "body"> {
  body: CustomBody;
}

const lexRuntime = new LexRuntimeV2Client();
const sns = new AWS.SNS();

export const handler = async (
  event: CustomEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(event.requestContext.authorizer);

  console.log(context);
  console.log(event.body.text);
  console.log(process.env.BOT_ID);
  console.log(process.env.BOT_ALIAS);

  const command = new RecognizeTextCommand({
    botId: process.env.BOT_ID,
    botAliasId: process.env.BOT_ALIAS,
    localeId: "en_GB",
    sessionId: "my-session-id",
    text: "Make a car reservation",
    // sessionState: {
    //   sessionAttributes: { conversationStatus: "successful" },
    //   dialogAction: {
    //     type: "Close", // Close the session if needed
    //   },
    //   intent: {
    //     name: "CreateNoteIntent",
    //     state: "Fulfilled", // Mark intent as fulfilled
    //   },
    // Use sessionState to wrap sessionAttributes
    // },
  });

  try {
    const response = await lexRuntime.send(command);

    // Send notification after successful note creation
    if (process.env.SNS_TOPIC_ARN) {
      try {
        const notificationMessage = {
          default: `Note created successfully: ${event.body.text}`,
          email: JSON.stringify({
            subject: "New Note Created",
            content: `A new note was created with text: ${event.body.text}`,
            recipient: "user@example.com", // This would come from user context
          }),
        };

        await sns
          .publish({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Message: JSON.stringify(notificationMessage),
            MessageStructure: "json",
            MessageAttributes: {
              notificationType: {
                DataType: "String",
                StringValue: "all",
              },
              priority: {
                DataType: "String",
                StringValue: "normal",
              },
            },
          })
          .promise();

        console.log("Notification sent successfully");
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error invoking Lex bot",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
