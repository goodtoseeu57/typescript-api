import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";
import * as jwt from "jsonwebtoken"; // Correct import for jsonwebtoken
import axios from "axios";
import jwkToPem from "jwk-to-pem"; // Import jwk-to-pem to convert JWK to PEM

// Cache for Cognito JWKS keys
let cachedKeys: { [key: string]: string } = {};

// Helper function to fetch the JWKS from Cognito
async function getCognitoJwks(
  userPoolId: string
): Promise<{ [key: string]: string }> {
  if (Object.keys(cachedKeys).length > 0) {
    return cachedKeys;
  }

  const url = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const response = await axios.get(url);

  const keys = response.data.keys;
  keys.forEach((key: any) => {
    const kid = key.kid;
    const publicKey = jwkToPem(key); // Convert JWK to PEM using jwk-to-pem
    cachedKeys[kid] = publicKey;
  });

  return cachedKeys;
}

// Lambda authorizer handler
export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken;

  console.log("Received token:", token);
  const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
  const clientId = process.env.COGNITO_CLIENT_ID || "";

  try {
    const decodedToken = jwt.decode(token, { complete: true }) as {
      header: { kid: string };
    };
    if (!decodedToken || !decodedToken.header.kid) {
      throw new Error("Invalid token");
    }

    // Fetch Cognito public keys
    const jwks = await getCognitoJwks(userPoolId);
    const publicKey = jwks[decodedToken.header.kid];

    if (!publicKey) {
      throw new Error("Public key not found");
    }

    // Verify the token using the public key
    const payload = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      audience: clientId, // Ensure this matches the Cognito client ID
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${userPoolId}`,
    }) as jwt.JwtPayload;

    console.log("Token is valid. Payload:", payload);

    // Return the "Allow" policy if verification is successful
    return generatePolicy("user", "Allow", event.methodArn);
  } catch (error) {
    console.error("Token verification failed", error);

    // Return the "Deny" policy if token verification fails
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

// Helper function to generate IAM policy
function generatePolicy(
  principalId: string,
  effect: string,
  resource: string
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
  };
}
