import { APIGatewayProxyHandler } from "aws-lambda";
import { dynamoDb } from "../db/dynamodb"
import { throwErrorIfNull } from "../../utils/utils";
import { v4 as uuidv4 } from 'uuid';

interface Note {
    content: string;
    type: string;
}

export const handler: APIGatewayProxyHandler = async (event, context) => {

    const note = JSON.parse(event.body || '{}') as Note;
    const params = {
        TableName: "Notes",
        Item: {
            id: { S: uuidv4() },
            CUSTOMER_NAME: { S: note.content },
        },
    };

    const res = await dynamoDb.putItem(params).promise().then(throwErrorIfNull)
    return { statusCode: 200, body: JSON.stringify({ message: 'Note added successfully', noteContent: note.content }) };
};
