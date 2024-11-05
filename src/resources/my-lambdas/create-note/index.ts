import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
} from "@aws-sdk/client-lex-runtime-v2";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  Context,
} from "aws-lambda";
import { LexV2ActiveContext } from "aws-lambda";

interface CustomBody {
  text: string;
}

interface CustomEvent extends Omit<APIGatewayProxyEvent, "body"> {
  body: CustomBody;
}

const lexRuntime = new LexRuntimeV2Client();
export const handler = async (event: CustomEvent, context: Context) => {
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

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error invoking Lex bot",
      }),
    };
  }
};
