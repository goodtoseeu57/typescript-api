import { APIGatewayEvent } from "aws-lambda";

/**
 * Creates a mock APIGatewayEvent with default values.
 *
 * This function generates a mock `APIGatewayEvent` object that can be used
 * in unit tests. You can pass an `overrides` object to customize any of
 * the event's properties, allowing for flexible test scenarios.
 *
 * @param overrides - A partial object of type `APIGatewayEvent` to override the default values.
 * @returns A mock `APIGatewayEvent` object with the specified overrides.
 *
 * @example
 * // Create a default mock event
 * const mockEvent = createMockAPIGatewayEvent();
 *
 * @example
 * // Create a mock event with custom HTTP method and body
 * const mockEvent = createMockAPIGatewayEvent({
 *   httpMethod: "POST",
 *   body: JSON.stringify({ key: "value" }),
 * });
 */
export const createMockAPIGatewayEvent = (
  overrides: Partial<APIGatewayEvent> = {}
): APIGatewayEvent => {
  const defaultEvent: APIGatewayEvent = {
    body: null,
    headers: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/auth",
    queryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: "",
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  };

  return { ...defaultEvent, ...overrides };
};
