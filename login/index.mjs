import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function getUser(event) {
    const command = new GetCommand({
        TableName: 'users',
        Key: {
            'username': event.body.username
        }
    });
    const { Item } = await docClient.send(command);
    return Item;
}

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        if (event.httpMethod !== 'POST')
            throw new Error(`Unsupported method "${event.httpMethod}"`);

        const user = await getUser(event);
        if (!user) {
            statusCode = '404';
            body = `User ${event.body.username} not found`;
        } else {
            const passwordHash = user.passwordHash;
            if (!await bcrypt.compare(event.body.password, passwordHash)) {
                statusCode = '401';
                body = "Access denied";
            } else {
                body = {
                    username: event.body.username,
                    token: jwt.sign(
                        {
                            username: event.body.username,
                        },
                        passwordHash
                    )
                };
            }
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