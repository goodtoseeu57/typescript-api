import * as AWS from "aws-sdk";

export const dynamoDb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });