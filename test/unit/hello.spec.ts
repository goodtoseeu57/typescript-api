import { APIGatewayEvent } from "aws-lambda";
import { handler } from "../../src/resources/my-lambdas/hello";
import { create } from "domain";
import { createMockAPIGatewayEvent } from "../mock/apigateway.mock";

describe("Lambda Handler", () => {
  it("should return a 200 status and message", async () => {
    const mockEvent = createMockAPIGatewayEvent();
    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ message: "Hello Auth" }));
  });
});
