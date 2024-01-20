import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

function isUsernameValid(username) {
    return /^[0-9A-Za-z]{6,16}$/.test(username);
}

function isPasswordValid(password) {
    return /^(?=.*?[0-9])(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[^0-9A-Za-z]).{8,32}$/
        .test(password);
}

async function getSecret() {
    const secret_name = "jwt";
    const client = new SecretsManagerClient({
        region: "us-east-1",
    });
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secret_name,
            VersionStage: "AWSCURRENT"
        })
    );
    return response.SecretString;
}

async function getUser(username) {
    const command = new GetCommand({
        TableName: 'users',
        Key: {
            'username': username
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
    const username = event.username;
    const password = event.password;

    try {
        if (!isUsernameValid(username)) {
            statusCode = '400';
            throw new Error(`Invalid username`);
        }
        if (!isPasswordValid(password)) {
            statusCode = '400';
            throw new Error(`Invalid password`);
        }
        if (event.httpMethod !== 'POST') {
            statusCode = '400';
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        const user = await getUser(username).catch(() => {
            statusCode = '404';
            throw new Error(`User ${username} not found`);
        });
        if (!user) {
            statusCode = '404';
            throw new Error(`User ${username} not found`);
        }
        const passwordHash = user.passwordHash;
        const secret = await getSecret().catch((err) => {
            throw new Error("Error retrieving secret key: " + err.message);
        })
        if (!secret) {
            throw new Error("Secret key does not exist");
        }
        if (!await bcrypt.compare(password, passwordHash)) {
            statusCode = '401';
            throw new Error("Access denied")
        }
        const token = jwt.sign({
            username: username,
            expiresIn: "1h"
        }, secret);
        body = {
            username: username,
            token: token
        };
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