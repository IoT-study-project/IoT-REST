import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import jwt from 'jsonwebtoken';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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

async function verifyToken(token) {
    const user = jwt.verify(token, await getSecret());
    if (user) {
        return user.username;
    } else {
        throw new Error("Access denied");
    }
}

async function logoutUser(username) {
    const command = new PutCommand({
        TableName: "users",
        Item: {
            "username": username,
            "token": null
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
        if (event.httpMethod !== 'POST') {
            statusCode = '400';
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        const token = event.body.token;
        verifyToken(token).then((username) => {
            logoutUser(username).catch((err) => {
                throw new Error("Logout failed: " + err.message);
            });
        }).catch((err) => {
            statusCode = '401';
            throw new Error(err.message);
        });
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