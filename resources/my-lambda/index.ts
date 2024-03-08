import { APIGatewayProxyHandler } from "aws-lambda";
import * as AWS from 'aws-sdk';

interface Note {
    content: string;
    type: string;
}

const dynamoDb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

export const handler: APIGatewayProxyHandler = async (event) => {

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

    const res = await dynamoDb.putItem(params).promise();
    return { statusCode: 200, body: JSON.stringify({ message: 'Note added successfully', noteContent: note.content }) };
};
