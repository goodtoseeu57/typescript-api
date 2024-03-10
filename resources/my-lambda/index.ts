import { APIGatewayProxyHandler } from "aws-lambda";
import * as AWS from 'aws-sdk';

interface Note {
    content: string;
    type: string;
}

export const throwErrorIfNull = <T>(result: T | null) => { if (result === null) throw new Error(); else return result }

const dynamoDb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

export const handler: APIGatewayProxyHandler = async (event, context) => {
    const note: Note = {
        content: 'hey',
        type: 'note'
    }
    const params = {
        TableName: "Notes",
        Item: {
            id: { S: "001" },
            CUSTOMER_NAME: { S: note.content },
        },
    };

    const res = await dynamoDb.putItem(params).promise().then(throwErrorIfNull)
    return { statusCode: 200, body: JSON.stringify({ message: 'Note added successfully', noteContent: note.content }) };
};
