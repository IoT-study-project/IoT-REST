import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, PutCommand, GetCommand
} from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcrypt';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function userExists(username) {
    const command = new GetCommand({
        TableName: 'users',
        Key: {
            'username': username
        }
    });
    const { Item } = await docClient.send(command);
    return Item !== undefined;
}

async function putUser(username, password) {
    const command = new PutCommand({
        TableName: "users",
        Item: {
            "username": username,
            "token": await bcrypt.hash(password, 10)
        },
    });
    return response = await docClient.send(command);
}

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.httpMethod) {
            case 'POST':
                if (await userExists(event.body.username)) {
                    statusCode = '409';
                    throw new Error(`User ${event.body.username} already exists`)
                }
                body = await putUser(event.body.username, event.body.password).catch((err) => {
                    throw new Error("Registration failed: " + err.message)
                });
                break;
            default:
                statusCode = '400';
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        if (statusCode === '200') {
            statusCode = '500';
        }
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
