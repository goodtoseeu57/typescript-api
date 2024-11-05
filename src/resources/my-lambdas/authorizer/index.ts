import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";

console.log(process.env.COGNITO_USER_POOL_ID);
console.log(process.env.COGNITO_CLIENT_ID);
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || "",
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken.split(" ")[1];

  console.log(token);

  console.log("Authorizer event:", event);
  console.log(process.env.COGNITO_USER_POOL_ID);
  console.log(process.env.COGNITO_CLIENT_ID);

  try {
    // Verify the token
    const payload = await verifier.verify(token, {
      tokenUse: "access", // Could be "id" or "access" depending on the token type you're validating
      clientId: process.env.COGNITO_CLIENT_ID || "", // Optional: you can validate the token's clientId
    });
    console.log("Token is valid. Payload:", payload);

    // Return the "Allow" policy if verification is successful
    return generatePolicy("user", "Allow", event.methodArn, {
      sub: payload.username,
    });
  } catch (error) {
    console.error("Token verification failed", error);

    // Return the "Deny" policy if token verification fails
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

function generatePolicy(
  principalId: string,
  effect: string,
  resource: string,
  context?: { [key: string]: string }
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}
