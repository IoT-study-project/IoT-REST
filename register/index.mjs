import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
//import { bcrypt } from 'bcryptjs';

const dynamo = DynamoDBDocument.from(new DynamoDB());

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
    };
    
    const data = event.body;

    try {
        switch (event.httpMethod) {
            case 'POST':
                body = await dynamo.put({
                    TableName: 'users',
                    Item: {
                        username : data.username,
                        passwordHash : data.password // to hash
                    }
                });
                break;
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = '400';
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
};
