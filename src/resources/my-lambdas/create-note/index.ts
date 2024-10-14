import { APIGatewayProxyHandler } from "aws-lambda";
import { dynamoDb } from "../../db/dynamodb";
import { throwErrorIfNull } from "../../../utils/utils";
import { v4 as uuidv4 } from "uuid";
import { LexRuntimeV2 } from "@aws-sdk/client-lex-runtime-v2";

const lexruntime = new LexRuntimeV2();

export const handler: APIGatewayProxyHandler = async (event, context) => {
  console.log("Received event: ", event);
  await lexruntime.recognizeText({
    botId: undefined,
    botAliasId: undefined,
    localeId: undefined,
    sessionId: undefined,
    text: undefined,
  });

  return { statusCode: 200, body: JSON.stringify({ message: "Hello Auth" }) };
};
