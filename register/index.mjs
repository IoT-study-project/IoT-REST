import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, PutCommand, GetCommand
} from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcrypt';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

function isUsernameValid(username) {
    return /^[0-9A-Za-z]{6,16}$/.test(username);
}

function isPasswordValid(password) {
    return /^(?=.*?[0-9])(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[^0-9A-Za-z]).{8,32}$/
        .test(password);
}

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
            "passwordHash": await bcrypt.hash(password, 10)
        },
    });
    return await docClient.send(command);
}

export const handler = async (event) => {
    let body;
    let statusCode = '200';
    const headers = {
        'Content-Type': 'application/json',
    };
    const username = event.body.username;
    const password = event.body.password;

    try {
        if (!isUsernameValid(username)) {
            statusCode = '400';
            throw new Error(`Invalid username`);
        }
        if (!isPasswordValid(password)) {
            statusCode = '400';
            throw new Error(`Invalid password`);
        }
        switch (event.httpMethod) {
            case 'POST':
                if (await userExists(username)) {
                    statusCode = '409';
                    throw new Error(`User ${username} already exists`)
                }
                body = await putUser(username, password).catch((err) => {
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
